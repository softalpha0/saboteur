---
test: ../clear_completed_keeps_active_test.md
status: passed
started: 2026-11-19T19:36:54.949Z
duration_s: 262
session_id: e5541ea8-4342-47ea-ad7d-9d8d1a57475b
---

# Clear completed removes only completed todos and keeps active ones — Result

## Add three todos ✓ passed (107.7s)
md5: 8b101e47ef2db79daad8df6df618e630
Open the page at http://localhost:4174/#/.
Add three todos, in order: "Buy milk", "Walk dog" and "Read book".
Verify the list shows "Buy milk", "Walk dog" and "Read book".
Verify the counter shows "3 items left!".

## Complete one todo ✓ passed (53.9s)
md5: aeaea305b743cc7fdee51180ecdc8914
Mark the "Walk dog" todo as completed.
Verify the "Walk dog" title is struck through.
Verify the counter shows "2 items left!".
Verify a "Clear completed" button is shown in the footer.

## Clear the completed todos ✓ passed (62.4s)
md5: c0ad11eae81364e75b83bdc76258f00e
Click the "Clear completed" button in the footer.
Verify the list shows "Buy milk" and "Read book".
Verify the list does not show any todo titled "Walk dog".
Verify the list shows exactly two todos.
Verify the counter shows "2 items left!".
