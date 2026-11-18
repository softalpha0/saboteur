import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  appendToManifest,
  checkPatch,
  cleanup,
  hashDir,
  listSourceFiles,
  loadManifest,
  makePatch,
  nextMutantId,
  prepare,
  selectMutants,
  serve,
  slug,
} from '../src/index.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const appDir = path.join(root, 'apps/shop');
const manifest = loadManifest(path.join(appDir, 'mutations/manifest.json'));
const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-mut-'));
const log = path.join(workRoot, 'build.log');

const bundle = (dir: string) => {
  const assets = path.join(dir, 'dist/assets');
  const js = fs.readdirSync(assets).find((f) => f.endsWith('.js'));
  return fs.readFileSync(path.join(assets, js ?? ''), 'utf8');
};

describe('mutation catalog', () => {
  it('has at least 8 mutants with unique ids and existing patch files', () => {
    expect(manifest.mutants.length).toBeGreaterThanOrEqual(8);
    for (const m of manifest.mutants) expect(fs.existsSync(path.join(manifest.dir, m.patch))).toBe(true);
  });

  it('selectMutants filters by id and rejects unknown ids', () => {
    expect(selectMutants(manifest, 'm03,M01').map((m) => m.id)).toEqual(['M01', 'M03']);
    expect(() => selectMutants(manifest, 'M99')).toThrow(/M99/);
  });

  for (const m of manifest.mutants) {
    it(`${m.id} applies cleanly to a fresh copy (git apply --check)`, async () => {
      const r = await checkPatch(appDir, manifest, m, workRoot);
      expect(r.output).toBe('');
      expect(r.code).toBe(0);
    });
  }
});

describe('prepare + serve (real vite build, no Kane)', () => {
  it('clean build, then every mutant builds and changes the bundle; real source untouched', async () => {
    const before = fs.readFileSync(path.join(appDir, 'src/lib/cart.ts'), 'utf8');
    const clean = await prepare({ appDir, buildCmd: 'vite build', workRoot, logFile: log });
    const cleanJs = bundle(clean.dir);
    for (const mutant of manifest.mutants) {
      const { dir } = await prepare({
        appDir,
        buildCmd: 'vite build',
        workRoot,
        manifest,
        mutant,
        logFile: log,
      });
      expect(bundle(dir), `${mutant.id} produced the same bundle as clean`).not.toBe(cleanJs);
      await cleanup(dir);
    }
    expect(fs.readFileSync(path.join(appDir, 'src/lib/cart.ts'), 'utf8')).toBe(before);

    const server = await serve({
      dir: clean.dir,
      serveCmd: 'vite preview --port 4179 --strictPort',
      url: 'http://localhost:4179',
      logFile: log,
    });
    try {
      const html = await (await fetch('http://localhost:4179/cart')).text();
      expect(html).toContain('<div id="root">');
    } finally {
      await server.stop();
    }
    await expect(fetch('http://localhost:4179/', { signal: AbortSignal.timeout(1000) })).rejects.toThrow();
    await cleanup(clean.dir);
  }, 180_000);
});

describe('authoring AI mutants (S4 helpers)', () => {
  it('makePatch turns a find/replace edit into a patch in the hand-written format that applies', async () => {
    const patch = await makePatch(
      appDir,
      { file: 'src/data/products.ts', find: 'priceCents: 1450', replace: 'priceCents: 1540' },
      workRoot,
    );
    expect(patch).toContain('--- a/src/data/products.ts');
    expect(patch).toContain('+++ b/src/data/products.ts');
    expect(patch).toMatch(/^-.*priceCents: 1450/m);
    expect(patch).toMatch(/^\+.*priceCents: 1540/m);
    expect(patch.split('\n').filter((l) => /^[-+][^-+]/.test(l))).toHaveLength(2); // one line changed, nothing else
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-ai-m-'));
    fs.writeFileSync(path.join(dir, 'X.patch'), patch);
    const m = { id: 'X', title: 't', category: 'c', patch: 'X.patch', userImpact: 'u', where: 'w' };
    const r = await checkPatch(appDir, { ...manifest, dir, mutants: [m] }, m, workRoot);
    expect(r.code).toBe(0);
    await expect(
      makePatch(appDir, { file: 'src/data/products.ts', find: 'inStock: true', replace: 'x' }, workRoot),
    ).rejects.toThrow(/occurs/);
  });

  it('nextMutantId, slug, appendToManifest, listSourceFiles', () => {
    expect(nextMutantId({ mutants: [{ id: 'M01' }, { id: 'M10' }, { id: 'X' }] as never })).toBe('M11');
    expect(slug('"+" Button: does NOTHING!')).toBe('button-does-nothing');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-man-'));
    const mp = path.join(dir, 'manifest.json');
    fs.writeFileSync(
      mp,
      JSON.stringify({ version: 1, app: 'a', mutants: [{ id: 'M01', title: 't', patch: 'p' }] }),
    );
    appendToManifest(mp, {
      id: 'M02',
      title: 'n',
      category: 'c',
      patch: 'ai/x.patch',
      userImpact: 'u',
      where: 'w',
      source: 'ai',
      kaneCheck: 'k',
    });
    expect(loadManifest(mp).mutants.map((m) => m.id)).toEqual(['M01', 'M02']);
    expect(() =>
      appendToManifest(mp, { id: 'M02', title: 'n', category: 'c', patch: 'p', userImpact: 'u', where: 'w' }),
    ).toThrow(/already/);
    const files = listSourceFiles(appDir).map((f) => f.path);
    expect(files).toContain('src/lib/cart.ts');
    expect(files.some((f) => f.endsWith('.css') || f.includes('test'))).toBe(false);
  });

  it('hashDir changes when a file changes', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-hash-'));
    fs.writeFileSync(path.join(dir, 'a.js'), '1');
    const h1 = hashDir(dir);
    fs.writeFileSync(path.join(dir, 'a.js'), '2');
    expect(hashDir(dir)).not.toBe(h1);
  });
});
