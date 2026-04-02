# Timer Modes

## Purpose

Validate how the current timer mode is represented on the page.

## Source Surface

- Template: [index.html](../../src/main/resources/templates/index.html)
- Scripts:
  - [timer.js](../../src/main/resources/static/js/timer.js)
  - [timer-state.js](../../src/main/resources/static/js/timer-state.js)

## User Story / Functional Slice

As a user, I can tell whether the timer is currently in pomodoro, short break, or long break mode.

## Dependencies

- mode labels with `data-mode`
- timer state field `currentMode`

## Happy Path Scenarios

- default visible active mode is `pomodoro`
- `mode-label--active` matches the current timer state
- active mode changes correctly after automatic timer transitions
- reset returns active mode display to `pomodoro`

## Negative / Edge Scenarios

- current implementation treats mode labels as display elements, not clickable controls
- invalid stored mode values must normalize back to a safe mode display
- UI must not show multiple active mode labels at once

## Accessibility / UI States

- active mode is visually distinguishable
- mode text remains visible even before runtime hydration

## Data / Auth / Storage Notes

- mode display is driven from `pomodoroTimerState`
- no API dependency for mode rendering itself
