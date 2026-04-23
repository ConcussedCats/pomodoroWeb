# Header Fragment Test Plans

## Source Surface

- Fragment: [header.html](../../src/main/resources/templates/fragments/header.html)

## Linked JS / API Dependencies

- Depends on `activePage` fragment parameter
- Depends on Spring Security view state:
  - `isAnonymous()`
  - `isAuthenticated()`
- Logout form posts to `/logout`
- Mini-timer slot depends on:
  - [timer-state.js](../../src/main/resources/static/js/timer-state.js)
  - [mini-timer.js](../../src/main/resources/static/js/mini-timer.js)
  - [mini-timer-sync.js](../../src/main/resources/static/js/mini-timer-sync.js)

## Covered Blocks

- branding and home link
- primary navigation
- anonymous auth controls
- authenticated account menu
- mini-timer slot rules

## Automation Notes

- Primary automation layer: `Playwright smoke`
- Secondary layer: `WebMvc` only for page-level active-state assertions where cheaper
- Priority: `P1`
- Stable hooks already available:
  - `#miniTimer`
  - `#miniTimerMode`
  - `#miniTimerTime`
  - `#miniTimerStatus`
  - `#profileEntry`
- First automation slices to implement:
  - active nav state on key pages
  - anonymous vs authenticated header mode
  - mini-timer slot presence on non-home pages

## Plans

- [01-branding-and-home-link.md](01-branding-and-home-link.md) — `Playwright smoke`
- [02-primary-navigation.md](02-primary-navigation.md) — `Playwright` + targeted `WebMvc`
- [03-anonymous-auth-controls.md](03-anonymous-auth-controls.md) — `Playwright`
- [04-authenticated-account-menu.md](04-authenticated-account-menu.md) — `Playwright` + `integration`
- [05-mini-timer-slot-rules.md](05-mini-timer-slot-rules.md) — `Playwright`
