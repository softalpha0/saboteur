---
mode: testing
url: http://localhost:4174
tags: [generated, edit]
max_steps: 30
---

# Saving an empty title while editing deletes the todo

## Add two todos
Open the page at http://localhost:4174/#/.
Add two todos, in order: "Buy milk" and "Walk dog".
Verify the list shows "Buy milk" and "Walk dog".
Verify the counter shows "2 items left!".

## Clear the title of one todo and save it
Double-click the "Walk dog" title to edit it, delete all of its text so the edit box is completely empty, then press Enter.
Verify the list does not show any todo titled "Walk dog".
Verify the list shows exactly one todo, titled "Buy milk".
Verify the counter shows exactly "1 item left!" and does not show "2 items left!".
