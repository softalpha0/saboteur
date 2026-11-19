import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkPatch, cleanup, loadManifest, prepare } from '../src/index.ts';

// The second target app (TodoMVC, React, from tastejs/todomvc): every bug patch applies to an
// unchanged copy, and the clean app and one mutant build. No Kane, no credits.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const appDir = path.join(root, 'apps/todomvc');
const manifest = loadManifest(path.join(appDir, 'mutations/manifest.json'));
const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-todomvc-'));
const log = path.join(workRoot, 'build.log');

describe('TodoMVC target', () => {
  it('has 10 hand-written bugs, each with a patch file', () => {
    expect(manifest.mutants.map((m) => m.id)).toEqual(
      Array.from({ length: 10 }, (_, i) => `M${String(i + 1).padStart(2, '0')}`),
    );
    for (const m of manifest.mutants) expect(fs.existsSync(path.join(manifest.dir, m.patch))).toBe(true);
  });

  it('every patch applies to a fresh copy', async () => {
    for (const m of manifest.mutants) {
      const r = await checkPatch(appDir, manifest, m, workRoot);
      expect(r.code, `${m.id}: ${r.output}`).toBe(0);
    }
  }, 60_000);

  it('the clean app and a mutant build, and the mutant changes the bundle', async () => {
    const clean = await prepare({ appDir, buildCmd: 'vite build', workRoot, logFile: log });
    const m = manifest.mutants.find((x) => x.id === 'M02');
    const bug = await prepare({
      appDir,
      buildCmd: 'vite build',
      workRoot,
      manifest,
      mutant: m,
      logFile: log,
    });
    const js = (dir: string) => {
      const assets = path.join(dir, 'dist/assets');
      return fs.readFileSync(
        path.join(assets, fs.readdirSync(assets).find((f) => f.endsWith('.js')) ?? ''),
        'utf8',
      );
    };
    expect(js(clean.dir)).not.toEqual(js(bug.dir));
    await cleanup(workRoot);
  }, 120_000);
});
