import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { type Report, coverageSummary, scoreText } from '@saboteur/report';
import pc from 'picocolors';
import type { Resolved } from './config.ts';
import type { DuelReport } from './duel.ts';
import { attachRequirements } from './requirements.ts';
import { mergeReports } from './site.ts';
import { ui } from './ui.ts';

/**
 * Committed evidence, checkable by anyone with no Kane login and no credits:
 *   evidence/manifest.json   the files (with sha256) and every headline claim
 *   evidence/data/*.json     the real report.json / duel.json files, local paths removed
 * `saboteur verify` checks every file's sha256 and recomputes every claim from the files.
 */

export type ClaimKind = 'score' | 'rules' | 'duel';

export type Claim = {
  id: string;
  text: string;
  kind: ClaimKind;
  /** File key of the report (score, rules) or the duel (duel). */
  file: string;
  /** Attack reports that fill in bugs the main report has no verdict for (as in `saboteur site`). */
  merge?: string[];
  side?: 'before' | 'after';
  /** requirements.json, relative to the repo root (rules claims). */
  requirements?: string;
  expect: string;
};

export type Manifest = {
  version: 1;
  about?: string;
  files: Record<string, { path: string; sha256: string; source?: string }>;
  claims: Claim[];
};

export const manifestPath = (root: string) => path.join(root, 'evidence', 'manifest.json');
const sha256 = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export function loadManifest(root: string): Manifest {
  const p = manifestPath(root);
  if (!fs.existsSync(p)) throw new Error(`no evidence manifest at ${p}`);
  return JSON.parse(fs.readFileSync(p, 'utf8')) as Manifest;
}

/**
 * Replace absolute local paths (they name the machine and the user) with the part from the project's
 * own folders (evidence/, reports/, tests/, examples/) on, or just the file name.
 */
export function scrubPaths<T>(value: T): T {
  const abs = /^([A-Za-z]:[\\/]|\/(home|Users|root|tmp|var|private)\/)/;
  const keepFrom = ['evidence', 'reports', 'tests', 'examples'];
  const shorten = (p: string) => {
    const parts = p.split(/[\\/]+/).filter(Boolean);
    const at = parts.findIndex((x) => keepFrom.includes(x));
    return `…/${(at >= 0 ? parts.slice(at) : parts.slice(-1)).join('/')}`;
  };
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return abs.test(v) ? shorten(v) : v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object')
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(value) as T;
}

/** `saboteur evidence add <file> --as <key>`: copy a real report into evidence/data, local paths removed. */
export function evidenceAdd(cfg: Resolved, file: string, key: string): string {
  if (!/^[a-z0-9-]+$/.test(key)) throw new Error('--as must be lowercase letters, digits and dashes');
  const src = path.resolve(file);
  if (!fs.existsSync(src)) throw new Error(`no file at ${src}`);
  const data = scrubPaths(JSON.parse(fs.readFileSync(src, 'utf8')));
  const rel = `data/${key}.json`;
  const dest = path.join(cfg.root, 'evidence', rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, `${JSON.stringify(data, null, 2)}\n`);
  const m = loadManifest(cfg.root);
  m.files[key] = { path: rel, sha256: sha256(dest), source: path.basename(path.dirname(src)) };
  fs.writeFileSync(manifestPath(cfg.root), `${JSON.stringify(m, null, 2)}\n`);
  return dest;
}

const short = (s: Report['before']) => scoreText(s).replace(' caught', '');

type Row = { id: string; text: string; expect: string; actual: string; ok: boolean };

export function verifyEvidence(root: string): {
  files: { key: string; ok: boolean; why?: string }[];
  rows: Row[];
} {
  const m = loadManifest(root);
  const files = Object.entries(m.files).map(([key, f]) => {
    const p = path.join(root, 'evidence', f.path);
    if (!fs.existsSync(p)) return { key, ok: false, why: 'missing' };
    if (!f.sha256) return { key, ok: false, why: 'not sealed (no sha256)' };
    const ok = sha256(p) === f.sha256;
    return { key, ok, why: ok ? undefined : 'sha256 does not match: the file was changed' };
  });
  const read = <T>(key: string): T => {
    const f = m.files[key];
    if (!f) throw new Error(`claim refers to unknown file "${key}"`);
    return JSON.parse(fs.readFileSync(path.join(root, 'evidence', f.path), 'utf8')) as T;
  };
  const report = (c: Claim): Report =>
    mergeReports(
      read<Report>(c.file),
      (c.merge ?? []).map((k) => read<Report>(k)),
    ).report;

  const rows = m.claims.map((c): Row => {
    let actual = '';
    try {
      if (c.kind === 'score') actual = short(report(c)[c.side ?? 'after']);
      else if (c.kind === 'rules') {
        const r = attachRequirements(report(c), [path.join(root, c.requirements ?? '')]);
        if (!r.requirements?.length) actual = 'no requirements file';
        else {
          const s = coverageSummary(r.requirements);
          actual = `${s.silentBefore} of ${s.planted} -> ${s.silentAfter} of ${s.planted}`;
        }
      } else if (c.kind === 'duel') {
        const d = read<DuelReport>(c.file);
        actual = `Red ${d.score.red} : Blue ${d.score.blue}, suite ${d.suiteBefore} -> ${d.suiteAfter}`;
      }
    } catch (err) {
      actual = `error: ${err instanceof Error ? err.message : String(err)}`;
    }
    return { id: c.id, text: c.text, expect: c.expect, actual, ok: actual === c.expect };
  });
  return { files, rows };
}

export async function cmdVerify(cfg: Resolved): Promise<number> {
  const { files, rows } = verifyEvidence(cfg.root);
  ui.title('Evidence files (sha256)');
  for (const f of files) f.ok ? ui.ok(f.key) : ui.fail(`${f.key}: ${f.why}`);
  ui.title('Headline numbers, recomputed from the files');
  for (const r of rows) {
    if (r.ok) ui.ok(`${r.text}: ${pc.bold(r.actual)}`);
    else ui.fail(`${r.text}: expected ${r.expect}, files say ${r.actual}`);
  }
  const ok = files.every((f) => f.ok) && rows.every((r) => r.ok);
  if (ok)
    ui.info(
      'Every number above was recomputed from real Kane CLI reports in evidence/data. No login, no credits.',
    );
  return ok ? 0 : 1;
}
