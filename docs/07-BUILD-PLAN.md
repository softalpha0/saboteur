# 07 — Build plan (Lagos time, WAT)

Deadline: **Thu 19 Nov, 7:29 PM**. Feature freeze: **Thu 10:00 AM**. Submit: **Thu 3:00 PM**.
Playbook rule: riskiest piece first, online early, last fifth for polish + submission.

## 0. Before the first line of code (Wed 08:00–08:45)

1. Register on testmuai.com with the **same email** as Slack and the submit form. Claim the 10,000 credits.
2. `npm i -g @testmuai/kane-cli` → `kane-cli login` → `kane-cli whoami` → `kane-cli balance`.
3. `kane-cli config project` (pick/create "Saboteur").
4. `npx @testmuai/kane-cli-skill` (Kane skill for Claude Code).
5. Create **new** public repo `saboteur` (first commit today; rule: repo started on/after 12 Nov).
6. Drop in these docs, `AGENTS.md`, `CLAUDE.md`. Ask Claude Code: "Read AGENTS.md and docs/02 + docs/03 and tell me back the 3 judging bars and the 3 Kane commands we use." Fix any misunderstanding before building.
7. Join the Slack, read #announcements for rule updates.

## 1. Spike — the riskiest assumption (Wed 08:45–10:30)

Goal: prove a **replayed** `_test.md` fails when the app is broken, with `--no-adaptive-heal`.

1. Scaffold `apps/shop` with just Home + Cart and the Canvas Tote (enough for one test).
2. Serve on :4173. Run `kane-cli testmd run tests/kane/starter/browse_add_to_cart_test.md --agent --headless` → expect exit 0, `output-browse_add_to_cart/` created.
3. Break the badge count by hand. Run again with `--no-adaptive-heal`. **Expect exit 1.**
4. Also try `kane-cli testrun run tests/kane/starter/browse_add_to_cart_test.md --agent --headless --no-adaptive-heal` on the broken build; save the NDJSON to `evidence/spike/` (real fixture for parser tests).
5. Write the outcome + credits used in `BUILD_LOG.md`.

If step 3 exits 0 (replay healed or skipped the check): switch attack runs to `--author` or `kane-cli run` objectives (see `03` §2.1), and update `03` + `AGENTS.md` before going on.

## 2. Wed build blocks

| Time | Block | Done when |
|---|---|---|
| 10:30–13:00 | **M1 demo shop** complete per `apps/shop/ROUTES.md` | All worked examples correct by hand; 4 starter tests pass via `testrun` (exit 0); recordings committed |
| 13:00–14:00 | **packages/kane**: spawn, NDJSON parser, `runSuite`, `runTestFile`, `classifyMutant` + Vitest on the spike fixture | Unit tests green |
| 14:00–14:30 | Break + push + CI green | — |
| 14:30–16:30 | **packages/mutator** + 10 patches + manifest | Every patch `git apply --check` OK; every mutant builds; served on :4173 |
| 16:30–18:00 | **attack** command end to end on all 10 mutants | Real before-score in `reports/` — first real result. Post a teaser screenshot? (optional) |
| 18:00–19:00 | Food / rest | — |
| 19:00–21:30 | **packages/agent** + **fill** loop + validator + transcripts | At least 1 survivor closed with a Kane-proven test |
| 21:30–23:00 | **run** command (whole pipeline) + **report** (md + json) + `--replay` | `pnpm saboteur run` works end to end on a clean clone |
| 23:00 | Sleep. Seriously. | — |

## 3. Thu

| Time | Block | Done when |
|---|---|---|
| 07:00–09:00 | Should items only if musts are solid: S1 config, S2 credit guard, S3 live table | — |
| 09:00–10:00 | Full fresh-clone run; save the showcase report to `evidence/` | Real numbers + links |
| **10:00** | **Feature freeze** | No new features after this |
| 10:00–11:30 | README final (real numbers, real links), docs tidy, screenshots/GIF | README matches what works |
| 11:30–13:00 | Record + upload video (script in `08`) | YouTube link works in a private window |
| 13:00–13:45 | 2+ public posts (X, LinkedIn, plus HN or Reddit) | Links saved |
| 13:45–14:30 | Score against rubric (`08` §4), fix the biggest gap in the write-up | — |
| **14:30–15:00** | **Submit** at https://www.kaneclihack.sh/o/submit | Confirmation seen; every link opened from another device |
| 15:00–19:29 | Buffer. Edit submission if needed (allowed until the deadline) | — |

## 4. Stuck rule

Stuck 30 minutes → update `BUILD_LOG.md` with where you are, start a fresh Claude chat, or cut the feature. Musts beat shoulds every time.

## 5. Cut order if time runs out (cut from the top)

1. C1–C3
2. S5 GitHub Action, S4 AI mutants, S3 live table
3. S1 config (hard-code paths for the demo app)
4. Reduce catalog from 10 to 6 mutants
5. **Never cut:** the fill loop (it's the Closed loop score), `--replay`, the video, the 2 posts
