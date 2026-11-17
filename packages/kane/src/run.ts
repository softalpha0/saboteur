import fs from 'node:fs';
import path from 'node:path';
import { digestTestmd, digestTestrun } from './parse.ts';
import { authArgs, kaneCommand, spawnKane } from './spawn.ts';
import type { KaneEvent, MemberResult, SuiteRun, TestFileRun } from './types.ts';

export type RunSuiteOptions = {
  /** Explicit *_test.md paths. A folder is not a valid testrun path (docs/03 §2). */
  files: string[];
  noHeal: boolean;
  parallel?: number;
  cwd: string;
  logDir: string;
  label: string;
  hardTimeoutMs?: number;
  onMemberEnd?: (m: MemberResult) => void;
  onEvent?: (e: KaneEvent) => void;
};

const MIN = 60_000;

/** Evidence packs Kane copied to <cwd>/.testmuai/evidence/ since `sinceMs`. */
export function newEvidencePacks(cwd: string, sinceMs: number): string[] {
  const dir = path.join(cwd, '.testmuai', 'evidence');
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.evidence'))
      .map((f) => path.join(dir, f))
      .filter((p) => fs.statSync(p).mtimeMs >= sinceMs - 1000);
  } catch {
    return [];
  }
}

export async function runSuite(opts: RunSuiteOptions): Promise<SuiteRun> {
  if (opts.files.length === 0) throw new Error('runSuite: no _test.md files given');
  const bad = opts.files.filter((f) => !f.endsWith('_test.md'));
  if (bad.length) throw new Error(`runSuite: not _test.md files: ${bad.join(', ')}`);

  const args = ['testrun', 'run', ...opts.files, '--agent', '--headless'];
  if (opts.noHeal) args.push('--no-adaptive-heal');
  if (opts.parallel && opts.parallel > 1) args.push('--parallel', String(opts.parallel));
  args.push(...authArgs());

  const started = Date.now();
  const proc = await spawnKane({
    args,
    cwd: opts.cwd,
    logDir: opts.logDir,
    label: opts.label,
    hardTimeoutMs: opts.hardTimeoutMs ?? 15 * MIN,
    onEvent: (e) => {
      opts.onEvent?.(e);
      if (opts.onMemberEnd && (e.type === 'testrun_member_end' || e.type === 'testrun_authored_member_end')) {
        const d = digestTestrun([e]);
        for (const m of d.members) opts.onMemberEnd(m);
      }
    },
  });
  const d = digestTestrun(proc.events);
  return {
    exitCode: proc.exitCode,
    killed: proc.killed,
    executionId: d.executionId,
    overallStatus: d.overallStatus,
    planValid: d.planValid,
    planFailures: d.planFailures,
    members: d.members,
    totals: d.totals,
    cliVersion: d.cliVersion,
    links: d.links,
    evidencePacks: newEvidencePacks(opts.cwd, started),
    durationS: proc.durationS,
    rawLogPath: proc.rawLogPath,
    progressLogPath: proc.progressLogPath,
    stderrTail: proc.stderrTail,
  };
}

export type RunTestFileOptions = {
  file: string;
  noHeal: boolean;
  cwd: string;
  logDir: string;
  label: string;
  hardTimeoutMs?: number;
  onEvent?: (e: KaneEvent) => void;
};

export async function runTestFile(opts: RunTestFileOptions): Promise<TestFileRun> {
  if (!opts.file.endsWith('_test.md')) throw new Error(`runTestFile: not a _test.md file: ${opts.file}`);
  const args = ['testmd', 'run', opts.file, '--agent', '--headless'];
  if (opts.noHeal) args.push('--no-adaptive-heal');
  args.push(...authArgs());

  const started = Date.now();
  const proc = await spawnKane({
    args,
    cwd: opts.cwd,
    logDir: opts.logDir,
    label: opts.label,
    hardTimeoutMs: opts.hardTimeoutMs ?? 10 * MIN,
    onEvent: opts.onEvent,
  });
  const d = digestTestmd(proc.events);
  return {
    exitCode: proc.exitCode,
    killed: proc.killed,
    overallStatus: d.overallStatus,
    durationS: d.durationS ?? proc.durationS,
    sessionId: d.sessionId,
    shareUrl: d.shareUrl,
    links: d.links,
    cliVersion: d.cliVersion,
    failureText:
      d.failureText ?? (proc.exitCode !== 0 && proc.exitCode !== 1 ? proc.stderrTail.trim() : undefined),
    failureStepIndex: d.failureStepIndex,
    summaryText: d.summaryText,
    evidencePacks: newEvidencePacks(opts.cwd, started),
    rawLogPath: proc.rawLogPath,
    progressLogPath: proc.progressLogPath,
    stderrTail: proc.stderrTail,
  };
}

export type PlainResult = { exitCode: number; output: string };

/** Runs a plain (non-NDJSON) Kane command such as `--version` or `balance`. */
export async function runPlain(
  args: string[],
  cwd: string,
  logDir: string,
  label: string,
): Promise<PlainResult> {
  const proc = await spawnKane({ args, cwd, logDir, label, hardTimeoutMs: 60_000 });
  const raw = fs.existsSync(proc.rawLogPath) ? fs.readFileSync(proc.rawLogPath, 'utf8') : '';
  return { exitCode: proc.exitCode, output: `${raw}${proc.stderrTail}`.trim() };
}

export async function version(cwd: string, logDir: string): Promise<PlainResult> {
  return runPlain(['--version'], cwd, logDir, 'version');
}

/** Raw `kane-cli balance` output. Exit 2 means not signed in. */
export async function balance(cwd: string, logDir: string): Promise<PlainResult & { credits?: number }> {
  const r = await runPlain(['balance', ...authArgs()], cwd, logDir, 'balance');
  return { ...r, credits: parseCredits(r.output) };
}

/** First number in Kane's balance output (e.g. "Credits: 9,812.5"). Undefined when there is none. */
export function parseCredits(output: string): number | undefined {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: strips ANSI colour codes
  const m = output.replace(/\u001b\[[0-9;]*m/g, '').match(/(\d[\d,]*(?:\.\d+)?)/);
  if (!m?.[1]) return undefined;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

export async function whoami(cwd: string, logDir: string): Promise<PlainResult> {
  return runPlain(['whoami'], cwd, logDir, 'whoami');
}

/** `testrun run --dry-run`: plan + preflight only, nothing executes. */
export async function dryRunSuite(files: string[], cwd: string, logDir: string) {
  const proc = await spawnKane({
    args: ['testrun', 'run', ...files, '--agent', '--dry-run', ...authArgs()],
    cwd,
    logDir,
    label: 'dry-run',
    hardTimeoutMs: 2 * MIN,
  });
  return { exitCode: proc.exitCode, digest: digestTestrun(proc.events), stderrTail: proc.stderrTail };
}

export { kaneCommand };
