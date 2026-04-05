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
- list `data-item-list="todo"`
- empty state `data-empty-state="todo"`

## Happy Path Scenarios

- todo input renders with maxlength `160`
- empty todo list shows the empty-state message initially
- valid task submission adds a new todo item
- empty-state message hides after the first successful add
- form resets after successful add

## Negative / Edge Scenarios

- blank or whitespace-only input is rejected
- rejected input marks the field invalid
- success and error message areas must not leak note-form state into todo form

## Accessibility / UI States

- input has visible label `Task`
- form message area uses `aria-live`
- invalid state is surfaced through input styling and `aria-invalid`

## Data / Auth / Storage Notes

- creation writes into `telos.productivity.v1`
- new todo items are stored with `id`, `text`, `completed`, `createdAt`, `updatedAt`
