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
- session counters and projection
- settings fields
- settings validation and persistence
- authenticated settings synchronization

## Related Shared Docs

- [Header](../header/README.md)
- [Footer](../footer/README.md)
- [Mini timer scripts](../mini-timer-scripts/README.md)

## Plans

- [01-page-shell-and-meta.md](01-page-shell-and-meta.md)
- [02-timer-modes.md](02-timer-modes.md)
- [03-timer-display-and-progress.md](03-timer-display-and-progress.md)
- [04-timer-controls-start-pause-reset.md](04-timer-controls-start-pause-reset.md)
- [05-session-counters-and-projection.md](05-session-counters-and-projection.md)
- [06-settings-panel-fields.md](06-settings-panel-fields.md)
- [07-settings-save-cancel-validation.md](07-settings-save-cancel-validation.md)
- [08-authenticated-settings-sync.md](08-authenticated-settings-sync.md)
