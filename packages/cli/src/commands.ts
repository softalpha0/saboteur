import fs from 'node:fs';
import path from 'node:path';
import type { Mutant } from '@saboteur/mutator';
import { cleanup, selectMutants } from '@saboteur/mutator';
import {
  type AttackRecord,
  type MutantReport,
  type Report,
  type Verdict,
  score,
  scoreText,
  writeReport,
} from '@saboteur/report';
import pc from 'picocolors';
import type { Resolved } from './config.ts';
import { type Context, createContext, hookSignals, loadState, saveState } from './context.ts';
import { doctor } from './doctor.ts';
import { attack, baseline, buildClean, creditGuard, fillOne } from './pipeline.ts';
import { suites } from './suite.ts';
import { ui } from './ui.ts';

type AttackState = { runId: string; suite: string[]; records: Record<string, AttackRecord> };

function routesText(cfg: Resolved): string {
  if (cfg.abs.routes && fs.existsSync(cfg.abs.routes)) return fs.readFileSync(cfg.abs.routes, 'utf8');
  return `(no routes file configured; the app is at ${cfg.app.url})`;
}

function rel(cfg: Resolved, files: string[]) {
  return files.map((f) => path.relative(cfg.root, f).split(path.sep).join('/'));
}

function reportFrom(
  ctx: Context,
  input: {
    mode: Report['mode'];
    base: string[];
    all: string[];
    baselineRun?: Awaited<ReturnType<typeof baseline>>['run'];
    mutants: Mutant[];
    before: Map<string, AttackRecord>;
    after: Map<string, AttackRecord>;
    closedBy: Map<string, MutantReport['closedBy']>;
    fills: Map<string, NonNullable<MutantReport['fill']>>;
    credits?: Report['credits'];
  },
): Report {
  const mutants: MutantReport[] = input.mutants
    .filter((m) => input.before.has(m.id))
    .map((m) => {
      const before = input.before.get(m.id) as AttackRecord;
      const after = input.after.get(m.id);
      return {
        id: m.id,
        title: m.title,
        category: m.category,
        userImpact: m.userImpact,
        verdictBefore: before.verdict,
        verdictAfter: (after?.verdict ?? before.verdict) as Verdict,
        before,
        after,
        closedBy: input.closedBy.get(m.id),
        fill: input.fills.get(m.id),
      };
    });
  const s = suites(ctx.cfg.abs.tests, ctx.cfg.abs.generated);
  const b = input.baselineRun;
  return {
    runId: ctx.runId,
    startedAt: ctx.startedAt,
    finishedAt: new Date().toISOString(),
    mode: input.mode,
    kaneCliVersion: ctx.kaneCliVersion,
    app: path.relative(ctx.cfg.root, ctx.cfg.abs.app).split(path.sep).join('/'),
    appUrl: ctx.cfg.app.url,
    suiteBefore: rel(ctx.cfg, input.base),
    suiteAfter: rel(ctx.cfg, input.all),
    baseline: {
      exitCode: b?.exitCode ?? -1,
      executionId: b?.executionId,
      links: b?.links ?? [],
      rawLog: b?.rawLogPath ?? '',
      authored: b?.totals?.authored ?? 0,
      durationS: b?.durationS ?? 0,
    },
    before: score(mutants.map((m) => m.verdictBefore)),
    after: score(mutants.map((m) => m.verdictAfter)),
    mutants,
    generatedTests: rel(ctx.cfg, s.generated),
    credits: input.credits,
    evidenceDir: ctx.evidenceDir,
  };
}

function printScores(report: Report, reportsDir: string) {
  ui.title('Result');
  console.log(
    `  Before: ${pc.bold(scoreText(report.before))}   (starter suite, ${report.suiteBefore.length} tests)`,
  );
  console.log(
    `  After:  ${pc.bold(pc.green(scoreText(report.after)))}   (with generated tests, ${report.suiteAfter.length} tests)`,
  );
  const excluded = report.after.errors + report.after.invalid + report.after.rejected;
  if (excluded)
    ui.warn(`${excluded} bug(s) excluded from the score (error/invalid/rejected); see the report`);
  ui.info(`Report: ${path.join(reportsDir, 'latest', 'report.md')} (also report.html)`);
}

// ---------------- commands ----------------

