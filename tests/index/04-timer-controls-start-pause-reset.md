# Timer Controls Start Pause Reset

## Purpose

Validate the primary timer control behavior exposed by the home page.

## Source Surface

- Template: [index.html](../../src/main/resources/templates/index.html)
- Script: [timer.js](../../src/main/resources/static/js/timer.js)

## User Story / Functional Slice

As a user, I can start, pause, resume, and reset the timer from the main controls.

## Dependencies

- controls:
  - `startBtn`
  - `resetBtn`
- worker or fallback interval
- persisted timer state

## Happy Path Scenarios

- clicking Start transitions idle timer into running state
- running timer changes button text from `Start` to `Pause`
- clicking the same control again pauses the timer
- paused timer resumes from remaining time
- Reset returns timer to fresh pomodoro defaults

## Negative / Edge Scenarios

- reset must stop the worker or fallback interval
- pause must persist remaining time instead of restarting the phase
- repeated rapid toggles must not create duplicate running intervals
- worker creation failure must fall back to interval-based ticking

## Accessibility / UI States

- both buttons are keyboard reachable
- visible control text reflects the current action
- settings button disabled state is coordinated separately while running

## Data / Auth / Storage Notes

- control actions mutate `pomodoroTimerState`
- start of a fresh pomodoro may trigger sound playback when enabled
