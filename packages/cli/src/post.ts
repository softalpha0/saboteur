import fs from 'node:fs';
import path from 'node:path';
import { PostWriter, redactSecrets } from '@saboteur/agent';
import { type Report, coverageSummary, scoreText } from '@saboteur/report';
import type { Resolved } from './config.ts';
import type { DuelReport } from './duel.ts';
import { attachRequirements, requirementsCandidates } from './requirements.ts';
import { repoUrl } from './site.ts';
import { ui } from './ui.ts';

/**
 * `saboteur post`: Saboteur writes the launch posts about its own run. Every number comes from
 * report.json (and duel.json). The default writer is a template; --ai has Claude write the blog post
 * from the same facts, and the post is rejected if it contains a number that is not in the facts.
 */

export type PostOptions = {
  report?: string;
  duel?: string;
  todomvc?: string;
  url?: string;
  out?: string;
  ai?: boolean;
};

type Inputs = { report: Report; duel?: DuelReport; second?: Report; site?: string; repo?: string };

const readJson = <T>(p: string): T => JSON.parse(fs.readFileSync(p, 'utf8')) as T;
const short = (s: Report['before']) => scoreText(s).replace(' caught', '');

/** The fact list: the only source of numbers for both the template and Claude. */
export function postFacts(i: Inputs): string {
  const r = i.report;
  const f: string[] = [];
  f.push(
    'Tool: Saboteur. It plants real bugs in a web app one at a time, runs the Kane CLI test suite against each broken build with self-healing off, and scores each bug caught or slipped.',
  );
  f.push(
    "For every bug that slipped, Claude writes a new Kane test. It is kept only if Kane passes it on the correct app and fails it on the bugged app; otherwise Kane's failure text goes back to Claude.",
  );
  f.push(
    'A failed test only counts as a catch if it fails again when re-run on its own. Kane or browser errors never count as catches.',
  );
  f.push(
    `Demo shop: ${r.suiteBefore.length} starter tests caught ${short(r.before)} planted bugs. With Claude's Kane-proven tests (${r.suiteAfter.length} tests): ${short(r.after)}.`,
  );
  if (r.requirements?.length) {
    const c = coverageSummary(r.requirements);
    f.push(
      `Demo shop spec rules with a planted bug that would break without any test noticing: ${c.silentBefore} of ${c.planted} before, ${c.silentAfter} of ${c.planted} after.`,
    );
  }
  const d = i.duel;
  if (d) {
    const holes = d.rounds.filter((x) => x.outcome === 'closed' || x.outcome === 'open');
    f.push(
      `Duel mode: a red Claude invents bugs the current suite misses, a blue Claude writes tests to catch them, Kane referees. Score: Red ${d.score.red} : Blue ${d.score.blue}. Suite ${d.suiteBefore} to ${d.suiteAfter} tests.`,
    );
    for (const h of holes)
      if (h.bug)
        f.push(
          `Duel hole found: ${h.bug.title}${h.outcome === 'closed' ? ' (closed by a Kane-proven test)' : ' (still open)'}.`,
        );
  }
  const s = i.second;
  if (s) {
    f.push(
      `React TodoMVC, an app the author did not write: ${s.suiteBefore.length} starter tests caught ${short(s.before)}. With Claude's Kane-proven tests (${s.suiteAfter.length} tests): ${short(s.after)}.`,
    );
    if (s.requirements?.length) {
      const c = coverageSummary(s.requirements);
      f.push(
        `TodoMVC spec rules with a planted bug that would break silently: ${c.silentBefore} of ${c.planted} before, ${c.silentAfter} of ${c.planted} after.`,
      );
    }
  }
  if (i.site)
    f.push(`Live report: ${i.site}`, `Try the broken builds: ${i.site.replace(/\/$/, '')}/demo/shop/`);
  if (i.repo) f.push(`Code: ${i.repo}`);
  return f.map((x) => `- ${x}`).join('\n');
}

export function templatePosts(i: Inputs): string {
  const r = i.report;
  const d = i.duel;
  const s = i.second;
  const link = i.site ?? i.repo ?? '';
  const x = [
    `My ${r.suiteBefore.length} green tests caught ${short(r.before)} planted bugs.`,
    '',
    'Saboteur breaks the app on purpose, Kane CLI runs the tests on each broken build, and Claude writes a test for every miss. Kane keeps it only if it fails on the bug.',
    '',
    `Now: ${short(r.after)}.${s ? ` On React TodoMVC: ${short(s.before)} → ${short(s.after)}.` : ''}`,
    '',
    link,
  ].join('\n');
  const long = [
    `My tests were green. They caught ${short(r.before)} planted bugs.`,
    '',
    'Saboteur plants one realistic bug at a time, lets Kane CLI run the suite against each broken build with self-healing off, and records which bugs slip through. A catch only counts if the test fails again on its own; Kane or browser errors never count.',
    '',
    'For every miss, Claude writes a new Kane test, kept only if Kane passes it on the correct app and fails it on the bug.',
    '',
    `Demo shop: ${short(r.before)} → ${short(r.after)}.`,
    ...(d
      ? [`Duel (Claude attacks, Claude defends, Kane referees): Red ${d.score.red} : Blue ${d.score.blue}.`]
      : []),
    ...(s ? [`React TodoMVC, an app I didn't write: ${short(s.before)} → ${short(s.after)}.`] : []),
    '',
    link,
  ].join('\n');
  return [
    '# Posts written by Saboteur from report.json',
    '',
    'Every number below comes from the reports. Edit the wording, not the numbers.',
    '',
    `## X (${x.length} characters)`,
    '',
    '```text',
    x,
    '```',
    '',
    '## LinkedIn / long form',
    '',
    '```text',
    long,
    '```',
    '',
    '## Facts used',
    '',
    postFacts(i),
    '',
  ].join('\n');
}

export async function cmdPost(cfg: Resolved, opts: PostOptions, writer?: PostWriter): Promise<number> {
  const reportPath = path.resolve(cfg.root, opts.report ?? 'reports/latest/report.json');
  if (!fs.existsSync(reportPath)) {
    ui.fail(`no report at ${reportPath}`);
    return 1;
  }
  const withReq = (r: Report) => attachRequirements(r, requirementsCandidates(cfg.root, r));
  const duelPath = path.resolve(cfg.root, opts.duel ?? 'reports/latest-duel/duel.json');
  const inputs: Inputs = {
    report: withReq(readJson<Report>(reportPath)),
    duel: fs.existsSync(duelPath) ? readJson<DuelReport>(duelPath) : undefined,
    second: opts.todomvc ? withReq(readJson<Report>(path.resolve(cfg.root, opts.todomvc))) : undefined,
    site: opts.url,
    repo: repoUrl(cfg.root),
  };
  let out = templatePosts(inputs);
  ui.title('Post');
  if (opts.ai) {
    const facts = postFacts(inputs);
    const w = writer ?? new PostWriter();
    const res = await w.write(facts);
    if (res.problems.length) {
      ui.warn(
        `Claude's post was rejected after ${res.attempts} attempt(s): ${res.problems.join('; ')}. Keeping the template posts only.`,
      );
    } else {
      ui.ok(`Claude wrote the blog post (attempt ${res.attempts}); every number in it is in the facts`);
      out = `${out}\n## Blog post (written by Claude from the facts above, checked)\n\n${redactSecrets(res.post)}\n`;
    }
  }
  const file = path.resolve(cfg.root, opts.out ?? 'reports/latest/posts.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, out);
  ui.info(`Written to ${path.relative(cfg.root, file)}`);
  return 0;
}
