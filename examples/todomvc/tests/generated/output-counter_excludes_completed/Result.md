---
test: ../counter_excludes_completed_test.md
status: passed
started: 2026-11-19T19:16:28.341Z
duration_s: 248
session_id: bb41a55f-2d6b-4848-92b3-19b689f0d298
---

# Counter counts only todos that are not completed — Result

## Add three todos ✓ passed (108s)
md5: 8b101e47ef2db79daad8df6df618e630
Open the page at http://localhost:4174/#/.
Add three todos, in order: "Buy milk", "Walk dog" and "Read book".
Verify the list shows "Buy milk", "Walk dog" and "Read book".
Verify the counter shows "3 items left!".

## Complete one todo ✓ passed (60.3s)
md5: d45f3137b25829bf4830814a45fa18ae
Mark the "Walk dog" todo as completed.
Verify the "Walk dog" title is struck through.
Verify the counter shows "2 items left!".

## Complete a second todo ✓ passed (46.3s)
md5: 7d74d4cb788707cfb1726b258bb7e10b
Mark the "Read book" todo as completed.
Verify the "Read book" title is struck through.
Verify the counter shows exactly "1 item left!" and does not show "3 items left!".
