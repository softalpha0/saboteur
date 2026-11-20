---
test: ../completed_filter_shows_only_completed_test.md
status: passed
started: 2026-11-19T19:29:49.029Z
duration_s: 229
session_id: 44990602-2ccf-46e9-96de-4fa786796c29
---

# Completed filter shows only completed todos — Result

## Add three todos ✓ passed (88.8s)
md5: 8b101e47ef2db79daad8df6df618e630
Open the page at http://localhost:4174/#/.
Add three todos, in order: "Buy milk", "Walk dog" and "Read book".
Verify the list shows "Buy milk", "Walk dog" and "Read book".
Verify the counter shows "3 items left!".

## Complete one todo ✓ passed (50s)
md5: d45f3137b25829bf4830814a45fa18ae
Mark the "Walk dog" todo as completed.
Verify the "Walk dog" title is struck through.
Verify the counter shows "2 items left!".

## Switch to the Completed view ✓ passed (53s)
md5: 39d73547735590818cfe9bf1d5cc9f0b
Click the "Completed" filter link in the footer.
Verify the list shows a todo titled "Walk dog".
Verify the list does not show any todo titled "Buy milk" or "Read book".
Verify the list shows exactly one todo.
