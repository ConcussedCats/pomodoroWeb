# Notes Form And Empty State

## Purpose

Validate the input workflow for adding notes and the empty-state behavior of the notes panel.

## Source Surface

- Template: [productivity.html](../../src/main/resources/templates/productivity.html)
- Script: [productivity.js](../../src/main/resources/static/js/productivity.js)

## User Story / Functional Slice

As a user, I can add a note with longer freeform text and see a meaningful empty state before any notes exist.

## Dependencies

- notes form with `data-entry-form="notes"`
- textarea `noteInput`
- list `data-item-list="notes"`
- empty state `data-empty-state="notes"`
- `POST /api/productivity/notes`

## Happy Path Scenarios

- notes textarea renders with maxlength `1200`
- notes panel empty state is visible when no notes exist
- valid note submission adds an item and hides the empty state
- form resets after successful add

## Negative / Edge Scenarios

- blank or whitespace-only note input is rejected
- `67` / `six seven` note input is rejected
- rejected note marks textarea invalid
- todo form and note form messages remain isolated

## Accessibility / UI States

- textarea has visible label `Note`
- form message uses `aria-live`
- textarea remains usable for multi-line input

## Data / Auth / Storage Notes

- creation goes through `/api/productivity/notes`
- note records are created from `noteText` payloads and mapped back into rendered notes
