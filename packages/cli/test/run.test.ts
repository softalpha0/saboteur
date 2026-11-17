import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Report } from '@saboteur/report';
import { afterAll, describe, expect, it } from 'vitest';
import { cmdRun } from '../src/commands.ts';
import { loadConfig } from '../src/config.ts';

// End-to-end orchestration of `saboteur run --replay` with real builds and a scripted stand-in for
// kane-cli (no credits). Checks the order of Kane calls, flags, verdicts and the written report.

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-run-'));
const saved = { ...process.env };
afterAll(() => {
  process.env = saved;
});

const member = (p: string, status: string, message?: string) => ({
  type: 'testrun_member_end',
  path: p,
  status,
  duration_s: 3,
  ...(message ? { failure: { message, step_index: 0 } } : {}),
});
const suiteRun = (exec: string, members: object[], exit: number, authored = 0) => ({
  exit,
  lines: [
    { type: 'stream_start', cli_version: '0.10.5' },
    { type: 'testrun_start', execution_id: exec },
    ...members,
    {
      type: 'testrun_summary',
      totals: { tests: members.length, passed: 0, failed: 0, broken: 0, skipped: 0, authored },
      upload: { url: `https://example.invalid/${exec}` },
    },
    { type: 'testrun_done', execution_id: exec, overall_status: exit === 0 ? 'passed' : 'failed' },
  ],
});

describe('saboteur run --replay (scripted Kane)', () => {
  it('doctor → baseline → attack → re-attack with generated tests → report', async () => {
    for (const d of ['tests/kane/starter', 'tests/kane/generated'])
      fs.mkdirSync(path.join(tmp, d), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'tests/kane/starter/a_test.md'), '## A\nVerify A.\n');
    fs.writeFileSync(path.join(tmp, 'tests/kane/generated/g_test.md'), '## G\nVerify G.\n');
    fs.writeFileSync(
      path.join(tmp, 'saboteur.config.json'),
      JSON.stringify({
        app: {
          dir: path.join(repo, 'apps/shop'),
          build: 'vite build',
          serve: 'vite preview --port 4182 --strictPort',
          url: 'http://localhost:4182',
        },
        mutations: { manifest: path.join(repo, 'apps/shop/mutations/manifest.json') },
        kane: { minCredits: 100 },
        workDir: path.join(tmp, 'work'),
      }),
    );
    const script = path.join(tmp, 'script.json');
    fs.writeFileSync(
      script,
      JSON.stringify({
        steps: [
          { exit: 0, lines: [{ type: 'testrun_plan', valid: true, members: [] }] }, // doctor dry-run
          suiteRun(
            'base',
            [
              member('tests/kane/starter/a_test.md', 'passed'),
              member('tests/kane/generated/g_test.md', 'passed'),
            ],
            0,
          ),
          suiteRun(
            'm01',
            [member('tests/kane/starter/a_test.md', 'failed', 'Final verification failed: "total $29.99"')],
            1,
          ), // M01 killed
          suiteRun('m03', [member('tests/kane/starter/a_test.md', 'passed')], 0), // M03 survived
          suiteRun(
            'm03b',
            [
              member('tests/kane/starter/a_test.md', 'passed'),
              member('tests/kane/generated/g_test.md', 'failed', 'Total mismatch'),
            ],
            1,
          ), // M03 killed by generated
        ],
      }),
    );
    process.env.KANE_CLI_BIN = path.join(here, 'fixtures/scripted-kane.mjs');
    process.env.SCRIPTED_KANE = script;
    process.env.ANTHROPIC_API_KEY = '';

    const code = await cmdRun(loadConfig(path.join(tmp, 'saboteur.config.json')), {
      replay: true,
      only: 'M01,M03',
    });
    expect(code).toBe(0);

    const report = JSON.parse(
      fs.readFileSync(path.join(tmp, 'reports/latest/report.json'), 'utf8'),
    ) as Report;
    expect(report.mode).toBe('replay');
    expect(report.kaneCliVersion).toBe('0.10.5');
    expect(report.before).toMatchObject({ killed: 1, survived: 1 });
    expect(report.after).toMatchObject({ killed: 2, survived: 0 });
    const m03 = report.mutants.find((m) => m.id === 'M03');
    expect(m03?.closedBy).toBe('existing-generated-test');
    expect(m03?.after?.caughtBy[0]).toMatchObject({ file: 'g_test.md', message: 'Total mismatch' });
    expect(m03?.after?.links).toContain('https://example.invalid/m03b');
    expect(report.mutants.find((m) => m.id === 'M01')?.before.executionId).toBe('m01');
    expect(fs.readFileSync(path.join(tmp, 'reports/latest/report.md'), 'utf8')).toContain(
      '**After: 2/2 caught**',
    );

    const argv = fs
      .readFileSync(`${script}.argv.log`, 'utf8')
      .trim()
      .split('\n')
      .filter((a) => a.startsWith('testrun run') && !a.includes('--dry-run'));
    expect(argv).toHaveLength(4);
    expect(argv[0]).not.toContain('--no-adaptive-heal'); // baseline heals
    expect(argv[0]).toContain('g_test.md'); // baseline records generated tests too
    expect(argv[1]).toContain('--no-adaptive-heal');
    expect(argv[1]).not.toContain('g_test.md'); // "before" = starter suite only
    expect(argv[3]).toContain('g_test.md'); // re-attack with generated
  }, 180_000);

  it('stops the run as invalid when Kane authors a test on a bugged build', async () => {
    const script = path.join(tmp, 'script2.json');
    fs.writeFileSync(
      script,
      JSON.stringify({
        steps: [
          { exit: 0, lines: [{ type: 'testrun_plan', valid: true, members: [] }] },
          suiteRun('base', [member('tests/kane/starter/a_test.md', 'passed')], 0),
          suiteRun('m01', [member('tests/kane/starter/a_test.md', 'passed')], 0, 1),
        ],
      }),
    );
    process.env.SCRIPTED_KANE = script;
    await expect(
      cmdRun(loadConfig(path.join(tmp, 'saboteur.config.json')), { replay: true, only: 'M01' }),
    ).rejects.toThrow(/authored/);
  }, 180_000);
});
