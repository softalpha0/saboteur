import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MutantProposer, type Proposal, checkProposal } from '@saboteur/agent';
import { type ObjectiveRun, runObjective } from '@saboteur/kane';
import {
  type Manifest,
  type Mutant,
  PrepareError,
  appendToManifest,
  cleanup,
  hashDir,
  listSourceFiles,
  loadManifest,
  makePatch,
  nextMutantId,
  prepare,
  slug,
} from '@saboteur/mutator';
import type { Resolved } from './config.ts';
import { type Context, createContext, hookSignals } from './context.ts';
import { buildClean, creditGuard, withServed } from './pipeline.ts';
import { short, ui } from './ui.ts';

export type MutateOptions = { count: number; dryRun?: boolean; proposer?: MutantProposer };

type Outcome = { proposal: Proposal; id?: string; kept: boolean; reason: string };

const distOf = (dir: string) => path.join(dir, 'dist');
const fence = (s: string, lang = '') => `\`\`\`\`${lang}\n${s.trimEnd()}\n\`\`\`\``;

function kaneLine(r: ObjectiveRun): string {
  return `exit ${r.exitCode}, run_end.status ${r.status ?? '?'}${r.testUrl ? `, [Kane](${r.testUrl})` : ''}${r.oneLiner ? `: ${r.oneLiner}` : ''}`;
}

const kaneError = (r: ObjectiveRun) => r.killed || (r.exitCode !== 0 && r.exitCode !== 1);

/**
 * S4: Claude proposes bugs for the configured app. A proposal is kept only when it applies, builds,
 * changes the build output, and Kane confirms it is visible: Claude's check passes on the bugged build
 * and fails on the correct build. Kept patches go to mutations/ai/ and into manifest.json (source "ai").
 */
export async function cmdMutate(cfg: Resolved, opts: MutateOptions): Promise<number> {
  hookSignals();
  const ctx = createContext(cfg);
  const proposer = opts.proposer ?? new MutantProposer();
  const transcriptPath = path.join(ctx.evidenceDir, 'mutate.md');
  const t: string[] = [
    `# mutate --ai (run \`${ctx.runId}\`)`,
    '',
    `Model: ${proposer.model}. Keep rule: applies, builds, build output changes, Kane check passes on the bugged build AND fails on the correct build.`,
    '',
  ];
  const flush = () => fs.writeFileSync(transcriptPath, `${t.join('\n')}\n`);

  ui.title(`mutate --ai: asking Claude for ${opts.count} bug(s)`);
  if (!opts.dryRun) await creditGuard(ctx, 'mutate');
  const routes =
    cfg.abs.routes && fs.existsSync(cfg.abs.routes)
      ? fs.readFileSync(cfg.abs.routes, 'utf8')
      : `(no routes file; app at ${cfg.app.url})`;
  const files = listSourceFiles(cfg.abs.app);
  if (!files.length) {
    ui.fail(`no source files found under ${path.join(cfg.app.dir, 'src')}`);
    return 1;
  }
  const answer = await proposer.propose({
    appUrl: cfg.app.url,
    routes,
    files,
    existing: ctx.manifest.mutants.map((m) => ({ id: m.id, title: m.title, where: m.where })),
    count: opts.count,
  });
  t.push('## Claude answered', '', fence(answer.raw, 'json'), '');
  for (const p of answer.problems) ui.warn(`dropped: ${p}`);
  ui.info(`${answer.proposals.length} proposal(s) to check`);

  const cleanDir = await buildClean(ctx);
  const cleanHash = fs.existsSync(distOf(cleanDir)) ? hashDir(distOf(cleanDir)) : undefined;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'saboteur-ai-'));
  const outcomes: Outcome[] = [];

  try {
    for (const proposal of answer.proposals) {
      const outcome = await checkOne(ctx, proposal, {
        cleanDir,
        cleanHash,
        tmp,
        dryRun: Boolean(opts.dryRun),
        t,
      });
      outcomes.push(outcome);
      flush();
    }
  } finally {
    await cleanup(cleanDir);
    fs.rmSync(tmp, { recursive: true, force: true });
    flush();
  }

  const kept = outcomes.filter((o) => o.kept);
  ui.title('mutate --ai result');
  for (const o of outcomes) {
    (o.kept ? ui.ok : ui.warn)(
      `${o.id ?? '—'} ${short(o.proposal.title, 60)}: ${o.kept ? 'kept' : o.reason}`,
    );
  }
  ui.info(
    `${kept.length}/${outcomes.length} kept${opts.dryRun ? ' (dry run: nothing written, no Kane runs)' : ''}. Transcript: ${path.relative(cfg.root, transcriptPath)}`,
  );
  if (kept.length)
    ui.info(
      `Score them against your suite: pnpm saboteur attack --only ${kept.map((o) => o.id).join(',')} (no new baseline needed; the tests did not change).`,
    );
  return 0;
}

