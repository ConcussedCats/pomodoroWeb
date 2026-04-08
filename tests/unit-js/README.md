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
