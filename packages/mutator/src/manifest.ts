import fs from 'node:fs';
import path from 'node:path';

export type Mutant = {
  id: string;
  title: string;
  category: string;
  patch: string;
  userImpact: string;
  where: string;
  source?: 'hand' | 'ai';
};

export type Manifest = {
  version: number;
  app: string;
  mutants: Mutant[];
  /** Absolute folder holding the manifest and its patches. */
  dir: string;
};

export function loadManifest(manifestPath: string): Manifest {
  const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Omit<Manifest, 'dir'>;
  if (!Array.isArray(raw.mutants)) throw new Error(`${manifestPath}: "mutants" must be an array`);
  const ids = new Set<string>();
  for (const m of raw.mutants) {
    if (!m.id || !m.patch || !m.title)
      throw new Error(`${manifestPath}: every mutant needs id, title and patch`);
    if (ids.has(m.id)) throw new Error(`${manifestPath}: duplicate mutant id ${m.id}`);
    ids.add(m.id);
  }
  return { ...raw, dir: path.dirname(path.resolve(manifestPath)) };
}

export function patchPath(manifest: Manifest, mutant: Mutant): string {
  return path.join(manifest.dir, mutant.patch);
}

export function readDiff(manifest: Manifest, mutant: Mutant): string {
  return fs.readFileSync(patchPath(manifest, mutant), 'utf8');
}

/** Keep mutants whose id is in `only` (comma-separated, case-insensitive). */
export function selectMutants(manifest: Manifest, only?: string): Mutant[] {
  if (!only) return manifest.mutants;
  const want = new Set(
    only
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
  );
  const picked = manifest.mutants.filter((m) => want.has(m.id.toUpperCase()));
  const missing = [...want].filter((id) => !picked.some((m) => m.id.toUpperCase() === id));
  if (missing.length) throw new Error(`unknown mutant id(s): ${missing.join(', ')}`);
  return picked;
}
