import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { type Report, score } from '@saboteur/report';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.ts';
import { evidenceAdd, scrubPaths, verifyEvidence } from '../src/evidence.ts';

// Sample data for the evidence checker only, not a real run.
type V = 'killed' | 'survived' | 'error';
const rec = (verdict: V) => ({
  verdict,
  reason: verdict,
  exitCode: verdict === 'killed' ? 1 : 0,
  caughtBy: [],
  links: [],
  rawLog: 'C:\\Users\\someone\\saboteur\\evidence\\runs\\r1\\kane.ndjson',
  evidencePacks: [],
  durationS: 1,
  retried: false,
  suite: [],
});
const mut = (id: string, b: V, a: V) => ({
  id,
  title: id,
  category: 'x',
  userImpact: 'x',
  verdictBefore: b,
  verdictAfter: a,
  before: rec(b),
  after: rec(a),
});
const make = (mutants: ReturnType<typeof mut>[], mode: Report['mode'] = 'live'): Report => ({
  runId: 'r1',
  startedAt: '',
  finishedAt: '',
  mode,
  app: 'apps/shop',
  appUrl: 'http://localhost:4173',
  suiteBefore: ['a'],
  suiteAfter: ['a', 'b'],
  baseline: { exitCode: 0, links: [], rawLog: '/home/someone/x.ndjson', authored: 0, durationS: 1 },
  before: score(mutants.map((m) => m.verdictBefore)),
  after: score(mutants.map((m) => m.verdictAfter)),
  mutants,
  generatedTests: [],
  evidenceDir: 'C:\\Users\\someone\\saboteur\\evidence\\runs\\r1',
});

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-evidence-'));
  fs.writeFileSync(path.join(root, 'saboteur.config.json'), '{}');
  fs.mkdirSync(path.join(root, 'evidence'), { recursive: true });
  fs.mkdirSync(path.join(root, 'apps/shop/mutations'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'apps/shop/mutations/requirements.json'),
    JSON.stringify({ requirements: [{ id: 'R1', text: 'rule', mutants: ['M01', 'M02'] }] }),
  );
  fs.writeFileSync(
    path.join(root, 'evidence/manifest.json'),
    JSON.stringify({
      version: 1,
      files: {},
      claims: [
        { id: 'b', text: 'before', kind: 'score', file: 'run', side: 'before', expect: '0/2' },
        {
          id: 'a',
          text: 'after',
          kind: 'score',
          file: 'run',
          merge: ['attack'],
          side: 'after',
          expect: '2/2',
        },
        {
          id: 'r',
          text: 'rules',
          kind: 'rules',
          file: 'run',
          merge: ['attack'],
          requirements: 'apps/shop/mutations/requirements.json',
          expect: '1 of 1 -> 0 of 1',
        },
      ],
    }),
  );
  const run = path.join(root, 'run.json');
  const attack = path.join(root, 'attack.json');
  fs.writeFileSync(
    run,
    JSON.stringify(make([mut('M01', 'survived', 'killed'), mut('M02', 'survived', 'error')])),
  );
  fs.writeFileSync(attack, JSON.stringify(make([mut('M02', 'killed', 'killed')], 'attack-only')));
  const cfg = loadConfig(path.join(root, 'saboteur.config.json'));
  evidenceAdd(cfg, run, 'run');
  evidenceAdd(cfg, attack, 'attack');
  return root;
}

describe('evidence and verify', () => {
  it('recomputes every claim from the committed files and checks their sha256', () => {
    const root = setup();
    const v = verifyEvidence(root);
    expect(v.files.every((f) => f.ok)).toBe(true);
    expect(v.rows.map((r) => [r.id, r.actual, r.ok])).toEqual([
      ['b', '0/2', true],
      ['a', '2/2', true],
      ['r', '1 of 1 -> 0 of 1', true],
    ]);
  });

  it('removes local paths before the file is committed', () => {
    const root = setup();
    const text = fs.readFileSync(path.join(root, 'evidence/data/run.json'), 'utf8');
    expect(text).not.toContain('someone');
    expect(text).toContain('…/evidence/runs/r1/kane.ndjson');
    expect(scrubPaths({ a: '/home/me/x/y.json', b: 'plain' })).toEqual({ a: '…/y.json', b: 'plain' });
  });

  it('fails when a file is edited after it was sealed', () => {
    const root = setup();
    const f = path.join(root, 'evidence/data/run.json');
    fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('"survived"', '"killed"'));
    const v = verifyEvidence(root);
    expect(v.files.find((x) => x.key === 'run')?.ok).toBe(false);
  });
});
