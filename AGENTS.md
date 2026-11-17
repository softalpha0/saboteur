# AGENTS.md — briefing for coding agents (Claude Code, Codex, Gemini)

Read this whole file before writing code. Then read `docs/02-HACKATHON-RULES.md` and `docs/03-KANE-INTEGRATION.md`. When in doubt, those two files win over your memory of Kane CLI.

## 1. What we're building

**Saboteur**: plants real bugs in a web app one at a time, runs the app's Kane CLI test suite against each broken build, reports which bugs Kane caught and which got through, then has Claude write a new Kane `_test.md` for each miss and keeps it only if Kane proves it passes on the clean app and fails on the bugged app.

- PRD: `docs/01-PRD.md`
- Architecture + contracts: `docs/04-ARCHITECTURE.md`
- Mutations: `docs/05-MUTATIONS.md`
- Claude prompts + loop: `docs/06-AGENT-PROMPTS.md`
- Plan: `docs/07-BUILD-PLAN.md`

## 2. Done statement

On a fresh clone, `pnpm saboteur run` on the demo shop prints a before score and an after score, writes `reports/latest/report.md` + `report.json`, and every verdict links to a real Kane result.

## 3. Hard rules (hackathon)

1. Deadline Thu 19 Nov 2026, 11:59 PM IST (7:29 PM Lagos). Feature freeze Thu 10:00 AM Lagos.
2. Everything in this repo is new work from 18 Nov onward. Don't paste in code from other projects.
3. All browser work goes through **Kane CLI**. No Playwright/Puppeteer/Selenium of our own. No fake Kane results, ever.
4. Judges must be able to run it: keep `--replay` mode working (no Anthropic key needed).
5. Never commit secrets, `.env`, or `.testmuai/evidence/`. Do commit `output-*/` folders next to `_test.md` files.
6. Numbers in README/report come only from real runs.

## 4. Kane CLI rules (from the official docs — don't improvise)

1. Only `packages/kane` spawns `kane-cli`. Everyone else calls its functions.
2. Spawn with `stdio: ['ignore', 'pipe', 'pipe']` and pass `--agent` → NDJSON on stdout, progress on stderr.
3. Commands we use:
   - suite: `kane-cli testrun run <a_test.md> <b_test.md> … --agent --headless [--no-adaptive-heal] [--parallel N]` → ends with `testrun_done`. Paths must be explicit `_test.md` files (a folder is not a valid path); `packages/kane` globs `tests/kane/**/*_test.md` and passes them
   - one file: `kane-cli testmd run <file> --agent --headless [--no-adaptive-heal]` → ends with `test_md_done`
   - ad-hoc (fallback): `kane-cli run "<objective>" --agent --headless` → ends with `run_end`
4. Always read the exit code too. Exit codes and every event field: `docs/03-KANE-INTEGRATION.md` §2–3.
5. Mutant runs use `--no-adaptive-heal`. Clean runs don't.
6. If events stop for > 60 s and the process is alive, wait. Kane has its own timeout.
7. `run_end.run_dir` is legacy, don't read it. Evidence lives in the pack (`{session_dir}/evidence/*.evidence`, a zip).
8. Writing `_test.md`: name ends `_test.md`; frontmatter keys only from the documented list (unknown keys are rejected); every step is `## Heading` + plain-English objective; every step ends in a visible check of the result. Full rules: `docs/03` §5.
9. CI auth: `--username "$LT_USERNAME" --access-key "$LT_ACCESS_KEY"`. Never `kane-cli login` in CI. Never ask a human to paste an access key into chat.
10. Stop and report clearly if kane-cli is not installed, not signed in, or out of credits.

Kane's own agent instructions can be appended here with:
`curl -fsSL https://www.testmuai.com/kane-cli-agent/AGENTS.md >> AGENTS.md`
(PowerShell: `cmd /c "curl.exe -fsSL https://www.testmuai.com/kane-cli-agent/AGENTS.md >> AGENTS.md"`). Or install the skill: `npx @testmuai/kane-cli-skill`.

## 5. Stack and commands

- Node 20+, pnpm workspaces, TypeScript strict, Biome, Vitest.
- Demo app: Vite + React + TS in `apps/shop`, served by `vite preview --port 4173 --strictPort`.
- LLM: `@anthropic-ai/sdk`; model from `ANTHROPIC_MODEL` env; never hard-code a model id.
- Developer is on **Windows/PowerShell**: use `node:path`, no bash-only scripts in `package.json`, no `rm -rf` (use `fs.rm`).

```bash
pnpm i
pnpm --filter shop dev          # app dev server
pnpm --filter shop preview      # :4173
pnpm saboteur doctor
pnpm saboteur baseline
pnpm saboteur attack [--only M03]
pnpm saboteur fill [--only M03]
pnpm saboteur run [--replay]
pnpm test && pnpm biome check && pnpm -r typecheck
```

## 6. How to work

1. Make a plan first, then build one feature at a time. Commit after each working feature (`feat(kane): parse testrun events`).
2. Riskiest first: the hour-1 spike in `docs/07` §1 decides how attack runs work. Don't build `attack` until the spike result is in `BUILD_LOG.md`.
3. Keep `main` working. Pull before work.
4. After each block, add a dated line to `BUILD_LOG.md`: what works, credits used, what's next.
5. Stuck 30 min: write state to `BUILD_LOG.md`, then simplify or cut. Cut order: `docs/07` §5.
6. Don't edit `apps/shop/ROUTES.md` without changing the app in the same commit (Claude's prompts depend on it).
7. Don't change mutant patches after a report has been generated from them; add a new mutant id instead.

## 7. Style for anything public (README, report, posts)

Plain words, short sentences, no hype ("revolutionary", "seamless", "leverage", "unlock"), no em dashes in public copy. Write like a developer explaining it to a friend.
