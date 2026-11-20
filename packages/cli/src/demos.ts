import fs from 'node:fs';
import path from 'node:path';
import { cleanup, prepare, readDiff } from '@saboteur/mutator';
import type { Resolved } from './config.ts';
import { createContext } from './context.ts';
import { repoUrl } from './site.ts';
import { ui } from './ui.ts';

/**
 * Build the clean app and every bugged version as static sites for the live demo:
 *   <site>/demo/<name>/index.html   bug switcher (what each bug does, its patch, links)
 *   <site>/demo/<name>/clean/       the correct app
 *   <site>/demo/<name>/M01/ ...     the app with exactly one planted bug
 *   <site>/404.html                 sends deep links (e.g. /cart after a refresh) back into the right build
 * No Kane runs and no credits: these are the same builds Saboteur tests, served for people to click.
 */

export type DemosOptions = { site?: string; name?: string; basePath?: string };

const esc = (s: string | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function defaultBasePath(root: string): string {
  const repo = repoUrl(root)?.split('/').pop();
  return repo ? `/${repo}/demo` : '/demo';
}

export const notFoundPage = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Not found</title>
<script>
// A refresh on a deep link of a demo build (e.g. .../demo/shop/M10/cart) lands here.
// Send it to that build with the path in ?p=, which the app puts back in the address bar.
(function () {
  var m = location.pathname.match(/^(.*\\/demo\\/[^/]+\\/[^/]+\\/)(.+)$/);
  if (m) location.replace(m[1] + '?p=' + encodeURIComponent('/' + m[2]) + location.hash);
})();
</script></head>
<body style="font:17px system-ui;padding:40px"><h1>Page not found</h1><p><a href="/">Home</a></p></body></html>
`;

type Entry = { id: string; title: string; impact: string; diff?: string };

export function renderSwitcher(appName: string, entries: Entry[], hint = ''): string {
  const [clean, ...bugs] = entries;
  const card = (e: Entry) => `<div class="bug">
<div class="top"><span class="id">${esc(e.id)}</span><b>${esc(e.title)}</b><a class="btn" href="${esc(e.id)}/">Open this build</a></div>
<p>${esc(e.impact)}</p>
${e.diff ? `<details><summary>The patch</summary><pre>${esc(e.diff)}</pre></details>` : ''}
</div>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(appName)} bugs</title>
<style>
:root{--bg:#fafaf7;--fg:#1d1d1f;--muted:#62626a;--card:#fff;--line:#e6e6e2;--red:#c4372b;--green:#1f7a3a}
@media (prefers-color-scheme:dark){:root{--bg:#0e1013;--fg:#f1f1f3;--muted:#a0a3ac;--card:#161920;--line:#262a33;--red:#ff6b5e;--green:#3ccf7a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:900px;margin:0 auto;padding:40px 16px 64px}
h1{font-size:clamp(30px,5vw,44px);letter-spacing:-1px;margin:0 0 8px}.lead{color:var(--muted);margin:0 0 24px}
.bug{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin:12px 0}
.bug.clean{border-color:var(--green)}
.top{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.top b{flex:1;min-width:200px}
.id{font-weight:800;color:var(--red);min-width:42px}.clean .id{color:var(--green)}
.bug p{margin:8px 0 0;color:var(--muted)}
.btn{padding:7px 12px;border-radius:9px;border:1px solid var(--line);color:var(--fg);text-decoration:none;font-weight:600;font-size:14px}
details{margin-top:8px}summary{cursor:pointer;color:var(--muted);font-size:14px}
pre{overflow-x:auto;font-size:13px;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px}
a{color:inherit}
</style></head><body><main>
<p><a href="../../">← Saboteur</a></p>
<h1>${esc(appName)}: try the bugs</h1>
<p class="lead">These are the builds Saboteur tests: the correct app, and the same app with exactly one planted bug each. Open one, use it like a customer, and see whether you would have noticed. Saboteur's Kane CLI runs used local builds of the same code.</p>
${hint ? `<p class="lead">${esc(hint)}</p>` : ''}
${clean ? card(clean).replace('class="bug"', 'class="bug clean"') : ''}
${bugs.map(card).join('\n')}
</main></body></html>
`;
}

export async function cmdDemos(cfg: Resolved, opts: DemosOptions): Promise<number> {
  const ctx = createContext(cfg);
  const name = opts.name ?? path.basename(cfg.abs.app);
  const site = path.resolve(opts.site ?? path.join(process.cwd(), 'site'));
  const out = path.join(site, 'demo', name);
  const basePath = (opts.basePath ?? defaultBasePath(cfg.root)).replace(/\/$/, '');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });

  ui.title(`Demo builds: ${name}`);
  const entries: Entry[] = [
    { id: 'clean', title: 'The correct app', impact: 'No planted bug. Everything works as described.' },
    ...ctx.manifest.mutants.map((m) => ({
      id: m.id,
      title: m.title,
      impact: m.userImpact,
      diff: readDiff(ctx.manifest, m),
    })),
  ];
  for (const e of entries) {
    const mutant = ctx.manifest.mutants.find((m) => m.id === e.id);
    const { dir } = await prepare({
      appDir: cfg.abs.app,
      buildCmd: `${cfg.app.build} --base ${basePath}/${name}/${e.id}/`,
      workRoot: ctx.workRoot,
      manifest: ctx.manifest,
      mutant,
      logFile: path.join(ctx.evidenceDir, `build-demo-${e.id}.log`),
    });
    fs.cpSync(path.join(dir, 'dist'), path.join(out, e.id), { recursive: true });
    await cleanup(dir);
    ui.ok(`${e.id} built`);
  }
  fs.writeFileSync(
    path.join(out, 'index.html'),
    renderSwitcher(
      name === 'shop' ? 'Saboteur Shop' : name,
      entries,
      name === 'shop' ? 'Test account: demo@saboteur.shop / sabotage123. Discount code: SAVE10.' : '',
    ),
  );
  fs.writeFileSync(path.join(site, '404.html'), notFoundPage);
  ui.info(`Written to ${path.relative(process.cwd(), out)}/ (served at ${basePath}/${name}/).`);
  return 0;
}
