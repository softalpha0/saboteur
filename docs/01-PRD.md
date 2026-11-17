# 01 — PRD: Saboteur

> Plants real bugs in your app, lets Kane CLI try to catch them, and has Claude write the Kane tests for every bug that got through.

Hackathon: KaneCLI Online Hackathon (TestMu AI). Deadline Thu 19 Nov 2026, 7:29 PM Lagos. Rules and judging: `02-HACKATHON-RULES.md`. Every Kane detail: `03-KANE-INTEGRATION.md`.

## 1. Problem

1. Coding agents now write the app **and** the end-to-end tests. A green suite says nothing about whether those tests would notice a real regression.
2. Coverage tools count lines run, not bugs caught. A browser test can click through checkout and still pass when the total is wrong.
3. Mutation testing answers "would my tests catch a bug?" for unit tests, but there is no simple version for **plain-English browser tests**.

## 2. Who has it

- **Primary:** a developer who uses Claude Code / Codex to ship a web app and keeps Kane `_test.md` files in the repo. They want to know which bugs their suite would miss, and they want those gaps closed without writing tests by hand.
- **Secondary:** a QA lead who needs one honest number for "how strong is our E2E suite" before a release.

## 3. What Saboteur does (one sentence)

Saboteur applies a list of small, realistic bug patches to your app one at a time, runs your Kane suite against each broken build, reports which bugs Kane caught (killed) and which slipped through (survived), then asks Claude to write a new Kane test for each survivor and keeps only tests Kane proves: pass on clean code, fail on the bug.

## 4. Done statement

