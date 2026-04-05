# User Page Test Plans

## Source Surface

- Template: [user.html](../../src/main/resources/templates/user.html)
- Script: [user-settings.js](../../src/main/resources/static/js/user-settings.js)
- Shared fragments:
  - [header.html](../../src/main/resources/templates/fragments/header.html)
  - [footer.html](../../src/main/resources/templates/fragments/footer.html)
  - [mini-timer-scripts.html](../../src/main/resources/templates/fragments/mini-timer-scripts.html)

## Linked JS / API Dependencies

- Session APIs:
  - `PATCH /api/user/username`
  - `PATCH /api/user/password`
- JWT parity APIs:
  - `PATCH /api/jwt/user/username`
  - `PATCH /api/jwt/user/password`
- Meta tags:
  - `_csrf`
  - `_csrf_header`

## Covered Blocks

- page shell and auth guard
- username form
- password form
- session API feedback and CSRF
- JWT API parity notes

## Related Shared Docs

- [Header](../header/README.md)
- [Footer](../footer/README.md)
- [Mini timer scripts](../mini-timer-scripts/README.md)

## Plans

- [01-page-shell-and-auth-guard.md](01-page-shell-and-auth-guard.md)
- [02-username-form.md](02-username-form.md)
- [03-password-form.md](03-password-form.md)
- [04-session-api-feedback-and-csrf.md](04-session-api-feedback-and-csrf.md)
- [05-jwt-api-parity-notes.md](05-jwt-api-parity-notes.md)
