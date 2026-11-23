import fs from 'node:fs';
import path from 'node:path';
import { type Report, gate, renderPrComment } from '@saboteur/report';
import pc from 'picocolors';
import type { Resolved } from './config.ts';
import { attachRequirements, requirementsCandidates } from './requirements.ts';
import { ui } from './ui.ts';

/**
 * `saboteur gate`: refuse to merge or deploy until Kane signs off. Reads a report.json, exits 1 when
 * fewer than --min-score percent of the planted bugs were caught (or a bug got no Kane verdict),
 * and writes a pull-request comment with the verdict and the Kane run behind every catch.
 */
export type GateCmdOptions = {
  report?: string;
  minScore?: string;
  allowErrors?: boolean;
  comment?: string;
  reportUrl?: string;
};

export async function cmdGate(cfg: Resolved, opts: GateCmdOptions): Promise<number> {
  const file = path.resolve(cfg.root, opts.report ?? 'reports/latest/report.json');
  if (!fs.existsSync(file)) {
    ui.fail(`no report at ${file}. Run "pnpm saboteur attack" or "pnpm saboteur run" first.`);
    return 1;
  }
  const minScore = Number(opts.minScore ?? 100);
  if (!Number.isFinite(minScore) || minScore < 0 || minScore > 100)
    throw new Error('--min-score must be a number from 0 to 100');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Report;
  const report = attachRequirements(raw, requirementsCandidates(cfg.root, raw));
  const g = gate(report, { minScore, allowErrors: opts.allowErrors });

  ui.title('Gate');
  if (g.pass)
    ui.ok(
      pc.green(
        `Kane signs off: ${g.caught}/${g.caught + g.slipped.length} planted bugs caught (${g.scorePct}%)`,
      ),
    );
  else {
    ui.fail(pc.red('Not safe to merge or deploy'));
    for (const r of g.reasons) ui.info(`  ${r}`);
  }
  for (const m of g.slipped) ui.info(`  would ship unnoticed: ${m.id} ${m.title}`);
  if (g.silentRules !== undefined) ui.info(`  spec rules that would break silently: ${g.silentRules}`);

  if (opts.comment) {
    const out = path.resolve(cfg.root, opts.comment);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(
      out,
      renderPrComment(report, { minScore, allowErrors: opts.allowErrors, reportUrl: opts.reportUrl }),
    );
    ui.info(`PR comment written to ${path.relative(cfg.root, out)}`);
  }
  return g.pass ? 0 : 1;
}
