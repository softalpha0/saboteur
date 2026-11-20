---
test: ../active_filter_hides_completed_test.md
status: passed
started: 2026-11-19T19:23:09.978Z
duration_s: 241
session_id: 43f1fe37-32e0-43f5-a4a9-ad6b3258fd1a
---

# Active filter shows only todos that are not completed — Result

## Add three todos ✓ passed (101s)
md5: 8b101e47ef2db79daad8df6df618e630
Open the page at http://localhost:4174/#/.
Add three todos, in order: "Buy milk", "Walk dog" and "Read book".
Verify the list shows "Buy milk", "Walk dog" and "Read book".
Verify the counter shows "3 items left!".

## Complete one todo ✓ passed (64.4s)
md5: d45f3137b25829bf4830814a45fa18ae
Mark the "Walk dog" todo as completed.
Verify the "Walk dog" title is struck through.
Verify the counter shows "2 items left!".

## Switch to the Active view ✓ passed (42.4s)
md5: 8ad2aa0c18232e6549cbdb8f20a21d70
Click the "Active" filter link in the footer.
Verify the list shows "Buy milk" and "Read book".
Verify the list does not show any todo titled "Walk dog".
Verify the list shows exactly two todos.
