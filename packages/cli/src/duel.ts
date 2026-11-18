import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MutantProposer, type Proposal, TestWriter } from '@saboteur/agent';
import { cleanup, hashDir, listSourceFiles, loadManifest } from '@saboteur/mutator';
import type { AttackRecord, FillRecord } from '@saboteur/report';
import pc from 'picocolors';
import type { Resolved } from './config.ts';
import { createContext, hookSignals } from './context.ts';
import { checkOne, distOf } from './mutate.ts';
import { attackOne, buildClean, creditGuard, fillOne } from './pipeline.ts';
import { readTests, suites } from './suite.ts';
import { short, ui } from './ui.ts';

/**
 * Duel: red team vs blue team, Kane is the referee.
 *
 * Each round the red agent (Claude) reads the current tests and plants one bug it thinks they will miss.
 * Kane first proves the bug is real and visible, then runs the whole suite against it.
 *   - The suite catches it: blue defended (blue +1).
 *   - It slips through: red found a hole (red +1). The blue agent (Claude) writes a test; if Kane proves it
 *     (passes on the correct app, fails on the bug) the hole is closed (blue +1) and the suite grows.
 * Next round, red has to find a hole in the stronger suite. Every verdict is a Kane verdict.
 */

export type RoundOutcome = 'defended' | 'closed' | 'open' | 'red-forfeit' | 'error';

export type DuelRound = {
  n: number;
  suiteSize: number;
  bug?: { id: string; title: string; userImpact: string; file: string; kaneCheck: string };
  dropped: { title: string; reason: string }[];
  attack?: AttackRecord;
  fill?: FillRecord;
  outcome: RoundOutcome;
  score: { red: number; blue: number };
};

export type DuelReport = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  app: string;
  appUrl: string;
  model?: string;
  rounds: DuelRound[];
  score: { red: number; blue: number };
  suiteBefore: number;
  suiteAfter: number;
  evidenceDir: string;
};

export type DuelOptions = {
  rounds: number;
  redTries?: number;
  proposer?: MutantProposer;
  writerFactory?: () => TestWriter;
};

const LABEL: Record<RoundOutcome, string> = {
  defended: 'BLUE defended: the suite caught it',
  closed: 'RED found a hole, BLUE closed it with a Kane-proven test',
  open: 'RED found a hole that stays open',
  'red-forfeit': 'RED could not produce a real, visible bug',
  error: 'no verdict (Kane or build error)',
};

