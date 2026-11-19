import fs from 'node:fs';
import path from 'node:path';
import treeKill from 'tree-kill';
import { startShell } from './exec.ts';

export type Server = { url: string; stop(): Promise<void> };

async function responds(url: string, timeoutMs = 1500): Promise<number | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return res.status;
  } catch {
    return null;
  }
}

/** Something already answering on the app URL would make Kane test the wrong build. */
export async function assertPortFree(url: string): Promise<void> {
  const status = await responds(url);
  if (status !== null) {
    throw new Error(
      `${url} is already in use (HTTP ${status}). Stop whatever is serving there (e.g. "pnpm --filter shop preview") and retry.`,
    );
  }
}

type PidRecord = { pid: number; url: string; startedAt: string };

const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/**
 * If a previous Saboteur run crashed, the shop server it started may still hold the port. That server
 * is recorded in `pidFile`; stop it (and only it) so the next run can start. Anything else on the port
 * is left alone and reported by assertPortFree.
 */
export async function stopLeftoverServer(pidFile: string, url: string): Promise<boolean> {
  let rec: PidRecord;
  try {
    rec = JSON.parse(fs.readFileSync(pidFile, 'utf8')) as PidRecord;
  } catch {
    return false;
  }
  fs.rmSync(pidFile, { force: true });
  const fresh = Date.now() - Date.parse(rec.startedAt) < 24 * 3600_000;
  if (rec.url !== url || !fresh || !alive(rec.pid) || (await responds(url)) === null) return false;
  await new Promise<void>((resolve) => treeKill(rec.pid, 'SIGTERM', () => resolve()));
  for (let i = 0; i < 40 && (await responds(url, 500)) !== null; i++)
    await new Promise((r) => setTimeout(r, 250));
  return true;
}

/** Start the configured serve command in `dir` and wait for HTTP 200 on `url`. */
export async function serve(opts: {
  dir: string;
  serveCmd: string;
  url: string;
  logFile: string;
  timeoutMs?: number;
  /** Where to record the server's pid, so a later run can stop it if this run crashes. */
  pidFile?: string;
}): Promise<Server> {
  if (opts.pidFile && (await stopLeftoverServer(opts.pidFile, opts.url))) {
    process.stderr.write(
      `[saboteur] stopped a shop server left running by an earlier Saboteur run on ${opts.url}\n`,
    );
  }
  await assertPortFree(opts.url);
  const child = startShell(opts.serveCmd, opts.dir, opts.logFile);
  if (opts.pidFile && child.pid) {
    fs.mkdirSync(path.dirname(opts.pidFile), { recursive: true });
    const rec: PidRecord = { pid: child.pid, url: opts.url, startedAt: new Date().toISOString() };
    fs.writeFileSync(opts.pidFile, JSON.stringify(rec));
  }
  const forget = () => {
    if (opts.pidFile) fs.rmSync(opts.pidFile, { force: true });
  };
  let exited: number | null = null;
  child.on('close', (code) => {
    exited = code ?? 1;
  });

  const stop = () =>
    new Promise<void>((resolve) => {
      if (exited !== null || child.pid === undefined) return resolve();
      treeKill(child.pid, 'SIGTERM', () => resolve());
    }).then(async () => {
      forget();
      // Wait until the port is really free before the next build is served.
      for (let i = 0; i < 40 && (await responds(opts.url, 500)) !== null; i++) {
        await new Promise((r) => setTimeout(r, 250));
      }
    });

  const deadline = Date.now() + (opts.timeoutMs ?? 30_000);
  while (Date.now() < deadline) {
    if (exited !== null) {
      let tail = '';
      try {
        tail = fs.readFileSync(opts.logFile, 'utf8').trim().split(/\r?\n/).slice(-3).join(' | ');
      } catch {}
      throw new Error(
        `serve command exited with code ${exited}${tail ? `: ${tail.slice(0, 300)}` : ''}; see ${opts.logFile}`,
      );
    }
    if ((await responds(opts.url)) === 200) return { url: opts.url, stop };
    await new Promise((r) => setTimeout(r, 300));
  }
  await stop();
  throw new Error(
    `${opts.url} did not return HTTP 200 within ${opts.timeoutMs ?? 30_000} ms; see ${opts.logFile}`,
  );
}