On a fresh clone, `pnpm saboteur run` on the demo shop prints a **before score** (bugs caught by the starter suite) and an **after score** (bugs caught after Claude's Kane-proven tests), writes `reports/latest/report.md` + `report.json`, and every verdict in that report links to a real Kane result.

## 5. User journey (5 steps)

1. Install: `pnpm i`, `kane-cli login`, set `ANTHROPIC_API_KEY`.
2. `pnpm saboteur doctor` → green checks: Kane signed in, credits, Chrome, app builds, suite found.
3. `pnpm saboteur run` → baseline passes on clean app → each mutant is attacked → live table fills in (caught / slipped).
4. For each survivor, Saboteur shows Claude's new test, Kane's verdict on clean and on mutant, and retries with Kane's failure text until proven (max 3 tries).
5. Open `reports/latest/report.md`: score before → after, per-bug table, Kane links, new `_test.md` files ready to commit.

## 6. Scope (MoSCoW)

### Must (the demo fails without these)

| ID | Feature | Acceptance check |
|---|---|---|
| M1 | Demo app "Saboteur Shop" (products, cart, discount code, checkout, order confirmation, login) running at `http://localhost:4173` | Starter suite passes on clean build |
| M2 | Starter Kane suite: 4 `_test.md` files in `tests/kane/starter/` | `kane-cli testrun run` on all starter `_test.md` files exits 0 on clean build |
| M3 | Mutation catalog: ≥ 8 bug patches in `apps/shop/mutations/` + `manifest.json` | Each patch applies cleanly with `git apply --check`; app still builds |
| M4 | `baseline` command: build clean app, run suite, require exit 0 | Aborts with Kane's failure message if any member fails on clean code |
| M5 | `attack` command: for each mutant → apply patch in a temp copy, build, serve on :4173, run suite with `--no-adaptive-heal`, classify | Verdict per mutant from exit code + `testrun_member_end` events (rules in §8) |
| M6 | `fill` command (the closed loop): for each survivor → Claude writes one `_test.md` → Kane runs it on clean (must pass) → Kane runs it on mutant (must fail) → on either miss, Kane's failure text goes back to Claude → max 3 attempts | Accepted tests saved to `tests/kane/generated/`; full loop transcript saved |
| M7 | Report: `report.md` + `report.json` with before/after score, per-mutant table, Kane failure messages, Test Manager/share links, test files added | Every number traceable to a run id |
| M8 | `run` = doctor → baseline → attack → fill → re-attack survivors → report | One command, end to end |
| M9 | `--replay` mode: skip Claude, use committed `tests/kane/generated/` | Judges can run without an Anthropic key |
| M10 | README + video + 2 public posts | Per `08-DEMO-AND-SUBMISSION.md` |

### Should

| ID | Feature |
|---|---|
| S1 | `saboteur.config.json` so it runs on any repo (build cmd, serve cmd, URL, tests dir, mutations dir) |
| S2 | Credit guard: `kane-cli balance` before each batch, stop under `minCredits` |
| S3 | Live terminal table while attacking (ink or plain ANSI) |
| S4 | `mutate --ai`: Claude proposes new bug patches for your own code (validated: applies, builds, changes behaviour) |
| S5 | GitHub Action example that runs `saboteur attack` on a PR and posts the score |

### Could

| ID | Feature |
|---|---|
| C1 | Static HTML report page |
| C2 | Parallel mutants (needs one port per worker) |
| C3 | Mobile target (Kane supports emulator/simulator on macOS Apple Silicon) |

### Won't (this hackathon)

- Our own browser automation. Kane does all browser work.
- Unit-test mutation (Stryker etc. already exist).
- Auto-fixing the app. Saboteur improves **tests**, never the product code.
- Accounts, payments, cloud hosting of Saboteur itself.

## 7. Mutation catalog (demo app)

Defined in `05-MUTATIONS.md`. Ten realistic bugs across cart maths, discount, validation, navigation and state. The starter suite is deliberately thin (happy paths only), so we **expect** some bugs to survive. The real numbers come from real runs; never write expected numbers into the README.

## 8. Verdict rules (attack)

| Kane result on mutant | Verdict |
|---|---|
| `testrun` exit 1 and ≥ 1 member `status: failed` | **Killed** (Kane caught it). Record which test and `failure.message` |
| `testrun` exit 1 but only `broken`/`interrupted` members | **Error** — re-run once; if still broken, exclude from score and report it |
| `testrun` exit 0 | **Survived** (Kane missed it) |
| exit 2 or 3 | **Error** (setup/auth/timeout). Excluded from score, shown in report |
| `testrun_summary.totals.authored > 0` on a mutant run | **Invalid** — a test was authored against broken code. Stop; baseline must author everything first |

Score = killed ÷ (killed + survived). Shown as `6/10 caught`.

## 9. Closed-loop rules (fill)

1. Input to Claude: the mutant's description + diff, the app's route map, the existing `_test.md` files, and the test-writing rules from `03-KANE-INTEGRATION.md` §5.
2. Output: exactly one `_test.md` file (validated locally: name, frontmatter keys, `##` steps, closing check).
3. Kane run A — clean app, healing on (authors the recording). Must pass. If not → send `failure.message` + step index back: "your test fails on correct code".
4. Kane run B — mutant app, `--no-adaptive-heal`. Must fail. If it passes → send back: "your test passed on the broken build; it doesn't check the thing that broke".
5. Accept on (A pass, B fail). Commit file + its `output-<stem>/` recording.
6. Max 3 attempts per survivor. After 3, mark "unproven" and show the last Kane output. Never accept an unproven test.
7. After fill, re-attack all previous survivors with the grown suite to get the after score.

## 10. Non-functional

- Works on Windows (PowerShell), macOS, Linux. Node 20+, pnpm.
- No secrets in repo. `.env.example` lists `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `LT_USERNAME`, `LT_ACCESS_KEY`.
- Every Kane call goes through `packages/kane` (one place to fix flags).
- Logs per run in `evidence/runs/<run-id>/` (NDJSON + stderr progress).

## 11. Success metrics for the hackathon

1. Clears all three judging bars on camera.
2. Before → after score from a real run, with links.
3. At least one survivor closed on the 2nd or 3rd attempt, so the video shows Kane's feedback changing Claude's test.
4. A developer can point it at their own app with one config file.

## 12. Risks

| Risk | Impact | Plan |
|---|---|---|
| Replay doesn't re-check assertions on a mutant | Mutants look "survived" falsely | Hour-1 spike; fallback `--author` or `kane-cli run` (see `03` §2.1) |
| Credits run out | Can't finish runs | Measure baseline cost first; credit guard; ask on Slack early |
| Kane run time × 10 mutants too slow | Demo takes too long | Keep suite to 4–6 tests; `--parallel 2`; record video from a finished run |
| Claude writes invalid `_test.md` | Loop stalls | Local validator before any Kane call; schema in `06-AGENT-PROMPTS.md` |
| A mutant also breaks the build | Wasted run | `attack` builds first; build failure = mutant rejected, not scored |
| Judges lack Anthropic key | Can't see live loop | `--replay` mode + transcripts + video |

## 13. Parking lot (for "what's next")

- Run on every PR as a GitHub check.
- Use Kane's `--bug-detection` to classify what each killed mutant looked like to Kane.
- Suite strength trend over time in Test Manager.
- Mutants for mobile apps via Kane emulator targets.
