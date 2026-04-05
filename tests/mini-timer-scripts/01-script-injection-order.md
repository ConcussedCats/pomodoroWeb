# Mini Timer Script Injection Order

## Purpose

Validate the fragment contract that injects the shared mini-timer runtime scripts.

## Source Surface

- Fragment: [mini-timer-scripts.html](../../src/main/resources/templates/fragments/mini-timer-scripts.html)

## User Story / Functional Slice

As a user on pages that include the mini-timer scripts fragment, I get a predictable runtime boot order for timer state and mini-timer hydration.

## Dependencies

- `timer-state.js`
- `mini-timer.js`
- `mini-timer-sync.js`

## Happy Path Scenarios

- `timer-state.js` loads before `mini-timer.js`
- `mini-timer.js` loads before `mini-timer-sync.js`
- pages using the fragment inherit the same script order

## Negative / Edge Scenarios

- loading `mini-timer.js` before `timer-state.js` is a runtime contract break
- pages that skip the fragment must be documented as intentional exceptions
- partial inclusion should be tested separately because behavior may degrade gracefully or remain static

## Accessibility / UI States

- script order itself has no direct accessibility surface, but broken order can leave stale visible state

## Data / Auth / Storage Notes

- order matters because later scripts depend on globals established by `timer-state.js`
