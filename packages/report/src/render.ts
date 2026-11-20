import fs from 'node:fs';
import path from 'node:path';
import { renderHtml } from './html.ts';
import { type CoverageStatus, coverageSummary } from './requirements.ts';
import { type AttackRecord, type MutantReport, type Report, scoreText } from './schema.ts';

const REQ: Record<CoverageStatus, string> = {
  silent: 'breaks silently',
  guarded: 'guarded',
  unknown: 'unknown (error)',
  untested: 'no bug planted',
};

const cell = (s: string | undefined, max = 160): string => {
  if (!s) return '';
  const one = s.replace(/\s+/g, ' ').trim();
  return (one.length > max ? `${one.slice(0, max - 1)}…` : one).replace(/\|/g, '\\|');
};

const rel = (from: string, p: string | undefined): string | undefined =>
  p ? path.relative(from, p).split(path.sep).join('/') : undefined;

function linkList(r: AttackRecord | undefined, reportDir: string): string {
  if (!r) return '';
  const out = r.links.map((l, i) => `[Kane ${i + 1}](${l})`);
  if (r.executionId) out.push(`exec \`${r.executionId}\``);
  const log = rel(reportDir, r.rawLog);
  if (log) out.push(`[log](${log})`);
  return out.join(' · ');
}

const label: Record<string, string> = {
  killed: 'caught',
  survived: 'slipped through',
  error: 'error',
  invalid: 'invalid',
  rejected: 'rejected',
};

function caught(m: MutantReport): { file?: string; message?: string } {
  const r = m.after?.verdict === 'killed' ? m.after : m.before;
  const c = r.caughtBy[0];
  return { file: c?.file, message: c?.detail ? `${c.message ?? ''} ${c.detail}` : c?.message };
}

