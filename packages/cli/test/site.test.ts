import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AttackRecord, Report } from '@saboteur/report';
import { score } from '@saboteur/report';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.ts';
import { cmdSite, mergeReports } from '../src/site.ts';

// Sample data for the site builder only, not a real run.
const rec = (verdict: AttackRecord['verdict'], file?: string): AttackRecord => ({
  verdict,
  reason: verdict,
  exitCode: verdict === 'killed' ? 1 : 0,
  caughtBy: file ? [{ file, message: 'assertion_failed: @ step 3' }] : [],
  links: [],
  rawLog: '/home/someone/secret/evidence/runs/x/kane.ndjson',
  evidencePacks: [],
  durationS: 1,
  retried: false,
  suite: [],
});
const report = (runId: string, mutants: Report['mutants'], mode: Report['mode'] = 'replay'): Report => ({
  runId,
  startedAt: '',
  finishedAt: '',
  mode,
  app: 'apps/shop',
  appUrl: 'http://localhost:4173',
  suiteBefore: ['a', 'b', 'c', 'd'],
  suiteAfter: ['a', 'b', 'c', 'd', 'e'],
  baseline: { exitCode: 0, links: [], rawLog: '', authored: 0, durationS: 1 },
  before: score(mutants.map((m) => m.verdictBefore)),
  after: score(mutants.map((m) => m.verdictAfter)),
  mutants,
  generatedTests: [],
  evidenceDir: '/home/someone/secret/evidence',
});
const mut = (id: string, b: AttackRecord, a?: AttackRecord) => ({
  id,
  title: `Bug ${id}`,
  category: 'x',
  userImpact: 'y',
  verdictBefore: b.verdict,
  verdictAfter: a?.verdict ?? b.verdict,
  before: b,
  after: a,
});

describe('saboteur site', () => {
  const main = report('run-1', [
    mut('M01', rec('survived'), rec('killed', 'e_test.md')),
    mut('M07', rec('survived'), rec('error')),
  ]);
  const extra = report('run-2', [mut('M07', rec('killed', 'beanie_test.md'))], 'attack-only');

  it('mergeReports fills only missing verdicts and records where they came from', () => {
    const { report: r, filledFrom } = mergeReports(main, [extra]);
    expect(r.mutants.map((m) => [m.id, m.verdictAfter])).toEqual([
      ['M01', 'killed'],
      ['M07', 'killed'],
    ]);
    expect(r.after).toMatchObject({ killed: 2, errors: 0 });
    expect(filledFrom).toEqual({ M07: 'run-2' });
  });

  it('writes a public site without local paths', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-site-'));
    fs.writeFileSync(path.join(tmp, 'saboteur.config.json'), '{}');
    fs.mkdirSync(path.join(tmp, 'reports'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'reports/main.json'), JSON.stringify(main));
    fs.writeFileSync(path.join(tmp, 'reports/extra.json'), JSON.stringify(extra));
    const code = await cmdSite(loadConfig(path.join(tmp, 'saboteur.config.json')), {
      report: 'reports/main.json',
      merge: ['reports/extra.json'],
      repo: 'https://github.com/example/saboteur',
    });
    expect(code).toBe(0);
    const index = fs.readFileSync(path.join(tmp, 'site/index.html'), 'utf8');
    const rep = fs.readFileSync(path.join(tmp, 'site/report.html'), 'utf8');
    expect(index).toContain('0/2');
    expect(index).toContain('2/2');
    expect(index).toContain('Verdicts for M07 come from a later attack run');
    expect(index).toContain('https://github.com/example/saboteur');
    expect(rep + index).not.toContain('/home/someone/secret');
    expect(rep).not.toContain('>log<');
    expect(fs.existsSync(path.join(tmp, 'site/.nojekyll'))).toBe(true);
  });

  it('publishes a second app with its own card and report page', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-site2-'));
    fs.writeFileSync(path.join(tmp, 'saboteur.config.json'), '{}');
    fs.mkdirSync(path.join(tmp, 'reports'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'reports/main.json'), JSON.stringify(main));
    const todo = report('todo-run', [mut('M01', rec('survived'), rec('killed', 'counter_test.md'))], 'live');
    fs.writeFileSync(path.join(tmp, 'reports/todo.json'), JSON.stringify(todo));
    await cmdSite(loadConfig(path.join(tmp, 'saboteur.config.json')), {
      report: 'reports/main.json',
      todomvc: 'reports/todo.json',
    });
    const index = fs.readFileSync(path.join(tmp, 'site/index.html'), 'utf8');
    expect(index).toContain("React TodoMVC, an app we didn't write");
    expect(index).toContain('todomvc/report.html');
    expect(index).toContain('todo-run');
    const rep = fs.readFileSync(path.join(tmp, 'site/todomvc/report.html'), 'utf8');
    expect(rep).not.toContain('/home/someone/secret');
  });
});
