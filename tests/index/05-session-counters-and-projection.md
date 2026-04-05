# Session Counters And Projection

## Purpose

Validate the counters and projected end-time messaging shown under the timer.

## Source Surface

- Template: [index.html](../../src/main/resources/templates/index.html)
- Scripts:
  - [timer.js](../../src/main/resources/static/js/timer.js)
  - [timer-state.js](../../src/main/resources/static/js/timer-state.js)

## User Story / Functional Slice

As a user, I can understand where I am within the current pomodoro cycle and when the focus session is expected to end.

## Dependencies

- DOM ids:
  - `sessionCount`
  - `sessionTotal`
  - `focusCycleCount`
  - `focusCycleTotal`
  - `sessionProjectionText`
- helpers:
  - `getCurrentPomodoroNumber`
  - `getCurrentFocusCycleNumber`
  - `getProjectedSessionEndTime`
  - `isFocusSessionFinished`

## Happy Path Scenarios

- default counters show pomodoro `1 of 4`
- focus cycle counter reflects current configured focus-cycle number
- total focus cycles reflect the current settings value
- projected end text shows `Session ends at ...` while session is in progress
- finished session state shows `Focus session complete`

## Negative / Edge Scenarios

- counters must not drift out of sync with stored timer state
- projected end time must not remain stale after settings changes
- final completed session must not continue to show a projected time

## Accessibility / UI States

- counter text remains understandable without interpreting timer graphics
- projection text should remain human-readable after updates

## Data / Auth / Storage Notes

- counters depend on both timer state and current settings
- total cycle count can differ by authenticated user settings
