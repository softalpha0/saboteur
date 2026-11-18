import path from 'node:path';
import { type AttackRecord, type MutantReport, type Report, scoreText } from './schema.ts';

/** C1: one static, self-contained HTML page (no scripts, no external assets) from report.json. */

const esc = (s: string | undefined | null): string =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const rel = (from: string, p: string | undefined) =>
  p ? path.relative(from, p).split(path.sep).join('/') : undefined;

const LABEL: Record<string, string> = {
  killed: 'caught',
  survived: 'slipped through',
  error: 'error',
  invalid: 'invalid',
  rejected: 'rejected',
};

function badge(v: string): string {
  return `<span class="b b-${esc(v)}">${esc(LABEL[v] ?? v)}</span>`;
}

function links(r: AttackRecord | undefined, dir: string): string {
  if (!r) return '';
  const out = r.links.map((l, i) => `<a href="${esc(l)}">Kane ${i + 1}</a>`);
  if (r.executionId) out.push(`<code>${esc(r.executionId)}</code>`);
  const log = rel(dir, r.rawLog);
  if (log) out.push(`<a href="${esc(log)}">log</a>`);
  return out.join(' · ');
}

function caught(m: MutantReport) {
  const r = m.after?.verdict === 'killed' ? m.after : m.before;
  return r.caughtBy[0];
}

function pct(killed: number, survived: number): number {
  return killed + survived === 0 ? 0 : Math.round((killed / (killed + survived)) * 100);
}

export function renderHtml(report: Report, reportDir: string): string {
  const rows = report.mutants
    .map((m) => {
      const c = caught(m);
      const said = c ? [c.message, c.detail].filter(Boolean).join(' ') : '';
      return `<tr>
  <td><b>${esc(m.id)}</b></td>
  <td>${esc(m.title)}<div class="sub">${esc(m.userImpact)}</div></td>
  <td>${badge(m.verdictBefore)}</td>
  <td>${badge(m.verdictAfter)}${m.closedBy === 'fill' ? ' <span class="sub">new test</span>' : ''}${m.after ? '' : ' <span class="sub">not re-run</span>'}</td>
  <td>${c ? `<code>${esc(c.file)}</code>` : ''}</td>
  <td class="said">${esc(said)}</td>
  <td class="links">${[links(m.before, reportDir), links(m.after, reportDir)].filter(Boolean).join('<br>')}</td>
</tr>`;
    })
    .join('\n');

  const fills = report.mutants
    .filter((m) => m.fill)
    .map((m) => {
      const f = m.fill;
      if (!f) return '';
      const steps = f.history
        .map((a) => {
          const text =
            a.decision === 'fails-on-clean'
              ? a.clean?.failureText
              : a.decision === 'passes-on-mutant'
                ? a.mutant?.summaryText
                : undefined;
          return `<li>Attempt ${a.n}: <b>${esc(a.decision)}</b>${a.clean ? `, clean exit ${a.clean.exitCode}` : ''}${a.mutant ? `, bugged exit ${a.mutant.exitCode}` : ''}${text ? `<div class="kane">Kane: ${esc(text)}</div>` : ''}</li>`;
        })
        .join('');
      const head = f.accepted
        ? `accepted on attempt ${f.attempts}: <code>${esc(f.testFile)}</code>`
        : `unproven after ${f.attempts} attempt(s)`;
      return `<section class="card"><h3>${esc(m.id)} ${esc(m.title)}</h3><p>${head} · <a href="${esc(rel(reportDir, f.transcript))}">transcript</a></p><ol>${steps}</ol>${f.error ? `<p class="err">${esc(f.error)}</p>` : ''}</section>`;
    })
    .join('\n');

  const b = report.before;
  const a = report.after;
  const scoreCards =
    report.mode === 'attack-only'
      ? `  <div class="card"><div class="sub">Score (${report.suiteBefore.length} tests)</div><div class="big">${esc(scoreText(b))}</div><div class="bar"><div style="width:${pct(b.killed, b.survived)}%"></div></div></div>`
      : `  <div class="card"><div class="sub">Before (starter suite, ${report.suiteBefore.length} tests)</div><div class="big">${esc(scoreText(b))}</div><div class="bar"><div style="width:${pct(b.killed, b.survived)}%"></div></div></div>
  <div class="card"><div class="sub">After (with generated tests, ${report.suiteAfter.length} tests)</div><div class="big">${esc(scoreText(a))}</div><div class="bar"><div style="width:${pct(a.killed, a.survived)}%"></div></div></div>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Saboteur report</title>
<style>
:root { --bg:#fafaf7; --fg:#1d1d1f; --muted:#6b6b70; --card:#fff; --line:#e6e6e2; --ok:#1f7a3a; --okbg:#e3f3e8; --bad:#b3261e; --badbg:#fbe5e3; --warn:#8a5a00; --warnbg:#fdf0d5; --accent:#5b4bc4; }
@media (prefers-color-scheme: dark) { :root { --bg:#141416; --fg:#ececef; --muted:#a0a0a8; --card:#1d1d21; --line:#2e2e34; --ok:#7bd88f; --okbg:#1c3324; --bad:#ff8a80; --badbg:#3a1d1b; --warn:#f5c26b; --warnbg:#3a2e14; --accent:#a99cff; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--fg); font:15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 1100px; margin: 0 auto; padding: 24px 16px 48px; }
h1 { margin: 0 0 4px; font-size: 26px; }
.meta { color: var(--muted); font-size: 13px; }
.scores { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin: 20px 0; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.big { font-size: 34px; font-weight: 700; }
.bar { height: 8px; background: var(--line); border-radius: 4px; overflow: hidden; margin-top: 8px; }
.bar > div { height: 100%; background: var(--accent); }
.table { overflow-x: auto; }
table { width: 100%; min-width: 820px; border-collapse: collapse; background: var(--card); border: 1px solid var(--line); border-radius: 12px; }
th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
.sub { color: var(--muted); font-size: 12px; }
.said { max-width: 320px; font-size: 13px; }
.links { font-size: 13px; white-space: nowrap; }
.b { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.b-killed { color: var(--ok); background: var(--okbg); }
.b-survived { color: var(--bad); background: var(--badbg); }
.b-error, .b-invalid, .b-rejected { color: var(--warn); background: var(--warnbg); }
.kane { color: var(--muted); font-size: 13px; margin-top: 2px; }
.err { color: var(--bad); }
a { color: var(--accent); }
code { font-size: 12px; }
</style>
</head>
<body>
<main>
<h1>Saboteur report</h1>
<div class="meta">Run <code>${esc(report.runId)}</code> · mode ${esc(report.mode)} · Kane CLI ${esc(report.kaneCliVersion ?? 'unknown')} · ${esc(report.app)} at ${esc(report.appUrl)}</div>
<div class="scores">
${scoreCards}
  <div class="card"><div class="sub">Baseline on the clean build</div><div class="big">exit ${report.baseline.exitCode}</div><div class="sub">${report.baseline.authored} recorded during baseline${report.baseline.executionId ? ` · <code>${esc(report.baseline.executionId)}</code>` : ''}</div></div>
</div>
<h2>Per bug</h2>
<div class="table"><table>
<thead><tr><th>Bug</th><th>What breaks</th><th>Before</th><th>After</th><th>Caught by</th><th>Kane said</th><th>Kane results</th></tr></thead>
<tbody>
${rows}
</tbody></table></div>
${fills ? `<h2>Closing the gaps</h2>\n${fills}` : ''}
<p class="sub">Every verdict above is a Kane CLI result. Generated from report.json, ${esc(report.finishedAt)}.</p>
</main>
</body>
</html>
`;
}
