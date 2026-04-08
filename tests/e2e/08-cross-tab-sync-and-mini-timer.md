# E2E Cross Tab Sync And Mini Timer

## Purpose

Define browser journeys that require two tabs or windows and shared timer/productivity state propagation.

## Source Surface

- Pages:
  - `/`
  - `/productivity`
  - `/user`
  - `/about`
- Shared scripts:
  - `timer-state.js`
  - `mini-timer.js`
  - `mini-timer-sync.js`

## User Story / Functional Slice

As a user with multiple tabs open, I can see timer and productivity changes propagate across those tabs.

## Dependencies

- multi-page browser context
- stable hooks:
  - `#miniTimer`
  - `#miniTimerTime`
  - `#miniTimerStatus`
  - `#timeDisplay`

## Happy Path Scenarios

- timer started on home page updates mini-timer on a non-home page
- settings saved on home page update mini-timer-dependent state on a non-home page
- productivity changes in one tab appear in another productivity tab via storage event

## Negative / Edge Scenarios

- cross-tab updates should not duplicate list entries
- static pages without full timer UI should still show coherent mini-timer state if scripts support it
- pages with partial script inclusion, such as 404, should be tested as explicit exceptions if included in browser coverage

## Accessibility / UI States

- updated mini-timer text remains readable after sync
- cross-tab changes should not leave controls visually inconsistent

## Data / Auth / Storage Notes

- this suite is inherently more fragile; schedule it after P0 single-tab flows
- isolate storage state carefully before launching second tab
