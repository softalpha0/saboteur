import { type GateOptions, gate } from './gate.ts';
import type { AttackRecord, MutantReport, Report } from './schema.ts';

/**
 * A short pull-request comment: the gate verdict, every bug that would ship unnoticed (with what
 * breaks for a customer), and a link to the Kane run behind every catch.
 */

const cell = (s: string | undefined) => (s ?? '').replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();

function kaneLinks(r: AttackRecord | undefined): string {
  if (!r) return '';
  const out = r.links.map((l, i) => `[Kane run${r.links.length > 1 ? ` ${i + 1}` : ''}](${l})`);
  if (!out.length && r.executionId) out.push(`exec \`${r.executionId}\``);
  return out.join(' · ');
}

function catcher(m: MutantReport, rec: AttackRecord | undefined): string {
  const c = rec?.caughtBy[0];
  if (!c) return '';
  return `\`${c.file}\`${c.message ? ` (${cell(c.message)})` : ''}`;
}

export function renderPrComment(report: Report, opts: GateOptions & { reportUrl?: string }): string {
  const g = gate(report, opts);
  const attackOnly = report.mode === 'attack-only';
  const rec = (m: MutantReport) => (attackOnly ? m.before : (m.after ?? m.before));
  const lines: string[] = [];
  lines.push(
    g.pass
      ? `## ✅ Saboteur: Kane signs off (${g.caught}/${g.caught + g.slipped.length} planted bugs caught)`
      : `## ⛔ Saboteur: not safe to merge (${g.caught}/${g.caught + g.slipped.length} planted bugs caught, gate needs ${opts.minScore}%)`,
    '',
  );
  if (!g.pass) for (const r of g.reasons) lines.push(`- ${r}`);
  if (!g.pass) lines.push('');
  if (g.silentRules !== undefined)
    lines.push(`Spec rules that would break without a test noticing: **${g.silentRules}**.`, '');

  if (g.slipped.length) {
    lines.push('### Bugs your tests would miss', '');
    lines.push('| Bug | What breaks for a customer |', '|---|---|');
    for (const m of g.slipped) lines.push(`| ${m.id} ${cell(m.title)} | ${cell(m.userImpact)} |`);
    lines.push('', 'Run `pnpm saboteur fill` to have Claude write Kane-proven tests for these.', '');
  }
  const caught = report.mutants.filter((m) => rec(m)?.verdict === 'killed');
  if (caught.length) {
    lines.push('### Caught, with the Kane run behind each catch', '');
    lines.push('| Bug | Caught by | Kane |', '|---|---|---|');
    for (const m of caught)
      lines.push(`| ${m.id} ${cell(m.title)} | ${catcher(m, rec(m))} | ${kaneLinks(rec(m))} |`);
    lines.push('');
  }
  if (g.errors.length) {
    lines.push('### No Kane verdict (not counted as caught)', '');
    for (const m of g.errors) lines.push(`- ${m.id} ${cell(m.title)}: ${cell(rec(m)?.reason)}`);
    lines.push('');
  }
  lines.push(
    `<sub>Run \`${report.runId}\` · Kane CLI ${report.kaneCliVersion ?? 'unknown'} · every verdict is a Kane CLI result, healing off on bugged builds${opts.reportUrl ? ` · [full report](${opts.reportUrl})` : ''}</sub>`,
  );
  return `${lines.join('\n')}\n`;
}
