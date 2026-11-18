import fs from 'node:fs';
import path from 'node:path';
import { TestWriter, type WriterReply, redactSecrets, validateTest } from '@saboteur/agent';
import {
  type SuiteRun,
  type TestFileRun,
  balance,
  classifyMutant,
  runSuite,
  runTestFile,
} from '@saboteur/kane';
import { type Mutant, PrepareError, cleanup, prepare, readDiff, serve } from '@saboteur/mutator';
import type { AttackRecord, FillAttempt, FillRecord } from '@saboteur/report';
import { type Context, removeCandidateFiles, setActiveServer, setPendingCandidate } from './context.ts';
import { readTests, relPaths } from './suite.ts';
import { attackHeader, attackRow, short, ui } from './ui.ts';

const MIN = 60_000;

export class CreditGuardError extends Error {}

/** S2: stop before a batch when the balance is under minCredits. Unknown balance format only warns. */
export async function creditGuard(ctx: Context, what: string): Promise<number | undefined> {
  const b = await balance(ctx.cfg.root, ctx.evidenceDir);
  if (b.exitCode !== 0) {
    throw new CreditGuardError(
      `kane-cli balance failed (exit ${b.exitCode}): ${short(b.output, 300)}. Run "kane-cli login".`,
    );
  }
  if (b.credits === undefined) {
    ui.warn(`could not read a number from "kane-cli balance"; continuing (${short(b.output, 80)})`);
    return undefined;
  }
  if (b.credits < ctx.cfg.kane.minCredits) {
    throw new CreditGuardError(
      `only ${b.credits} Kane credits left, under minCredits ${ctx.cfg.kane.minCredits}. Not starting ${what}. Top up or lower kane.minCredits in saboteur.config.json.`,
    );
  }
  ui.dim(`credits: ${b.credits} (before ${what})`);
  return b.credits;
}

/** Build (clean or mutant), serve it, run `fn`, always stop the server. */
export async function withServed<T>(
  ctx: Context,
  dir: string,
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  const server = await serve({
    dir,
    serveCmd: ctx.cfg.app.serve,
    url: ctx.cfg.app.url,
    logFile: path.join(ctx.evidenceDir, `serve-${label}.log`),
    pidFile: path.join(ctx.stateDir, 'server.pid.json'),
  });
  setActiveServer(server);
  try {
    return await fn();
  } finally {
    setActiveServer(null);
    await server.stop();
  }
}

export async function buildClean(ctx: Context): Promise<string> {
  const { dir } = await prepare({
    appDir: ctx.cfg.abs.app,
    buildCmd: ctx.cfg.app.build,
    workRoot: ctx.workRoot,
    logFile: path.join(ctx.evidenceDir, 'build-clean.log'),
  });
  return dir;
}

function suiteOpts(ctx: Context, files: string[], label: string, noHeal: boolean) {
  return {
    files: relPaths(ctx.cfg.root, files),
    noHeal,
    // Attacks only (bugged builds): the first failed test already means "caught". A bug only counts as
    // slipped when every test passed, so stopping early never changes a verdict. Baseline runs everything.
    failFast: noHeal && ctx.cfg.kane.failFast !== false,
    parallel: ctx.cfg.kane.parallel,
    cwd: ctx.cfg.root,
    logDir: ctx.evidenceDir,
    label,
    // Enough for every test to take ~3 min, never less than the configured floor.
    hardTimeoutMs:
      Math.max(
        ctx.cfg.kane.suiteTimeoutMin,
        Math.ceil(files.length / Math.max(1, ctx.cfg.kane.parallel)) * 3,
      ) * MIN,
    onMemberEnd: (m: { file: string; status: string; durationS: number; failure?: { message: string } }) =>
      ui.dim(
        `    · ${m.file} ${m.status} ${m.durationS}s${m.failure ? `: ${short(m.failure.message, 90)}` : ''}`,
      ),
  };
}

function noteVersion(ctx: Context, run: { cliVersion?: string }) {
  if (run.cliVersion) ctx.kaneCliVersion = run.cliVersion;
}

export type BaselineResult = { run: SuiteRun; ok: boolean };

