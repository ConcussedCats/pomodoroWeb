# Negative Test Lanes

## Purpose

This document explains how to run the negative-test automation without mixing gap-finding checks into the normal green path.

## Lanes

- `blocking`: negative and contract checks for behavior that already exists and should stay stable
- `known-gap`: desired behavior that may still fail until implementation catches up
- `ui-negative`: browser-visible validation and error-state checks

## Java Tags

- `negative`
- `contract`
- `known-gap`

## JS Naming

Node test titles use inline labels like:

- `[ui-negative]`
- `[known-gap]`

This keeps the files runnable with plain `node --test`, while still making their intent visible in output and CI logs.

## Playwright Naming

Playwright test titles use inline tags:

- `@ui-negative`
- `@known-gap`

The current negative browser specs live in [negative-browser-flows.spec.js](e2e/negative-browser-flows.spec.js).

## Recommended Commands

Blocking Java negative layer:

```bash
./mvnw -q -Dtest='Forbidden67PolicyTest,UserServiceImplTest,UserTimeSettingsRestControllerTest,UserRestControllerTest,AuthJwtControllerTest,UserJwtControllerTest' test
```

Known-gap Java lane:

```bash
./mvnw -q -DrunKnownGaps=true -Dtest='UserTimeSettingsRestControllerTest' test
```

Blocking JS negative layer:

```bash
node --test tests/unit-js/settings-validation.test.mjs tests/unit-js/login-validation.test.mjs tests/unit-js/user-profile-validation.test.mjs tests/unit-js/productivity-interactions.test.mjs
```

Browser negative layer:

```bash
npx playwright test tests/e2e/negative-browser-flows.spec.js --reporter=line
```

## Current Known Gaps

- form-login redirect-back behavior is still documented as a desired gap, but not kept as a runnable Java suite because the dedicated MockMvc form-login slice currently fails during security filter initialization on the current stack
- session timer settings still accept decimal JSON values through coercion; a strict-integer known-gap test exists behind `runKnownGaps=true`
- remote [teclos.space](https://teclos.space) now runs most browser-negative specs directly; the remaining skips are limited to:
  - login-success and authenticated productivity checks only when `E2E_LOGIN_USERNAME` / `E2E_LOGIN_PASSWORD` are not provided
  - home timer reload-recovery while the live countdown-reload behavior remains unstable
