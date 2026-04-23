# Note Item Lifecycle

## Purpose

Validate the full lifecycle of an individual note item after creation.

## Source Surface

- Script: [productivity.js](../../src/main/resources/static/js/productivity.js)

## User Story / Functional Slice

As a user, I can edit, save, cancel, and delete existing notes while preserving formatting and metadata.

## Dependencies

- note actions:
  - `edit`
  - `save-edit`
  - `cancel-edit`
  - `delete`
- note renderer with timestamp formatting

## Happy Path Scenarios

- note item renders content and updated timestamp
- edit mode replaces rendered note with textarea editor
- saving edit updates content and `updatedAt`
- line breaks are preserved visually through `<br>` conversion
- deleting note removes it from the list

## Negative / Edge Scenarios

- empty edited note content is rejected
- `67` / `six seven` note edits are rejected
- HTML/script content in notes must be escaped, not executed
- invalid or corrupted timestamps should degrade to an empty timestamp string instead of crashing

## Accessibility / UI States

- textarea editor remains keyboard operable
- note content remains readable in both display and edit modes
- action buttons remain visible for each note item

## Data / Auth / Storage Notes

- note edits use `/api/productivity/notes/{id}`
- note items do not support completion state
