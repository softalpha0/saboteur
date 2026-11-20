---
name: saboteur
description: Measure how good a web app's Kane CLI tests really are by planting real bugs and checking which ones the tests miss, then have Claude write new Kane tests that Kane proves catch them. Use when the user asks "are my tests any good?", "would my tests catch this bug?", "test my tests", "find gaps in my e2e tests", "run saboteur", or wants Kane-proven tests for missed bugs. Needs kane-cli installed and signed in.
---

# Saboteur: test your tests

Saboteur plants one realistic bug at a time in a web app (as a git patch on a temporary copy), runs the app's Kane CLI `_test.md` suite against each broken build with self-healing off, and scores each bug **caught** or **slipped**. For every bug that slipped, Claude writes a new `_test.md`, and it is kept only if Kane proves it **passes on the correct app and fails on the bugged app**.

Repo: https://github.com/softalpha0/saboteur

## Before you run anything

1. Run `pnpm saboteur doctor` (add `--replay` if there is no Claude key). Every line must be ✔. Fix what it reports before going on. Common fixes:
   - `kane-cli is not installed`: `npm install -g @testmuai/kane-cli`, then ask the user to run `kane-cli login` themselves.
   - Low disk space: Kane writes screenshots for every run. Ask the user to free space. Don't delete their files yourself.
   - Port in use: a previous preview server is still running. `doctor` stops one Saboteur started; anything else, ask the user.
   - A generated test not proven by Kane: follow doctor's instruction (quarantine it or re-run `fill`).
2. Check credits in doctor's output. Tell the user roughly what the run will cost **before** starting:
   - attack: about 2 to 4 credits per bug
   - fill: about 60 to 110 credits per bug that slipped (recording new tests is the expensive part)
   - full `run` on 10 bugs: a few hundred credits
3. **Ask the user before any step that runs Kane more than twice.** Never loop Kane runs on your own.

## Commands

Run from the repo root. For another config, add `-c <path>/saboteur.config.json` (the TodoMVC example has `pnpm todomvc <command>`).

| Goal | Command | Kane credits |
|---|---|---|
| Check readiness | `pnpm saboteur doctor` | ~0 |
| Score the current suite only | `pnpm saboteur attack` | low |
| Write Kane-proven tests for the bugs that slipped | `pnpm saboteur fill` | high |
| Everything: baseline, attack, fill, re-attack, report | `pnpm saboteur run` | high |
| Same, without Claude, using committed tests | `pnpm saboteur run --replay` | medium |
| Only some bugs | add `--only M03,M05` (quote it in PowerShell) | less |
| Claude invents new bugs for this app | `pnpm saboteur mutate --ai --count 5` | medium |
| Red team vs blue team | `pnpm saboteur duel --rounds 3` | high |
| Rebuild the report from report.json | `pnpm saboteur report` | none |

## Reading the result

Open `reports/latest/report.md` (also `report.html`) and tell the user, in plain words:

1. **The score**: "Before: X/10 caught, after: Y/10."
2. **Requirement coverage**: which rules of the app's spec would break without any test noticing (the "breaks silently" rows). This is usually the most useful line for the user.
3. **Each bug that slipped**: what breaks for a customer (the "What breaks" column), and the new test that now catches it, if any.
4. Anything **excluded** (error, invalid, rejected) and why. These are not catches.

Verdict rules you must keep when you explain results:
- **caught**: a test failed on the bugged build and failed again when re-run on its own.
- **slipped**: every test passed on the bugged build.
- **error**: Kane or the browser had a problem (crash, `browser_disconnected`, `analyzer_failed`, full disk, timeout). Never call an error a catch.
- A generated test counts only if Kane passed it on the clean build and failed it on the bugged build. Never describe an unproven test as working.

Never invent or estimate numbers. Every number you report must come from `report.json` or Kane's output.

## Using it on the user's own app

1. Copy `saboteur.config.json` and set `app.dir`, `app.build`, `app.serve`, `app.url`.
2. Write `ROUTES.md` for the app: pages, rules and exact values (prices, texts). Claude uses it as the facts when writing tests, so it must match the app.
3. Add bugs: one small git patch per bug in `mutations/`, plus a `manifest.json` entry (id, title, userImpact, patch). Or run `saboteur mutate --ai` to have Claude propose bugs that Kane confirms are visible.
4. Optional: `mutations/requirements.json` maps spec rules to the bugs that break them, for the requirement coverage table.
5. Put the starter `_test.md` files under the configured tests folder and run `doctor`.

## Safety

- Never paste, print or ask for API keys or Kane access keys in chat. Keys go in `.env` (Claude) or `kane-cli login` (Kane), done by the user.
- Never commit `.env` or `.testmuai/evidence/`. Do commit `output-*/` folders next to proven `_test.md` files.
- Bugs are applied only to temporary copies of the app; the real source is never modified.
- Run against a local build or staging, never production.
