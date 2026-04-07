# Login Page Test Plans

## Source Surface

- Template: [login.html](../../src/main/resources/templates/login.html)
- Shared fragments:
  - [header.html](../../src/main/resources/templates/fragments/header.html)
  - [footer.html](../../src/main/resources/templates/fragments/footer.html)
  - [mini-timer-scripts.html](../../src/main/resources/templates/fragments/mini-timer-scripts.html)

## Linked JS / API Dependencies

- Session auth entrypoint: `POST /login`
- Security redirect target: `/user`
- CSRF hidden form field
- No page-owned JavaScript file

## Covered Blocks

- page shell and layout
- login form fields and CSRF
- successful login and redirect
- error states for invalid credentials

## Automation Notes

- Primary automation layers:
  - `WebMvc` / Spring Security integration
  - `Playwright` for end-to-end browser login flow
- Priority: `P0`
- Stable hooks already available:
  - `#loginForm`
  - `#loginIdentifier`
  - `#loginPassword`
- First automation slices to implement:
  - GET `/login` smoke
  - valid login redirect to `/user`
  - invalid credentials stay in login flow with error message

## Plans

- [01-page-shell-and-layout.md](01-page-shell-and-layout.md) — `WebMvc smoke`
- [02-login-form-fields-and-csrf.md](02-login-form-fields-and-csrf.md) — `WebMvc`
- [03-login-success-and-redirect.md](03-login-success-and-redirect.md) — `integration` + `Playwright P0`
- [04-login-error-and-invalid-credentials.md](04-login-error-and-invalid-credentials.md) — `integration` + `Playwright P0`
