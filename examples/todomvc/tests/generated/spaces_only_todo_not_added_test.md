---
mode: testing
url: http://localhost:4174
tags: [generated, add]
max_steps: 30
---

# A todo made only of spaces is not added

## Add one real todo
Open the page at http://localhost:4174/#/.
Add a todo titled "Buy milk".
Verify the list shows exactly one todo, titled "Buy milk".
Verify the counter shows "1 item left!".

## Try to add a todo of only spaces
Click the "What needs to be done?" box, type five spaces "     " and nothing else, then press Enter.
Verify the list still shows exactly one todo, titled "Buy milk", and has no blank or empty todo row.
Verify the counter shows exactly "1 item left!" and does not show "2 items left!".
