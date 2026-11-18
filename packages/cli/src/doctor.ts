import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { modelFromEnv } from '@saboteur/agent';
import { balance, dryRunSuite, version } from '@saboteur/kane';
import { assertPortFree, checkPatch, cleanup, loadManifest, prepare } from '@saboteur/mutator';
import type { Resolved } from './config.ts';
import { loadProven } from './pipeline.ts';
import { relPaths, suites } from './suite.ts';
import { ui } from './ui.ts';

export type DoctorResult = { ok: boolean; failures: string[]; credits?: number; kaneVersion?: string };

const CHROME_CANDIDATES: Record<string, string[]> = {
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA ?? ''}\\Google\\Chrome\\Application\\chrome.exe`,
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ],
};

function findChrome(): string | undefined {
  const env = process.env.KANE_CLI_CHROME_PATH;
  if (env && fs.existsSync(env)) return env;
  return (CHROME_CANDIDATES[process.platform] ?? []).find((p) => p && fs.existsSync(p));
}

export async function doctor(
  cfg: Resolved,
  opts: { live: boolean; logDir: string; build?: boolean },
): Promise<DoctorResult> {
  ui.title('Doctor');
  const failures: string[] = [];
  const fail = (s: string) => {
    failures.push(s);
    ui.fail(s);
  };
  const res: DoctorResult = { ok: true, failures };

  const major = Number(process.versions.node.split('.')[0]);
  if (major >= 20) ui.ok(`Node ${process.versions.node}`);
  else fail(`Node ${process.versions.node}: Saboteur needs Node 20+`);

  // Kane installed + signed in + credits (AGENTS.md §4.10: stop and report clearly).
  const v = await version(cfg.root, opts.logDir);
  if (v.exitCode !== 0) {
    fail('kane-cli is not installed or not on PATH. Install: npm install -g @testmuai/kane-cli');
  } else {
    res.kaneVersion = v.output.split(/\s+/).find((w) => /^\d+\.\d+\.\d+/.test(w)) ?? v.output;
    ui.ok(`kane-cli ${res.kaneVersion}`);
    const b = await balance(cfg.root, opts.logDir);
    if (b.exitCode !== 0) {
      fail(
        process.env.LT_USERNAME
          ? `Kane basic auth failed (LT_USERNAME/LT_ACCESS_KEY): ${b.output.split('\n')[0]}`
          : `Kane is not signed in (${b.output.split('\n')[0]}). Run "kane-cli login" (and "kane-cli config project").`,
      );
    } else if (b.credits === undefined) {
      ui.warn(`signed in; could not read a credit number from: ${b.output.split('\n')[0]}`);
    } else if (b.credits < cfg.kane.minCredits) {
      res.credits = b.credits;
      fail(
        `only ${b.credits} credits, under minCredits ${cfg.kane.minCredits}. Claim or top up credits, or lower kane.minCredits.`,
      );
    } else {
      res.credits = b.credits;
      ui.ok(`signed in, ${b.credits} credits (floor ${cfg.kane.minCredits})`);
    }
  }

  // Kane keeps screenshots and logs for every run under ~/.testmuai; a full disk crashes Chrome mid-run.
  try {
    const st = await fs.promises.statfs(os.homedir());
    const freeGb = (st.bavail * st.bsize) / 1024 ** 3;
    if (freeGb < 2)
      fail(
        `only ${freeGb.toFixed(1)} GB free on the drive with your home folder; Kane needs room for screenshots and logs. Free some space (see README: disk space).`,
      );
    else if (freeGb < 5)
      ui.warn(`${freeGb.toFixed(1)} GB free disk space; a full attack writes a lot of Kane screenshots`);
    else ui.ok(`${freeGb.toFixed(0)} GB free disk space`);
  } catch {
    // statfs is not available everywhere; skip the check
  }

  const chrome = findChrome();
  if (chrome) ui.ok(`Chrome: ${chrome}`);
  else ui.warn('Chrome not found in the usual places. Kane needs Chrome on PATH or KANE_CLI_CHROME_PATH.');

  // Suite.
  const s = suites(cfg.abs.tests, cfg.abs.generated);
  if (s.base.length === 0)
    fail(`no *_test.md files under ${path.relative(cfg.root, cfg.abs.tests)} (outside the generated folder)`);
  else ui.ok(`suite: ${s.base.length} test(s) to score, ${s.generated.length} generated test(s)`);
  if (s.generated.length) {
    const proven = provenFiles(cfg);
    const unproven = s.generated.map((f) => path.basename(f)).filter((f) => !proven.has(f));
    if (unproven.length) {
      ui.warn(
        `${unproven.length} generated test(s) have no record of Kane proving them (pass on clean AND fail on the bug):`,
      );
      for (const f of unproven) ui.info(`    ${f}`);
      ui.info(
        '    Likely left behind by a stopped fill. Quarantine them: mkdir tests/kane/quarantine; git mv tests/kane/generated/<file> tests/kane/quarantine/',
      );
    } else {
      ui.ok(`all ${s.generated.length} generated test(s) were proven by Kane`);
    }
  }

  if (failures.length === 0 && s.all.length) {
    const dry = await dryRunSuite(relPaths(cfg.root, s.all), cfg.root, opts.logDir);
    if (dry.exitCode === 0 && dry.digest.planValid !== false)
      ui.ok('Kane preflight (testrun --dry-run): plan valid');
    else {
      fail(`Kane preflight failed (exit ${dry.exitCode})`);
      for (const f of dry.digest.planFailures) ui.info(`  ${f}`);
      if (!dry.digest.planFailures.length && dry.stderrTail)
        ui.info(`  ${dry.stderrTail.trim().split('\n').slice(-3).join(' ')}`);
    }
  }

  // Mutation catalog.
  try {
    const manifest = loadManifest(cfg.abs.manifest);
    const bad: string[] = [];
    for (const m of manifest.mutants) {
      const r = await checkPatch(
        cfg.abs.app,
        manifest,
        m,
        cfg.workDir ? path.resolve(cfg.root, cfg.workDir) : undefined,
      );
      if (r.code !== 0) bad.push(`${m.id}: ${r.output.trim().split('\n')[0]}`);
    }
    if (bad.length) fail(`patches that do not apply: ${bad.join('; ')}`);
    else ui.ok(`mutations: ${manifest.mutants.length} patch(es) apply cleanly`);
  } catch (err) {
    fail(`mutation manifest: ${err instanceof Error ? err.message : String(err)}`);
  }

  // App builds + port free.
  try {
    await assertPortFree(cfg.app.url);
    ui.ok(`${cfg.app.url} is free`);
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
  if (opts.build !== false) {
    try {
      const { dir } = await prepare({
        appDir: cfg.abs.app,
        buildCmd: cfg.app.build,
        workRoot: cfg.workDir ? path.resolve(cfg.root, cfg.workDir) : undefined,
        logFile: path.join(opts.logDir, 'build-doctor.log'),
      });
      await cleanup(dir);
      ui.ok(`app builds (${cfg.app.build})`);
    } catch (err) {
      fail(`app build failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Claude (live mode only).
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  const hasModel = Boolean(process.env.ANTHROPIC_MODEL?.trim());
  let modelProblem: string | undefined;
  try {
    if (hasModel) modelFromEnv();
  } catch (err) {
    modelProblem = (err as Error).message; // never contains the value itself
  }
  if (modelProblem) fail(`Claude: ${modelProblem}`);
  else if (hasKey && hasModel) ui.ok(`Claude: key set, model ${process.env.ANTHROPIC_MODEL}`);
  else if (opts.live)
    fail('Claude: set ANTHROPIC_API_KEY and ANTHROPIC_MODEL in .env (or use --replay, which needs neither)');
  else ui.warn('Claude key/model not set: fine for --replay, needed for the live fill loop');

  res.ok = failures.length === 0;
  if (res.ok) ui.ok('ready');
  return res;
}

/** Generated tests Kane proved: proven.json, plus "accepted" decisions in fill transcripts (older runs). */
export function provenFiles(cfg: Resolved): Set<string> {
  const out = new Set(loadProven(cfg.abs.generated).map((e) => e.file));
  const runs = path.join(cfg.root, 'evidence', 'runs');
  if (!fs.existsSync(runs)) return out;
  for (const run of fs.readdirSync(runs)) {
    const dir = path.join(runs, run);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).filter((n) => /^fill-.*\.md$/.test(n))) {
      const text = fs.readFileSync(path.join(dir, f), 'utf8');
      for (const m of text.matchAll(/\*\*Decision:\*\* accepted\. Saved `([^`]+)`/g)) {
        if (m[1]) out.add(path.basename(m[1]));
      }
    }
  }
  return out;
}
