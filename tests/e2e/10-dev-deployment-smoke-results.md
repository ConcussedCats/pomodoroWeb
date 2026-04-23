# Dev Deployment Smoke Results

## Purpose

Record remote smoke runs for the deployed dev environment.

## Executed Suite

- [dev-deployment-smoke.spec.js](dev-deployment-smoke.spec.js)

## Target Pages

- `/`
- `/productivity`
- `/login`

## Coverage

- deployment is reachable by URL
- key UI elements render on the target pages
- no obvious horizontal layout break is detected
- no critical `console.error` or uncaught `pageerror` is emitted during base navigation

## Result

- Execution date: `2026-04-08`
- Result status: passed
- Target URL:
  - `E2E_DEV_BASE_URL` or `E2E_BASE_URL`
  - default fallback: `https://teclos.space`
- Command:
  - `npx playwright test tests/e2e/dev-deployment-smoke.spec.js --reporter=line`
- Outcome:
  - `3 passed`
- Passed pages:
  - `/`
  - `/productivity`
  - `/login`
- Notes:
  - smoke checks use `domcontentloaded` plus visible UI hooks, which is a better fit for deployed pages with ongoing browser activity than `networkidle`
  - anonymous `401` noise from timer-settings sync on public pages is treated as expected non-critical behavior and is filtered from the console-error assertion
  - the deployed `/productivity` page currently renders an anonymous `Login required` guest-card variant rather than the tabbed workspace; the smoke suite accepts either variant as valid primary UI for that route
