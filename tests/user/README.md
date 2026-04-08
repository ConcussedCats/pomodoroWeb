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
- frontend validation execution results

## Related Shared Docs

- [Header](../header/README.md)
- [Footer](../footer/README.md)
- [Mini timer scripts](../mini-timer-scripts/README.md)

## Automation Notes

- Primary automation layers:
  - `WebMvc` / integration for auth guards and API contracts
  - `Playwright` for browser form behavior
- Priority: `P0`
- Stable hooks already available:
  - `#username-form`
  - `#password-form`
  - `#username`
  - `#oldPassword`
  - `#newPassword`
  - `#confirmNewPassword`
  - `#username-message`
  - `#password-message`
- First automation slices to implement:
  - auth guard on `/user`
  - username happy path and conflict path
  - password happy path and invalid current password path
  - CSRF/session contract checks

## Executable Suites

- [user-profile-validation.test.mjs](../unit-js/user-profile-validation.test.mjs): section presence, username validation, password confirm logic, minimum length, valid submit path with mocked fetch
- [06-validation-execution-results.md](06-validation-execution-results.md): executed frontend validation result

## Plans

- [01-page-shell-and-auth-guard.md](01-page-shell-and-auth-guard.md) — `WebMvc P0`
- [02-username-form.md](02-username-form.md) — `Playwright` + `WebMvc API`
- [03-password-form.md](03-password-form.md) — `Playwright` + `WebMvc API`
- [04-session-api-feedback-and-csrf.md](04-session-api-feedback-and-csrf.md) — `WebMvc / integration P0`
- [05-jwt-api-parity-notes.md](05-jwt-api-parity-notes.md) — `WebMvc JWT API P1`
- [06-validation-execution-results.md](06-validation-execution-results.md) — executed JS frontend suite
