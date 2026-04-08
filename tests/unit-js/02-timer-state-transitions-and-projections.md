# Timer State Transitions And Projections Scenarios

## Purpose

Define JS unit scenarios for timer progression, session completion, and projected end-time logic.

## Source Surface

- [timer-state.js](../../src/main/resources/static/js/timer-state.js)

## User Story / Functional Slice

As the timer state engine, the module must move between work/break phases correctly and compute derived values safely.

## Dependencies

- fixed timestamps in tests
- exported timer-state helpers

## Happy Path Scenarios

- `startTimerState` starts a fresh pomodoro timer
- `pauseTimerState` freezes a running timer at the correct remaining value
- `resetTimerState` returns fresh pomodoro state
- `setModeState` switches into requested valid mode and resets end-time
- `applySettingsToTimerState` recomputes remaining time for paused state
- `getCurrentPomodoroNumber` returns expected pomodoro number across cycle states
- `getCurrentFocusCycleNumber` returns expected focus cycle number
- `hydrateTimerState` advances completed pomodoro into short break
- `hydrateTimerState` advances fourth pomodoro into long break
- `hydrateTimerState` advances completed long break into next focus cycle or final stopped state
- `getProjectedSessionEndTime` returns a future end time for in-progress or startable sessions
- `isFocusSessionFinished` returns true only for terminal completed state
- `areStatesEqual` returns true only for field-identical states

## Negative / Edge Scenarios

- calling `startTimerState` on already-running state returns a consistent running state
- invalid mode passed to `setModeState` normalizes instead of corrupting state
- hydrate guard prevents runaway loops on pathological input
- projected end time returns `null` when the session is already finished

## Accessibility / UI States

- Not applicable at the pure state-module layer

## Data / Auth / Storage Notes

- This suite should stub time explicitly rather than rely on wall clock
- P0 because browser timer behavior depends heavily on these transitions
