# E2E Productivity Todo Flow

## Purpose

Define end-to-end journeys for the todo portion of the productivity page.

## Source Surface

- Page: `/productivity`
- Script: `productivity.js`

## User Story / Functional Slice

As a user, I can create, edit, complete, and delete todo items in the browser.

## Dependencies

- stable hooks:
  - `#todoInput`
  - `data-entry-form="todo"`
  - `data-item-list="todo"`
  - `data-empty-state="todo"`

## Happy Path Scenarios

- todo tab is active on page load
- user adds a task
- task appears in list and empty state disappears
- user edits task text and saves
- user toggles task completion
- user deletes task and list returns to empty state when appropriate

## Negative / Edge Scenarios

- blank task submission shows validation feedback
- HTML payload is rendered escaped, not executed

## Accessibility / UI States

- keyboard can reach add/edit/delete controls
- completed visual state remains distinguishable

## Data / Auth / Storage Notes

- clear `telos.productivity.v1` before run
- verify persistence across reload where useful
