import fs from 'node:fs';
import path from 'node:path';
import spawn from 'cross-spawn';
import treeKill from 'tree-kill';
import { NdjsonSplitter } from './ndjson.ts';
import type { KaneEvent } from './types.ts';

export type KaneProcessResult = {
  exitCode: number;
  killed: boolean;
  events: KaneEvent[];
  durationS: number;
  rawLogPath: string;
  progressLogPath: string;
  stderrTail: string;
};

export type KaneSpawnOptions = {
  args: string[];
  cwd: string;
  /** Folder for this run's logs, e.g. evidence/runs/<run-id>. */
  logDir: string;
  /** File stem for the logs: kane-<label>.ndjson + progress-<label>.log. */
  label: string;
  /** Saboteur's hard kill. Kane has its own --timeout; this only guards against a hung process. */
  hardTimeoutMs: number;
  /** Kill Kane when it prints nothing at all (stdout or stderr) for this long. Default 10 min. */
  stallTimeoutMs?: number;
  onEvent?: (e: KaneEvent) => void;
};

/**
 * The binary to run. `KANE_CLI_BIN` overrides it (a path to kane-cli, or to a .js/.mjs entry that is
 * run with this Node). cross-spawn resolves Windows .cmd shims without a shell.
 */
export function kaneCommand(): { cmd: string; prefix: string[] } {
  const bin = process.env.KANE_CLI_BIN?.trim();
  if (bin && /\.(c|m)?js$/.test(bin)) return { cmd: process.execPath, prefix: [bin] };
  return { cmd: bin || 'kane-cli', prefix: [] };
}

/** Basic-auth flags, only when both env vars are set (CI). Locally `kane-cli login` is used. */
export function authArgs(env: NodeJS.ProcessEnv = process.env): string[] {
  const user = env.LT_USERNAME?.trim();
  const key = env.LT_ACCESS_KEY?.trim();
  return user && key ? ['--username', user, '--access-key', key] : [];
}

/** Hide the access key when we write a command line to a log. */
export function redactArgs(args: string[]): string[] {
  return args.map((a, i) => (args[i - 1] === '--access-key' ? '***' : a));
}

export function spawnKane(opts: KaneSpawnOptions): Promise<KaneProcessResult> {
  fs.mkdirSync(opts.logDir, { recursive: true });
  const rawLogPath = path.join(opts.logDir, `kane-${opts.label}.ndjson`);
  const progressLogPath = path.join(opts.logDir, `progress-${opts.label}.log`);
  const raw = fs.createWriteStream(rawLogPath);
  const progress = fs.createWriteStream(progressLogPath);
  // A full disk must not crash the whole run; Kane's own result (exit code, events) still comes back.
  const onLogError = (err: Error) => {
    process.stderr.write(`[saboteur] could not write Kane log: ${err.message}\n`);
  };
  raw.on('error', onLogError);
  progress.on('error', onLogError);
  const { cmd, prefix } = kaneCommand();
  const args = [...prefix, ...opts.args];
  progress.write(`$ kane-cli ${redactArgs(opts.args).join(' ')}\n`);

  const started = Date.now();
  const events: KaneEvent[] = [];
  let stderrTail = '';

  return new Promise((resolve) => {
    let child: ReturnType<typeof spawn>;
    try {
      // Non-TTY stdin => Kane switches to NDJSON (docs/03 §1). Same on Windows, macOS and Linux.
      child = spawn(cmd, args, { cwd: opts.cwd, stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
    } catch (err) {
      progress.end(`spawn failed: ${String(err)}\n`);
      raw.end();
      resolve({
        exitCode: 2,
        killed: false,
        events,
        durationS: 0,
        rawLogPath,
        progressLogPath,
        stderrTail: String(err),
      });
      return;
    }

    let killed = false;
    // Kill the whole process tree. On Windows kane-cli runs behind a launcher, so killing only the
    // direct child leaves Kane (and its Chrome) running and the run waits forever.
    const killTree = (why: string) => {
      if (killed) return;
      killed = true;
      progress.write(`\n[saboteur] ${why}, stopping Kane\n`);
      stderrTail = `${stderrTail}\n[saboteur] ${why}`.slice(-4000);
      if (child.pid !== undefined) treeKill(child.pid, 'SIGKILL', () => undefined);
      else child.kill('SIGKILL');
      // If something still holds the output pipes open, do not wait for them forever.
      setTimeout(() => finish(3), 15_000).unref();
    };
    const timer = setTimeout(
      () => killTree(`hard timeout after ${Math.round(opts.hardTimeoutMs / 60_000)} min`),
      opts.hardTimeoutMs,
    );
    const stallMs = opts.stallTimeoutMs ?? 10 * 60_000;
    let lastOutput = Date.now();
    const stall = setInterval(
      () => {
        if (Date.now() - lastOutput > stallMs)
          killTree(`no output from Kane for ${Math.round(stallMs / 60_000)} min (hung)`);
      },
      Math.min(15_000, Math.max(250, stallMs / 4)),
    );
    stall.unref();

    const splitter = new NdjsonSplitter((event, line) => {
      raw.write(`${line}\n`);
      if (!event) return;
      events.push(event);
      opts.onEvent?.(event);
    });

    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      lastOutput = Date.now();
      splitter.push(chunk);
    });
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => {
      lastOutput = Date.now();
      progress.write(chunk);
      stderrTail = (stderrTail + chunk).slice(-4000);
    });

    let settled = false;
    const finish = (code: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(stall);
      splitter.end();
      raw.end();
      progress.end();
      resolve({
        exitCode: code,
        killed,
        events,
        durationS: Math.round((Date.now() - started) / 1000),
        rawLogPath,
        progressLogPath,
        stderrTail,
      });
    };

    child.on('error', (err: NodeJS.ErrnoException) => {
      const msg =
        err.code === 'ENOENT'
          ? 'kane-cli not found on PATH. Install it with: npm install -g @testmuai/kane-cli'
          : `failed to start kane-cli: ${err.message}`;
      stderrTail = (stderrTail + msg).slice(-4000);
      progress.write(`${msg}\n`);
      finish(2);
    });
    child.on('close', (code, signal) => finish(code ?? (signal ? 3 : 2)));
    // 'close' waits for the output pipes; a grandchild (e.g. Chrome) can keep them open after Kane exits.
    child.on('exit', (code, signal) => {
      setTimeout(() => finish(killed ? 3 : (code ?? (signal ? 3 : 2))), 10_000).unref();
    });
  });
}
