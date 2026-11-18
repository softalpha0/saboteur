import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.ts';
import { provenFiles } from '../src/doctor.ts';
import { suites } from '../src/suite.ts';

describe('generated tests: proof records and quarantine', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-proven-'));
  for (const d of [
    'tests/kane/starter',
    'tests/kane/generated',
    'tests/kane/quarantine',
    'evidence/runs/r1',
  ]) {
    fs.mkdirSync(path.join(tmp, d), { recursive: true });
  }
  fs.writeFileSync(path.join(tmp, 'tests/kane/starter/a_test.md'), '## A\nVerify A.\n');
  fs.writeFileSync(path.join(tmp, 'tests/kane/generated/g1_test.md'), '## G\nVerify G.\n');
  fs.writeFileSync(path.join(tmp, 'tests/kane/generated/g2_test.md'), '## G\nVerify G.\n');
  fs.writeFileSync(path.join(tmp, 'tests/kane/quarantine/flaky_test.md'), '## F\nVerify F.\n');
  fs.writeFileSync(path.join(tmp, 'saboteur.config.json'), '{}');
  fs.writeFileSync(
    path.join(tmp, 'evidence/runs/r1/fill-M01.md'),
    '**Decision:** accepted. Saved `tests/kane/generated/g1_test.md` and its Kane recording.\n',
  );
  fs.writeFileSync(
    path.join(tmp, 'tests/kane/generated/proven.json'),
    JSON.stringify([{ file: 'g2_test.md' }]),
  );

  it('quarantine folders are not part of any suite', () => {
    const s = suites(path.join(tmp, 'tests/kane'), path.join(tmp, 'tests/kane/generated'));
    expect(s.all.map((f) => path.basename(f))).toEqual(['a_test.md', 'g1_test.md', 'g2_test.md']);
  });

  it('proof comes from proven.json and from accepted decisions in fill transcripts', () => {
    const cfg = loadConfig(path.join(tmp, 'saboteur.config.json'));
    expect([...provenFiles(cfg)].sort()).toEqual(['g1_test.md', 'g2_test.md']);
  });
});
