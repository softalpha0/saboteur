---
test: ../toggle_all_marks_all_active_again_test.md
status: passed
started: 2026-11-20T03:29:35.121Z
duration_s: 204
session_id: cad71bee-3a19-4559-b170-57f92098a639
---

# Toggle all marks every todo active again when all are completed — Result

## Add two todos ✓ passed (63.2s)
md5: fea5f28bd3b8b436a7152426a6807dfa
Open the page at http://localhost:4174/#/.
Add two todos, in order: "Buy milk" and "Walk dog".
Verify the list shows "Buy milk" and "Walk dog".
Verify the counter shows "2 items left!".

## Mark all todos as completed with the toggle-all arrow ✓ passed (41.8s)
md5: 1657c1d2709440b6bbb4fefeae120c42
Click the "toggle all" arrow (❯) to the left of the "What needs to be done?" box once.
Verify the "Buy milk" and "Walk dog" titles are both struck through.
Verify the counter shows "0 items left!".

## Use the toggle-all arrow again to mark all todos active ✓ passed (57.2s)
md5: ea13e93e388a7e01f024b6cecc221ae0
Click the "toggle all" arrow (❯) to the left of the "What needs to be done?" box one more time.
Verify neither the "Buy milk" title nor the "Walk dog" title is struck through.
Verify the counter shows exactly "2 items left!" and does not show "0 items left!".
