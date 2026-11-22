# Saboteur

**Find out which bugs your Kane tests would miss, then let Claude write the tests that catch them, proven by Kane.**

[![CI](https://github.com/softalpha0/saboteur/actions/workflows/ci.yml/badge.svg)](https://github.com/softalpha0/saboteur/actions/workflows/ci.yml)
![Verified with Kane CLI](https://img.shields.io/badge/verified%20with-Kane%20CLI-6b4fbb)

🌐 **Live results:** [softalpha0.github.io/saboteur](https://softalpha0.github.io/saboteur/) · ▶️ **Demo video:** [youtu.be/_3oNNZhODN0](https://youtu.be/_3oNNZhODN0) · 🐞 **Try the bugs:** [live broken builds](https://softalpha0.github.io/saboteur/demo/shop/) · 📊 **Evidence:** [`evidence/README.md`](evidence/README.md) · 🏁 Built for the [KaneCLI Online Hackathon](https://www.kaneclihack.sh/) (TestMu AI, Nov 2026)

> **Before: 0/10** planted bugs caught by the 4 starter tests → **After: 10/10** with 14 Claude-written tests, each proven by Kane.
> **Duel:** a red Claude then found 3 more bugs the 18-test suite missed; a blue Claude closed all 3 with Kane-proven tests. **Red 3 : Blue 3**, suite 18 → 21.
> **An app we didn't write:** on the official React TodoMVC, the 4 starter tests caught **2/10**; with Claude's Kane-proven tests, **10/10** (suite 4 → 11). By spec rule: **7 of 7** rules with a planted bug would have broken silently before, **0 of 7** after.
> Real Kane CLI runs on Windows, 18 to 20 Nov 2026. Details: [`evidence/README.md`](evidence/README.md).
> **Use it from your coding agent:** `pnpm saboteur skill --install`, then ask *"use saboteur to check my tests"*.

---

## Contents

1. [The problem](#the-problem)
2. [What it does](#what-it-does)
3. [Try it](#try-it)
4. [How it works](#how-it-works)
5. [Guarantees](#guarantees)
6. [Verified evidence](#verified-evidence)
7. [Tech stack](#tech-stack)
8. [Run it yourself](#run-it-yourself)
9. [Second app: TodoMVC](#second-app-todomvc)
10. [Testing](#testing)
11. [Project layout](#project-layout)
12. [Known limitations](#known-limitations)
13. [Build log](#build-log)
14. [Credits](#credits)

## The problem

Coding agents write our apps and our end-to-end tests now. A green suite tells you the app works today. It doesn't tell you whether those tests would notice tomorrow's bug. A browser test can click all the way through checkout and still pass when the total is wrong.

## What it does

1. **Plants bugs.** Ten small, realistic bugs (wrong total, dead "+" button, 1% instead of 10% discount, bad redirect…), one at a time, each as a real code patch.
2. **Lets Kane hunt.** Runs your Kane CLI suite against each broken build in real Chrome, with healing turned off so a broken page fails instead of being worked around.
3. **Scores the suite.** Killed = Kane caught it. Survived = it got through.
4. **Closes the gaps.** For each survivor, Claude writes a new `_test.md`. Kane runs it twice: it must **pass on the correct app** and **fail on the bugged app**. If not, Kane's own failure message goes back to Claude for another try (max 3).
5. **Reports.** Before/after score, per-bug table, Kane failure messages, links to every run.

- **Agent used:** Claude (Anthropic API) writes and revises tests. Built with Claude Code.
- **What Kane does:** every pass/fail verdict in Saboteur is a Kane verdict (`testrun run`, `testmd run`, `--no-adaptive-heal`).

## Try it

Judges: you already have Kane CLI access. This path needs **no Anthropic key**.

```bash
git clone https://github.com/softalpha0/saboteur && cd saboteur
pnpm i
npm i -g @testmuai/kane-cli
kane-cli login                 # then: kane-cli config project
pnpm saboteur doctor --replay  # Kane signed in, credits, Chrome, patches apply, app builds
pnpm saboteur run --replay     # uses the Claude-written tests we committed; Kane still proves them
```

No setup at all: open the [live broken builds](https://softalpha0.github.io/saboteur/demo/shop/) and try each bug in your browser.

Live loop (Claude writes new tests): copy `.env.example` to `.env`, set `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`, then `pnpm saboteur run`.

## How it works

```mermaid
flowchart LR
  A[Clean shop] -->|Kane suite must pass| B[Baseline OK]
  B --> C{For each bug patch}
  C -->|apply + build + serve| D[Bugged shop]
  D -->|kane-cli testrun --no-adaptive-heal| E{Kane verdict}
  E -->|a test failed| K[Killed]
  E -->|all passed| S[Survived]
  S --> F[Claude writes _test.md]
  F -->|Kane: must PASS on clean| G{ok?}
  G -->|no: Kane failure text| F
  G -->|yes| H[Kane: must FAIL on bugged]
  H -->|passed: Kane summary| F
  H -->|failed| P[Proven test saved]
  P --> R[Re-attack -> after score]
```

More diagrams (sequence, mutant state machine): [`docs/04-ARCHITECTURE.md`](docs/04-ARCHITECTURE.md).

## Guarantees

| Guarantee | How |
|---|---|
| A test is only added if Kane proves it | Accepted only on Kane exit 0 on clean **and** exit 1 on the bugged build |
| No healing around bugs | Bugged builds run with `--no-adaptive-heal` |
| The suite is valid before attacking | Baseline must pass on the clean build; any test authored during a bugged run invalidates that run |
| Product code is never changed | Bugs are applied to a temp copy; Saboteur only writes test files |
| Every number is traceable | Each verdict stores Kane's execution id, failure message and link |

## Verified evidence

See [`evidence/README.md`](evidence/README.md): per-bug Kane results, which test caught each bug, the duel rounds, credits used, and what went wrong along the way.

## Tech stack

TypeScript · Node 20 · pnpm workspaces · Vite + React (demo shop) · **Kane CLI 0.10.x** · Anthropic SDK (Claude) · commander · Vitest · Biome

## Run it yourself

1. Node 20+, pnpm, Chrome on PATH.
2. `npm i -g @testmuai/kane-cli`, then `kane-cli login` and `kane-cli config project`.
3. `pnpm i`
4. `pnpm saboteur doctor` (checks Kane sign-in, credits, Chrome, app build)
5. `pnpm saboteur run` (or `--replay`)

Your own app: edit `saboteur.config.json` (build/serve commands, URL, tests dir, bug patches). See [`docs/05-MUTATIONS.md`](docs/05-MUTATIONS.md).

### Use it from your coding agent

Saboteur ships as an agent skill (`skills/saboteur/SKILL.md`), the same way TestMu AI ships its Kane CLI skill. In this repo, Claude Code picks it up automatically from `.claude/skills/`. To add it to your own project:

```bash
pnpm saboteur skill --install --dir <your project>
```

Then ask your agent: *"use saboteur to check how good my tests are"*. The skill tells the agent to run `doctor` first, state the credit cost and ask before spending, report only numbers from `report.json`, and never count a Kane or browser error as a caught bug. Other agents that read `SKILL.md` files can use the same file.

### Requirement coverage

A bug count says how many planted bugs slipped. Requirement coverage says **which rules of your spec would break without any test noticing**. `mutations/requirements.json` (next to the manifest) maps each rule in `ROUTES.md` to the bugs that break it; the report then shows each rule as *breaks silently*, *guarded*, or *no bug planted*. On TodoMVC the starter tests caught 2 of 10 bugs, yet every one of the 7 rules with a planted bug still had a bug that slipped, so all 7 would break silently.

### Commands

| Command | What it does |
|---|---|
| `pnpm saboteur doctor [--replay]` | Kane installed and signed in, credits above `minCredits`, Chrome, suite found, Kane preflight (`testrun --dry-run`), every patch applies, app builds, port free, Claude key (live mode only) |
| `pnpm saboteur baseline` | Builds the clean app, runs every `_test.md` with healing on. Must exit 0. New tests get recorded here |
| `pnpm saboteur attack [--only M03] [--with-generated] [--resume]` | For each bug: copy the app, `git apply`, build, serve on :4173, `kane-cli testrun run ... --no-adaptive-heal`, classify. Saves after every bug; `--resume` picks up an interrupted attack. Tests within a bug run `kane.parallel` at a time (default 2), and an attack stops at the first failed test (`--on-failure fail-fast`), since one failure already means caught |
| `pnpm saboteur fill [--only M03]` | For each survivor of the last attack: Claude writes one `_test.md`, Kane must pass it on the clean build and fail it on the bugged build (max 3 tries) |
| `pnpm saboteur run [--replay] [--only ...]` | doctor, baseline, attack with the starter suite (before score), re-attack survivors with generated tests already in the repo, fill what still slips through (skipped with `--replay`), re-attack, write the report (after score) |
| `pnpm saboteur mutate --ai [--count 5] [--dry-run]` | Claude proposes new bugs for your app as small find/replace edits. Saboteur makes the patch itself and keeps a bug only if it applies, builds, changes the build output, and Kane confirms it is visible: Claude's check must pass on the bugged build and fail on the correct one. Kept bugs go to `mutations/ai/` and the manifest (`"source": "ai"`) |
| `pnpm saboteur duel [--rounds 3]` | Red team vs blue team, with Kane as the referee. Each round a red Claude agent reads your current tests and plants a bug it thinks they will miss; Kane proves the bug is real and runs the whole suite against it. Caught: blue scores. Slipped: red scores, then a blue Claude agent writes a test, and if Kane proves it the hole is closed (blue scores) and the suite grows. Report: `reports/latest-duel/duel.html` |
| `pnpm saboteur site [--merge <attack report.json>] [--video <url>]` | Builds a public static site in `site/` from your real reports: a landing page with the numbers, the full report (no local log paths) and the duel scoreboard. Push it and `.github/workflows/pages.yml` publishes it to GitHub Pages |
| `pnpm saboteur report` | Re-render `reports/latest/report.md` and `report.html` from `report.json` |

Every report is written three ways: `report.json`, `report.md` and a static `report.html` (open it in a browser).

On GitHub: `.github/workflows/saboteur.yml` runs `saboteur attack` with real Kane on a pull request labelled `saboteur` (or by hand) and posts the report as a PR comment. It needs repo secrets `LT_USERNAME` and `LT_ACCESS_KEY`, and spends credits, so it never runs unless asked.

Logs for every run: `evidence/runs/<run-id>/` (Kane NDJSON, Kane stderr, build and serve logs, one `fill-<bug>.md` transcript per survivor).

## Second app: TodoMVC

Saboteur is not tied to the demo shop. `apps/todomvc` is the official React [TodoMVC](https://github.com/tastejs/todomvc) (MIT), with only its build switched to Vite and nothing in `src/` changed. It has 10 hand-written bugs (`apps/todomvc/mutations/`), 4 starter Kane tests (`examples/todomvc/tests/starter/`) and its own config. Everything runs the same way through `pnpm todomvc`:

```bash
pnpm todomvc doctor
pnpm todomvc baseline
pnpm todomvc attack
pnpm todomvc fill
pnpm todomvc duel
```

**Real result:** the 4 starter tests caught **2 of 10** bugs. With Claude's Kane-proven tests: **10 of 10** (suite 4 → 11). Per-bug table: [`evidence/README.md`](evidence/README.md#3b-second-app-react-todomvc-an-app-we-didnt-write). Reports go to `examples/todomvc/reports/`.

## Testing

`pnpm test` (Vitest: Kane NDJSON parser, verdict rules, `_test.md` validator, prompts, report, every patch applies and builds, and the fill loop and `run --replay` end to end against real builds of the shop with a scripted stand-in for `kane-cli`, so CI spends no credits) · `pnpm biome check` · `pnpm -r typecheck`. Kane-backed checks: [`docs/09-TESTING.md`](docs/09-TESTING.md).

## Project layout

```
apps/shop/            demo shop + mutations/ (bug patches) + ROUTES.md
apps/todomvc/         TodoMVC (React, MIT, from tastejs/todomvc) + its mutations/ + ROUTES.md
examples/todomvc/     Saboteur config + starter Kane tests for TodoMVC
packages/cli          saboteur CLI
packages/kane         the only code that calls kane-cli
packages/agent        Claude prompts + _test.md validator
packages/mutator      apply patch, build, serve
packages/report       report.json + report.md
tests/kane/starter    hand-written Kane tests
tests/kane/generated  Claude-written, Kane-proven tests
docs/                 PRD, rules, Kane integration, architecture, plan
evidence/             real run results and links
```

## Known limitations

- A full attack takes a while: every bug is a fresh build plus a Kane replay. On our Windows laptop the first full run took hours (tests one at a time, every test run for every bug). With 2 tests at a time and fail-fast, a caught bug takes about 1 to 3 minutes; a bug that slips runs the whole suite.
- On a slow machine Kane's browser can crash or time out. Saboteur never counts that as a caught bug: it is an error, retried once, and every catch is re-run alone to confirm it.
- Claude wrote every test correctly on the first attempt in our runs, so Kane's feedback loop (failure text back to Claude) has not been needed in a real run yet. It is covered by automated tests.
- The demo catalog (M01 to M10) is hand-written. `mutate --ai` adds more for your own app; each kept bug costs two short Kane runs to prove it is visible.
- Bugs run one at a time. Running several in parallel would need one port per worker, and the `_test.md` files point at one URL.
- Kane keeps screenshots and logs for every run under `~/.testmuai/kaneai/sessions/`. After many runs this can fill a small disk; `saboteur doctor` warns under 5 GB free and stops under 2 GB. Old session folders can be deleted once their runs are reported (results are also uploaded to Test Manager).
- Kane runs cost credits; replays of recorded tests are much cheaper than authoring runs.

## Build log

[`BUILD_LOG.md`](BUILD_LOG.md)

## Credits

Built solo by softalpha0 for the KaneCLI Online Hackathon by [TestMu AI](https://www.testmuai.com/). Kane CLI docs: https://github.com/LambdaTest/kane-cli. MIT licence.