export function renderMarkdown(report: Report, reportDir: string): string {
  const lines: string[] = [];
  lines.push('# Saboteur report', '');
  lines.push(
    `Run \`${report.runId}\` · mode **${report.mode}** · Kane CLI ${report.kaneCliVersion ?? 'unknown'} · app \`${report.app}\` at ${report.appUrl}`,
    '',
  );
  if (report.mode === 'attack-only') {
    lines.push(
      `**Score: ${scoreText(report.before)}** (${report.suiteBefore.length} tests). Fill the gaps, then \`saboteur run\` for a before/after score.`,
      '',
    );
  } else {
    lines.push(
      `**Before: ${scoreText(report.before)}** (starter suite, ${report.suiteBefore.length} tests)  `,
    );
    lines.push(
      `**After: ${scoreText(report.after)}** (with generated tests, ${report.suiteAfter.length} tests)`,
      '',
    );
  }
  const excluded = report.after.errors + report.after.invalid + report.after.rejected;
  if (excluded > 0)
    lines.push(`${excluded} mutant(s) excluded from the score (error, invalid or rejected). See below.`, '');

  const b = report.baseline;
  lines.push(
    `Baseline on the clean build: Kane exit ${b.exitCode}, ${b.authored} test(s) recorded during baseline${b.executionId ? `, exec \`${b.executionId}\`` : ''}${b.links.length ? `, ${b.links.map((l) => `[Kane](${l})`).join(' ')}` : ''}.`,
    '',
  );
  if (report.credits?.before !== undefined && report.credits.after !== undefined) {
    lines.push(
      `Credits: ${report.credits.before} before, ${report.credits.after} after (${(report.credits.before - report.credits.after).toFixed(2)} used).`,
      '',
    );
  }

  lines.push('## Per bug', '');
  lines.push('| Bug | What breaks | Before | After | Caught by | Kane said | Kane results |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const m of report.mutants) {
    const c = caught(m);
    const after = m.after ? label[m.verdictAfter] : `${label[m.verdictAfter]} (not re-run)`;
    lines.push(
      `| ${m.id} | ${cell(m.title, 80)} | ${label[m.verdictBefore]} | ${after}${m.closedBy === 'fill' ? ' (new test)' : ''} | ${c.file ? `\`${c.file}\`` : ''} | ${cell(c.message)} | ${[linkList(m.before, reportDir), linkList(m.after, reportDir)].filter(Boolean).join('<br>')} |`,
    );
  }
  lines.push('');

  if (report.requirements?.length) {
    const s = coverageSummary(report.requirements);
    const attackOnly = report.mode === 'attack-only';
    lines.push('## Requirement coverage', '');
    lines.push(
      attackOnly
        ? `**${s.silentBefore} of ${s.planted}** spec rules with a planted bug would break without any test noticing.`
        : `With the starter suite, **${s.silentBefore} of ${s.planted}** spec rules with a planted bug would break without any test noticing. With the generated tests: **${s.silentAfter} of ${s.planted}**.`,
      '',
    );
    lines.push(
      attackOnly ? '| Rule | Bugs | Status |' : '| Rule | Bugs | Starter suite | With generated tests |',
    );
    lines.push(attackOnly ? '|---|---|---|' : '|---|---|---|---|');
    for (const r of report.requirements) {
      const bugs = r.mutants.join(', ') || '—';
      lines.push(
        attackOnly
          ? `| ${cell(r.text, 120)} | ${bugs} | ${REQ[r.before]} |`
          : `| ${cell(r.text, 120)} | ${bugs} | ${REQ[r.before]} | ${REQ[r.after]} |`,
      );
    }
    lines.push('');
  }

  const filled = report.mutants.filter((m) => m.fill);
  if (filled.length) {
    lines.push('## Closing the gaps (Claude writes, Kane proves)', '');
    for (const m of filled) {
      const f = m.fill;
      if (!f) continue;
      const status = f.accepted
        ? `accepted on attempt ${f.attempts}: \`${f.testFile}\``
        : `unproven after ${f.attempts} attempt(s)`;
      lines.push(
        `- **${m.id}** ${cell(m.title, 80)}: ${status}. [Transcript](${rel(reportDir, f.transcript)})${f.error ? ` Error: ${cell(f.error)}` : ''}`,
      );
      for (const a of f.history) {
        const parts = [`attempt ${a.n}: ${a.decision}`];
        if (a.clean) parts.push(`clean exit ${a.clean.exitCode}`);
        if (a.mutant) parts.push(`bugged exit ${a.mutant.exitCode}`);
        const text =
          a.decision === 'fails-on-clean'
            ? a.clean?.failureText
            : a.decision === 'passes-on-mutant'
              ? a.mutant?.summaryText
              : undefined;
        lines.push(`  - ${parts.join(', ')}${text ? `. Kane: "${cell(text, 200)}"` : ''}`);
      }
    }
    lines.push('');
  }

  const problems = report.mutants.filter(
    (m) =>
      ['error', 'invalid', 'rejected'].includes(m.verdictAfter) ||
      ['error', 'invalid', 'rejected'].includes(m.verdictBefore),
  );
  if (problems.length) {
    lines.push('## Excluded from the score', '');
    for (const m of problems) {
      const r = m.after && m.verdictAfter !== 'killed' && m.verdictAfter !== 'survived' ? m.after : m.before;
      lines.push(`- **${m.id}** ${r.verdict}: ${cell(r.reason, 300)}`);
    }
    lines.push('');
  }

  if (report.generatedTests.length) {
    lines.push('## Generated tests in the suite', '');
    for (const t of report.generatedTests) lines.push(`- \`${t}\``);
    lines.push('');
  }

  lines.push(
    `Raw Kane logs: \`${rel(reportDir, report.evidenceDir)}\`. Started ${report.startedAt}, finished ${report.finishedAt}.`,
    '',
  );
  return lines.join('\n');
}

/** Write report.json + report.md + report.html into reports/<runId>/ and the same into reports/latest/. */
export function writeReport(report: Report, reportsRoot: string): { dir: string; latest: string } {
  const dir = path.join(reportsRoot, report.runId);
  const latest = path.join(reportsRoot, 'latest');
  for (const d of [dir, latest]) {
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(path.join(d, 'report.md'), renderMarkdown(report, d));
    fs.writeFileSync(path.join(d, 'report.html'), renderHtml(report, d));
  }
  return { dir, latest };
}
