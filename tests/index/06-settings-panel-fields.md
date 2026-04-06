# Settings Panel Fields

## Purpose

Validate the structure and bounds of the timer settings panel fields.

## Source Surface

- Template: [index.html](../../src/main/resources/templates/index.html)
- Script: [settings.js](../../src/main/resources/static/js/settings.js)

## User Story / Functional Slice

As a user, I can view and edit all timer settings through a dedicated panel with explicit field constraints.

## Dependencies

- inputs:
  - `pomodoroTime`
  - `shortBreakTime`
  - `longBreakTime`
  - `focusCycles`
  - `soundEnabled`
- panel controls:
  - `settingsToggle`
  - `saveSettings`
  - `cancelSettings`

## Happy Path Scenarios

- opening settings hides the timer section and shows the settings section
- each numeric field shows the expected default or loaded value
- numeric min/max values match current DTO validation rules
- sound checkbox reflects current boolean setting

## Negative / Edge Scenarios

- settings panel must not open while disabled during a running timer
- field constraints in markup must remain aligned with runtime validation:
  - pomodoro `1..120`
  - short break `1..30`
  - long break `1..80`
  - cycles `1..12`
- stale values should not remain after a storage-driven settings refresh

## Accessibility / UI States

- each input has a visible label
- checkbox is grouped with descriptive text
- error container `settingsError` is present for feedback

## Data / Auth / Storage Notes

- field values mirror `pomodoroSettings`
- auth state only changes where settings are loaded from and saved to
