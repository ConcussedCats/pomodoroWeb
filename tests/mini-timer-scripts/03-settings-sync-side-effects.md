# Mini Timer Settings Sync Side Effects

## Purpose

Validate the page-wide consequences of `mini-timer-sync.js` and related settings events.

## Source Surface

- Script: [mini-timer-sync.js](../../src/main/resources/static/js/mini-timer-sync.js)
- Supporting scripts:
  - [timer-state.js](../../src/main/resources/static/js/timer-state.js)
  - [mini-timer.js](../../src/main/resources/static/js/mini-timer.js)

## User Story / Functional Slice

As an authenticated user browsing a non-home page, I see mini-timer values synchronized with server-side time settings.

## Dependencies

- `GET /api/user/time-settings`
- `settings:updated` custom event
- `timer:state-updated` custom event

## Happy Path Scenarios

- on load, authenticated page fetches current time settings
- successful sync saves normalized settings locally
- synced settings are applied to timer state
- both settings and timer update events are dispatched after successful sync

## Negative / Edge Scenarios

- unauthenticated or failed `GET` should exit quietly without breaking the page
- sync failure should not erase existing local timer state
- missing network response should not block static mini-timer rendering

## Accessibility / UI States

- text values should remain stable if sync fails
- users should not see blank mini-timer content due to a failed API call

## Data / Auth / Storage Notes

- this behavior is session-auth based
- CSRF is not required for the `GET`
- successful sync mutates `pomodoroSettings` and may cascade into updated `pomodoroTimerState`
