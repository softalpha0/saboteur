---
mode: testing
url: http://localhost:4174
tags: [generated, toggle-all]
max_steps: 30
---

# Toggle all marks todos active again when they were completed one by one

## Add two todos
Open the page at http://localhost:4174/#/.
Add two todos, in order: "Buy milk" and "Walk dog".
Verify the list shows "Buy milk" and "Walk dog".
Verify the counter shows "2 items left!".

## Complete both todos with their own checkboxes
Click the round checkbox next to "Buy milk" and the round checkbox next to "Walk dog".
Verify the "Buy milk" and "Walk dog" titles are both struck through.
Verify the counter shows "0 items left!".

## Use the toggle-all arrow to mark them active again
Click the "toggle all" arrow (❯) to the left of the "What needs to be done?" box.
Verify neither the "Buy milk" title nor the "Walk dog" title is struck through.
Verify the counter shows exactly "2 items left!" and does not show "0 items left!".
