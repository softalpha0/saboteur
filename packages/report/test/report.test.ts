import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  type AttackRecord,
  type Report,
  renderMarkdown,
  score,
  scoreText,
  writeReport,
} from '../src/index.ts';

// Sample data for the renderer only. Not a real run; never copy these numbers anywhere public.
const rec = (over: Partial<AttackRecord>): AttackRecord => ({
  verdict: 'survived',
  reason: 'every test passed on the bugged build',
  exitCode: 0,
  caughtBy: [],
  links: [],
  evidencePacks: [],
  durationS: 10,
  retried: false,
  suite: ['a_test.md'],
  ...over,
});

const sample = (root: string): Report => ({
  runId: 'sample',
  startedAt: '2026-01-01T00:00:00Z',
  finishedAt: '2026-01-01T00:10:00Z',
  mode: 'live',
  kaneCliVersion: '0.10.5',
  app: 'apps/shop',
  appUrl: 'http://localhost:4173',
  suiteBefore: ['a_test.md'],
  suiteAfter: ['a_test.md', 'b_test.md'],
  baseline: {
    exitCode: 0,
    executionId: 'base',
    links: [],
    rawLog: path.join(root, 'evidence/kane-baseline.ndjson'),
    authored: 0,
    durationS: 5,
  },
  before: score(['killed', 'survived', 'error']),
  after: score(['killed', 'killed', 'error']),
  mutants: [
    {
      id: 'M01',
      title: 'Total | skips last',
      category: 'maths',
      userImpact: 'x',
      verdictBefore: 'killed',
      verdictAfter: 'killed',
      before: rec({
        verdict: 'killed',
        exitCode: 1,
        caughtBy: [{ file: 'a_test.md', message: 'Final verification failed: "total"' }],
        links: ['https://example.invalid/e1'],
      }),
    },
    {
      id: 'M03',
      title: 'SAVE10 1%',
      category: 'maths',
      userImpact: 'x',
      verdictBefore: 'survived',
      verdictAfter: 'killed',
      closedBy: 'fill',
      before: rec({}),
      after: rec({
        verdict: 'killed',
        exitCode: 1,
        caughtBy: [{ file: 'b_test.md', message: 'Total mismatch' }],
      }),
      fill: {
        attempts: 2,
        accepted: true,
        testFile: 'tests/kane/generated/b_test.md',
        transcript: path.join(root, 'evidence/fill-M03.md'),
        history: [
          {
            n: 1,
            decision: 'fails-on-clean',
            clean: { exitCode: 1, failureText: 'expected $54.00', rawLog: 'x' },
          },
          {
            n: 2,
            decision: 'accepted',
            clean: { exitCode: 0, rawLog: 'x' },
            mutant: { exitCode: 1, rawLog: 'y' },
          },
        ],
      },
    },
    {
      id: 'M05',
      title: 'Email',
      category: 'validation',
      userImpact: 'x',
      verdictBefore: 'error',
      verdictAfter: 'error',
      before: rec({ verdict: 'error', exitCode: 2, reason: 'Kane exit 2: auth' }),
    },
  ],
  generatedTests: ['tests/kane/generated/b_test.md'],
  evidenceDir: path.join(root, 'evidence'),
});

describe('score', () => {
  it('excludes errors from the denominator', () => {
    const s = score(['killed', 'survived', 'error', 'invalid', 'rejected', 'killed']);
    expect(s).toEqual({ killed: 2, survived: 1, errors: 1, invalid: 1, rejected: 1 });
    expect(scoreText(s)).toBe('2/3 caught');
  });
});

describe('renderMarkdown + writeReport', () => {
  it('renders scores, table, fill history and exclusions; writes run + latest', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-report-'));
    const report = sample(root);
    const md = renderMarkdown(report, path.join(root, 'reports/sample'));
    expect(md).toContain('**Before: 1/2 caught**');
    expect(md).toContain('**After: 2/2 caught**');
    expect(md).toContain('Total \\| skips last');
    expect(md).toContain('[Kane 1](https://example.invalid/e1)');
    expect(md).toContain('accepted on attempt 2');
    expect(md).toContain('Kane: "expected $54.00"');
    expect(md).toContain('**M05** error: Kane exit 2: auth');
    expect(md).toContain('[Transcript](../../evidence/fill-M03.md)');

    const out = writeReport(report, path.join(root, 'reports'));
    expect(JSON.parse(fs.readFileSync(path.join(out.latest, 'report.json'), 'utf8')).runId).toBe('sample');
    expect(fs.readFileSync(path.join(out.dir, 'report.md'), 'utf8')).toContain('# Saboteur report');
  });
});
