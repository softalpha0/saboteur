import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { cmdAttack } from '../src/commands.ts';
import { loadConfig } from '../src/config.ts';

// attack saves after every bug; --resume keeps those verdicts and runs only the rest (scripted Kane, no credits).
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-resume-'));
const saved = { ...process.env };
afterAll(() => {
  process.env = saved;
});

const run = (status: string, exit: number) => ({
  exit,
  lines: [
    {
      type: 'testrun_member_end',
      path: 'tests/kane/starter/a_test.md',
      status,
      duration_s: 1,
      ...(status === 'failed' ? { failure: { message: 'x' } } : {}),
    },
    {
      type: 'testrun_summary',
      totals: { tests: 1, passed: 0, failed: 0, broken: 0, skipped: 0, authored: 0 },
    },
    { type: 'testrun_done', overall_status: exit ? 'failed' : 'passed' },
  ],
});

describe('attack --resume', () => {
  it('keeps saved verdicts and attacks only the missing bugs', async () => {
    fs.mkdirSync(path.join(tmp, 'tests/kane/starter'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'tests/kane/starter/a_test.md'), '## A\nVerify A.\n');
    fs.writeFileSync(
      path.join(tmp, 'saboteur.config.json'),
      JSON.stringify({
        app: {
          dir: path.join(repo, 'apps/shop'),
          build: 'vite build',
          serve: 'vite preview --port 4184 --strictPort',
          url: 'http://localhost:4184',
        },
        mutations: { manifest: path.join(repo, 'apps/shop/mutations/manifest.json') },
        kane: { minCredits: 0 },
        workDir: path.join(tmp, 'work'),
      }),
    );
    process.env.KANE_CLI_BIN = path.join(here, 'fixtures/scripted-kane.mjs');
    const cfg = loadConfig(path.join(tmp, 'saboteur.config.json'));

    // First attack: only M01 (killed).
    const s1 = path.join(tmp, 's1.json');
    fs.writeFileSync(s1, JSON.stringify({ steps: [run('failed', 1)] }));
    process.env.SCRIPTED_KANE = s1;
    await cmdAttack(cfg, { only: 'M01' });
    const state = JSON.parse(fs.readFileSync(path.join(tmp, '.saboteur/state/attack.json'), 'utf8'));
    expect(Object.keys(state.records)).toEqual(['M01']);

    // Resume over M01,M02: M01 kept, only M02 runs.
    const s2 = path.join(tmp, 's2.json');
    fs.writeFileSync(s2, JSON.stringify({ steps: [run('passed', 0)] }));
    process.env.SCRIPTED_KANE = s2;
    await cmdAttack(cfg, { only: 'M01,M02', resume: true });
    const runs = fs
      .readFileSync(`${s2}.argv.log`, 'utf8')
      .split('\n')
      .filter((l) => l.startsWith('testrun run'));
    expect(runs).toHaveLength(1);
    const report = JSON.parse(fs.readFileSync(path.join(tmp, 'reports/latest/report.json'), 'utf8'));
    expect(report.mutants.map((m: { id: string; verdictBefore: string }) => [m.id, m.verdictBefore])).toEqual(
      [
        ['M01', 'killed'],
        ['M02', 'survived'],
      ],
    );
  }, 120_000);
});
