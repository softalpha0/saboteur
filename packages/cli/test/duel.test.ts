import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MutantProposer, Proposal, TestWriter, WriterReply } from '@saboteur/agent';
import { parseAnswer } from '@saboteur/agent';
import { loadManifest } from '@saboteur/mutator';
import { afterAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.ts';
import { type DuelReport, cmdDuel } from '../src/duel.ts';

// Duel end to end: real copy/patch/build/serve of the demo shop, stubs in place of both Claude agents,
// and a scripted stand-in for kane-cli (no credits). Checks the referee logic and the scoring.

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-duel-'));
const saved = { ...process.env };
afterAll(() => {
  process.env = saved;
});

const proposal = (over: Partial<Proposal>): Proposal => ({
  title: 'Mug price typo',
  category: 'display',
  userImpact: 'Mug shows the wrong price',
  file: 'src/data/products.ts',
  find: 'priceCents: 1450',
  replace: 'priceCents: 1540',
  kaneCheck: 'Open the home page and verify the Ceramic Mug shows $15.40',
  ...over,
});

const end = (status: string, exit: number) => ({
  exit,
  lines: [{ type: 'run_end', status, one_liner: status }],
});
const suite = (status: 'passed' | 'failed', exit: number, file = 'tests/kane/starter/a_test.md') => ({
  exit,
  lines: [
    {
      type: 'testrun_member_end',
      path: file,
      status,
      duration_s: 1,
      ...(status === 'failed' ? { failure: { message: 'Final verification failed: "price"' } } : {}),
    },
    {
      type: 'testrun_summary',
      totals: { tests: 1, passed: 0, failed: 0, broken: 0, skipped: 0, authored: 0 },
    },
    { type: 'testrun_done', overall_status: exit ? 'failed' : 'passed' },
  ],
});
const testmd = (exit: number) => ({
  exit,
  lines: [{ type: 'test_md_done', overall_status: exit ? 'failed' : 'passed' }],
});

const TEST = `FILE: apron_price_is_34_99_test.md
\`\`\`markdown
---
mode: testing
url: http://localhost:4186
tags: [generated, display]
max_steps: 30
---

## Open the home page
Open the home page.
Verify the Linen Apron is listed.

## Check the apron price
Look at the Linen Apron card.
Verify its price shows $34.99.
\`\`\``;

describe('saboteur duel', () => {
  it('scores defended, closed and forfeit rounds from Kane verdicts only', async () => {
    fs.cpSync(path.join(repo, 'apps/shop/mutations'), path.join(tmp, 'mutations'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'tests/kane/starter'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'tests/kane/starter/a_test.md'), '## A\nVerify A.\n');
    fs.writeFileSync(
      path.join(tmp, 'saboteur.config.json'),
      JSON.stringify({
        app: {
          dir: path.join(repo, 'apps/shop'),
          build: 'vite build',
          serve: 'vite preview --port 4186 --strictPort',
          url: 'http://localhost:4186',
          routes: path.join(repo, 'apps/shop/ROUTES.md'),
        },
        mutations: { manifest: path.join(tmp, 'mutations/manifest.json') },
        kane: { minCredits: 0 },
        workDir: path.join(tmp, 'work'),
      }),
    );
    const script = path.join(tmp, 'script.json');
    fs.writeFileSync(
      script,
      JSON.stringify({
        steps: [
          // round 1: bug is real (bug passes, clean fails), suite catches it, confirm catches it again
          end('passed', 0),
          end('failed', 1),
          suite('failed', 1),
          suite('failed', 1),
          // round 2: bug is real, suite misses it, blue's test passes clean and fails on the bug
          end('passed', 0),
          end('failed', 1),
          suite('passed', 0),
          testmd(0),
          testmd(1),
          // round 3: red's proposals are invalid locally, so Kane is never called
        ],
      }),
    );
    process.env.KANE_CLI_BIN = path.join(here, 'fixtures/scripted-kane.mjs');
    process.env.SCRIPTED_KANE = script;

    const queue = [
      proposal({}),
      proposal({
        title: 'Apron price typo',
        find: 'priceCents: 3499',
        replace: 'priceCents: 3449',
        kaneCheck: 'verify the Linen Apron shows $34.49',
      }),
      proposal({ title: 'Ambiguous', find: 'inStock: true' }),
      proposal({ title: 'Ambiguous again', find: 'inStock: true' }),
    ];
    const seenTests: number[] = [];
    const proposer = {
      model: 'stub',
      propose: async (input: { tests?: unknown[] }) => {
        seenTests.push(input.tests?.length ?? -1);
        const p = queue.shift();
        return { raw: '{}', prompt: 'p', proposals: p ? [p] : [], problems: [] };
      },
    } as unknown as MutantProposer;
    const writer = {
      systemText: 's',
      modelId: 'stub',
      first: async (): Promise<WriterReply> => ({
        ...parseAnswer(TEST),
        raw: TEST,
        prompt: 'p',
        model: 'stub',
      }),
      retry: async (): Promise<WriterReply> => ({
        ...parseAnswer(TEST),
        raw: TEST,
        prompt: 'p',
        model: 'stub',
      }),
    } as unknown as TestWriter;

    const code = await cmdDuel(loadConfig(path.join(tmp, 'saboteur.config.json')), {
      rounds: 3,
      proposer,
      writerFactory: () => writer,
    });
    expect(code).toBe(0);

    const r = JSON.parse(
      fs.readFileSync(path.join(tmp, 'reports/latest-duel/duel.json'), 'utf8'),
    ) as DuelReport;
    expect(r.rounds.map((x) => x.outcome)).toEqual(['defended', 'closed', 'red-forfeit']);
    expect(r.score).toEqual({ red: 1, blue: 2 });
    expect(r.suiteBefore).toBe(1);
    expect(r.suiteAfter).toBe(2); // blue's proven test joined the suite
    expect(seenTests).toEqual([1, 1, 2, 2]); // red always sees the current suite, including blue's new test
    expect(r.rounds[1]?.fill?.accepted).toBe(true);
    expect(
      loadManifest(path.join(tmp, 'mutations/manifest.json'))
        .mutants.filter((m) => m.source === 'ai')
        .map((m) => m.id),
    ).toEqual(['M11', 'M12']);
    const html = fs.readFileSync(path.join(tmp, 'reports/latest-duel/duel.html'), 'utf8');
    expect(html).toContain('Red 1');
    expect(html).toContain('Blue 2');
    expect(html).not.toMatch(/<script/);
  }, 240_000);
});
