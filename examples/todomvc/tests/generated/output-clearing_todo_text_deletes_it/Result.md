---
test: ../clearing_todo_text_deletes_it_test.md
status: passed
started: 2026-11-19T19:51:07.755Z
duration_s: 213
session_id: 2f8ff7e9-e160-40d4-a0e5-42b8d1a2eafd
---

# Saving an empty title while editing deletes the todo — Result

## Add two todos ✓ passed (67.5s)
md5: fea5f28bd3b8b436a7152426a6807dfa
Open the page at http://localhost:4174/#/.
Add two todos, in order: "Buy milk" and "Walk dog".
Verify the list shows "Buy milk" and "Walk dog".
Verify the counter shows "2 items left!".

## Clear the title of one todo and save it ✓ passed (107s)
md5: 48b30c59a74e4ba95216815ac7e8ec2d
Double-click the "Walk dog" title to edit it, delete all of its text so the edit box is completely empty, then press Enter.
Verify the list does not show any todo titled "Walk dog".
Verify the list shows exactly one todo, titled "Buy milk".
Verify the counter shows exactly "1 item left!" and does not show "2 items left!".
