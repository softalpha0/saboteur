import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MutantProposer, Proposal } from '@saboteur/agent';
import { loadManifest, nextMutantId } from '@saboteur/mutator';
import { afterAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.ts';
import { cmdMutate } from '../src/mutate.ts';

// S4 end to end with real copy/patch/build, a stub in place of Claude and a scripted stand-in for
// kane-cli (no credits). Checks the keep rule: applies, builds, Kane check passes on bug AND fails on clean.

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-mutate-'));
const saved = { ...process.env };
afterAll(() => {
  process.env = saved;
});

const p = (over: Partial<Proposal>): Proposal => ({
  title: 'Mug price typo',
  category: 'display',
  userImpact: 'Mug shows the wrong price',
  file: 'src/data/products.ts',
  find: 'priceCents: 1450',
  replace: 'priceCents: 1540',
  kaneCheck: 'Open the home page and verify the Ceramic Mug shows $15.40',
  ...over,
});

describe('saboteur mutate --ai', () => {
  it('keeps only proposals Kane proves visible; writes patch + manifest entry with source ai', async () => {
    fs.cpSync(path.join(repo, 'apps/shop/mutations'), path.join(tmp, 'mutations'), { recursive: true });
    // The real catalog grows over time (earlier duels add AI bugs), so expected ids are relative to it.
    const existing = loadManifest(path.join(tmp, 'mutations/manifest.json'));
    const id = nextMutantId(existing);
    const existingIds = new Set(existing.mutants.map((x) => x.id));
    const aiDir = path.join(tmp, 'mutations/ai');
    const aiBefore = fs.existsSync(aiDir) ? fs.readdirSync(aiDir).length : 0;
    fs.mkdirSync(path.join(tmp, 'tests/kane/starter'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, 'saboteur.config.json'),
      JSON.stringify({
        app: {
          dir: path.join(repo, 'apps/shop'),
          build: 'vite build',
          serve: 'vite preview --port 4183 --strictPort',
          url: 'http://localhost:4183',
          routes: path.join(repo, 'apps/shop/ROUTES.md'),
        },
        mutations: { manifest: path.join(tmp, 'mutations/manifest.json') },
        workDir: path.join(tmp, 'work'),
      }),
    );
    const script = path.join(tmp, 'script.json');
    const end = (status: string, exit: number) => ({
      exit,
      lines: [{ type: 'run_end', status, one_liner: status }],
    });
    // proposal 1: bug passed, clean failed -> kept. proposal 2: dropped locally. proposal 3: passes on both -> dropped.
    fs.writeFileSync(
      script,
      JSON.stringify({ steps: [end('passed', 0), end('failed', 1), end('passed', 0), end('passed', 0)] }),
    );
    process.env.KANE_CLI_BIN = path.join(here, 'fixtures/scripted-kane.mjs');
    process.env.SCRIPTED_KANE = script;

    const proposals = [
      p({}),
      p({ title: 'Ambiguous', find: 'inStock: true' }),
      p({
        title: 'Apron price typo',
        find: 'priceCents: 3499',
        replace: 'priceCents: 3449',
        kaneCheck: 'Open the home page',
      }),
    ];
    const stub = {
      model: 'stub',
      propose: async () => ({ raw: '{}', prompt: 'p', proposals, problems: [] }),
    } as unknown as MutantProposer;

    const code = await cmdMutate(loadConfig(path.join(tmp, 'saboteur.config.json')), {
      count: 3,
      proposer: stub,
    });
    expect(code).toBe(0);

    const m = loadManifest(path.join(tmp, 'mutations/manifest.json'));
    const added = m.mutants.filter((x) => !existingIds.has(x.id));
    expect(added.map((x) => [x.id, x.title, x.patch, x.source])).toEqual([
      [id, 'Mug price typo', `ai/${id}-mug-price-typo.patch`, 'ai'],
    ]);
    const patch = fs.readFileSync(path.join(aiDir, `${id}-mug-price-typo.patch`), 'utf8');
    expect(patch).toContain('+++ b/src/data/products.ts');
    expect(fs.readdirSync(aiDir)).toHaveLength(aiBefore + 1);

    const runs = fs
      .readFileSync(`${script}.argv.log`, 'utf8')
      .split('\n')
      .filter((l) => l.startsWith('run '));
    expect(runs).toHaveLength(4);
    expect(runs[0]).toContain('verify the Ceramic Mug shows $15.40');
    expect(runs[0]).toContain('--url http://localhost:4183');
  }, 180_000);
});
