import { coverageSummary } from './requirements.ts';
import type { MutantReport, Report, Verdict } from './schema.ts';

/**
 * Merge/deploy gate: Kane signs off only when the suite catches enough of the planted bugs.
 * Uses the "after" verdicts for a full run, the only verdicts for an attack-only run.
 * Errors (Kane or browser problems) are never treated as catches; by default they also block,
 * because Kane could not give a verdict.
 */

export type GateOptions = { minScore: number; allowErrors?: boolean };

export type GateResult = {
  pass: boolean;
  scorePct: number;
  caught: number;
  slipped: MutantReport[];
  errors: MutantReport[];
  reasons: string[];
  silentRules?: number;
};

const verdictOf = (r: Report, m: MutantReport): Verdict =>
  r.mode === 'attack-only' ? m.verdictBefore : m.verdictAfter;

export function gate(report: Report, opts: GateOptions): GateResult {
  const scored = report.mutants.filter((m) => ['killed', 'survived'].includes(verdictOf(report, m)));
  const caught = scored.filter((m) => verdictOf(report, m) === 'killed').length;
  const slipped = scored.filter((m) => verdictOf(report, m) === 'survived');
  const errors = report.mutants.filter((m) => verdictOf(report, m) === 'error');
  const scorePct = scored.length ? Math.round((caught / scored.length) * 100) : 0;
  const reasons: string[] = [];
  if (!scored.length) reasons.push('no bug got a Kane verdict');
  if (scorePct < opts.minScore)
    reasons.push(
      `${caught}/${scored.length} planted bugs caught (${scorePct}%), the gate needs ${opts.minScore}%`,
    );
  if (errors.length && !opts.allowErrors)
    reasons.push(
      `${errors.length} bug(s) without a Kane verdict (error): ${errors.map((m) => m.id).join(', ')}`,
    );
  const cov = report.requirements?.length ? coverageSummary(report.requirements) : undefined;
  return {
    pass: reasons.length === 0,
    scorePct,
    caught,
    slipped,
    errors,
    reasons,
    silentRules: cov ? (report.mode === 'attack-only' ? cov.silentBefore : cov.silentAfter) : undefined,
  };
}