export async function cmdDuel(cfg: Resolved, opts: DuelOptions): Promise<number> {
  hookSignals();
  const ctx = createContext(cfg);
  const proposer = opts.proposer ?? new MutantProposer();
  const newWriter = opts.writerFactory ?? (() => new TestWriter({ appUrl: cfg.app.url }));
  const redTries = opts.redTries ?? 2;
  const routes =
    cfg.abs.routes && fs.existsSync(cfg.abs.routes)
      ? fs.readFileSync(cfg.abs.routes, 'utf8')
      : `(no routes file; app at ${cfg.app.url})`;
  const sourceFiles = listSourceFiles(cfg.abs.app);
  const transcriptPath = path.join(ctx.evidenceDir, 'duel.md');
  const t: string[] = [
    `# Duel (run \`${ctx.runId}\`)`,
    '',
    `Red and blue are both Claude (${proposer.model}). Kane is the referee.`,
    '',
  ];
  const flush = () => fs.writeFileSync(transcriptPath, `${t.join('\n')}\n`);

  const score = { red: 0, blue: 0 };
  const rounds: DuelRound[] = [];
  const suiteBefore = suites(cfg.abs.tests, cfg.abs.generated).all.length;

  ui.title(`Duel: ${opts.rounds} round(s). Red plants bugs, blue writes tests, Kane referees.`);
  const cleanDir = await buildClean(ctx);
  const cleanHash = fs.existsSync(distOf(cleanDir)) ? hashDir(distOf(cleanDir)) : undefined;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-duel-'));

  try {
    for (let n = 1; n <= opts.rounds; n++) {
      await creditGuard(ctx, `duel round ${n}`);
      const s = suites(cfg.abs.tests, cfg.abs.generated);
      const round: DuelRound = {
        n,
        suiteSize: s.all.length,
        dropped: [],
        outcome: 'red-forfeit',
        score: { ...score },
      };
      ui.title(
        `Round ${n}  ${pc.red(`red ${score.red}`)} : ${pc.blue(`blue ${score.blue}`)}   (${s.all.length} tests in the suite)`,
      );
      t.push(`## Round ${n}`, '', `Suite: ${s.all.length} tests.`, '');

      // RED: plant one bug the current tests should miss; Kane proves it is real before it counts.
      let kept: Awaited<ReturnType<typeof checkOne>> | undefined;
      for (let attempt = 1; attempt <= redTries && !kept?.kept; attempt++) {
        const manifest = loadManifest(cfg.abs.manifest);
        const answer = await proposer.propose({
          appUrl: cfg.app.url,
          routes,
          files: sourceFiles,
          existing: manifest.mutants.map((m) => ({ id: m.id, title: m.title, where: m.where })),
          count: 1,
          tests: readTests(s.all, cfg.root),
        });
        const p: Proposal | undefined = answer.proposals[0];
        if (!p) {
          round.dropped.push({
            title: '(no usable proposal)',
            reason: answer.problems.join('; ') || 'empty answer',
          });
          continue;
        }
        ui.info(`${pc.red('red')} plants: ${p.title} ${pc.dim(`(${p.file})`)}`);
        const outcome = await checkOne(ctx, p, { cleanDir, cleanHash, tmp, dryRun: false, t });
        if (outcome.kept) kept = outcome;
        else {
          round.dropped.push({ title: p.title, reason: outcome.reason });
          ui.warn(`not a valid bug: ${short(outcome.reason, 100)}`);
        }
      }

      if (!kept?.kept || !kept.mutant) {
        round.outcome = 'red-forfeit';
        rounds.push({ ...round, score: { ...score } });
        ui.info(LABEL[round.outcome]);
        flush();
        continue;
      }

      ctx.manifest = loadManifest(cfg.abs.manifest);
      const mutant = kept.mutant;
      round.bug = {
        id: mutant.id,
        title: mutant.title,
        userImpact: mutant.userImpact,
        file: kept.proposal.file,
        kaneCheck: kept.proposal.kaneCheck,
      };
      ui.ok(`Kane confirmed the bug is real and visible: ${mutant.id}`);

      // REFEREE: the whole current suite against red's bug.
      const attack = await attackOne(ctx, mutant, s.all, `duel-r${n}`);
      round.attack = attack;
      t.push(
        `Kane ran ${s.all.length} tests against ${mutant.id}: **${attack.verdict}**. ${attack.reason}`,
        '',
      );

      if (attack.verdict === 'killed') {
        score.blue++;
        round.outcome = 'defended';
        ui.ok(`${pc.blue('blue')} defended: ${attack.caughtBy[0]?.file} caught it`);
      } else if (attack.verdict === 'survived') {
        score.red++;
        ui.warn(`${pc.red('red')} found a hole: all ${s.all.length} tests passed on the bugged build`);
        // BLUE: close the hole with a test Kane proves.
        const fill = await fillOne(ctx, {
          mutant,
          cleanDir,
          existingFiles: s.all,
          routes,
          writer: newWriter(),
        });
        round.fill = fill;
        if (fill.accepted) {
          score.blue++;
          round.outcome = 'closed';
        } else {
          round.outcome = 'open';
        }
      } else {
        round.outcome = 'error';
      }
      round.score = { ...score };
      rounds.push(round);
      ui.info(`${LABEL[round.outcome]}   ${pc.red(`red ${score.red}`)} : ${pc.blue(`blue ${score.blue}`)}`);
      flush();
    }
  } finally {
    await cleanup(cleanDir);
    fs.rmSync(tmp, { recursive: true, force: true });
    flush();
  }

  const report: DuelReport = {
    runId: ctx.runId,
    startedAt: ctx.startedAt,
    finishedAt: new Date().toISOString(),
    app: path.relative(cfg.root, cfg.abs.app).split(path.sep).join('/'),
    appUrl: cfg.app.url,
    model: proposer.model,
    rounds,
    score,
    suiteBefore,
    suiteAfter: suites(cfg.abs.tests, cfg.abs.generated).all.length,
    evidenceDir: ctx.evidenceDir,
  };
  const out = writeDuelReport(report, path.join(cfg.root, 'reports'));
  ui.title('Duel result');
  console.log(`  ${pc.bold(pc.red(`Red ${score.red}`))} : ${pc.bold(pc.blue(`Blue ${score.blue}`))}`);
  ui.info(
    `Suite: ${report.suiteBefore} → ${report.suiteAfter} tests. Report: ${path.join(out, 'duel.html')}`,
  );
  return 0;
}

// ---------------- duel report ----------------

