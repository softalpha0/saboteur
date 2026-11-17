# 08 — Demo video, launch posts, submission checklist

## 1. Submission description (paste into the form; replace the brackets with real values)

**Saboteur — find out which bugs your Kane tests would miss, then let Claude close the gaps.**

Agents write our apps and our E2E tests now. A green suite doesn't tell you if those tests would notice a real regression. Saboteur plants small, realistic bugs in your app one at a time (wrong total, dead button, bad redirect), runs your Kane CLI suite against each broken build, and reports which bugs Kane caught and which slipped through. For every bug that slipped through, Claude writes a new `_test.md`, and Saboteur only keeps it after Kane proves it: it must pass on the correct app and fail on the bugged one. If Kane rejects it, Kane's own failure message goes back to Claude for another try.

- **Agent used:** Claude (Anthropic API) writes and revises the Kane tests; built with Claude Code.
- **What Kane does:** runs every test in real Chrome (`testrun run` for the suite, `testmd run` for each new test, `--no-adaptive-heal` on bugged builds so a broken page fails instead of healing), and its pass/fail + failure text decide every verdict.
- **Result on the demo shop:** [X/10] bugs caught by the starter suite → [Y/10] after Saboteur. [Report link]
- **Repo:** [link] · **Video:** [link] · **Posts:** [link 1], [link 2]

## 2. Video script (target 4:20, ~130 words/min, captions on)

| Time | Show | Say (rough) |
|---|---|---|
| 0:00–0:25 | Green test suite in terminal | "My coding agent wrote me four Kane tests. All green. But would they catch a real bug? I had no idea. So I built Saboteur." |
| 0:25–0:40 | Title card + one line | "Saboteur plants real bugs in your app, lets Kane try to catch them, and has Claude write tests for the ones that get through." |
| 0:40–1:40 | `pnpm saboteur run` — baseline passes, attack table filling | "First, baseline: the suite passes on the correct shop. Now Saboteur applies bug one: the cart total skips the last item. Kane replays the suite in real Chrome with healing off... caught. Bug three: SAVE10 takes 1% instead of 10%... all green. Kane missed it." End on the before-score. |
| 1:40–3:00 | One survivor's loop transcript, side by side with Kane output | "For each miss, Claude writes a new Kane test. Kane runs it on the correct shop: it fails, Claude checked the wrong total. That failure message goes straight back to Claude. Attempt two: passes on the correct shop... and fails on the bugged one. Proven. Saved." |
| 3:00–3:30 | Re-attack + after-score | "Re-run the attack with the new tests: [X] → [Y] bugs caught." |
| 3:30–3:55 | Report + Test Manager link + evidence pack viewer | "Every verdict links to a real Kane run and evidence pack." |
| 3:55–4:20 | Config file + "what's next" | "Point it at your own app with one config file. Next: run it on every PR." |

Recording checklist: notifications off, terminal font large, browser zoom ~125%, clean desktop, finish 10 s under 5:00, upload as public or unlisted, open the link in a private window.

## 3. Launch posts (rule 7 needs ≥ 2; more reach = bonus points)

Edit these in your own words before posting. Post Thu morning.

**X**
> My AI agent wrote my E2E tests. All green.
> So I planted 10 real bugs in the app to see how many they'd catch.
> [X]/10.
> Built Saboteur for the @testmuai Kane CLI hackathon: it plants bugs, Kane tries to catch them, Claude writes tests for the misses, and Kane has to prove each one.
> [video] [repo]

**LinkedIn**
> A passing test suite tells you your app works today. It doesn't tell you if your tests would notice tomorrow's bug.
> For the Kane CLI hackathon I built Saboteur: it breaks a demo shop on purpose, one bug at a time, and checks which bugs the browser tests catch. For each miss, Claude writes a new test, and Kane only accepts it if it passes on the real app and fails on the broken one.
> Starter suite: [X]/10 bugs caught. After: [Y]/10.
> Repo + 4-min demo: [links]

**Hacker News (Show HN)**
> Title: Show HN: Saboteur – mutation testing for plain-English browser tests
> Body: 3–4 plain sentences on what it does, how Kane verifies, the before/after number, repo link. No hype words.

**Reddit** (r/QualityAssurance or r/webdev, check each sub's self-promo rules first): same as LinkedIn, shorter.

Save every post URL in `evidence/README.md`.

## 4. Score yourself before submitting

| Check | Yes? |
|---|---|
| B1 Works end to end on a fresh clone | |
| B2 Kane caught something (killed mutants) **and** proved something (accepted tests) — visible in video | |
| B3 Agent ↔ Kane loop visible (a retry driven by Kane's text) | |
| Ships: real CLI, real runs, no slides | |
| Verified: every number links to a Kane run | |
| Closed loop: no human step inside the loop | |
| Craft: install steps tested on Windows + one other OS | |
| Description answers in the first lines: what problem, who has it, does it work, why different, would someone use it | |

## 5. Submission checklist

1. [ ] Repo is **public**; first commit dated ≥ 12 Nov
2. [ ] README has video + repo + report links at the top
3. [ ] YouTube video 3–5 min, plays in a private window
4. [ ] ≥ 2 public posts on different platforms, links saved
5. [ ] Description mentions the agent used and what Kane does
6. [ ] Judges can run it: Kane login steps, `--replay` mode, no secrets needed for replay
7. [ ] `.env`, keys, `.testmuai/evidence/` **not** committed; `output-*/` recordings **are** committed
8. [ ] Submit at https://www.kaneclihack.sh/o/submit by 3:00 PM Lagos
9. [ ] Open every submitted link from your phone
10. [ ] Update tracker: KaneCLI (HK-018) → Submitted
