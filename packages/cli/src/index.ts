#!/usr/bin/env node
import path from 'node:path';
import { Command } from 'commander';
import { cmdAttack, cmdBaseline, cmdDoctor, cmdFill, cmdReport, cmdRun } from './commands.ts';
import { type Resolved, loadConfig, loadDotEnv } from './config.ts';
import { CreditGuardError, InvalidRunError } from './pipeline.ts';
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
  return c;
}

async function main(fn: () => Promise<number>) {
  try {
    process.exitCode = await fn();
  } catch (err) {
    // Known, user-fixable problems print one line. SABOTEUR_DEBUG=1 shows the stack for anything else.
    const debug = Boolean(process.env.SABOTEUR_DEBUG);
    if (err instanceof CreditGuardError || err instanceof InvalidRunError || !(err instanceof Error))
      ui.fail(String(err instanceof Error ? err.message : err));
    else ui.fail(debug ? (err.stack ?? err.message) : `${err.message}  (set SABOTEUR_DEBUG=1 for details)`);
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
  .action((o: { only?: string; withGenerated?: boolean }) => main(() => cmdAttack(cfg(), o)));

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
  .command('report')
  .description('re-render report.md from a report.json')
  .option('--from <file>', 'report.json to render (default: reports/latest/report.json)')
  .action((o: { from?: string }) => main(() => cmdReport(cfg(), o)));

await program.parseAsync();
