# 09 — Testing Saboteur itself

Two layers: cheap unit tests that never spend Kane credits, and real Kane runs that do.

## 1. Unit tests (Vitest, run in CI)

| Package | What we test | Fixture |
|---|---|---|
| `kane` | NDJSON parser: routes by `type`, ignores unknown types, handles partial last line, matches members by file name (paths can be relative or absolute) | `evidence/spike/*.ndjson` from our real hour-1 spike runs |
| `kane` | `classifyMutant`: exit 1 + failed → killed; exit 0 → survived; only broken → error; exit 2/3 → error; `totals.authored > 0` → invalid | Hand-built event arrays |
| `agent` | Validator rules 1–6 from `06-AGENT-PROMPTS.md` §5 | Good/bad `_test.md` strings |
| `agent` | Prompt builder includes the diff, routes, existing tests, and Kane text verbatim on retries | Snapshot |
| `mutator` | Every patch in the manifest passes `git apply --check` on a clean tree | Real patches |
| `report` | report.md renders from a sample report.json; score maths | Sample json |

`pnpm test` must pass before every push. CI: `.github/workflows/ci.yml` runs `pnpm biome check`, `pnpm -r typecheck`, `pnpm test`. CI does **not** run Kane by default (no credits on CI).

## 2. Kane-backed checks (manual, cost credits)

| When | Command | Expect |
|---|---|---|
| After shop changes | `kane-cli testrun run <every tests/kane/**/*_test.md> --agent --headless` | exit 0 |
| After adding a mutant | `pnpm saboteur attack --only M0X` | A verdict, not an error |
| Before recording video | `pnpm saboteur run` from a fresh clone | Before + after score, report written |
| Judge path | `pnpm saboteur run --replay` | No Anthropic calls; generated tests replay |

Record credits used for each in `BUILD_LOG.md`.

## 3. Optional: Kane in CI (Should S5)

`.github/workflows/saboteur.yml`, manual trigger only (`workflow_dispatch`). Per Kane's CI docs: install Chrome (`browser-actions/setup-chrome@v1`), `npm i -g @testmuai/kane-cli`, auth with `--username "$LT_USERNAME" --access-key "$LT_ACCESS_KEY"` from repo secrets, `--headless`, upload `.testmuai/evidence/*.evidence` as an artifact.
