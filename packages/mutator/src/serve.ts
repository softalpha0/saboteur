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

/** Start the configured serve command in `dir` and wait for HTTP 200 on `url`. */
export async function serve(opts: { dir: string; serveCmd: string; url: string; logFile: string; timeoutMs?: number }): Promise<Server> {
  await assertPortFree(opts.url);
  const child = startShell(opts.serveCmd, opts.dir, opts.logFile);
  let exited: number | null = null;
  child.on('close', (code) => {
    exited = code ?? 1;
  });

  const stop = () =>
    new Promise<void>((resolve) => {
      if (exited !== null || child.pid === undefined) return resolve();
      treeKill(child.pid, 'SIGTERM', () => resolve());
    }).then(async () => {
      // Wait until the port is really free before the next build is served.
      for (let i = 0; i < 40 && (await responds(opts.url, 500)) !== null; i++) {
        await new Promise((r) => setTimeout(r, 250));
      }
    });

  const deadline = Date.now() + (opts.timeoutMs ?? 30_000);
  while (Date.now() < deadline) {
    if (exited !== null) throw new Error(`serve command exited with code ${exited}; see ${opts.logFile}`);
    if ((await responds(opts.url)) === 200) return { url: opts.url, stop };
    await new Promise((r) => setTimeout(r, 300));
  }
  await stop();
  throw new Error(`${opts.url} did not return HTTP 200 within ${opts.timeoutMs ?? 30_000} ms; see ${opts.logFile}`);
}
