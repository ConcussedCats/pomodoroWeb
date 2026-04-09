# JavaScript Unit Test Plans

## Purpose

This folder captures JS unit-level scenarios that should later be automated outside full browser journeys whenever narrower, faster coverage is useful.

## Source Surface

- [timer-state.js](../../src/main/resources/static/js/timer-state.js)
- [productivity.js](../../src/main/resources/static/js/productivity.js)

## Automation Notes

- Primary automation layer: JS unit runner if introduced later
- Priority: `P0` for `timer-state.js`
- Priority: `P1` for isolated productivity storage/helper coverage
- Do not block browser E2E on having this layer first; add it to stabilize pure state logic

## Plans

- [01-timer-state-normalization-and-storage.md](01-timer-state-normalization-and-storage.md)
- [02-timer-state-transitions-and-projections.md](02-timer-state-transitions-and-projections.md)
- [03-productivity-storage-and-sanitization.md](03-productivity-storage-and-sanitization.md)

## Executable Suites

- [timer-state.test.mjs](timer-state.test.mjs): pure timer state-machine logic, mode switching, transitions, counters, projections
- [timer-persistence.test.mjs](timer-persistence.test.mjs): settings storage, timer serialization, reload recovery, timestamp-based hydration
- [mini-timer.test.mjs](mini-timer.test.mjs): mini timer hydration, state mirroring, storage-driven sync, cross-page recovery
- [login-validation.test.mjs](login-validation.test.mjs): login form required-field validation, disabled submit state, client-side error feedback
- [user-profile-validation.test.mjs](user-profile-validation.test.mjs): profile page section presence, username/password frontend validation, confirm-password logic
- [settings-validation.test.mjs](settings-validation.test.mjs): timer settings numeric/type/range validation, error messages, correction flow, invalid-save blocking
- [productivity-tabs.test.mjs](productivity-tabs.test.mjs): productivity tab presence, active-state switching, panel visibility, no-route-change behavior
- [productivity-interactions.test.mjs](productivity-interactions.test.mjs): todo/note create-edit-delete flows, deadline validation, invalid states, keyboard save behavior, anti-67 guardrails
- [productivity-api.test.mjs](productivity-api.test.mjs): API hydration, load-failure fallback, and user-visible error handling for the productivity page
- [dom-test-utils.mjs](dom-test-utils.mjs): shared fake DOM/runtime harness for frontend validation scripts
- [productivity.test-utils.mjs](productivity.test-utils.mjs): shared fake DOM/runtime harness for API-backed `productivity.js`
- [timer-state.test-utils.mjs](timer-state.test-utils.mjs): shared isolated runtime helpers for loading `timer-state.js` without UI dependencies

## Negative-Test Notes

- JS negative tests use inline labels like `[ui-negative]`.
- See [NegativeTestLanes.md](../NegativeTestLanes.md) for the current lane split and run commands.