const esc = (s: string | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderDuelMarkdown(r: DuelReport): string {
  const lines = [
    '# Saboteur duel',
    '',
    `Run \`${r.runId}\` · ${r.app} at ${r.appUrl} · red and blue are both Claude (${r.model ?? 'model unknown'}), Kane is the referee.`,
    '',
    `**Red ${r.score.red} : Blue ${r.score.blue}** · suite grew from ${r.suiteBefore} to ${r.suiteAfter} tests.`,
    '',
    '| Round | Red planted | Kane: suite vs bug | Outcome | Score |',
    '|---|---|---|---|---|',
  ];
  for (const x of r.rounds) {
    const bug = x.bug
      ? `${x.bug.id} ${x.bug.title}`
      : `(no valid bug: ${x.dropped.map((d) => d.reason).join('; ')})`;
    const kane = x.attack
      ? `${x.attack.verdict}${x.attack.caughtBy[0] ? ` by \`${x.attack.caughtBy[0].file}\`` : ''}`
      : '';
    const fill = x.fill
      ? x.fill.accepted
        ? ` (new test \`${x.fill.testFile}\`, attempt ${x.fill.attempts})`
        : ` (no proven test after ${x.fill.attempts})`
      : '';
    lines.push(
      `| ${x.n} | ${bug.replace(/\|/g, '\\|')} | ${kane} | ${LABEL[x.outcome]}${fill} | ${x.score.red} : ${x.score.blue} |`,
    );
  }
  lines.push('', `Transcript: \`${path.join(r.evidenceDir, 'duel.md')}\``, '');
  return lines.join('\n');
}

export function renderDuelHtml(r: DuelReport): string {
  const rows = r.rounds
    .map((x) => {
      const cls =
        x.outcome === 'defended' || x.outcome === 'closed' ? 'blue' : x.outcome === 'open' ? 'red' : 'gray';
      return `<div class="round ${cls}"><div class="n">Round ${x.n}</div>
<div class="what"><div class="bug">${x.bug ? esc(x.bug.title) : 'Red forfeited'}</div><div class="sub">${esc(x.bug?.userImpact ?? x.dropped.map((d) => d.reason).join('; '))}</div></div>
<div class="out">${esc(LABEL[x.outcome])}${x.attack?.caughtBy[0] ? `<div class="sub">caught by <code>${esc(x.attack.caughtBy[0].file)}</code></div>` : ''}${x.fill?.accepted ? `<div class="sub">new test <code>${esc(path.basename(x.fill.testFile ?? ''))}</code>, attempt ${x.fill.attempts}</div>` : ''}</div>
<div class="sc">${x.score.red} : ${x.score.blue}</div></div>`;
    })
    .join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Saboteur duel</title><style>
:root{--bg:#fafaf7;--fg:#1d1d1f;--muted:#6b6b70;--card:#fff;--line:#e6e6e2;--red:#c4372b;--blue:#2f5bd3;--redbg:#fbe5e3;--bluebg:#e4ebfb}
@media (prefers-color-scheme:dark){:root{--bg:#141416;--fg:#ececef;--muted:#a0a0a8;--card:#1d1d21;--line:#2e2e34;--red:#ff8a80;--blue:#8fb0ff;--redbg:#3a1d1b;--bluebg:#1c2540}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:980px;margin:0 auto;padding:24px 16px 48px}h1{margin:0 0 4px}.meta,.sub{color:var(--muted);font-size:13px}
.board{display:flex;justify-content:center;gap:28px;align-items:center;margin:24px 0;font-weight:800;font-size:56px}
.board .r{color:var(--red)}.board .b{color:var(--blue)}.board .sep{color:var(--muted);font-size:40px}
.round{display:grid;grid-template-columns:90px 1fr 1fr 70px;gap:12px;align-items:center;background:var(--card);border:1px solid var(--line);border-left-width:6px;border-radius:10px;padding:12px 14px;margin-bottom:10px}
.round.blue{border-left-color:var(--blue)}.round.red{border-left-color:var(--red)}.round.gray{border-left-color:var(--line)}
.n{font-weight:700}.bug{font-weight:600}.sc{text-align:right;font-weight:700}
@media (max-width:640px){.round{grid-template-columns:1fr 60px}.n{grid-column:1/-1}.out{grid-column:1/-1}}
code{font-size:12px}
</style></head><body><main>
<h1>Saboteur duel</h1>
<div class="meta">${esc(r.app)} at ${esc(r.appUrl)} · red and blue are both Claude · Kane CLI is the referee · run <code>${esc(r.runId)}</code></div>
<div class="board"><span class="r">Red ${r.score.red}</span><span class="sep">:</span><span class="b">Blue ${r.score.blue}</span></div>
<p class="meta" style="text-align:center">Red scores for every bug that slips past the suite. Blue scores for every bug the suite catches, and for every hole closed with a test Kane proves. The suite grew from ${r.suiteBefore} to ${r.suiteAfter} tests.</p>
${rows}
</main></body></html>
`;
}

export function writeDuelReport(r: DuelReport, reportsRoot: string): string {
  const dirs = [path.join(reportsRoot, `duel-${r.runId}`), path.join(reportsRoot, 'latest-duel')];
  for (const d of dirs) {
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'duel.json'), `${JSON.stringify(r, null, 2)}\n`);
    fs.writeFileSync(path.join(d, 'duel.md'), renderDuelMarkdown(r));
    fs.writeFileSync(path.join(d, 'duel.html'), renderDuelHtml(r));
  }
  return dirs[1] as string;
}
