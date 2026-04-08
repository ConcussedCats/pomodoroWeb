# Timer State Normalization And Storage Scenarios

## Purpose

Define JS unit scenarios for settings/state normalization and storage-facing behavior in `timer-state.js`.

## Source Surface

- [timer-state.js](../../src/main/resources/static/js/timer-state.js)

## User Story / Functional Slice

As the shared timer state module, the code must normalize malformed input and persist safe values to browser storage.

## Dependencies

- `localStorage`
- exported `window.PomodoroTimerState`

## Happy Path Scenarios

- default settings normalize to `25/5/15/true/1`
- valid numeric settings are preserved
- `getSettingsKey` maps:
  - `pomodoro -> pomodoro`
  - `short-break -> shortBreak`
  - `long-break -> longBreak`
- `getDefaultTimerState` returns idle pomodoro state
- `saveSettings` writes normalized settings to `pomodoroSettings`
- `saveTimerState` writes normalized timer state to `pomodoroTimerState`
- `loadSettings` returns parsed saved settings
- `loadTimerState` returns parsed saved timer state when valid

## Negative / Edge Scenarios

- invalid numbers are clamped or replaced by fallback values
- `soundEnabled` defaults to true unless explicitly false
- corrupted `pomodoroSettings` JSON falls back to defaults
- corrupted `pomodoroTimerState` JSON falls back to default timer state
- invalid mode in stored timer state falls back to `pomodoro`
- negative remaining seconds are normalized away
- idle break state loaded from storage resets to default pomodoro state

## Accessibility / UI States

- Not applicable at the pure state-module layer

## Data / Auth / Storage Notes

- Keys under test:
  - `pomodoroSettings`
  - `pomodoroTimerState`
- This suite should avoid DOM dependencies and focus on pure state/storage transitions