/** M4: the suite must pass on the clean build (healing on, records any new test). */
export async function baseline(ctx: Context, files: string[], cleanDir?: string): Promise<BaselineResult> {
  ui.title(`Baseline: ${files.length} Kane test(s) on the clean build`);
  const dir = cleanDir ?? (await buildClean(ctx));
  const run = await withServed(ctx, dir, 'baseline', () =>
    runSuite(suiteOpts(ctx, files, 'baseline', false)),
  );
  noteVersion(ctx, run);
  if (run.exitCode === 0) {
    ui.ok(
      `baseline passed (Kane exit 0${run.executionId ? `, exec ${run.executionId}` : ''}, ${run.totals?.authored ?? 0} recorded now)`,
    );
    return { run, ok: true };
  }
  ui.fail(
    `baseline failed: Kane exit ${run.exitCode}. The suite must pass on correct code before Saboteur can score it.`,
  );
  for (const f of run.planFailures) ui.info(`plan: ${f}`);
  for (const m of run.members.filter((x) => x.status !== 'passed')) {
    ui.info(`${m.file}: ${m.status}${m.failure ? ` - ${m.failure.message}` : ''}`);
  }
  if (!run.members.length && run.stderrTail) ui.info(short(run.stderrTail, 400));
  const gen = run.members.filter(
    (m) =>
      m.status !== 'passed' &&
      files.some((f) => path.basename(f) === m.file && f.startsWith(ctx.cfg.abs.generated)),
  );
  if (gen.length) {
    ui.info('');
    ui.info('These are generated tests. A test that fails on correct code cannot stay in the suite.');
    ui.info(
      'Re-run once to rule out a flaky run; if it fails again, move it to quarantine (Saboteur skips that folder):',
    );
    ui.info('  mkdir tests/kane/quarantine');
    for (const m of gen) ui.info(`  git mv tests/kane/generated/${m.file} tests/kane/quarantine/${m.file}`);
  }
  ui.dim(`log: ${path.relative(ctx.cfg.root, run.rawLogPath)}`);
  return { run, ok: false };
}

function toRecord(run: SuiteRun, files: string[], ctx: Context, retried: boolean): AttackRecord {
  const c = classifyMutant(run);
  return {
    verdict: c.verdict,
    reason:
      c.verdict === 'error' && run.stderrTail && !run.members.length
        ? `${c.reason}. ${short(run.stderrTail, 300)}`
        : c.reason,
    exitCode: run.exitCode,
    executionId: run.executionId,
    caughtBy: c.caughtBy,
    links: run.links,
    rawLog: run.rawLogPath,
    evidencePacks: run.evidencePacks,
    durationS: run.durationS,
    retried,
    suite: relPaths(ctx.cfg.root, files).map((f) => f.split(path.sep).join('/')),
  };
}

/** M5: one mutant: copy + patch + build + serve, run the suite with --no-adaptive-heal, classify. */
export async function attackOne(
  ctx: Context,
  mutant: Mutant,
  files: string[],
  label: string,
): Promise<AttackRecord> {
  let dir: string | undefined;
  try {
    ({ dir } = await prepare({
      appDir: ctx.cfg.abs.app,
      buildCmd: ctx.cfg.app.build,
      workRoot: ctx.workRoot,
      manifest: ctx.manifest,
      mutant,
      logFile: path.join(ctx.evidenceDir, `build-${mutant.id}.log`),
    }));
  } catch (err) {
    if (err instanceof PrepareError) {
      return {
        verdict: 'rejected',
        reason: `${err.stage} failed: ${short(err.output || err.message, 300)}`,
        exitCode: null,
        caughtBy: [],
        links: [],
        evidencePacks: [],
        durationS: 0,
        retried: false,
        suite: [],
      };
    }
    throw err;
  }
  const builtDir = dir;
  try {
    return await withServed(ctx, builtDir, `${label}-${mutant.id}`, async () => {
      let run = await runSuite(suiteOpts(ctx, files, `${label}-${mutant.id}`, true));
      noteVersion(ctx, run);
      let rec = toRecord(run, files, ctx, false);
      let retry = classifyMutant(run).retry;

      // Confirm a catch: re-run the test that failed, alone. A slow or flaky run (e.g. a timed-out wait)
      // must never count as a caught bug. Two failures in a row = caught.
      if (rec.verdict === 'killed' && rec.caughtBy[0]) {
        const name = rec.caughtBy[0].file;
        const file = files.find((f) => path.basename(f) === name);
        if (file) {
          ui.dim(`    confirming: re-running ${name} alone`);
          const confirm = await runSuite({
            ...suiteOpts(ctx, [file], `${label}-${mutant.id}-confirm`, true),
            failFast: false,
          });
          const c = classifyMutant(confirm);
          if (c.verdict === 'killed') {
            rec = { ...rec, reason: `${rec.reason}; confirmed: ${name} failed again on its own` };
          } else {
            ui.dim(
              `    ${name} did not fail again (${c.verdict}); treating the first failure as flaky and re-running the suite`,
            );
            retry = true;
          }
        }
      }

      if (retry) {
        ui.dim('    re-running the suite once (PRD §8)');
        run = await runSuite({
          ...suiteOpts(ctx, files, `${label}-${mutant.id}-retry`, true),
          failFast: false,
        });
        rec = toRecord(run, files, ctx, true);
      }
      return rec;
    });
  } finally {
    await cleanup(builtDir);
  }
}

