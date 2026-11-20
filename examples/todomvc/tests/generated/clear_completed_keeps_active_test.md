---
mode: testing
url: http://localhost:4174
tags: [generated, clear-completed]
max_steps: 30
---

# Clear completed removes only completed todos and keeps active ones

## Add three todos
Open the page at http://localhost:4174/#/.
Add three todos, in order: "Buy milk", "Walk dog" and "Read book".
Verify the list shows "Buy milk", "Walk dog" and "Read book".
Verify the counter shows "3 items left!".

## Complete one todo
Mark the "Walk dog" todo as completed.
Verify the "Walk dog" title is struck through.
Verify the counter shows "2 items left!".
Verify a "Clear completed" button is shown in the footer.

## Clear the completed todos
Click the "Clear completed" button in the footer.
Verify the list shows "Buy milk" and "Read book".
Verify the list does not show any todo titled "Walk dog".
Verify the list shows exactly two todos.
Verify the counter shows "2 items left!".
