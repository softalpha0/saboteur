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
| | First real attack: before-score | | | |
| | First survivor closed by fill loop | | | |
| | `saboteur run` end to end on fresh clone | | | |
| 2026-11-19 10:00 | Feature freeze | | | |
| | Video uploaded | | | |
| | Posts live | | | |
| | Submitted | | | |
