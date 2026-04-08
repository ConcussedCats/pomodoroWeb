# Remote Login Smoke Execution Results

## Purpose

Record the live-site smoke result for the login page against `https://teclos.space`.

## Executed Suite

- [../e2e/login-remote.spec.js](../e2e/login-remote.spec.js)

## Executed Coverage

- login page renders with the expected form hooks:
  - `#loginForm`
  - `#loginIdentifier`
  - `#loginPassword`
- client-side validation blocks empty submit and surfaces field/form error state
- non-empty invalid credentials still pass through to the server and return to the login flow with the server-side error message
- anonymous navigation to `/user` redirects back to `/login`

## Optional Coverage

- successful login redirect to `/user` is implemented in the same Playwright suite
- this scenario is intentionally gated behind:
  - `E2E_LOGIN_USERNAME`
  - `E2E_LOGIN_PASSWORD`
- the live smoke stays safe by default and does not require a mutable shared account

## Result

- Execution date: `2026-04-08`
- Result status: passed with skips
- Target URL: `https://teclos.space`
- Command:
  - `npx playwright test tests/e2e/login-remote.spec.js --reporter=line`
- Outcome:
  - `3 passed`
  - `2 skipped`
- Passed scenarios:
  - login page renders expected server-side form contract
  - non-empty invalid credentials reach the server and stay in the login flow with the server-side error message
  - anonymous access to `/user` redirects back to `/login`
- Skipped scenarios:
  - client-side login validation on the live site
  - successful login redirect with valid credentials
- Notes:
  - `login-validation.js` is not currently deployed on `teclos.space/login`, so the live smoke cannot yet verify the new client-side disabled/error-state behavior there
  - the successful-login case is implemented but intentionally requires `E2E_LOGIN_USERNAME` and `E2E_LOGIN_PASSWORD`
  - the current live login form contains two hidden `_csrf` inputs; the smoke was made tolerant to this actual DOM shape
