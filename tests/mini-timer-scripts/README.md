# Mini Timer Scripts Test Plans

## Source Surface

- Fragment: [mini-timer-scripts.html](../../src/main/resources/templates/fragments/mini-timer-scripts.html)
- Scripts:
  - [timer-state.js](../../src/main/resources/static/js/timer-state.js)
  - [mini-timer.js](../../src/main/resources/static/js/mini-timer.js)
  - [mini-timer-sync.js](../../src/main/resources/static/js/mini-timer-sync.js)

## Linked JS / API Dependencies

- `localStorage`:
  - `pomodoroSettings`
  - `pomodoroTimerState`
- custom events:
  - `settings:updated`
  - `timer:state-updated`
- session API:
  - `GET /api/user/time-settings`

## Covered Blocks

- script injection order
- runtime contract with header mini-timer markup
- settings sync side effects

## Plans

- [01-script-injection-order.md](01-script-injection-order.md)
- [02-mini-timer-runtime-contract.md](02-mini-timer-runtime-contract.md)
- [03-settings-sync-side-effects.md](03-settings-sync-side-effects.md)
