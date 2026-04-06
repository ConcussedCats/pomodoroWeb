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

## Plans

- [01-branding-and-home-link.md](01-branding-and-home-link.md)
- [02-primary-navigation.md](02-primary-navigation.md)
- [03-anonymous-auth-controls.md](03-anonymous-auth-controls.md)
- [04-authenticated-account-menu.md](04-authenticated-account-menu.md)
- [05-mini-timer-slot-rules.md](05-mini-timer-slot-rules.md)
