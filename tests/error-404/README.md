# 404 Error Page Test Plans

## Source Surface

- Template: [404.html](../../src/main/resources/templates/error/404.html)
- Shared fragments:
  - [header.html](../../src/main/resources/templates/fragments/header.html)
  - [footer.html](../../src/main/resources/templates/fragments/footer.html)

## Linked JS / API Dependencies

- Manual script inclusion:
  - `timer-state.js`
  - `mini-timer.js`
- No `mini-timer-sync.js`
- Recovery navigation points to `/`

## Covered Blocks

- not-found content
- recovery navigation
- partial mini-timer script inclusion

## Plans

- [01-not-found-content.md](01-not-found-content.md)
- [02-recovery-navigation.md](02-recovery-navigation.md)
- [03-mini-timer-script-inclusion.md](03-mini-timer-script-inclusion.md)
