# 03 — Kane CLI integration (the source of truth for every Kane call)

Every command, flag, event and field below is copied from the official Kane CLI docs. Nothing is guessed. If a run behaves differently, trust the run, fix this file, and note it in `BUILD_LOG.md`.

Sources (read 2026-11-17, Kane CLI **0.10.3**, released 2026-11-07 per CHANGELOG):

- Repo + README: https://github.com/LambdaTest/kane-cli
- Running tests: `docs/user-guide/running-tests.md`
- test.md format: `docs/user-guide/testmd/overview.md`, `testmd/running.md`
- Batch runs: `docs/user-guide/testrun.md`
- testrun NDJSON schema: `integrations/kiro-powers/steering/kane-cli-testrun.md`
- run_end + evidence packs: `integrations/kiro-powers/steering/kane-cli-run.md`, `docs/user-guide/evidence.md`
- Auth + CI: `docs/user-guide/authentication.md`, `docs/user-guide/cicd.md`
- Agents: `docs/user-guide/agents.md`, https://www.testmuai.com/kane-cli/agents.md

Checked 2026-11-18 against the real `kane-cli --help` of **0.10.5**: every flag below exists. Extras we use: `testrun run --dry-run` (plan + preflight only; `saboteur doctor` runs it). `whoami` takes no `--username/--access-key`, so with basic auth `doctor` checks sign-in with `balance` (exit 2 = not signed in).

## 1. Setup (once, hour 1)

```bash
npm install -g @testmuai/kane-cli      # Node 18+ and Chrome on PATH
kane-cli login                         # OAuth in browser (local dev)
kane-cli whoami                        # identity card
kane-cli balance                       # credit balance
npx @testmuai/kane-cli-skill           # installs the Kane skill for Claude Code / Codex / Gemini
```

- Claim the 10,000 free credits: https://www.testmuai.com/kane-cli/#creditOffer
- Authoring runs need a Test Manager project + folder: `kane-cli config project` (or `kane-cli projects list` → `kane-cli config project <id>`).
- CI / non-interactive: **do not** call `kane-cli login`. Pass `--username "$LT_USERNAME" --access-key "$LT_ACCESS_KEY"` (keys: TestMu dashboard → Settings → Keys).
- Windows note: Kane switches to NDJSON when **stdin is not a TTY**. Our Node wrapper spawns with `stdio: ['ignore', 'pipe', 'pipe']`, which works the same on Windows, macOS and Linux. We also pass `--agent` explicitly.

## 2. The three Kane commands Saboteur uses

| Purpose | Command | Completion event |
|---|---|---|
| Run the whole suite against one app build | `kane-cli testrun run <a_test.md> <b_test.md> … --agent --headless [--no-adaptive-heal] [--parallel N]` | `testrun_done` |
| Prove one generated test | `kane-cli testmd run <file>_test.md --agent --headless [--no-adaptive-heal]` | `test_md_done` |
| Ad-hoc probe (fallback only) | `kane-cli run "<objective>" --agent --headless --max-steps 40 --timeout 300` | `run_end` |

**`testrun` paths:** explicit paths must each end in `_test.md`; with no paths it walks the current directory recursively. A folder is not a valid path, so `packages/kane` globs `tests/kane/**/*_test.md` and passes each file. Don't use `--match` for this: it sees OS-native separators (`tests\kane\` on Windows). Explicit paths with an unauthored test are fine: that member is authored during the run (0.8.4+), which on a mutant run makes the run **invalid** (see PRD §8).

Always also read the **process exit code**. Docs: "early refusal, invalid plan or dry-run can exit without the normal completion event."

### 2.1 Why `--no-adaptive-heal` on mutant runs

From `testmd/running.md`: the first run of a `_test.md` **authors** each step and saves a recording in `output-<stem>/`; later runs **replay** it. When a replay fails, adaptive healing (on by default) tries "three shrinking replay windows, then re-author authorable steps".

On a mutant we want the opposite: if the app broke, the test should **fail**, not heal its way around the bug. So:

- Baseline (clean app): healing **on** (default). Authors any new tests.
- Attack (mutant app): `--no-adaptive-heal`. A failed replay is a failed test.

