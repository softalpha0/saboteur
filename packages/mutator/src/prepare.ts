import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runFile, runShell } from './exec.ts';
import { type Manifest, type Mutant, patchPath } from './manifest.ts';

export type PrepareOptions = {
  /** The real app source. Never modified. */
  appDir: string;
  buildCmd: string;
  /** Where copies go. Default: <os tmp>/saboteur-work. Kept outside the repo so git apply works like patch. */
  workRoot?: string;
  manifest?: Manifest;
  mutant?: Mutant;
  logFile: string;
};

export class PrepareError extends Error {
  constructor(
    readonly stage: 'copy' | 'patch' | 'build',
    message: string,
    readonly output: string,
  ) {
    super(message);
  }
}

const SKIP = new Set(['node_modules', 'dist', '.vite', 'mutations']);

export function defaultWorkRoot(): string {
  return path.join(os.tmpdir(), 'saboteur-work');
}

/** git, but blind to any repository above `dir`, so `git apply` patches relative to `dir`. */
export function gitOutsideRepo(args: string[], dir: string) {
  return runFile('git', args, dir, { ...process.env, GIT_CEILING_DIRECTORIES: path.dirname(dir) });
}

/** Copy the app (without node_modules/dist), link node_modules back to the real install. */
export async function copyApp(appDir: string, dest: string): Promise<void> {
  await fs.promises.rm(dest, { recursive: true, force: true });
  await fs.promises.mkdir(dest, { recursive: true });
  await fs.promises.cp(appDir, dest, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(appDir, src);
      if (!rel) return true;
      return !SKIP.has(rel.split(path.sep)[0] ?? '');
    },
  });
  const realModules = path.join(appDir, 'node_modules');
  if (fs.existsSync(realModules)) {
    // 'junction' works on Windows without admin rights; ignored on macOS/Linux.
    await fs.promises.symlink(realModules, path.join(dest, 'node_modules'), 'junction');
  }
}

/** Copy, apply the mutant patch (if any) and build. Returns the folder that holds the build. */
export async function prepare(opts: PrepareOptions): Promise<{ dir: string }> {
  const name = opts.mutant ? opts.mutant.id : 'clean';
  const dir = path.join(opts.workRoot ?? defaultWorkRoot(), name);

  try {
    await copyApp(opts.appDir, dir);
  } catch (err) {
    throw new PrepareError('copy', `could not copy ${opts.appDir}`, String(err));
  }

  if (opts.mutant) {
    if (!opts.manifest) throw new Error('prepare: a mutant needs its manifest');
    const patch = patchPath(opts.manifest, opts.mutant);
    const check = await gitOutsideRepo(['apply', '--check', patch], dir);
    if (check.code !== 0)
      throw new PrepareError('patch', `${opts.mutant.id}: patch does not apply`, check.output);
    const applied = await gitOutsideRepo(['apply', patch], dir);
    if (applied.code !== 0)
      throw new PrepareError('patch', `${opts.mutant.id}: git apply failed`, applied.output);
  }

  const built = await runShell(opts.buildCmd, dir, opts.logFile);
  if (built.code !== 0) throw new PrepareError('build', `${name}: build failed`, built.output);
  return { dir };
}

/** `git apply --check` for one patch against a fresh copy of the app. Used by doctor and tests. */
export async function checkPatch(appDir: string, manifest: Manifest, mutant: Mutant, workRoot?: string) {
  const dir = path.join(workRoot ?? defaultWorkRoot(), `check-${mutant.id}`);
  await copyApp(appDir, dir);
  try {
    return await gitOutsideRepo(['apply', '--check', patchPath(manifest, mutant)], dir);
  } finally {
    await fs.promises.rm(dir, { recursive: true, force: true });
  }
}

export async function cleanup(dir: string): Promise<void> {
  await fs.promises.rm(dir, { recursive: true, force: true });
}
