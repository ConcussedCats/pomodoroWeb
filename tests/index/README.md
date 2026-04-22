# Index Page Test Plans

## Source Surface

- Template: [index.html](../../src/main/resources/templates/index.html)
- Page scripts:
  - [settings.js](../../src/main/resources/static/js/settings.js)
  - [timer.js](../../src/main/resources/static/js/timer.js)
- Shared scripts:
  - [timer-state.js](../../src/main/resources/static/js/timer-state.js)
  - [mini-timer.js](../../src/main/resources/static/js/mini-timer.js)
  - [mini-timer-sync.js](../../src/main/resources/static/js/mini-timer-sync.js)

## Linked JS / API Dependencies

- Session API:
  - `GET /api/user/time-settings`
  - `PATCH /api/user/time-settings`
- Browser state:
  - `pomodoroSettings`
  - `pomodoroTimerState`
- Meta tags:
  - `_csrf`
  - `_csrf_header`
  - `is-authenticated`

## Covered Blocks

- page shell and meta contract
- timer mode display
- timer display and progress
- timer controls
- pattern-based cycle state, work-progress dots, and projection
- settings fields
- settings validation and persistence
- authenticated settings synchronization

## Related Shared Docs

- [Header](../header/README.md)
- [Footer](../footer/README.md)
- [Mini timer scripts](../mini-timer-scripts/README.md)

## Automation Notes

- Primary automation layer: `Playwright`
- Secondary layers:
  - `WebMvc` for transport/auth edges around settings APIs
  - future JS-unit layer for `timer-state.js` if introduced
- Priority: `P0`
- Stable hooks already available:
  - `#startBtn`
  - `#resetBtn`
  - `#prevCycleBtn`
  - `#nextCycleBtn`
  - `#settingsToggle`
  - `#timeDisplay`
  - `#sessionDots`
  - `#patternType`
  - `#sessionProjectionText`
  - `#pomodoroTime`
  - `#shortBreakTime`
  - `#longBreakTime`
  - `#focusCycles`
  - `#soundEnabled`
- First automation slices to implement:
  - shell/meta smoke
  - timer controls
  - settings validation
  - authenticated settings sync

## Plans

- [01-page-shell-and-meta.md](01-page-shell-and-meta.md) — `WebMvc smoke` + `Playwright smoke`
- [02-timer-modes.md](02-timer-modes.md) — `Playwright` + `timer-state` unit coverage
- [03-timer-display-and-progress.md](03-timer-display-and-progress.md) — `Playwright`
- [04-timer-controls-start-pause-reset.md](04-timer-controls-start-pause-reset.md) — `Playwright P0`
- [05-session-counters-and-projection.md](05-session-counters-and-projection.md) — `Playwright` + `timer-state` unit coverage
- [06-settings-panel-fields.md](06-settings-panel-fields.md) — `Playwright`
- [07-settings-save-cancel-validation.md](07-settings-save-cancel-validation.md) — `Playwright P0`
- [08-authenticated-settings-sync.md](08-authenticated-settings-sync.md) — `WebMvc API` + `Playwright P0`

## Executable Suites

- [UserTimeSettingsRestControllerTest.java](../../src/test/java/com/example/telos/api/UserTimeSettingsRestControllerTest.java): session API contract coverage for timer settings `GET/PATCH`, including `401`, `403`, validation, and malformed body handling
- [UserJwtControllerTest.java](../../src/test/java/com/example/telos/api/UserJwtControllerTest.java): JWT API contract coverage for timer settings `GET/PATCH` with bearer auth and invalid-token handling
- [../e2e/home-timer.spec.js](../e2e/home-timer.spec.js): browser flow for default `classic` render, start/pause/resume/reset, compact-pattern switching, skip-button autostart, and reload recovery on the home page
- [../unit-js/timer-state.test.mjs](../unit-js/timer-state.test.mjs): pattern-based state-machine coverage for `classic`/`compact`, cycle transitions, skip semantics, projections, and recovery
- [../unit-js/timer-persistence.test.mjs](../unit-js/timer-persistence.test.mjs): localStorage persistence, migration, and recovery coverage for the new phase/cycle state
- [../unit-js/mini-timer.test.mjs](../unit-js/mini-timer.test.mjs): mini-timer sync and completed-state coverage for the new timer model