export class InvalidRunError extends Error {}

export async function attack(
  ctx: Context,
  mutants: Mutant[],
  files: string[],
  label: string,
  onResult?: (id: string, rec: AttackRecord) => void,
): Promise<Map<string, AttackRecord>> {
  const par = ctx.cfg.kane.parallel > 1 ? `, ${ctx.cfg.kane.parallel} tests at a time` : '';
  ui.title(`Attack (${label}): ${mutants.length} bug(s) × ${files.length} Kane test(s), healing off${par}`);
  attackHeader();
  const out = new Map<string, AttackRecord>();
  for (const m of mutants) {
    const rec = await attackOne(ctx, m, files, label);
    out.set(m.id, rec);
    onResult?.(m.id, rec);
    const detail =
      rec.verdict === 'killed'
        ? `${rec.caughtBy[0]?.file}: ${short(rec.caughtBy[0]?.message, 70)}`
        : rec.verdict === 'survived'
          ? 'all tests passed on the bugged build'
          : short(rec.reason, 80);
    attackRow(m.id, m.title, rec.verdict, detail);
    if (rec.verdict === 'invalid') {
      throw new InvalidRunError(
        `${m.id}: a test was authored during a bugged run. Run "pnpm saboteur baseline" so every test is recorded on the clean build first.`,
      );
    }
  }
  return out;
}

// ---------- fill: the closed loop (M6, PRD §9) ----------

type FillOptions = {
  mutant: Mutant;
  cleanDir: string;
  existingFiles: string[];
  routes: string;
  writer?: TestWriter;
};

function kaneSummary(r: TestFileRun) {
  return {
    exitCode: r.exitCode,
    overallStatus: r.overallStatus,
    failureText: r.failureText,
    summaryText: r.summaryText,
    shareUrl: r.shareUrl,
    rawLog: r.rawLogPath,
  };
}

const isInfra = (r: TestFileRun) => r.killed || (r.exitCode !== 0 && r.exitCode !== 1);

/** Kane run with one retry on infra errors (exit 2/3), which do not count as a Claude attempt (06 §6). */
async function provedRun(
  ctx: Context,
  dir: string,
  file: string,
  noHeal: boolean,
  label: string,
): Promise<TestFileRun> {
  const once = (l: string) =>
    withServed(ctx, dir, l, () =>
      runTestFile({
        file: path.relative(ctx.cfg.root, file),
        noHeal,
        cwd: ctx.cfg.root,
        logDir: ctx.evidenceDir,
        label: l,
      }),
    );
  let r = await once(label);
  if (isInfra(r)) {
    ui.dim(`      Kane infra problem (exit ${r.exitCode}); retrying the run once`);
    r = await once(`${label}-retry`);
  }
  if (r.cliVersion) ctx.kaneCliVersion = r.cliVersion;
  return r;
}

function removeCandidate(file: string) {
  removeCandidateFiles(file);
  setPendingCandidate(null);
}

function fence(s: string, lang = '') {
  return `\`\`\`\`${lang}\n${s.trimEnd()}\n\`\`\`\``;
}

