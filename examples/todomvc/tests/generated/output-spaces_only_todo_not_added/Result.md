---
test: ../spaces_only_todo_not_added_test.md
status: passed
started: 2026-11-19T19:45:07.253Z
duration_s: 155
session_id: 1cd43a2b-3d8f-4a24-8da4-5de8d6f9deb0
---

# A todo made only of spaces is not added — Result

## Add one real todo ✓ passed (51.5s)
md5: 478c3f2746477795014152508ffa3b44
Open the page at http://localhost:4174/#/.
Add a todo titled "Buy milk".
Verify the list shows exactly one todo, titled "Buy milk".
Verify the counter shows "1 item left!".

## Try to add a todo of only spaces ✓ passed (68.3s)
md5: 1a18e9b5ee73b1637e0cdc2688195c8c
Click the "What needs to be done?" box, type five spaces "     " and nothing else, then press Enter.
Verify the list still shows exactly one todo, titled "Buy milk", and has no blank or empty todo row.
Verify the counter shows exactly "1 item left!" and does not show "2 items left!".
