---
mode: testing
url: http://localhost:4174
tags: [generated, counter]
max_steps: 30
---

# Counter counts only todos that are not completed

## Add three todos
Open the page at http://localhost:4174/#/.
Add three todos, in order: "Buy milk", "Walk dog" and "Read book".
Verify the list shows "Buy milk", "Walk dog" and "Read book".
Verify the counter shows "3 items left!".

## Complete one todo
Mark the "Walk dog" todo as completed.
Verify the "Walk dog" title is struck through.
Verify the counter shows "2 items left!".

## Complete a second todo
Mark the "Read book" todo as completed.
Verify the "Read book" title is struck through.
Verify the counter shows exactly "1 item left!" and does not show "3 items left!".