export async function fillOne(ctx: Context, opts: FillOptions): Promise<FillRecord> {
  const { mutant } = opts;
  const transcriptPath = path.join(ctx.evidenceDir, `fill-${mutant.id}.md`);
  const t: string[] = [
    `# Fill transcript: ${mutant.id} ${mutant.title}`,
    '',
    `Run \`${ctx.runId}\`. Accept rule: Kane exit 0 on the clean build AND exit 1 on the bugged build (--no-adaptive-heal).`,
    '',
  ];
  const history: FillAttempt[] = [];
  const record: FillRecord = { attempts: 0, accepted: false, transcript: transcriptPath, history };
  const flush = () => fs.writeFileSync(transcriptPath, redactSecrets(`${t.join('\n')}\n`));

  ui.title(`Fill ${mutant.id}: ${mutant.title}`);
  let mutantDir: string | undefined;
  try {
    ({ dir: mutantDir } = await prepare({
      appDir: ctx.cfg.abs.app,
      buildCmd: ctx.cfg.app.build,
      workRoot: ctx.workRoot,
      manifest: ctx.manifest,
      mutant,
      logFile: path.join(ctx.evidenceDir, `build-fill-${mutant.id}.log`),
    }));
  } catch (err) {
    record.error = `could not build the bugged app: ${err instanceof Error ? err.message : String(err)}`;
    t.push(record.error);
    flush();
    return record;
  }

  const writer = opts.writer ?? new TestWriter({ appUrl: ctx.cfg.app.url });
  record.model = writer.modelId;
  t.push('## System prompt', '', fence(writer.systemText, 'text'), '');

  let reply: WriterReply | undefined;
  try {
    for (let n = 1; n <= ctx.cfg.agent.maxAttempts; n++) {
      record.attempts = n;
      const last = history[history.length - 1];
      if (!reply || !last) {
        reply = await writer.first({
          mutant,
          diff: readDiff(ctx.manifest, mutant),
          routes: opts.routes,
          existingTests: readTests(opts.existingFiles, ctx.cfg.root),
        });
      } else {
        const problem =
          last.decision === 'fails-on-clean' || last.decision === 'passes-on-mutant'
            ? last.decision
            : 'invalid-file';
        const kaneText =
          last.decision === 'fails-on-clean'
            ? last.clean?.failureText
            : last.decision === 'passes-on-mutant'
              ? (last.mutant?.summaryText ??
                last.mutant?.failureText ??
                `Kane exit ${last.mutant?.exitCode}, overall_status ${last.mutant?.overallStatus ?? 'passed'}`)
              : (last.invalid ?? []).join('\n');
        reply = await writer.retry(
          problem,
          reply.body ?? reply.raw,
          kaneText ?? '(Kane gave no failure text)',
        );
      }

      t.push(
        `## Attempt ${n}`,
        '',
        '### Prompt sent to Claude',
        '',
        fence(reply.prompt, 'text'),
        '',
        '### Claude answered',
        '',
        fence(reply.raw, 'markdown'),
        '',
      );
      const attempt: FillAttempt = { n, fileName: reply.fileName, decision: 'invalid-file' };
      history.push(attempt);

      const problems = validateTest(reply, ctx.cfg.abs.tests);
      if (problems.length || !reply.fileName || !reply.body) {
        attempt.invalid = problems;
        ui.warn(`attempt ${n}: invalid file (${problems.join(' ')}); no Kane credits spent`);
        t.push(
          '### Local validator',
          '',
          ...problems.map((p) => `- ${p}`),
          '',
          '**Decision:** invalid-file (counts as an attempt)',
          '',
        );
        flush();
        continue;
      }

      fs.mkdirSync(ctx.cfg.abs.generated, { recursive: true });
      const file = path.join(ctx.cfg.abs.generated, reply.fileName);
      setPendingCandidate(file);
      fs.writeFileSync(file, reply.body);
      ui.info(`attempt ${n}: ${path.relative(ctx.cfg.root, file)}`);

      // Kane run A: clean build, healing on (records the test). Must pass.
      const a = await provedRun(ctx, opts.cleanDir, file, false, `fill-${mutant.id}-a${n}-clean`);
      attempt.clean = kaneSummary(a);
      t.push(
        '### Kane run A (clean build, healing on)',
        '',
        `exit ${a.exitCode}, overall_status ${a.overallStatus ?? '?'}${a.shareUrl ? `, [share](${a.shareUrl})` : ''}`,
        '',
      );
      if (a.failureText) t.push(fence(withStep(a.failureText, a.failureStepIndex) ?? '', 'text'), '');
      if (isInfra(a)) {
        attempt.decision = 'infra-error';
        record.error = `Kane infrastructure error on the clean build (exit ${a.exitCode}): ${short(a.failureText ?? a.stderrTail, 300)}`;
        t.push(`**Decision:** infra-error. ${record.error}`, '');
        removeCandidate(file);
        ui.fail(record.error);
        break;
      }
      if (a.exitCode !== 0) {
        attempt.decision = 'fails-on-clean';
        attempt.clean.failureText = withStep(a.failureText, a.failureStepIndex);
        ui.warn(`  Kane on clean: FAILED (exit ${a.exitCode}): ${short(a.failureText, 100)}`);
        t.push("**Decision:** fails-on-clean. Kane's text goes back to Claude.", '');
        removeCandidate(file);
        flush();
        continue;
      }
      ui.ok('  Kane on clean: passed');

      // Kane run B: bugged build, --no-adaptive-heal. Must fail.
      const b = await provedRun(ctx, mutantDir, file, true, `fill-${mutant.id}-a${n}-mutant`);
      attempt.mutant = kaneSummary(b);
      t.push(
        '### Kane run B (bugged build, --no-adaptive-heal)',
        '',
        `exit ${b.exitCode}, overall_status ${b.overallStatus ?? '?'}${b.shareUrl ? `, [share](${b.shareUrl})` : ''}`,
        '',
      );
      if (b.failureText || b.summaryText)
        t.push(fence((b.failureText ?? b.summaryText) as string, 'text'), '');
      if (isInfra(b)) {
        attempt.decision = 'infra-error';
        record.error = `Kane infrastructure error on the bugged build (exit ${b.exitCode}): ${short(b.failureText ?? b.stderrTail, 300)}`;
        t.push(`**Decision:** infra-error. ${record.error}`, '');
        removeCandidate(file);
        ui.fail(record.error);
        break;
      }
      if (b.exitCode === 0) {
        attempt.decision = 'passes-on-mutant';
        ui.warn('  Kane on bugged build: PASSED, so this test does not catch the bug');
        t.push("**Decision:** passes-on-mutant. Kane's summary goes back to Claude.", '');
        removeCandidate(file);
        flush();
        continue;
      }

      attempt.decision = 'accepted';
      setPendingCandidate(null);
      recordProven(ctx, {
        file: path.basename(file),
        mutant: mutant.id,
        runId: ctx.runId,
        attempt: n,
        model: writer.modelId,
        clean: { exitCode: a.exitCode, shareUrl: a.shareUrl },
        bugged: { exitCode: b.exitCode, shareUrl: b.shareUrl },
        acceptedAt: new Date().toISOString(),
      });
      record.accepted = true;
      record.testFile = path.relative(ctx.cfg.root, file).split(path.sep).join('/');
      ui.ok(`  Kane on bugged build: FAILED as it should. Proven on attempt ${n}: ${record.testFile}`);
      t.push(`**Decision:** accepted. Saved \`${record.testFile}\` and its Kane recording.`, '');
      break;
    }
    if (!record.accepted && !record.error) {
      ui.fail(`unproven after ${record.attempts} attempt(s); nothing saved`);
      t.push(`**Unproven** after ${record.attempts} attempt(s). Nothing was added to the suite.`);
    }
  } catch (err) {
    record.error = redactSecrets(err instanceof Error ? err.message : String(err));
    ui.fail(`fill stopped: ${record.error}`);
    t.push(`**Stopped:** ${record.error}`);
  } finally {
    flush();
    await cleanup(mutantDir);
  }
  return record;
}

function withStep(text: string | undefined, step?: number): string | undefined {
  if (!text) return text;
  return step === undefined ? text : `${text} (step index ${step})`;
}

// ---------- proven.json: which generated tests Kane actually proved ----------

export type ProvenEntry = {
  file: string;
  mutant: string;
  runId: string;
  attempt: number;
  model?: string;
  clean: { exitCode: number; shareUrl?: string };
  bugged: { exitCode: number; shareUrl?: string };
  acceptedAt: string;
};

export function provenPath(generatedDir: string): string {
  return path.join(generatedDir, 'proven.json');
}

export function loadProven(generatedDir: string): ProvenEntry[] {
  try {
    return JSON.parse(fs.readFileSync(provenPath(generatedDir), 'utf8')) as ProvenEntry[];
  } catch {
    return [];
  }
}

function recordProven(ctx: Context, entry: ProvenEntry): void {
  const list = loadProven(ctx.cfg.abs.generated).filter((e) => e.file !== entry.file);
  list.push(entry);
  fs.mkdirSync(ctx.cfg.abs.generated, { recursive: true });
  fs.writeFileSync(provenPath(ctx.cfg.abs.generated), `${JSON.stringify(list, null, 2)}\n`);
}
