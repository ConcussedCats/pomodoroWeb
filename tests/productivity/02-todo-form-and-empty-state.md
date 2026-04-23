# Todo Form And Empty State

## Purpose

Validate the input workflow for adding new todo items and the empty-state behavior for the todo list.

## Source Surface

- Template: [productivity.html](../../src/main/resources/templates/productivity.html)
- Script: [productivity.js](../../src/main/resources/static/js/productivity.js)

## User Story / Functional Slice

As a user, I can add a task to the todo list and see a meaningful empty state when no tasks exist.

## Dependencies

- todo form with `data-entry-form="todo"`
- input `todoInput`
- textarea `todoDescriptionInput`
- select `todoPriorityInput`
- input `todoDeadlineInput`
- list `data-item-list="todo"`
- empty state `data-empty-state="todo"`
- `POST /api/productivity/todos`

## Happy Path Scenarios

- todo input renders with maxlength `25`
- empty todo list shows the empty-state message initially
- valid task submission adds a new todo item
- empty-state message hides after the first successful add
- form resets after successful add
- valid `priority` and future `deadline` values are accepted

## Negative / Edge Scenarios

- blank or whitespace-only input is rejected
- past deadline is rejected before submit
- `67` / `six seven` input is rejected in task fields
- rejected input marks the field invalid
- success and error message areas must not leak note-form state into todo form

## Accessibility / UI States

- input has visible label `Task`
- form message area uses `aria-live`
- invalid state is surfaced through input styling and `aria-invalid`

## Data / Auth / Storage Notes

- creation goes through `/api/productivity/todos`
- todo payload includes `title`, `description`, `priority`, `deadline`, and `isDone`
