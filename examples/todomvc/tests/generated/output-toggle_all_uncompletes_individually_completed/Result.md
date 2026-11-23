---
test: ../toggle_all_uncompletes_individually_completed_test.md
status: passed
started: 2026-11-23T08:22:50.616Z
duration_s: 391
session_id: 41d80c8a-810d-49b5-a9cc-2ffe9c535410
---

# Toggle all marks todos active again when they were completed one by one — Result

## Add two todos ✓ passed (85.8s)
md5: fea5f28bd3b8b436a7152426a6807dfa
Open the page at http://localhost:4174/#/.
Add two todos, in order: "Buy milk" and "Walk dog".
Verify the list shows "Buy milk" and "Walk dog".
Verify the counter shows "2 items left!".

## Complete both todos with their own checkboxes ✓ passed (68.8s)
md5: 9b3da0b4e619a6afda8a01832d239821
Click the round checkbox next to "Buy milk" and the round checkbox next to "Walk dog".
Verify the "Buy milk" and "Walk dog" titles are both struck through.
Verify the counter shows "0 items left!".

## Use the toggle-all arrow to mark them active again ✓ passed (82.4s)
md5: 1d15feac6b7be99e0272eff7607e1517
Click the "toggle all" arrow (❯) to the left of the "What needs to be done?" box.
Verify neither the "Buy milk" title nor the "Walk dog" title is struck through.
Verify the counter shows exactly "2 items left!" and does not show "0 items left!".
