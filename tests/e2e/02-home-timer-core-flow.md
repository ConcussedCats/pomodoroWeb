# E2E Home Timer Core Flow

## Purpose

Define the main browser journey for the timer on the home page.

## Source Surface

- Page: `/`
- Scripts:
  - `timer.js`
  - `timer-state.js`

## User Story / Functional Slice

As a user, I can start, pause, resume, and reset the timer while the page reflects the correct mode and remaining time.

## Dependencies

- stable hooks:
  - `#startBtn`
  - `#resetBtn`
  - `#timeDisplay`

## Happy Path Scenarios

- page loads with default `25:00`
- clicking Start begins countdown
- clicking Pause freezes countdown
- clicking Start again resumes countdown
- clicking Reset returns to default pomodoro state

## Negative / Edge Scenarios

- rapid Start/Pause interaction does not produce duplicated countdown behavior
- reset during running state stops countdown cleanly

## Accessibility / UI States

- button text changes are visible and keyboard reachable
- timer text remains readable while running

## Data / Auth / Storage Notes

- clear `pomodoroTimerState` before each run
- this journey should avoid relying on audio playback assertions first