**Spike to run in hour 1 (riskiest assumption):** confirm that a replayed test with a closing assertion ("verify the total shows $59.98") **fails** when the total is wrong. Docs say checkpoints are "evaluated during test execution", but confirm it on a real replay. If replay does not re-check assertions, switch attack runs to `--author` (re-author every step, slower, more credits) or to one-shot `kane-cli run` objectives. Record the result in `BUILD_LOG.md`.

### 2.2 Exit codes

`kane-cli run`

| Code | Meaning |
|---|---|
| 0 | Run passed |
| 1 | Run failed (unrecoverable failure or upload failed) |
| 2 | Error (auth, TMS credential exchange, config, Chrome, unknown subcommand, unhandled exception) |
| 3 | Cancelled or hit `--timeout` |

`kane-cli testmd run`

| Code | Meaning |
|---|---|
| 0 | Passed (or file had no steps) |
| 1 | At least one non-optional step failed |
| 2 | Parse/auth/org mismatch/Chrome launch/invalid flag/lock conflict error |
| 3 | Cancelled or timed out |

`kane-cli testrun run`

| Code | Meaning |
|---|---|
| 0 | All members passed |
| 1 | At least one member failed or broke |
| 2 | Usage error, invalid plan (preflight), or auth error. Nothing ran |
| 3 | Cancelled |

## 3. NDJSON we parse

### 3.1 `testrun run` events (stdout, one JSON object per line)

| `type` | Fields we use |
|---|---|
| `testrun_plan` | `members[{path, test_id?, tags, failure?, unresolved?}]`, `valid`, `parallel` — if `valid: false`, abort and print each `failure` |
| `testrun_start` | `execution_id`, `members`, `parallel` |
| `testrun_member_start` | `path`, `session_id`, `log_path` |
| `testrun_member_end` | `path`, `test_id?`, `status` ∈ `passed \| failed \| broken \| interrupted`, `duration_s`, `session_id`, `log_path`, `failure?: {message, step_index?}` |
| `testrun_authored_member_end` | same as `testrun_member_end` (test had no recording; authored after replays). `path` may be relative — **match by file name** |
| `testrun_summary` | `totals{tests, passed, failed, broken, skipped, authored}`, `duration_s`, `upload`, `cancelled`, `execution{id, status}` |
| `testrun_done` | `execution_id`, `overall_status` ∈ `passed \| failed \| cancelled` — **stop parsing here** |

Other lines (`stream_start`, `testrun_progress`, `testrun_investigations_wait`, `testrun_evidence_ingest`, `warning`) are logged but don't change verdicts.

