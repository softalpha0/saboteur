import { type ChildProcess, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export type ExecResult = { code: number; output: string };

/** PATH with the app's node_modules/.bin first, so "vite build" works without pnpm/npx. */
export function envWithBin(dir: string, extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const bin = path.join(dir, 'node_modules', '.bin');
  const key = Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH') ?? 'PATH';
  return { ...process.env, ...extra, [key]: `${bin}${path.delimiter}${process.env[key] ?? ''}` };
}

/** Run a configured shell command (build/serve from saboteur.config.json). */
export function startShell(
  command: string,
  cwd: string,
  logFile: string,
  env?: NodeJS.ProcessEnv,
): ChildProcess {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const log = fs.createWriteStream(logFile, { flags: 'a' });
  log.write(`$ ${command}  (in ${cwd})\n`);
  const child = spawn(command, {
    cwd,
    shell: true,
    env: env ?? envWithBin(cwd),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.pipe(log, { end: false });
  child.stderr?.pipe(log, { end: false });
  child.on('close', () => log.end());
  return child;
}

export function runShell(
  command: string,
  cwd: string,
  logFile: string,
  timeoutMs = 5 * 60_000,
): Promise<ExecResult> {
  return new Promise((resolve) => {
    let output = '';
    const child = startShell(command, cwd, logFile);
    child.stdout?.on('data', (d: Buffer) => {
      output = (output + d.toString()).slice(-8000);
    });
    child.stderr?.on('data', (d: Buffer) => {
      output = (output + d.toString()).slice(-8000);
    });
    const t = setTimeout(() => child.kill(), timeoutMs);
    child.on('error', (err) => {
      clearTimeout(t);
      resolve({ code: 127, output: `${output}\n${err.message}` });
    });
    child.on('close', (code) => {
      clearTimeout(t);
      resolve({ code: code ?? 1, output });
    });
  });
}

/** Run a program directly (no shell), e.g. git. */
export function runFile(
  file: string,
  args: string[],
  cwd: string,
  env?: NodeJS.ProcessEnv,
): Promise<ExecResult> {
  return new Promise((resolve) => {
    let output = '';
    const child = spawn(file, args, { cwd, env: env ?? process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', (d: Buffer) => {
      output += d.toString();
    });
    child.stderr.on('data', (d: Buffer) => {
      output += d.toString();
    });
    child.on('error', (err) => resolve({ code: 127, output: `${output}${err.message}` }));
    child.on('close', (code) => resolve({ code: code ?? 1, output }));
  });
}
