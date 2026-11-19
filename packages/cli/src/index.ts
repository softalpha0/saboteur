#!/usr/bin/env node
import path from 'node:path';
import { redactSecrets } from '@saboteur/agent';
import { Command } from 'commander';
import { cmdAttack, cmdBaseline, cmdDoctor, cmdFill, cmdReport, cmdRun } from './commands.ts';
import { type Resolved, loadConfig, loadDotEnv } from './config.ts';
import { cmdDuel } from './duel.ts';
import { cmdMutate } from './mutate.ts';
import { CreditGuardError, InvalidRunError } from './pipeline.ts';
import { cmdSite } from './site.ts';
import { ui } from './ui.ts';

const program = new Command();
program
  .name('saboteur')
  .description(
    'Plant real bugs, let Kane CLI hunt them, have Claude write Kane-proven tests for the ones that slip through.',
  )
  .option('-c, --config <file>', 'config file', 'saboteur.config.json');

function cfg(): Resolved {
  const c = loadConfig(program.opts<{ config: string }>().config);
  loadDotEnv(path.join(c.root, '.env'));
  // A config in a subfolder (examples/todomvc) still picks up the repo's .env when run from the repo root.
  loadDotEnv(path.resolve('.env'));
  return c;
}

async function main(fn: () => Promise<number>) {
  try {
    process.exitCode = await fn();
  } catch (err) {
    // Known, user-fixable problems print one line. SABOTEUR_DEBUG=1 shows the stack for anything else.
    const debug = Boolean(process.env.SABOTEUR_DEBUG);
    if (err instanceof CreditGuardError || err instanceof InvalidRunError || !(err instanceof Error))
      ui.fail(redactSecrets(String(err instanceof Error ? err.message : err)));
    else
      ui.fail(
        redactSecrets(
          debug ? (err.stack ?? err.message) : `${err.message}  (set SABOTEUR_DEBUG=1 for details)`,
        ),
      );
    process.exitCode = 1;
  }
}

program
  .command('doctor')
  .description('check Kane sign-in, credits, Chrome, suite, patches, app build, port, Claude key')
  .option('--replay', 'skip the Claude key check')
  .action((o: { replay?: boolean }) => main(() => cmdDoctor(cfg(), { live: !o.replay })));

program
  .command('baseline')
  .description('build the clean app and require the whole Kane suite to pass (records new tests)')
  .action(() => main(() => cmdBaseline(cfg())));

program
  .command('attack')
  .description('apply each bug, run the Kane suite with --no-adaptive-heal, record caught / slipped')
  .option('--only <ids>', 'comma-separated mutant ids, e.g. M03,M05')
  .option('--with-generated', 'include tests/kane/generated in the suite')
  .option('--resume', 'keep verdicts from an interrupted attack on the same suite; run only the rest')
  .action((o: { only?: string; withGenerated?: boolean; resume?: boolean }) =>
    main(() => cmdAttack(cfg(), o)),
  );

program
  .command('fill')
  .description(
    'for each survivor of the last attack: Claude writes a _test.md, Kane must pass it on clean and fail it on the bug',
  )
  .option('--only <ids>', 'comma-separated mutant ids')
  .action((o: { only?: string }) => main(() => cmdFill(cfg(), o)));

program
  .command('run')
  .description('doctor → baseline → attack → fill → re-attack → report')
  .option('--replay', 'skip Claude; use the committed tests in tests/kane/generated')
  .option('--only <ids>', 'comma-separated mutant ids')
  .action((o: { replay?: boolean; only?: string }) =>
    main(() => cmdRun(cfg(), { replay: Boolean(o.replay), only: o.only })),
  );

program
  .command('mutate')
  .description(
    'S4: Claude proposes new bugs for your app; kept only if they apply, build, and Kane sees them',
  )
  .option('--ai', 'have Claude propose bugs (the only mode; hand-written patches go in the mutations folder)')
  .option('--count <n>', 'how many bugs to ask for', '5')
  .option('--dry-run', 'check that proposals apply and build; no Kane runs, nothing saved')
  .action((o: { ai?: boolean; count: string; dryRun?: boolean }) =>
    main(async () => {
      if (!o.ai) {
        ui.fail(
          'use "saboteur mutate --ai". Hand-written bugs: add a patch + manifest entry (docs/05-MUTATIONS.md).',
        );
        return 1;
      }
      const count = Number(o.count);
      if (!Number.isInteger(count) || count < 1 || count > 20)
        throw new Error('--count must be a whole number from 1 to 20');
      return cmdMutate(cfg(), { count, dryRun: o.dryRun });
    }),
  );

program
  .command('duel')
  .description(
    'red team vs blue team: Claude plants bugs your tests miss, Claude writes tests to catch them, Kane referees',
  )
  .option('--rounds <n>', 'how many rounds', '3')
  .action((o: { rounds: string }) =>
    main(async () => {
      const rounds = Number(o.rounds);
      if (!Number.isInteger(rounds) || rounds < 1 || rounds > 20)
        throw new Error('--rounds must be a whole number from 1 to 20');
      return cmdDuel(cfg(), { rounds });
    }),
  );

program
  .command('site')
  .description('build a public static site (landing page, report, duel) from your real reports into site/')
  .option('--report <file>', 'main report.json (default: reports/latest/report.json)')
  .option(
    '--merge <files...>',
    'attack report.json files that fill in bugs the main report has no verdict for',
  )
  .option('--duel <file>', 'duel.json (default: reports/latest-duel/duel.json)')
  .option('--video <url>', 'link to your demo video')
  .option('--repo <url>', 'source repo link (default: from git remote origin)')
  .action((o: { report?: string; merge?: string[]; duel?: string; video?: string; repo?: string }) =>
    main(() => cmdSite(cfg(), o)),
  );

program
  .command('report')
  .description('re-render report.md from a report.json')
  .option('--from <file>', 'report.json to render (default: reports/latest/report.json)')
  .action((o: { from?: string }) => main(() => cmdReport(cfg(), o)));

await program.parseAsync();