async function checkOne(
  ctx: Context,
  p: Proposal,
  s: { cleanDir: string; cleanHash?: string; tmp: string; dryRun: boolean; t: string[] },
): Promise<Outcome> {
  const { t } = s;
  const cfg = ctx.cfg;
  t.push(
    `## ${p.title}`,
    '',
    `\`${p.file}\` · ${p.category} · ${p.userImpact}`,
    '',
    `Kane check: ${p.kaneCheck}`,
    '',
  );
  const reject = (reason: string, id?: string): Outcome => {
    t.push(`**Dropped:** ${reason}`, '');
    return { proposal: p, id, kept: false, reason };
  };

  const local = checkProposal(p, cfg.abs.app);
  if (local) return reject(local);

  const manifest = loadManifest(cfg.abs.manifest); // fresh: earlier proposals may have been added
  const id = nextMutantId(manifest);
  let patch: string;
  try {
    patch = await makePatch(cfg.abs.app, p, ctx.workRoot);
  } catch (err) {
    return reject(`could not make a patch: ${(err as Error).message}`);
  }
  t.push(fence(patch, 'diff'), '');
  const file = `${id}-${slug(p.title)}.patch`;
  fs.writeFileSync(path.join(s.tmp, file), patch);
  const mutant: Mutant = {
    id,
    title: p.title,
    category: p.category,
    patch: file,
    userImpact: p.userImpact,
    where: p.file,
    source: 'ai',
  };
  const tmpManifest: Manifest = { ...manifest, dir: s.tmp, mutants: [mutant] };

  let dir: string;
  try {
    ({ dir } = await prepare({
      appDir: cfg.abs.app,
      buildCmd: cfg.app.build,
      workRoot: ctx.workRoot,
      manifest: tmpManifest,
      mutant,
      logFile: path.join(ctx.evidenceDir, `build-ai-${id}.log`),
    }));
  } catch (err) {
    if (err instanceof PrepareError)
      return reject(`${err.stage} failed: ${short(err.output || err.message, 200)}`, id);
    throw err;
  }

  try {
    if (s.cleanHash && fs.existsSync(distOf(dir)) && hashDir(distOf(dir)) === s.cleanHash) {
      return reject(
        'the build output is identical to the correct build (the edit changes nothing users can see)',
        id,
      );
    }
    if (s.dryRun) return reject('dry run: applies and builds, not checked with Kane, not saved', id);

    await creditGuard(ctx, `Kane check for ${id}`);
    ui.info(`${id} ${short(p.title, 60)}: Kane check on the bugged build…`);
    const onBug = await withServed(ctx, dir, `ai-${id}-bug`, () =>
      runObjective({
        objective: p.kaneCheck,
        url: cfg.app.url,
        cwd: cfg.root,
        logDir: ctx.evidenceDir,
        label: `ai-${id}-bug`,
      }),
    );
    t.push(`Kane on the bugged build: ${kaneLine(onBug)}`, '');
    if (kaneError(onBug))
      return reject(
        `Kane error on the bugged build (exit ${onBug.exitCode}): ${short(onBug.stderrTail, 150)}`,
        id,
      );
    if (onBug.status !== 'passed')
      return reject(`Kane did not see the bug: ${short(onBug.reason ?? onBug.oneLiner, 150)}`, id);

    ui.info(`${id}: same check on the correct build…`);
    const onClean = await withServed(ctx, s.cleanDir, `ai-${id}-clean`, () =>
      runObjective({
        objective: p.kaneCheck,
        url: cfg.app.url,
        cwd: cfg.root,
        logDir: ctx.evidenceDir,
        label: `ai-${id}-clean`,
      }),
    );
    t.push(`Kane on the correct build: ${kaneLine(onClean)}`, '');
    if (kaneError(onClean))
      return reject(
        `Kane error on the correct build (exit ${onClean.exitCode}): ${short(onClean.stderrTail, 150)}`,
        id,
      );
    if (onClean.status === 'passed')
      return reject('the check also passes on the correct build, so it does not show the bug', id);

    const dest = path.join(path.dirname(cfg.abs.manifest), 'ai');
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, file), patch);
    appendToManifest(cfg.abs.manifest, { ...mutant, patch: `ai/${file}`, kaneCheck: p.kaneCheck });
    t.push(`**Kept** as \`${id}\` → \`mutations/ai/${file}\``, '');
    return { proposal: p, id, kept: true, reason: 'kept' };
  } finally {
    await cleanup(dir);
  }
}