export async function cmdDoctor(cfg: Resolved, opts: { live: boolean }) {
  const ctx = createContext(cfg);
  const r = await doctor(cfg, { live: opts.live, logDir: ctx.evidenceDir });
  return r.ok ? 0 : 1;
}

export async function cmdBaseline(cfg: Resolved) {
  hookSignals();
  const ctx = createContext(cfg);
  const s = suites(cfg.abs.tests, cfg.abs.generated);
  await creditGuard(ctx, 'baseline');
  const r = await baseline(ctx, s.all);
  return r.ok ? 0 : 1;
}

export async function cmdAttack(
  cfg: Resolved,
  opts: { only?: string; withGenerated?: boolean; resume?: boolean },
) {
  hookSignals();
  const ctx = createContext(cfg);
  const s = suites(cfg.abs.tests, cfg.abs.generated);
  const files = opts.withGenerated ? s.all : s.base;
  const suite = rel(cfg, files);
  let mutants = selectMutants(ctx.manifest, opts.only);

  // --resume: keep verdicts from an interrupted attack on the same suite, run only what is missing.
  const previous = loadState<AttackState>(ctx.stateDir, 'attack');
  const kept = new Map<string, AttackRecord>();
  if (opts.resume && previous && previous.suite.join('|') === suite.join('|')) {
    for (const m of mutants) {
      const r = previous.records[m.id];
      if (r && r.verdict !== 'error') kept.set(m.id, r);
    }
    if (kept.size) ui.info(`resuming: ${kept.size} verdict(s) kept from run ${previous.runId}`);
    mutants = mutants.filter((m) => !kept.has(m.id));
  } else if (opts.resume) {
    ui.warn('nothing to resume for this suite; running every bug');
  }

  // Save after every bug, so an interrupted attack keeps what it already learned.
  const records = new Map(kept);
  const save = () =>
    saveState<AttackState>(ctx, 'attack', { runId: ctx.runId, suite, records: Object.fromEntries(records) });
  const creditsBefore = await creditGuard(ctx, 'attack');
  await attack(ctx, mutants, files, opts.withGenerated ? 'after' : 'before', (id, rec) => {
    records.set(id, rec);
    save();
  });
  save();
  mutants = selectMutants(ctx.manifest, opts.only);
  const report = reportFrom(ctx, {
    mode: 'attack-only',
    base: files,
    all: files,
    mutants,
    before: records,
    after: new Map(),
    closedBy: new Map(),
    fills: new Map(),
    credits: { before: creditsBefore },
  });
  writeReport(report, path.join(cfg.root, 'reports'));
  printScores(report, path.join(cfg.root, 'reports'));
  return 0;
}

export async function cmdFill(cfg: Resolved, opts: { only?: string }) {
  hookSignals();
  const ctx = createContext(cfg);
  const state = loadState<AttackState>(ctx.stateDir, 'attack');
  if (!state) {
    ui.fail('no attack results yet. Run "pnpm saboteur attack" first.');
    return 1;
  }
  const survivors = selectMutants(ctx.manifest, opts.only).filter(
    (m) => state.records[m.id]?.verdict === 'survived',
  );
  if (!survivors.length) {
    ui.ok('no survivors to fill in the last attack');
    return 0;
  }
  await creditGuard(ctx, 'fill');
  const cleanDir = await buildClean(ctx);
  let accepted = 0;
  try {
    for (const m of survivors) {
      const s = suites(cfg.abs.tests, cfg.abs.generated);
      const rec = await fillOne(ctx, { mutant: m, cleanDir, existingFiles: s.all, routes: routesText(cfg) });
      if (rec.accepted) accepted++;
    }
  } finally {
    await cleanup(cleanDir);
  }
  ui.info(
    `${accepted}/${survivors.length} survivor(s) now have a Kane-proven test. Run "pnpm saboteur attack --with-generated" or "pnpm saboteur run" for the after score.`,
  );
  return 0;
}

