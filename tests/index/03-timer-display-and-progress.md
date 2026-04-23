# Timer Display And Progress

## Purpose

Validate the main numerical timer display, textual timer label, and circular progress visualization.

## Source Surface

- Template: [index.html](../../src/main/resources/templates/index.html)
- Script: [timer.js](../../src/main/resources/static/js/timer.js)

## User Story / Functional Slice

As a user, I can see the remaining time, understand the current phase, and visually estimate progress.

## Dependencies

- DOM ids and classes:
  - `timeDisplay`
  - `.timer-label`
  - `.timer-progress-bar`
- timer state helpers:
  - `getRemainingSeconds`
  - `getModeDurationSeconds`

## Happy Path Scenarios

- default display starts at `25:00`
- timer label reflects current mode:
  - `Focus Time`
  - `Short Break`
  - `Long Break`
- display decrements once running
- SVG progress values remain synchronized with remaining time

## Negative / Edge Scenarios

- progress must never exceed the `0..100%` effective range
- timer display must never show negative time
- corrupted stored timer state should normalize back to a valid display

## Accessibility / UI States

- time value remains readable as text, not only as graphics
- label provides mode meaning beyond the numeric timer

## Data / Auth / Storage Notes

- display depends on `pomodoroTimerState`
- no server call is required for render after local state is available
