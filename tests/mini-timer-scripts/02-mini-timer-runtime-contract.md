# Mini Timer Runtime Contract

## Purpose

Validate the runtime assumptions that the mini-timer scripts make about page markup and state.

## Source Surface

- Scripts:
  - [mini-timer.js](../../src/main/resources/static/js/mini-timer.js)
  - [timer-state.js](../../src/main/resources/static/js/timer-state.js)
- Shared markup source:
  - [header.html](../../src/main/resources/templates/fragments/header.html)

## User Story / Functional Slice

As a user, I see a compact timer that reflects the shared timer state on non-home pages.

## Dependencies

- required DOM ids:
  - `miniTimer`
  - `miniTimerMode`
  - `miniTimerTime`
  - `miniTimerStatus`
- local storage keys:
  - `pomodoroSettings`
  - `pomodoroTimerState`

## Happy Path Scenarios

- mini-timer reads current settings and timer state from storage
- displayed mode, time, and status match the stored state
- mini-timer updates when custom events fire on the document
- mini-timer updates when `storage` events arrive from another tab

## Negative / Edge Scenarios

- missing DOM ids should fail gracefully by early return
- corrupted storage should fall back to normalized state rather than crashing
- pages with markup but without full script set should be documented as partially functional

## Accessibility / UI States

- visible text values remain meaningful before and after hydration
- status text transitions between ready, running, and paused states

## Data / Auth / Storage Notes

- runtime depends on normalized shared timer state
- no direct JWT dependency
