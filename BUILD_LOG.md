# Build log

One dated line per block. Real results only: exit codes, credits used, what broke.

| When (Lagos) | What | Result | Credits used | Next |
|---|---|---|---|---|
| 2026-11-17 23:55 | Docs written: PRD, rules, Kane integration, architecture, mutations, prompts, plan, demo, testing | — | 0 | Hour-1 spike |
| 2026-11-18 00:10 | Checked flags against the real `kane-cli --help` (0.10.5): `testrun run` / `testmd run` both have `--agent --headless --no-adaptive-heal`; `testrun` also has `--parallel`, `--dry-run`. `whoami` has no `--username`; `balance` does and exits 2 when not signed in | Matches docs/03 | 0 | Spike |
| 2026-11-18 00:30 | Shop M1 built per ROUTES.md; Vitest checks all 5 worked examples | Builds, typechecks | 0 | |
| 2026-11-18 00:40 | 10 mutants (M01–M10) as patches + manifest. Each applies to a fresh copy, builds, changes the bundle. Dev-only browser sanity check (not in repo): clean build passes all 10 checks, each patch breaks its own check | OK | 0 | |
| 2026-11-18 01:00 | packages/kane (spawn, NDJSON, verdicts), mutator, agent (prompts, validator, Claude writer), report, cli (doctor, baseline, attack, fill, run, report). 54 tests, incl. fill loop + `run --replay` end to end with a scripted Kane stand-in. Biome + typecheck clean | No real Kane run yet (no login on the build box) | 0 | Run the spike on a signed-in machine |
| 2026-11-18 __:__ | Spike: replay fails on broken badge with `--no-adaptive-heal`? | | | |
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
