import fs from 'node:fs';
import path from 'node:path';
import spawn from 'cross-spawn';
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
    const timer = setTimeout(() => {
      killed = true;
      progress.write(`\n[saboteur] hard timeout after ${opts.hardTimeoutMs} ms, stopping Kane\n`);
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 10_000).unref();
    }, opts.hardTimeoutMs);

    const splitter = new NdjsonSplitter((event, line) => {
      raw.write(`${line}\n`);
      if (!event) return;
      events.push(event);
      opts.onEvent?.(event);
    });

    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => splitter.push(chunk));
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => {
      progress.write(chunk);
      stderrTail = (stderrTail + chunk).slice(-4000);
    });

    let settled = false;
    const finish = (code: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
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
  });
}
