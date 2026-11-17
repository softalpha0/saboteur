# 06 — Agent prompts and the Kane ↔ Claude loop

This is the "Closed loop" judging dimension. Kane's own output is the only feedback Claude gets about whether its test works.

## 1. Who does what

| Actor | Job | Never does |
|---|---|---|
| Saboteur (code) | Applies bugs, runs Kane, validates files, decides accept/reject | Judges a test by itself |
| Kane CLI | Runs every test in real Chrome, returns pass/fail + failure text | — |
| Claude (writer agent) | Writes one `_test.md` per survivor, revises from Kane's feedback | Edits app code, sees the browser directly, decides its own test is good |

## 2. System prompt — `packages/agent/prompts/write-test.system.md`

```text
You write Kane CLI test files (_test.md) for a web shop running at http://localhost:4173.

A bug was planted in the shop and the current test suite did NOT catch it. Write ONE new
test that:
  1. passes on the correct shop, and
  2. fails on the shop with this bug.

Kane CLI reads plain-English steps and runs them in a real browser. Follow these rules exactly:
- Output only the file, inside one ```markdown fence, preceded by a line: FILE: <name>_test.md
- File name: lowercase, words joined by underscores, ends in _test.md.
- Frontmatter allowed keys only: mode, url, tags, max_steps. Use:
    ---
    mode: testing
    url: http://localhost:4173
    tags: [generated, <category>]
    max_steps: 30
    ---
- Each step starts with "## <short heading>". The body is a plain-English objective.
- Say the goal, not the clicks ("Add the Canvas Tote to the cart"), but keep exact values
  literal (prices like $59.98, codes like SAVE10, emails).
- Every step ends with a check of the result that is visible on the screen that step leaves
  you on, e.g. "Verify the order total shows $44.10". Name the outcome, not the button.
- If the proof is on another page, navigate there explicitly first, then check.
- The final step must check the exact thing the bug breaks. A test that only checks that a
  page loads is useless here.
- Use only routes, product names and values from the ROUTES section. Do not invent pages.
- If an element only sometimes appears, write it as a condition ("if a banner appears, dismiss it").
- 2 to 6 steps. No @import. No auth in frontmatter.
```

## 3. User prompt — first attempt

```text
BUG (planted):
id: {{mutant.id}}
title: {{mutant.title}}
user impact: {{mutant.userImpact}}
diff:
{{diff}}

ROUTES AND FACTS (the correct shop):
{{routes}}          <- apps/shop/ROUTES.md, hand-written: pages, product names, prices,
                       stock, discount codes, shipping rule, test login

EXISTING TESTS (they all pass on the correct shop AND on the bugged shop):
{{existingTests}}

Write the new test.
```

## 4. User prompt — retry (attempt 2 or 3)

```text
Your previous test:
{{previousAttempt.testBody}}

Kane CLI ran it. Problem: {{problem}}

{{#if fails-on-clean}}
It FAILED on the CORRECT shop, so it is checking something that is not true.
Kane said: {{kaneText}}      <- testmd/testrun failure.message (+ step index)
Fix the steps or the expected value. Keep it aimed at the bug.
{{/if}}

{{#if passes-on-mutant}}
It PASSED on the BUGGED shop, so it does not detect the bug.
Kane said: {{kaneText}}      <- final result summary of the passing run
Make the final check target exactly what the diff changes.
{{/if}}

Return the full corrected file in the same format.
```

`kaneText` is always Kane's own words (from `failure.message` or the run's summary). Saboteur never rewrites or summarises it.

## 5. Local validator (runs before any Kane credits are spent)

Reject and re-prompt (counts as an attempt) if:

1. No `FILE:` line or name doesn't match `^[a-z0-9_]+_test\.md$`.
2. Frontmatter has a key outside `mode, url, tags, max_steps` (Kane rejects unknown keys at parse time).
3. Fewer than 2 or more than 6 `## ` steps, or any step body empty.
4. Any step body contains `@import`.
5. Last step has no check word (`verify`, `assert`, `confirm`, `check`).
6. File name already exists in `tests/kane/`.

## 6. Accept rule

Accept only when **both**:

- Kane run A on CLEAN: `testmd run` exit **0**
- Kane run B on MUTANT with `--no-adaptive-heal`: exit **1**

Exit 2 or 3 on either run = infrastructure problem. Retry the Kane run once, and don't count it as a Claude attempt.

## 7. Transcript (saved for judges)

`evidence/runs/<run-id>/fill-<mutant-id>.md` records, per attempt: the prompt sent, Claude's file, Kane run A result (exit, `overall_status`, share URL if any, failure text), Kane run B result, and the decision. The video shows one of these where attempt 1 failed and attempt 2 was accepted.

## 8. Model and keys

- `ANTHROPIC_API_KEY` from `.env` (never committed).
- `ANTHROPIC_MODEL` from `.env`: set it to the Claude model you have access to. The code reads it and never hard-codes a model name.
- `--replay` skips Claude completely and uses `tests/kane/generated/` as-is.
