import fs from 'node:fs';
import path from 'node:path';
import { type Manifest, type Server, loadManifest } from '@saboteur/mutator';
import type { Resolved } from './config.ts';

export type Context = {
  cfg: Resolved;
  manifest: Manifest;
  runId: string;
  /** evidence/runs/<run-id>/ : Kane NDJSON, stderr progress, build logs, fill transcripts. */
  evidenceDir: string;
  stateDir: string;
  workRoot?: string;
  startedAt: string;
  kaneCliVersion?: string;
};

export function newRunId(d = new Date()): string {
  return d
    .toISOString()
    .replace(/\.\d+Z$/, 'Z')
    .replace(/:/g, '-');
}

export function createContext(cfg: Resolved): Context {
  const runId = newRunId();
  const evidenceDir = path.join(cfg.root, 'evidence', 'runs', runId);
  fs.mkdirSync(evidenceDir, { recursive: true });
  const stateDir = path.join(cfg.root, '.saboteur', 'state');
  fs.mkdirSync(stateDir, { recursive: true });
  return {
    cfg,
    manifest: loadManifest(cfg.abs.manifest),
    runId,
    evidenceDir,
    stateDir,
    workRoot: cfg.workDir ? path.resolve(cfg.root, cfg.workDir) : undefined,
    startedAt: new Date().toISOString(),
  };
}

// The one served build, so Ctrl+C never leaves a preview server holding the port.
let active: Server | null = null;
export function setActiveServer(s: Server | null): void {
  active = s;
}
// A generated test that Kane has not proven yet. If the run is stopped, it must not stay in the suite.
let pending: string | null = null;
export function setPendingCandidate(file: string | null): void {
  pending = file;
}
export function removeCandidateFiles(file: string): void {
  fs.rmSync(file, { force: true });
  fs.rmSync(path.join(path.dirname(file), `output-${path.basename(file).replace(/\.md$/, '')}`), {
    recursive: true,
    force: true,
  });
}
let hooked = false;
export function hookSignals(): void {
  if (hooked) return;
  hooked = true;
  process.on('SIGINT', () => {
    console.log('\n  stopping…');
    if (pending) {
      removeCandidateFiles(pending);
      console.log(`  removed unproven test ${path.basename(pending)}`);
      pending = null;
    }
    const s = active;
    active = null;
    (s ? s.stop() : Promise.resolve()).finally(() => process.exit(130));
  });
}

export function saveState<T>(ctx: Context, name: string, value: T): void {
  fs.writeFileSync(path.join(ctx.stateDir, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
}

export function loadState<T>(stateDir: string, name: string): T | undefined {
  const p = path.join(stateDir, `${name}.json`);
  return fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, 'utf8')) as T) : undefined;
}
