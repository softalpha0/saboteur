import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { PostWriter } from '@saboteur/agent';
import { postProblems } from '@saboteur/agent';
import { type Report, gate, renderPrComment, score } from '@saboteur/report';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.ts';
import { cmdGate } from '../src/gate.ts';
import { cmdPost, postFacts, templatePosts } from '../src/post.ts';

// Sample data for the gate, PR comment and post writer only, not a real run.
type V = 'killed' | 'survived' | 'error';
const rec = (verdict: V, file?: string) => ({
  verdict,
  reason: verdict === 'error' ? 'browser_disconnected' : verdict,
  exitCode: verdict === 'killed' ? 1 : 0,
  caughtBy: file ? [{ file, message: 'assertion_failed: @ step 3' }] : [],
  links: file ? ['https://kane.example/run/1'] : [],
  evidencePacks: [],
  durationS: 1,
  retried: false,
  suite: [],
});
const mut = (id: string, b: V, a: V) => ({
  id,
  title: `Bug ${id}`,
  category: 'x',
  userImpact: `Customer impact ${id}`,
  verdictBefore: b,
  verdictAfter: a,
  before: rec(b, b === 'killed' ? 'a_test.md' : undefined),
  after: rec(a, a === 'killed' ? 'b_test.md' : undefined),
});
const make = (mutants: ReturnType<typeof mut>[], mode: Report['mode'] = 'live'): Report => ({
  runId: 'run-1',
  startedAt: '',
  finishedAt: '',
  mode,
  kaneCliVersion: '0.10.5',
  app: 'apps/shop',
  appUrl: 'http://localhost:4173',
  suiteBefore: ['a', 'b', 'c', 'd'],
  suiteAfter: ['a', 'b', 'c', 'd', 'e', 'f'],
  baseline: { exitCode: 0, links: [], rawLog: '', authored: 0, durationS: 1 },
  before: score(mutants.map((m) => m.verdictBefore)),
  after: score(mutants.map((m) => m.verdictAfter)),
  mutants,
  generatedTests: [],
  evidenceDir: '/tmp',
});

describe('gate', () => {
  it('signs off only when enough planted bugs are caught, and blocks on errors by default', () => {
    const all = make([mut('M01', 'survived', 'killed'), mut('M02', 'killed', 'killed')]);
    expect(gate(all, { minScore: 100 }).pass).toBe(true);

    const attack = make([mut('M01', 'survived', 'survived'), mut('M02', 'killed', 'killed')], 'attack-only');
    const g = gate(attack, { minScore: 100 });
    expect(g.pass).toBe(false);
    expect(g.slipped.map((m) => m.id)).toEqual(['M01']);
    expect(gate(attack, { minScore: 50 }).pass).toBe(true);

    const withError = make([mut('M01', 'killed', 'killed'), mut('M02', 'error', 'error')]);
    expect(gate(withError, { minScore: 100 }).pass).toBe(false);
    const allowed = gate(withError, { minScore: 100, allowErrors: true });
    expect(allowed.pass).toBe(true);
    expect(allowed.caught).toBe(1); // the error is never counted as caught
  });

  it('writes a PR comment with what would ship unnoticed and the Kane run behind each catch', () => {
    const r = make([mut('M01', 'survived', 'survived'), mut('M02', 'killed', 'killed')], 'attack-only');
    const md = renderPrComment(r, { minScore: 100, reportUrl: 'https://ci.example/run' });
    expect(md).toContain('⛔ Saboteur: not safe to merge (1/2');
    expect(md).toContain('| M01 Bug M01 | Customer impact M01 |');
    expect(md).toContain('[Kane run](https://kane.example/run/1)');
    expect(md).toContain('[full report](https://ci.example/run)');
  });

  it('cmdGate exits 1 when blocked and writes the comment file', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-gate-'));
    fs.writeFileSync(path.join(tmp, 'saboteur.config.json'), '{}');
    fs.mkdirSync(path.join(tmp, 'reports/latest'), { recursive: true });
    const r = make([mut('M01', 'survived', 'survived')], 'attack-only');
    fs.writeFileSync(path.join(tmp, 'reports/latest/report.json'), JSON.stringify(r));
    const cfg = loadConfig(path.join(tmp, 'saboteur.config.json'));
    expect(await cmdGate(cfg, { comment: 'reports/latest/pr-comment.md' })).toBe(1);
    expect(fs.readFileSync(path.join(tmp, 'reports/latest/pr-comment.md'), 'utf8')).toContain(
      'not safe to merge',
    );
    expect(await cmdGate(cfg, { minScore: '0' })).toBe(0);
  });
});

