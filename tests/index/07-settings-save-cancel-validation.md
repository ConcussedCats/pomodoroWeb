# Settings Save Cancel Validation

## Purpose

Validate the client-side behavior of saving, canceling, and validating timer settings.

## Source Surface

- Script: [settings.js](../../src/main/resources/static/js/settings.js)
- Supporting state: [timer-state.js](../../src/main/resources/static/js/timer-state.js)

## User Story / Functional Slice

As a user, I can save valid timer settings, cancel unwanted edits, and receive clear feedback for invalid values.

## Dependencies

- `validateSettingsDraft`
- `showValidationError`
- `showSettingsMessage`
- `settings:updated` custom event

## Happy Path Scenarios

- valid settings save closes the panel and persists normalized values
- Cancel restores the last saved settings and closes the panel
- field error state clears on further input
- successful save dispatches `settings:updated`

## Negative / Edge Scenarios

- non-integer or out-of-range values are rejected
- invalid field gets `aria-invalid` and invalid class
- invalid save must not persist settings or close the panel
- cancel must discard unsaved field edits

## Accessibility / UI States

- validation errors are surfaced through the visible message area
- invalid fields are explicitly marked
- focus moves to the invalid field on validation failure

## Data / Auth / Storage Notes

- anonymous save writes only to local storage
- save behavior also affects timer state through later listeners
