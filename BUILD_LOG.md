# Build log

One dated line per block. Real results only: exit codes, credits used, what broke.

| When (Lagos) | What | Result | Credits used | Next |
|---|---|---|---|---|
| 2026-11-17 23:55 | Docs written: PRD, rules, Kane integration, architecture, mutations, prompts, plan, demo, testing | — | 0 | Hour-1 spike |
| 2026-11-18 00:10 | Checked flags against the real `kane-cli --help` (0.10.5): `testrun run` / `testmd run` both have `--agent --headless --no-adaptive-heal`; `testrun` also has `--parallel`, `--dry-run`. `whoami` has no `--username`; `balance` does and exits 2 when not signed in | Matches docs/03 | 0 | Spike |
| 2026-11-18 00:30 | Shop M1 built per ROUTES.md; Vitest checks all 5 worked examples | Builds, typechecks | 0 | |
| 2026-11-18 00:40 | 10 mutants (M01–M10) as patches + manifest. Each applies to a fresh copy, builds, changes the bundle. Dev-only browser sanity check (not in repo): clean build passes all 10 checks, each patch breaks its own check | OK | 0 | |
| 2026-11-18 01:00 | packages/kane (spawn, NDJSON, verdicts), mutator, agent (prompts, validator, Claude writer), report, cli (doctor, baseline, attack, fill, run, report). 54 tests, incl. fill loop + `run --replay` end to end with a scripted Kane stand-in. Biome + typecheck clean | No real Kane run yet (no login on the build box) | 0 | Run the spike on a signed-in machine |
| 2026-11-18 01:55 | **Spike (Windows, Kane 0.10.5):** run 1 `testmd run` on clean exit 0 (recorded). Badge broken by hand (`const count = 0`). Run 2 `testmd run --no-adaptive-heal` exit 1. Run 3 `testrun run --no-adaptive-heal` exit 1, member `failed`, `failure.message: "assertion_failed: @ step 5"`, `authored: 0`. NDJSON saved to `evidence/spike/` and used as a parser fixture | **Pass**: replay re-checks assertions. Attack stays replay + `--no-adaptive-heal` | ~19 for the first three runs (10531.35 → 10512.51) | Commit the recording, baseline all 4 starter tests |
| 2026-11-18 03:00 | Built the rest: richer Kane failure text (member session log appended to the terse `failure.message`), `runObjective` (`kane-cli run`), S4 `mutate --ai`, C1 HTML report, S5 GitHub Action (opt-in). 66+ tests, no Kane credits spent | Code only; S4 and S5 not yet run against real Kane | 0 | First real attack on the dev machine |
| | Shop M1 complete, starter suite `testrun` exit 0 | | | |
| | packages/kane + parser tests | | | |
| | 10 mutants apply + build | | | |
| 2026-11-18 | Baseline (Windows): 4/4 starter tests pass on clean, exec `f5fa2d5b-9183-4ad3-83e9-826d4b4d0525`. **First real attack: 0/10 caught** by the starter suite; every bug slipped (no test checks totals, +, Remove, out-of-stock, email rule, order number, redirect target or reload). ~3 min per bug with tests one at a time | Real | baseline ~3.3 (10368.44 → 10365.15); attack ~19 for 10 bugs × 4 replays (10365.15 → 10346.11) | Fill M01, M03, M08 first |
| 2026-11-18 | Fill: all 10 survivors got a Kane-proven test, every one on attempt 1 (so the retry loop never fired). Credits: ~580 for 3, ~500 for 7 (recording new tests is the expensive part) | Real | ~1080 | |
| 2026-11-18 | Final run --replay: baseline 18/18 pass; before **0/10** again; after: M01 to M06 caught, then Kane hung on M07 after Chrome crashed (TargetClosedError) for 2h+. Cause: Saboteur's hard timeout only killed the Windows launcher, not Kane. Fixed: kill the whole process tree, kill Kane after 10 min of silence, one retry. Also: attacks stop at the first catch (fail-fast) and every catch is confirmed by re-running that test alone | Run incomplete; no report | ~55 so far | Re-run with the fixes |
| 2026-11-19 | attack --with-generated --only M07,M08,M09 with the fixed version: all 3 caught, each confirmed alone. **After: 10/10** | Real | small | Duel |
| 2026-11-19 | Duel, 3 rounds: red found 3 bugs the suite missed (badge counts products, free shipping before discount, sign out), all confirmed visible by Kane; blue closed all 3 on attempt 1. **Red 3 : Blue 3**, suite 18 → 21 | Real | ~450 | README, video, posts |
| | First survivor closed by fill loop | | | |
| | `saboteur run` end to end on fresh clone | | | |
| 2026-11-19 10:00 | Feature freeze | | | |
| | Video uploaded | | | |
| | Posts live | | | |
| | Submitted | | | |
- 2026-11-19: Added TodoMVC (React, MIT, tastejs/todomvc ff43b02) as a second target: apps/todomvc (Vite build, src unchanged), 10 bug patches, 4 starter tests, examples/todomvc/saboteur.config.json, `pnpm todomvc`. Each bug checked visible in a browser by a one-off local script outside the repo; patches apply and build in CI. No Kane runs yet (0 credits).
- 2026-11-20: Live demo: `saboteur demos` builds the clean app and every bugged version into site/demo/<app>/ with a bug switcher page and a 404 fallback for deep links; the Pages workflow builds them for the shop and TodoMVC. Shop router now honours Vite's base path (no change to behaviour or patches). Checked in a browser against a Pages-like server. 0 credits.
- 2026-11-20: TodoMVC final run 2026-11-20T02-11-09Z: before 2/10, after 10/10 (suite 4 -> 11, 7 tests proven on attempt 1). ~750 credits over 3 TodoMVC runs. site --todomvc publishes its report.
- 2026-11-20: Requirement coverage (mutations/requirements.json -> report section + landing card: which spec rules would break silently) and the Saboteur agent skill (skills/saboteur/SKILL.md, `saboteur skill --install`, shipped in .claude/skills for Claude Code). No Kane runs.
- 2026-11-23: saboteur gate (merge/deploy gate: exit 1 until Kane signs off; PR comment with Kane run per catch, wired into saboteur.yml) and saboteur post (launch posts from report.json; --ai Claude blog post rejected on any number not in the facts). No Kane runs.
- 2026-11-23: saboteur verify + evidence/manifest.json: real reports committed in evidence/data (local paths removed, sha256 sealed); verify recomputes every headline number; CI runs it. No Kane runs.
