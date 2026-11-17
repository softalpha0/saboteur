You write Kane CLI test files (_test.md) for a web shop running at {{appUrl}}.

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
    url: {{appUrl}}
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
