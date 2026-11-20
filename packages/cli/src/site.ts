import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { type MutantReport, type Report, renderHtml, score, scoreText } from '@saboteur/report';
import type { Resolved } from './config.ts';
import { type DuelReport, renderDuelHtml } from './duel.ts';
import { ui } from './ui.ts';

/**
 * Build a public, static site from real Saboteur reports (no Kane runs, no credits):
 *   site/index.html   landing page with the real numbers
 *   site/report.html  the before/after report (no links to local log files)
 *   site/duel.html    the duel scoreboard
 * Static files you commit in site/assets/ (images, the explainer video) are kept.
 * .github/workflows/pages.yml publishes site/ to GitHub Pages.
 */

export type SiteOptions = {
  report?: string;
  /** Extra attack reports whose verdicts fill in bugs the main report has no verdict for (error / invalid). */
  merge?: string[];
  duel?: string;
  out?: string;
  video?: string;
  repo?: string;
};

const esc = (s: string | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const readJson = <T>(p: string): T => JSON.parse(fs.readFileSync(p, 'utf8')) as T;

/**
 * Fill in "after" verdicts the main report could not give (error / invalid / rejected) from later
 * attack runs on the same bugs. Every verdict is still a Kane verdict; the page says which run it came from.
 */
export function mergeReports(
  base: Report,
  extras: Report[],
): { report: Report; filledFrom: Record<string, string> } {
  const filledFrom: Record<string, string> = {};
  const mutants: MutantReport[] = base.mutants.map((m) => {
    if (m.verdictAfter === 'killed' || m.verdictAfter === 'survived') return m;
    for (const x of extras) {
      const other = x.mutants.find((o) => o.id === m.id);
      // An attack-only report stores its verdicts as "before".
      const rec = other?.after ?? other?.before;
      if (rec && (rec.verdict === 'killed' || rec.verdict === 'survived')) {
        filledFrom[m.id] = x.runId;
        return { ...m, after: rec, verdictAfter: rec.verdict };
      }
    }
    return m;
  });
  return {
    report: { ...base, mutants, after: score(mutants.map((m) => m.verdictAfter)) },
    filledFrom,
  };
}

export function repoUrl(root: string): string | undefined {
  try {
    const url = execFileSync('git', ['config', '--get', 'remote.origin.url'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    const m = url.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);
    return m ? `https://github.com/${m[1]}/${m[2]}` : undefined;
  } catch {
    return undefined;
  }
}

export function renderLanding(input: {
  report: Report;
  duel?: DuelReport;
  filledFrom: Record<string, string>;
  repo?: string;
  video?: string;
  hasExplainer: boolean;
}): string {
  const { report: r, duel: d } = input;
  const suiteAfter = d?.suiteAfter ?? r.suiteAfter.length;
  const filled = Object.keys(input.filledFrom);
  const runs = [r.runId, ...new Set(Object.values(input.filledFrom)), d?.runId].filter(Boolean);
  const video = input.video
    ? `<p class="cta"><a class="btn" href="${esc(input.video)}">Watch the demo video</a></p>`
    : '';
  const explainer = input.hasExplainer
    ? `<figure class="vid"><video src="assets/explainer.mp4" autoplay muted loop playsinline controls></video><figcaption>Animated illustration of the real runs below.</figcaption></figure>`
    : '';
  const duelCard = d
    ? `<div class="stat"><div class="k">Duel: AI attacker vs the suite</div><div class="v"><span class="red">Red ${d.score.red}</span> : <span class="blue">Blue ${d.score.blue}</span></div><div class="s">Red found ${d.rounds.filter((x) => x.outcome === 'closed' || x.outcome === 'open').length} bugs the suite missed; blue closed ${d.rounds.filter((x) => x.outcome === 'closed').length} with Kane-proven tests</div></div>`
    : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Saboteur</title>
<meta name="description" content="Saboteur plants real bugs in your web app, uses Kane CLI to show which ones your tests miss, and has Claude write new Kane tests that Kane must prove.">
<style>
:root{--bg:#fafaf7;--fg:#1d1d1f;--muted:#62626a;--card:#fff;--line:#e6e6e2;--red:#c4372b;--green:#1f7a3a;--blue:#2f5bd3;--accent:#5b4bc4}
@media (prefers-color-scheme:dark){:root{--bg:#0e1013;--fg:#f1f1f3;--muted:#a0a3ac;--card:#161920;--line:#262a33;--red:#ff6b5e;--green:#3ccf7a;--blue:#7fa2ff;--accent:#b0a4ff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1040px;margin:0 auto;padding:48px 16px 64px}
h1{font-size:clamp(40px,7vw,72px);line-height:1.02;letter-spacing:-2px;margin:0}h1 span{color:var(--red)}
.lead{font-size:clamp(18px,2.4vw,22px);color:var(--muted);max-width:720px;margin:18px 0 0}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin:36px 0}
.stat{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px}
.stat .k{font-size:14px;color:var(--muted);font-weight:600}.stat .v{font-size:40px;font-weight:800;letter-spacing:-1px;margin:6px 0}
.stat .s{font-size:14px;color:var(--muted)}.red{color:var(--red)}.green{color:var(--green)}.blue{color:var(--blue)}
.vid{margin:8px 0 36px}.vid video{width:100%;border-radius:16px;border:1px solid var(--line);display:block}.vid figcaption{font-size:13px;color:var(--muted);margin-top:8px}
h2{font-size:28px;letter-spacing:-.5px;margin:40px 0 14px}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.step{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px}.step b{display:block;font-size:19px;margin-bottom:6px}
.step p{margin:0;color:var(--muted);font-size:15px}
.links{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0}
.btn{display:inline-block;padding:10px 16px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--fg);text-decoration:none;font-weight:600}
.btn.primary{background:var(--fg);color:var(--bg);border-color:var(--fg)}
pre{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;overflow-x:auto;font-size:14px}
.note{font-size:14px;color:var(--muted)}
footer{margin-top:48px;font-size:14px;color:var(--muted)}
</style></head><body><main>
<h1>Saboteur <span>tests your tests</span></h1>
<p class="lead">It plants real bugs in your web app one at a time, lets Kane CLI run your tests against each broken build, and shows which bugs slipped through. Then Claude writes a new Kane test for every miss, and Kane only keeps it if it passes on the correct app and fails on the bug.</p>
${video}
<div class="stats">
<div class="stat"><div class="k">Planted bugs caught</div><div class="v"><span class="red">${esc(scoreText(r.before).replace(' caught', ''))}</span> → <span class="green">${esc(scoreText(r.after).replace(' caught', ''))}</span></div><div class="s">${r.suiteBefore.length} starter tests, then with Claude's Kane-proven tests</div></div>
${duelCard}
<div class="stat"><div class="k">Test suite</div><div class="v">${r.suiteBefore.length} → ${suiteAfter}</div><div class="s">every added test proven by Kane CLI</div></div>
</div>
${explainer}
<div class="links"><a class="btn primary" href="report.html">Full report</a><a class="btn" href="demo/shop/">Try the shop's bugs live</a><a class="btn" href="demo/todomvc/">Try TodoMVC's bugs live</a>${d ? '<a class="btn" href="duel.html">Duel scoreboard</a>' : ''}${input.repo ? `<a class="btn" href="${esc(input.repo)}">Source on GitHub</a>` : ''}</div>
<h2>How it works</h2>
<div class="steps">
<div class="step"><b>1 · Plant</b><p>A small, realistic bug as a code patch: a wrong total, a dead button, a bad redirect. One at a time, on a fresh build.</p></div>
<div class="step"><b>2 · Hunt</b><p>Kane CLI replays your <code>_test.md</code> suite in real Chrome with healing off, so a broken page fails instead of being worked around.</p></div>
<div class="step"><b>3 · Score</b><p>Caught or slipped, per bug. Browser crashes and timeouts are errors, never catches, and every catch is re-run to confirm it.</p></div>
<div class="step"><b>4 · Close the gaps</b><p>Claude writes a test for each miss. Kane runs it on the correct app (must pass) and the bugged app (must fail). Kane's failure text goes back to Claude if not.</p></div>
</div>
<h2>Run it yourself</h2>
<pre>git clone ${esc(input.repo ?? '<this repo>')}
cd saboteur
pnpm i
kane-cli login
pnpm saboteur doctor --replay
pnpm saboteur run --replay</pre>
<p class="note">Replay mode needs no Claude key: it uses the committed, Kane-proven tests. Point it at your own app with <code>saboteur.config.json</code>.</p>
<footer>Every number on this site comes from real Kane CLI runs (${esc(runs.join(', '))}).${filled.length ? ` Verdicts for ${esc(filled.join(', '))} come from a later attack run, because Kane's browser crashed on those bugs in the main run.` : ''} Built for the KaneCLI Online Hackathon with Kane CLI and Claude.</footer>
</main></body></html>
`;
}

export async function cmdSite(cfg: Resolved, opts: SiteOptions): Promise<number> {
  const reportPath = path.resolve(cfg.root, opts.report ?? 'reports/latest/report.json');
  if (!fs.existsSync(reportPath)) {
    ui.fail(`no report at ${reportPath}. Run "pnpm saboteur run --replay" first, or pass --report.`);
    return 1;
  }
  const base = readJson<Report>(reportPath);
  const extras = (opts.merge ?? []).map((p) => readJson<Report>(path.resolve(cfg.root, p)));
  const { report, filledFrom } = mergeReports(base, extras);
  const duelPath = path.resolve(cfg.root, opts.duel ?? 'reports/latest-duel/duel.json');
  const duel = fs.existsSync(duelPath) ? readJson<DuelReport>(duelPath) : undefined;

  const out = path.resolve(cfg.root, opts.out ?? 'site');
  fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(out, 'report.html'), renderHtml(report, out, { public: true }));
  if (duel) fs.writeFileSync(path.join(out, 'duel.html'), renderDuelHtml(duel));
  fs.writeFileSync(
    path.join(out, 'index.html'),
    renderLanding({
      report,
      duel,
      filledFrom,
      repo: opts.repo ?? repoUrl(cfg.root),
      video: opts.video,
      hasExplainer: fs.existsSync(path.join(out, 'assets', 'explainer.mp4')),
    }),
  );
  fs.writeFileSync(path.join(out, '.nojekyll'), '');

  ui.title('Site');
  ui.ok(
    `before ${scoreText(report.before)}, after ${scoreText(report.after)}${duel ? `, duel Red ${duel.score.red} : Blue ${duel.score.blue}` : ''}`,
  );
  for (const [id, run] of Object.entries(filledFrom)) ui.info(`${id}: after-verdict taken from run ${run}`);
  ui.info(
    `Written to ${path.relative(cfg.root, out)}/ (index.html, report.html${duel ? ', duel.html' : ''}).`,
  );
  ui.info('Open site/index.html to check it, then commit site/ and push; the Pages workflow publishes it.');
  return 0;
}
