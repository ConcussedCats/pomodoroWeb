# Todo Item Lifecycle

## Purpose

Validate the full lifecycle of an individual todo item after creation.

## Source Surface

- Script: [productivity.js](../../src/main/resources/static/js/productivity.js)

## User Story / Functional Slice

As a user, I can complete, edit, save, cancel, and delete an existing todo item.

## Dependencies

- list item actions:
  - `toggle-complete`
  - `edit`
  - `save-edit`
  - `cancel-edit`
  - `delete`

## Happy Path Scenarios

- new todo appears at the top of the list
- checkbox toggles completed state
- completed state updates visual styling
- entering edit mode replaces static text with an input editor
- saving edit updates text and timestamp data
- canceling edit restores non-editing state
- deleting item removes it from the list

## Negative / Edge Scenarios

- empty edited text is rejected
- editing one item should not put unrelated items into edit mode
- deleting an item being edited should clear edit state safely
- HTML in task text must be escaped, not executed

## Accessibility / UI States

- checkbox is operable by keyboard
- edit controls remain reachable in both normal and editing states
- focused editor should move caret to the end on edit start

## Data / Auth / Storage Notes

- todo lifecycle mutates `telos.productivity.v1`
- toggling complete only applies to todo items, not notes
