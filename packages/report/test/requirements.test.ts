import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  type Report,
  coverageSummary,
  loadRequirements,
  renderHtml,
  renderMarkdown,
  requirementCoverage,
  score,
} from '../src/index.ts';

// Sample data for the coverage logic only, not a real run.
const rec = (verdict: 'killed' | 'survived' | 'error') => ({
  verdict,
  reason: verdict,
  exitCode: verdict === 'killed' ? 1 : 0,
  caughtBy: [],
  links: [],
  evidencePacks: [],
  durationS: 1,
  retried: false,
  suite: [],
});
const mut = (id: string, b: 'killed' | 'survived' | 'error', a: 'killed' | 'survived' | 'error') => ({
  id,
  title: id,
  category: 'x',
  userImpact: 'x',
  verdictBefore: b,
  verdictAfter: a,
  before: rec(b),
  after: rec(a),
});
const mutants = [
  mut('M01', 'survived', 'killed'),
  mut('M02', 'killed', 'killed'),
  mut('M03', 'error', 'error'),
];
const report: Report = {
  runId: 'r',
  startedAt: '',
  finishedAt: '',
  mode: 'live',
  app: 'apps/shop',
  appUrl: 'http://localhost:4173',
  suiteBefore: ['a'],
  suiteAfter: ['a', 'b'],
  baseline: { exitCode: 0, links: [], rawLog: '', authored: 0, durationS: 1 },
  before: score(mutants.map((m) => m.verdictBefore)),
  after: score(mutants.map((m) => m.verdictAfter)),
  mutants,
  generatedTests: [],
  evidenceDir: '/tmp',
};
const reqs = [
  { id: 'R1', text: 'Total is right', mutants: ['M01', 'M02'] },
  { id: 'R2', text: 'Plus works', mutants: ['M02'] },
  { id: 'R3', text: 'Email checked', mutants: ['M03'] },
  { id: 'R4', text: 'Nothing planted', mutants: [] },
  { id: 'R5', text: 'Bug not in this run', mutants: ['M99'] },
];

describe('requirement coverage', () => {
  it('a rule breaks silently if any of its bugs slipped, is guarded if all were caught', () => {
    const rows = requirementCoverage(report, reqs);
    expect(rows.map((r) => [r.id, r.before, r.after])).toEqual([
      ['R1', 'silent', 'guarded'],
      ['R2', 'guarded', 'guarded'],
      ['R3', 'unknown', 'unknown'],
      ['R4', 'untested', 'untested'],
      ['R5', 'untested', 'untested'],
    ]);
    expect(coverageSummary(rows)).toEqual({
      total: 5,
      planted: 3,
      silentBefore: 1,
      silentAfter: 0,
      untested: 2,
    });
  });

  it('shows up in the markdown and HTML reports', () => {
    const r = { ...report, requirements: requirementCoverage(report, reqs) };
    const md = renderMarkdown(r, '/tmp');
    expect(md).toContain('## Requirement coverage');
    expect(md).toContain('**1 of 3**');
    expect(md).toContain('| Total is right | M01, M02 | breaks silently | guarded |');
    const html = renderHtml(r, '/tmp');
    expect(html).toContain('Requirement coverage');
    expect(html).toContain('no bug planted');
  });

  it('every requirement file in the repo is valid and names only real bugs', () => {
    const root = path.resolve(__dirname, '../../..');
    for (const app of ['apps/shop', 'apps/todomvc']) {
      const loaded = loadRequirements(path.join(root, app, 'mutations/requirements.json'));
      expect(loaded?.length).toBeGreaterThan(0);
      const manifest = JSON.parse(fs.readFileSync(path.join(root, app, 'mutations/manifest.json'), 'utf8'));
      const ids = new Set<string>(manifest.mutants.map((m: { id: string }) => m.id));
      // The shop's M11 to M13 come from a duel and live in the owner's catalog.
      const known = (id: string) =>
        ids.has(id) || (app === 'apps/shop' && ['M11', 'M12', 'M13'].includes(id));
      for (const r of loaded ?? [])
        for (const id of r.mutants) expect(known(id), `${app} ${r.id} ${id}`).toBe(true);
    }
    expect(loadRequirements(path.join(os.tmpdir(), 'nope.json'))).toBeUndefined();
  });
});
