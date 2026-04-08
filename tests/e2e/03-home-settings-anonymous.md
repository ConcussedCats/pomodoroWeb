# E2E Home Settings Anonymous Flow

## Purpose

Define the browser journey for local-only settings behavior when the user is not authenticated.

## Source Surface

- Page: `/`
- Script: `settings.js`

## User Story / Functional Slice

As an anonymous user, I can adjust timer settings locally without needing server persistence.

## Dependencies

- stable hooks:
  - `#settingsToggle`
  - `#pomodoroTime`
  - `#shortBreakTime`
  - `#longBreakTime`
  - `#focusCycles`
  - `#soundEnabled`
  - `#saveSettings`
  - `#cancelSettings`

## Happy Path Scenarios

- anonymous user opens settings
- valid settings save closes the panel
- refreshed page retains saved settings via local storage
- cancel discards unsaved field edits

## Negative / Edge Scenarios

- invalid numeric values are rejected visibly
- anonymous save must not depend on server availability

## Accessibility / UI States

- settings fields are keyboard reachable
- invalid state is visible and recoverable

## Data / Auth / Storage Notes

- assertions should include local storage updates to `pomodoroSettings`
