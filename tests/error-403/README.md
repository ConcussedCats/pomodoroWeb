# 403 Error Page Test Plans

## Source Surface

- Template: [403.html](../../src/main/resources/templates/error/403.html)
- Shared fragments:
  - [header.html](../../src/main/resources/templates/fragments/header.html)
  - [footer.html](../../src/main/resources/templates/fragments/footer.html)

## Linked JS / API Dependencies

- No page-specific JavaScript
- No mini-timer-scripts fragment included
- Recovery navigation points to `/`

## Covered Blocks

- access denied content
- recovery navigation
- shared header/footer behavior on a custom error page

## Plans

- [01-access-denied-content.md](01-access-denied-content.md)
- [02-recovery-navigation.md](02-recovery-navigation.md)
- [03-shared-header-footer-behavior.md](03-shared-header-footer-behavior.md)
