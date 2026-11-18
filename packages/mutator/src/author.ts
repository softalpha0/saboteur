import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Manifest, Mutant } from './manifest.ts';
import { copyApp, defaultWorkRoot, gitOutsideRepo } from './prepare.ts';

export type Edit = { file: string; find: string; replace: string };

/**
 * Apply one find/replace edit to a fresh copy of the app and return `git diff` of it, in the same
 * format as the hand-written patches (paths relative to the app dir, a/ b/ prefixes).
 * Line endings of the edited file are kept, so the diff touches only the changed lines.
 */
export async function makePatch(appDir: string, edit: Edit, workRoot = defaultWorkRoot()): Promise<string> {
  const dir = path.join(workRoot, `author-${crypto.randomBytes(4).toString('hex')}`);
  await copyApp(appDir, dir);
  try {
    const git = (...args: string[]) => gitOutsideRepo(['-c', 'core.autocrlf=false', ...args], dir);
    let r = await git('init', '-q');
    if (r.code !== 0) throw new Error(`git init failed: ${r.output}`);
    fs.writeFileSync(path.join(dir, '.git', 'info', 'exclude'), 'node_modules\ndist\n');
    r = await git('add', '-A');
    if (r.code !== 0) throw new Error(`git add failed: ${r.output}`);

    const file = path.join(dir, edit.file);
    const original = fs.readFileSync(file, 'utf8');
    const eol = original.includes('\r\n') ? '\r\n' : '\n';
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const src = norm(original);
    const find = norm(edit.find);
    const count = src.split(find).length - 1;
    if (count !== 1) throw new Error(`"find" occurs ${count} times in ${edit.file}`);
    const next = src.replace(find, () => norm(edit.replace));
    fs.writeFileSync(file, eol === '\n' ? next : next.replace(/\n/g, '\r\n'));

    r = await git('diff', '--no-color', '--', edit.file);
    if (r.code !== 0) throw new Error(`git diff failed: ${r.output}`);
    if (!r.output.trim()) throw new Error('the edit produced an empty diff');
    return r.output.endsWith('\n') ? r.output : `${r.output}\n`;
  } finally {
    await fs.promises.rm(dir, { recursive: true, force: true });
  }
}

/** Fingerprint of a build folder (paths + bytes). Used to reject edits that change nothing in the build. */
export function hashDir(dir: string): string {
  const h = crypto.createHash('sha1');
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else {
        h.update(path.relative(dir, p).split(path.sep).join('/'));
        h.update(fs.readFileSync(p));
      }
    }
  };
  walk(dir);
  return h.digest('hex');
}

/** Next free id: M11 after M10, and so on. Ids are never reused (AGENTS.md §6.7). */
export function nextMutantId(manifest: Pick<Manifest, 'mutants'>, offset = 0): string {
  const max = manifest.mutants.reduce((n, m) => Math.max(n, Number(m.id.match(/^M(\d+)$/)?.[1] ?? 0)), 0);
  return `M${String(max + 1 + offset).padStart(2, '0')}`;
}

export function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'bug'
  );
}

/** Append a mutant to manifest.json, keeping everything already in it. */
export function appendToManifest(manifestPath: string, mutant: Mutant & Record<string, unknown>): void {
  const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { mutants: unknown[] };
  if ((raw.mutants as Mutant[]).some((m) => m.id === mutant.id))
    throw new Error(`mutant id ${mutant.id} already in the manifest`);
  raw.mutants.push(mutant);
  fs.writeFileSync(manifestPath, `${JSON.stringify(raw, null, 2)}\n`);
}

const SOURCE = /\.(ts|tsx|js|jsx|mjs|vue|svelte)$/;

/** App source files to show Claude (src/ only, no tests), capped so the prompt stays a sensible size. */
export function listSourceFiles(appDir: string, maxBytes = 200_000): { path: string; content: string }[] {
  const out: { path: string; content: string }[] = [];
  let total = 0;
  const walk = (d: string) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (['node_modules', 'dist', '__tests__', 'test', 'tests'].includes(e.name)) continue;
        walk(p);
      } else if (SOURCE.test(e.name) && !/\.(test|spec)\./.test(e.name)) {
        const content = fs.readFileSync(p, 'utf8');
        if (total + content.length > maxBytes) continue;
        total += content.length;
        out.push({ path: path.relative(appDir, p).split(path.sep).join('/'), content });
      }
    }
  };
  walk(path.join(appDir, 'src'));
  return out;
}
