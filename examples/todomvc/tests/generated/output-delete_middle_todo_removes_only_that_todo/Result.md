---
test: ../delete_middle_todo_removes_only_that_todo_test.md
status: failed
started: 2026-11-19T19:57:53.204Z
duration_s: 539
session_id: 402305b0-3f81-473c-8145-800048d86386
---

# Deleting a todo removes only the todo that was clicked — Result

## Add three todos ✓ passed (121.8s)
md5: 8b101e47ef2db79daad8df6df618e630
Open the page at http://localhost:4174/#/.
Add three todos, in order: "Buy milk", "Walk dog" and "Read book".
Verify the list shows "Buy milk", "Walk dog" and "Read book".
Verify the counter shows "3 items left!".

## Delete the middle todo ✓ passed (77.1s)
md5: 981d5e7deab596b4dd1acba229c5be6e
Hover over the "Walk dog" row and click the "×" delete button on that same "Walk dog" row.
Verify the list does not show any todo titled "Walk dog".
Verify the list still shows a todo titled "Buy milk".
Verify the list still shows a todo titled "Read book".
Verify the list shows exactly two todos.
Verify the counter shows "2 items left!".

## Delete the last todo ✗ failed (311.1s)
md5: ebc881feb20d2fa3b9a8ca036a50429b
Reason: AP produced no action for 3 consecutive steps
Hover over the "Read book" row and click the "×" delete button on that same "Read book" row.
Verify the list does not show any todo titled "Read book".
Verify the list shows exactly one todo, titled "Buy milk".
Verify the counter shows exactly "1 item left!".
