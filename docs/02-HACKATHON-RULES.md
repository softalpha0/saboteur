# 02 — Hackathon rules, judging, and how Saboteur meets each one

Source: https://www.kaneclihack.sh/ (Rules, Judging, FAQ sections), read 2026-11-17.
Full terms: https://www.testmuai.com/testmuconf-2026/conference-terms-and-conditions/

If anything here disagrees with the live site, the live site wins. Re-read it before submitting.

## 1. Key facts

| Item | Value |
|---|---|
| Event | KaneCLI Online Hackathon, run by TestMu AI (formerly LambdaTest), supported by OpenAI |
| Window | 12–19 November 2026 |
| **Deadline** | **Thu 19 Nov 2026, 11:59 PM IST = 10:29 AM PT = 7:29 PM Lagos (WAT)** |
| Our internal target | Submit by **3:00 PM Lagos, Thu 19 Nov** (4.5 h buffer) |
| Submit page | https://www.kaneclihack.sh/o/submit |
| Team size | 1–4 (we are solo: softalpha0) |
| Prizes | 1st $1,500 · 2nd $1,000 · 3rd $500, each + $250 OpenAI credits, founders 1:1, 3 months Kane CLI Pro, blog feature |
| Help | Slack (invite on the site), conferences@testmuai.com |

## 2. Rules (paraphrased from the site) and our compliance

| # | Rule | What we do |
|---|---|---|
| 1 | 18+, anywhere, team ≤ 4, no application, no entry cap | Solo entry |
| 2 | **Repo started on or after 12 Nov.** Commit history is checked. Old idea OK, old codebase not | Fresh repo `saboteur`, first commit 18 Nov. No code copied from Wayproof or older projects |
| 3 | Must be registered on testmuai.com **and have run Kane CLI** | Register with the same email used for Slack and the submit form; run `kane-cli login` + a first run in hour 1 |
| 4 | No paid plan needed. New accounts get 10,000 free credits for one month. Low on credits → ask on Slack **before** the deadline | Claim credits first. Saboteur has a credit guard (`kane-cli balance` before every batch) |
| 5 | **Judges must be able to run it.** Working credentials for any login or paid service, and a fallback (recorded run or backup deploy) for third-party services | Demo app has no login wall for judges (a test login is printed on screen). Claude is a paid service → ship `--replay` mode with committed generated tests + recorded run logs, and the video as fallback (see §5) |
| 6 | Demo = recorded YouTube video, ~3–5 min, need not be live | Script in `08-DEMO-AND-SUBMISSION.md` |
| 7 | Public GitHub repo, YouTube demo, **at least two different public posts** | Posts drafted in `08-DEMO-AND-SUBMISSION.md` |
| 8 | Submissions lock at deadline, editable until then, one per team, captain gets prize | Submit early, then edit |
| 9 | TestMu AI decides everything, final | — |
| 10 | Fraudulent, automated, duplicated, or gaming entries can be disqualified | Every number in the README comes from a real run with a share link or evidence pack |
| 11 | Event/prizes may change | Re-check site Thu morning |
| 12 | Prize fulfilment handled by TestMu AI | — |
| 13 | TestMu AI employees and partners can't win | — |
| 14 | We keep our code; TestMu can feature it with attribution | MIT licence |
| 15 | Code of Conduct applies, incl. Slack | — |
| 16 | Conference T&Cs apply | Read once before submitting |

## 3. Submission requirements (from the site's challenge section)

1. Public GitHub repo started on or after 12 Nov
2. A description of the app, **the agent used, and what Kane does**
3. 3–5 min demo video on YouTube
4. Optional live URL
5. At least two public launch posts (Hacker News, X, Reddit, or LinkedIn)

The submit form only renders when logged in, so its exact fields were not visible to us. Open it on Wed to see the fields early.

## 4. Judging

Three TestMu AI engineers score each entry.

### 4.1 Three pass/fail bars (miss one and the rest is not scored)

| Bar | Exact wording on site (paraphrased) | How Saboteur clears it | Where judges see it |
|---|---|---|---|
| B1 | It works end to end | One command, `pnpm saboteur run`, goes baseline → attack → fill gaps → report | Video minute 1–3, README "Try it" |
| B2 | Kane CLI caught or proved something | Kane **catches planted bugs** (killed mutants) and **proves** each new test kills its bug while passing on clean code | Report table with Kane failure messages + Test Manager links |
| B3 | The agent and Kane CLI communicate | Kane's failure output (`failure.message`, `run_end.reason`/`summary`) is fed to Claude; Claude's new `_test.md` is run by Kane; repeat until proven | Report "loop transcript" per survivor; video minute 2–3 |

### 4.2 Four dimensions, 25% each

| Dimension | What judges want | Saboteur's answer | Hours we put here |
|---|---|---|---|
| Ships | A real flow that runs end to end, not slides | Real CLI, real demo app, real Kane runs, real patches | Most of Wed |
| Verified | Kane caught or confirmed something meaningful | Every mutant verdict is a Kane verdict. Every generated test is accepted only after two Kane runs (passes clean, fails mutant) | Wed afternoon |
| Closed loop | Kane results feed back to the agent; **tighter = better** | Kane's failure text drives Claude's next attempt (up to 3 tries per survivor) with no human step | Wed evening |
| Craft | Would a developer install it tonight? | Works on your own repo via `saboteur.config.json`; clear output; one score number | Thu morning |

Tie-breaks: averaged scores, then **Verified**, then **Closed loop**. Those two are our strongest areas by design.

### 4.3 Launch buzz

Required: at least 2 posts on HN, X, Reddit, or LinkedIn. **More posts, reach and engagement earn bonus points.** Post on Thu morning, not at 7 PM.

## 5. Judge-access plan (rule 5)

| Thing judges need | Plan |
|---|---|
| Kane CLI account | Judges are TestMu engineers; they use their own. README says so plainly |
| Demo app | Runs locally with `pnpm --filter shop preview` — no backend, no keys |
| Claude (paid) | Live mode needs `ANTHROPIC_API_KEY`. Fallback 1: `saboteur run --replay` skips Claude and uses the generated tests we committed in `tests/kane/generated/`, so judges still see Kane prove them. Fallback 2: recorded loop transcripts in `evidence/runs/`. Fallback 3: the video. If the submit form has a private-notes field, add a spend-capped key there |
| Proof of past runs | `evidence/` holds the reports, Test Manager share links, and the evidence-pack file names from our real runs |

## 6. Previous edition winners (Aug 2026)

From our tracker notes: demo.studio, GuardianKane (a Claude Code Stop-hook that runs Kane), KANE vs. ABLE. Saboteur is different from all three: it doesn't check the agent's own change, it **measures how good your Kane test suite is** and then makes it better.