Real example of a failing member (shape from Kane's own test fixture):

```json
{"type":"testrun_authored_member_end","path":"fail_test.md","test_id":"fail-bb6c5182","status":"failed","duration_s":41,"session_id":"d263…","log_path":"/home/dev/.testmuai/kaneai/sessions/d263…/events.ndjson","failure":{"message":"Final verification failed: \"the page heading says \"Totally Different Heading\"\"","step_index":2},"v":1,"ts":"2026-09-21T08:51:17.875Z"}
```

`failure.message` is exactly what we hand to Claude.

### 3.2 `testmd run` completion

Wait for `test_md_done`: `overall_status`, `duration_s`, `session_id`, optional `share_url`. Embedded `run_end` events finish single steps; they do **not** finish the file.

### 3.3 `run` completion (fallback path)

`run_end` is "the one event you should script against", stable across versions:

| Field | Meaning |
|---|---|
| `status` | `passed` / `failed` |
| `summary` | What the agent did |
| `one_liner` | Short headline |
| `reason` | Why the run stopped |
| `duration` | Seconds |
| `credits_consumed` | Decimal credits used (older docs: `credits`) — read both |
| `final_state` | Values from "store as" objectives |
| `test_url` | Test Manager link (if upload succeeded) |
| `session_dir` | Session log + sealed evidence pack under `evidence/` |
| `run_dir` | **Legacy, no longer created** — don't read it |
| `result_code` | Optional; `"740"` + `verdict` = confirmed product bug (only with `--bug-detection`) |

Progress lines have no `type`, only `step`, `status` (`running`/`done`/`failed`), `remark`. Use them for live display only.

## 4. Evidence packs (for the report and for Claude)

- Each run seals a pack: `{session_dir}/evidence/<execution_id>.evidence`; `testmd`/`testrun` packs are also copied to `<cwd>/.testmuai/evidence/`.
- A pack is a plain zip:

```bash
unzip -p <pack> "tests/*/result.yaml"                 # verdict + per-step outcomes
unzip -p <pack> "tests/*/steps/*/failure.yaml"        # failure records (failed steps only)
unzip -p <pack> "tests/*/logs/0-console.ndjson"       # browser console, run 0
unzip <pack> "tests/*/steps/*/screenshot.png" -d tmp  # screenshots
```

- Visual viewer: `kane-cli evidence serve <pack>`. Check a broken pack: `kane-cli evidence validate <pack>`.
- **Do not commit `.testmuai/evidence/`** (docs: packs are run artifacts). We copy only report-relevant packs to a GitHub Release and link them from `evidence/README.md`.
- **Do commit `output-<stem>/`** next to each `_test.md` (docs: makes tests replayable on any machine). This is what lets judges replay our suite.

## 5. Writing `_test.md` files (rules Claude must follow)

From `running-tests.md` and `testmd/overview.md`:

1. File name ends in `_test.md` (otherwise it's a helper, only reachable by `@import`).
2. Optional YAML frontmatter. Keys we use: `mode: testing`, `url`, `tags`, `max_steps`, `headless`. **Unknown keys are rejected** (`unknown config key`). Never put auth in frontmatter.
3. Every step starts with `## Heading`. Text before the first `##` is ignored. Body is a prose objective **or** one `@import path` line, not both.
4. **End every flow in a check of the result** ("verify the cart shows 1 item"). Name the outcome, not the control.
5. The closing check must be visible on the screen the last action leaves you on. If proof is on another page, navigate there explicitly first.
6. Say the goal, not the clicks. Keep exact values (prices, codes, URLs) literal or in `{{variables}}`.
7. Fresh data each run: smart variables like `{{smart.random_email}}`.
8. Optional elements as conditions: "if a cookie banner appears, dismiss it".
9. Editing a step re-records that step **and every later step** in the file.

Assertion phrasing Kane maps to methods (from `features/checkpoints/overview.md`): prices/text/counts → Visual; disabled/checked → DOM; "URL contains" → URL; "no console errors" → DevTools.

## 6. Running from Node (contract for `packages/kane`)

```ts
// pseudo-contract — implement in packages/kane/src/run.ts
const files = await glob('tests/kane/**/*_test.md');   // explicit _test.md paths, never a folder
spawn('kane-cli', ['testrun', 'run', ...files, '--agent', '--headless', '--no-adaptive-heal'], {
  stdio: ['ignore', 'pipe', 'pipe'],   // non-TTY stdin => NDJSON
  env: process.env,
});
// read stdout line by line -> JSON.parse -> route by obj.type
// stderr -> append to evidence/runs/<run-id>/progress.log
// resolve on process 'close' with { exitCode, events, done }
```

- Pass `--username/--access-key` only when `LT_USERNAME`/`LT_ACCESS_KEY` are set.
- Kane applies its own `--timeout`. If events stop for >60 s and the process is alive, **wait** (docs). Our hard kill is 15 min per suite run.
- Slow Chrome start: raise `KANE_CLI_CDP_TIMEOUT_MS` (default 30000) / `KANE_CLI_CDP_RETRIES` (default 2). Non-standard Chrome path: `KANE_CLI_CHROME_PATH`.

## 7. Credits

- Free: 10,000 for one month. The docs show per-run figures such as 12 and 58 credits in examples; real cost depends on steps. **Measure our own cost on the baseline run** and write it in `BUILD_LOG.md`.
- Replays are "no agent involved, no LLM cost, much faster" (docs), so attack runs on recorded tests should be cheap; authoring runs cost more.
- Saboteur calls `kane-cli balance` before each batch and stops below `minCredits` in config.
