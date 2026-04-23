# E2E Productivity Notes And Keyboard Flow

## Purpose

Define end-to-end journeys for notes, including keyboard-driven editing.

## Source Surface

- Page: `/productivity`
- Script: `productivity.js`

## User Story / Functional Slice

As a user, I can manage notes and use the intended keyboard shortcuts while editing.

## Dependencies

- stable hooks:
  - `#noteInput`
  - `data-entry-form="notes"`
  - `data-item-list="notes"`
  - `data-empty-state="notes"`

## Happy Path Scenarios

- user switches to Notes tab
- user adds a note
- note renders with visible content
- user edits the note and saves with `Ctrl+Enter` or `Cmd+Enter`
- user deletes the note

## Negative / Edge Scenarios

- blank note submission shows validation feedback
- raw HTML/script payload is escaped in rendered note content
- note editing should not save on plain `Enter` without modifier

## Accessibility / UI States

- tab switch and note controls are keyboard reachable
- textarea editing remains usable for multi-line content

## Data / Auth / Storage Notes

- clear `telos.productivity.v1` before run