/** M8: doctor → baseline → attack → (existing generated tests) → fill → re-attack survivors → report. */
export async function cmdRun(cfg: Resolved, opts: { replay: boolean; only?: string }) {
  hookSignals();
  const ctx = createContext(cfg);
  ui.info(
    pc.dim(
      `run ${ctx.runId} · mode ${opts.replay ? 'replay (no Claude calls)' : 'live'} · logs ${path.relative(cfg.root, ctx.evidenceDir)}`,
    ),
  );

  const dr = await doctor(cfg, { live: !opts.replay, logDir: ctx.evidenceDir });
  if (!dr.ok) {
    ui.fail('doctor found problems; fix them and run again');
    return 1;
  }
  const creditsBefore = dr.credits;
  const mutants = selectMutants(ctx.manifest, opts.only);

  // Baseline over everything that will be used later, so no test is authored on a bugged build.
  let s = suites(cfg.abs.tests, cfg.abs.generated);
  const cleanDir = await buildClean(ctx);
  const before = new Map<string, AttackRecord>();
  const after = new Map<string, AttackRecord>();
  const closedBy = new Map<string, MutantReport['closedBy']>();
  const fills = new Map<string, NonNullable<MutantReport['fill']>>();
  let baselineRun: Awaited<ReturnType<typeof baseline>>['run'] | undefined;

  try {
    await creditGuard(ctx, 'baseline');
    const b = await baseline(ctx, s.all, cleanDir);
    baselineRun = b.run;
    if (!b.ok) return 1;

    await creditGuard(ctx, 'attack');
    for (const [k, v] of await attack(ctx, mutants, s.base, 'before')) before.set(k, v);
    let survivors = mutants.filter((m) => before.get(m.id)?.verdict === 'survived');

    // Generated tests already in the repo (committed earlier, or the judge path in --replay).
    if (survivors.length && s.generated.length) {
      await creditGuard(ctx, 're-attack with generated tests');
      for (const [k, v] of await attack(ctx, survivors, s.all, 'after')) {
        after.set(k, v);
        if (v.verdict === 'killed') closedBy.set(k, 'existing-generated-test');
      }
      survivors = survivors.filter((m) => after.get(m.id)?.verdict === 'survived');
    }

    if (!opts.replay && survivors.length) {
      const filled: Mutant[] = [];
      for (const m of survivors) {
        await creditGuard(ctx, `fill ${m.id}`);
        s = suites(cfg.abs.tests, cfg.abs.generated);
        const rec = await fillOne(ctx, {
          mutant: m,
          cleanDir,
          existingFiles: s.all,
          routes: routesText(cfg),
        });
        fills.set(m.id, rec);
        if (rec.accepted) filled.push(m);
      }
      if (filled.length) {
        s = suites(cfg.abs.tests, cfg.abs.generated);
        await creditGuard(ctx, 're-attack with the grown suite');
        for (const [k, v] of await attack(ctx, filled, s.all, 'after-fill')) {
          after.set(k, v);
          if (v.verdict === 'killed') closedBy.set(k, 'fill');
        }
      }
    } else if (opts.replay && survivors.length) {
      ui.info(
        `${survivors.length} bug(s) still slip through and --replay does not call Claude: ${survivors.map((m) => m.id).join(', ')}`,
      );
    }
  } finally {
    await cleanup(cleanDir);
    s = suites(cfg.abs.tests, cfg.abs.generated);
    let creditsAfter: number | undefined;
    try {
      creditsAfter = await creditGuard(
        { ...ctx, cfg: { ...cfg, kane: { ...cfg.kane, minCredits: 0 } } },
        'report',
      );
    } catch {
      creditsAfter = undefined;
    }
    if (before.size) {
      const report = reportFrom(ctx, {
        mode: opts.replay ? 'replay' : 'live',
        base: s.base,
        all: s.all,
        baselineRun,
        mutants,
        before,
        after,
        closedBy,
        fills,
        credits: { before: creditsBefore, after: creditsAfter },
      });
      writeReport(report, path.join(cfg.root, 'reports'));
      printScores(report, path.join(cfg.root, 'reports'));
    }
  }
  return 0;
}

/** Re-render report.md from a report.json (e.g. after editing the renderer). */
export async function cmdReport(cfg: Resolved, opts: { from?: string }) {
  const file = path.resolve(opts.from ?? path.join(cfg.root, 'reports', 'latest', 'report.json'));
  if (!fs.existsSync(file)) {
    ui.fail(`no report at ${file}`);
    return 1;
  }
  const report = JSON.parse(fs.readFileSync(file, 'utf8')) as Report;
  writeReport(report, path.join(cfg.root, 'reports'));
  printScores(report, path.join(cfg.root, 'reports'));
  return 0;
}
