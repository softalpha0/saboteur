# TodoMVC (React): routes and facts

This file is the spec Claude gets as "ROUTES AND FACTS" when writing tests for TodoMVC. The app is the official React version from [tastejs/todomvc](https://github.com/tastejs/todomvc), unchanged apart from the build tool (see README.md).

Base URL: `http://localhost:4174` (`vite preview --port 4174 --strictPort`)

## Pages

There is one page. The filter is in the URL hash.

| URL | Shows |
|---|---|
| `/#/` | All todos |
| `/#/active` | Only todos that are not completed |
| `/#/completed` | Only completed todos |

## What is on the page

- Heading "todos".
- A text box with the placeholder "What needs to be done?". Type a title and press Enter to add a todo at the bottom of the list. The box clears after adding.
- The todo list. Each row has a round checkbox (complete / not complete), the title, and a "×" delete button that appears when you hover over the row. Completed todos are shown with their title struck through and greyed out.
- A "toggle all" arrow (❯) to the left of the text box. It is shown only when there are todos.
- A footer, shown only when there are todos:
  - a counter: "N items left!" (or "1 item left!"), counting todos that are **not** completed
  - filter links: All, Active, Completed (the current one is outlined)
  - a "Clear completed" button, shown only when at least one todo is completed

## Rules

1. **Adding:** the title is trimmed. Pressing Enter with an empty box, or only spaces, adds nothing.
2. **Completing:** clicking a todo's checkbox toggles it between active and completed.
3. **Toggle all:** if every visible todo is completed, the arrow marks them all active. Otherwise it marks them all completed.
4. **Editing:** double-click a todo's title to edit it. Enter or clicking away saves the trimmed text. Saving an empty title deletes the todo.
5. **Deleting:** the "×" button deletes only that todo.
6. **Clear completed:** deletes every completed todo and keeps every active one.
7. **Counter:** "1 item left!" for one, "N items left!" otherwise (including "0 items left!").
8. **No persistence:** todos are kept in memory only. Reloading the page empties the list. Tests must add the todos they need.

## Worked example (correct app)

Add "Buy milk", "Walk dog", "Read book". Complete "Walk dog".

| View | Todos shown | Counter |
|---|---|---|
| All | Buy milk, Walk dog (struck through), Read book | 2 items left! |
| Active | Buy milk, Read book | 2 items left! |
| Completed | Walk dog | 2 items left! |

After "Clear completed": Buy milk, Read book; counter "2 items left!"; the button is hidden.
