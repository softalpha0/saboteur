import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TestWriter, WriterReply } from '@saboteur/agent';
import { parseAnswer } from '@saboteur/agent';
import { afterAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.ts';
import { createContext } from '../src/context.ts';
import { buildClean, fillOne } from '../src/pipeline.ts';
import { suites } from '../src/suite.ts';

// Integration test of the closed loop with a REAL copy/patch/build/serve of the demo shop, a scripted
// stand-in for kane-cli (no credits) and a stub writer in place of Claude. It checks Saboteur's own
// logic: retry on Kane's text, accept only on (clean exit 0, bugged exit 1), files saved / removed.

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-fill-'));
const saved = { ...process.env };
afterAll(() => {
  process.env = saved;
});

const file = (name: string, finalCheck: string) => `FILE: ${name}
\`\`\`markdown
---
mode: testing
url: http://localhost:4181
tags: [generated, maths]
max_steps: 30
---

## Fill the cart
Open the home page and add the Canvas Tote and the Linen Apron to the cart.
Verify the cart badge in the header shows 2.

## Apply SAVE10
Open the cart page and apply the discount code SAVE10.
${finalCheck}
\`\`\``;

class StubWriter {
  calls: { kind: string; kaneText?: string; problem?: string }[] = [];
  constructor(private readonly answers: string[]) {}
  get systemText() {
    return 'stub system prompt';
  }
  get modelId() {
    return 'stub-model';
  }
  private reply(): WriterReply {
    const raw = this.answers.shift() ?? '';
    return { ...parseAnswer(raw), raw, prompt: 'p', model: 'stub-model' };
  }
  async first() {
    this.calls.push({ kind: 'first' });
    return this.reply();
  }
  async retry(problem: string, _body: string, kaneText: string) {
    this.calls.push({ kind: 'retry', problem, kaneText });
    return this.reply();
  }
}

describe('fillOne (closed loop)', () => {
  it('feeds Kane failure text back, accepts only on clean-pass + bug-fail, keeps the proven file', async () => {
    fs.mkdirSync(path.join(tmp, 'tests/kane/starter'), { recursive: true });
    fs.copyFileSync(
      path.join(repo, 'tests/kane/starter/login_test.md'),
      path.join(tmp, 'tests/kane/starter/login_test.md'),
    );
    fs.writeFileSync(
      path.join(tmp, 'saboteur.config.json'),
      JSON.stringify({
        app: {
          dir: path.join(repo, 'apps/shop'),
          build: 'vite build',
          serve: 'vite preview --port 4181 --strictPort',
          url: 'http://localhost:4181',
        },
        mutations: { manifest: path.join(repo, 'apps/shop/mutations/manifest.json') },
        workDir: path.join(tmp, 'work'),
      }),
    );
    const kaneMsg = 'Final verification failed: "the Total shows $54.00" $&';
    const script = path.join(tmp, 'script.json');
    fs.writeFileSync(
      script,
      JSON.stringify({
        steps: [
          // attempt 1, run A (clean): fails -> goes back to Claude
          {
            exit: 1,
            lines: [
              {
                type: 'run_end',
                status: 'failed',
                reason: kaneMsg,
                failure: { message: kaneMsg, step_index: 1 },
              },
              { type: 'test_md_done', overall_status: 'failed' },
            ],
          },
          // attempt 2, run A (clean): passes
          {
            exit: 0,
            lines: [
              { type: 'test_md_done', overall_status: 'passed', share_url: 'https://example.invalid/s/2a' },
            ],
          },
          // attempt 2, run B (bugged): fails -> accepted
          { exit: 1, lines: [{ type: 'test_md_done', overall_status: 'failed' }] },
        ],
      }),
    );
    process.env.KANE_CLI_BIN = path.join(here, 'fixtures/scripted-kane.mjs');
    process.env.SCRIPTED_KANE = script;

    const cfg = loadConfig(path.join(tmp, 'saboteur.config.json'));
    const ctx = createContext(cfg);
    const mutant = ctx.manifest.mutants.find((m) => m.id === 'M03');
    if (!mutant) throw new Error('M03 missing');
    const writer = new StubWriter([
      file('discount_save10_total_test.md', 'Verify the Total shows $54.00.'),
      file('discount_save10_total_test.md', 'Verify the Total shows $53.98.'),
    ]);
    const cleanDir = await buildClean(ctx);
    const rec = await fillOne(ctx, {
      mutant,
      cleanDir,
      existingFiles: suites(cfg.abs.tests, cfg.abs.generated).all,
      routes: 'routes',
      writer: writer as unknown as TestWriter,
    });

    expect(rec.accepted).toBe(true);
    expect(rec.attempts).toBe(2);
    expect(rec.history.map((h) => h.decision)).toEqual(['fails-on-clean', 'accepted']);
    expect(writer.calls[1]).toEqual({
      kind: 'retry',
      problem: 'fails-on-clean',
      kaneText: `${kaneMsg} (step index 1)`,
    });
    expect(
      fs.readFileSync(path.join(tmp, 'tests/kane/generated/discount_save10_total_test.md'), 'utf8'),
    ).toContain('$53.98');

    const argv = fs.readFileSync(`${script}.argv.log`, 'utf8').trim().split('\n');
    const runs = argv.filter((a) => a.startsWith('testmd run'));
    expect(runs).toHaveLength(3);
    expect(runs[1]).not.toContain('--no-adaptive-heal'); // clean
    expect(runs[2]).toContain('--no-adaptive-heal'); // bugged
    expect(runs[0]).toContain(path.join('tests', 'kane', 'generated', 'discount_save10_total_test.md'));

    const proven = JSON.parse(fs.readFileSync(path.join(tmp, 'tests/kane/generated/proven.json'), 'utf8'));
    expect(proven).toMatchObject([
      {
        file: 'discount_save10_total_test.md',
        mutant: 'M03',
        attempt: 2,
        clean: { exitCode: 0 },
        bugged: { exitCode: 1 },
      },
    ]);

    const transcript = fs.readFileSync(rec.transcript, 'utf8');
    expect(transcript).toContain(kaneMsg);
    expect(transcript).toContain('**Decision:** accepted');
  }, 120_000);

  it('never accepts a test that passes on the bugged build; unproven after max attempts; removes candidates', async () => {
    const script = path.join(tmp, 'script2.json');
    const pass = {
      exit: 0,
      lines: [
        { type: 'run_end', status: 'passed', summary: 'Total showed $59.38' },
        { type: 'test_md_done', overall_status: 'passed' },
      ],
    };
    fs.writeFileSync(script, JSON.stringify({ steps: [pass, pass, pass, pass] }));
    process.env.SCRIPTED_KANE = script;

    const cfg = loadConfig(path.join(tmp, 'saboteur.config.json'));
    const ctx = { ...createContext(cfg), cfg: { ...cfg, agent: { maxAttempts: 3 } } };
    const mutant = ctx.manifest.mutants.find((m) => m.id === 'M04');
    if (!mutant) throw new Error('M04 missing');
    const bad = file('shipping_fee_test.md', 'Verify the page loads.');
    const writer = new StubWriter([bad, bad.replace('Verify the page loads.', 'The page is fine.'), bad]);
    const cleanDir = await buildClean(ctx);
    const rec = await fillOne(ctx, {
      mutant,
      cleanDir,
      existingFiles: [],
      routes: 'routes',
      writer: writer as unknown as TestWriter,
    });
    expect(rec.accepted).toBe(false);
    expect(rec.attempts).toBe(3);
    expect(rec.history.map((h) => h.decision)).toEqual([
      'passes-on-mutant',
      'invalid-file',
      'passes-on-mutant',
    ]);
    expect(writer.calls[1]?.kaneText).toBe('Total showed $59.38');
    expect(fs.existsSync(path.join(tmp, 'tests/kane/generated/shipping_fee_test.md'))).toBe(false);
  }, 120_000);
});
