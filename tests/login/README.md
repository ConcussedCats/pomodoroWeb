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
- Page script:
  - [login-validation.js](../../src/main/resources/static/js/login-validation.js)

## Covered Blocks

- page shell and layout
- login form fields and CSRF
- successful login and redirect
- error states for invalid credentials
- frontend validation execution results

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
  - frontend required-field validation without auth integration

## Executable Suites

- [AuthJwtControllerTest.java](../../src/test/java/com/example/telos/api/AuthJwtControllerTest.java): JWT login contract coverage for valid and invalid credential paths
- [login-validation.test.mjs](../unit-js/login-validation.test.mjs): required fields, disabled submit state, client-side error state
- [05-validation-execution-results.md](05-validation-execution-results.md): executed frontend validation result
- [../e2e/login-remote.spec.js](../e2e/login-remote.spec.js): live `teclos.space` smoke for login form rendering, invalid submit, protected-route redirect, optional successful login
- [06-remote-smoke-execution-results.md](06-remote-smoke-execution-results.md): executed remote login smoke result

## Plans

- [01-page-shell-and-layout.md](01-page-shell-and-layout.md) — `WebMvc smoke`
- [02-login-form-fields-and-csrf.md](02-login-form-fields-and-csrf.md) — `WebMvc`
- [03-login-success-and-redirect.md](03-login-success-and-redirect.md) — `integration` + `Playwright P0`
- [04-login-error-and-invalid-credentials.md](04-login-error-and-invalid-credentials.md) — `integration` + `Playwright P0`
- [05-validation-execution-results.md](05-validation-execution-results.md) — executed JS frontend suite