describe('post', () => {
  const r = make([mut('M01', 'survived', 'killed'), mut('M02', 'survived', 'killed')]);

  it('template posts use only numbers from the report', () => {
    const facts = postFacts({ report: r, site: 'https://example.github.io/saboteur/' });
    const posts = templatePosts({ report: r, site: 'https://example.github.io/saboteur/' });
    expect(facts).toContain('4 starter tests caught 0/2');
    expect(posts).toContain('Now: 2/2.');
    expect(posts).not.toContain('—');
    expect(posts).toMatch(/## X \(\d+ of 280 characters\)/);
  });

  it('--merge fills bugs the main report has no verdict for, like saboteur site', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-post-merge-'));
    fs.writeFileSync(path.join(tmp, 'saboteur.config.json'), '{}');
    fs.mkdirSync(path.join(tmp, 'reports'), { recursive: true });
    const main = make([mut('M01', 'survived', 'killed'), mut('M02', 'survived', 'error')]);
    const later = make([mut('M02', 'killed', 'killed')], 'attack-only');
    fs.writeFileSync(path.join(tmp, 'reports/main.json'), JSON.stringify(main));
    fs.writeFileSync(path.join(tmp, 'reports/later.json'), JSON.stringify(later));
    const cfg = loadConfig(path.join(tmp, 'saboteur.config.json'));
    await cmdPost(cfg, { report: 'reports/main.json', merge: ['reports/later.json'], out: 'posts.md' });
    expect(fs.readFileSync(path.join(tmp, 'posts.md'), 'utf8')).toContain('Now: 2/2.');
  });

  it('a Claude post with a made-up number is rejected and the template is kept', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-post-'));
    fs.writeFileSync(path.join(tmp, 'saboteur.config.json'), '{}');
    fs.mkdirSync(path.join(tmp, 'reports/latest'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'reports/latest/report.json'), JSON.stringify(r));
    const cfg = loadConfig(path.join(tmp, 'saboteur.config.json'));
    const liar = {
      write: async (facts: string) => {
        const post = `# Saboteur\n\nIt caught 97% of bugs across 300 apps. ${'Plain words. '.repeat(40)}`;
        return { post, problems: postProblems(post, facts), attempts: 2 };
      },
    } as unknown as PostWriter;
    expect(await cmdPost(cfg, { ai: true }, liar)).toBe(0);
    const out = fs.readFileSync(path.join(tmp, 'reports/latest/posts.md'), 'utf8');
    expect(out).not.toContain('300 apps');
    expect(out).toContain('## X');

    const honest = {
      write: async (facts: string) => {
        const post = `# My tests caught 0/2\n\nWith Kane-proven tests: 2/2. ${'Plain words. '.repeat(40)}`;
        return { post, problems: postProblems(post, facts), attempts: 1 };
      },
    } as unknown as PostWriter;
    await cmdPost(cfg, { ai: true }, honest);
    expect(fs.readFileSync(path.join(tmp, 'reports/latest/posts.md'), 'utf8')).toContain(
      'With Kane-proven tests: 2/2.',
    );
  });

  it('postProblems flags unknown numbers, em dashes and hype words', () => {
    const facts = '- caught 0/10, then 10/10';
    expect(postProblems(`caught 0/10 then 10/10 ${'x'.repeat(400)}`, facts)).toEqual([]);
    expect(postProblems(`caught 7 of 10 — a seamless win ${'x'.repeat(400)}`, facts)).toEqual([
      'numbers not in the facts: 7',
      'contains an em dash',
      'hype words: seamless',
    ]);
  });
});
