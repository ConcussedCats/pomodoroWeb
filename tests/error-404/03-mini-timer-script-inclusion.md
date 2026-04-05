# 404 Mini Timer Script Inclusion

## Purpose

Validate the unusual mini-timer setup on the 404 page.

## Source Surface

- Template: [404.html](../../src/main/resources/templates/error/404.html)
- Manual script tags:
  - `timer-state.js`
  - `mini-timer.js`

## User Story / Functional Slice

As a user on the 404 page, I can still see a more functional mini-timer slot than on the 403 page, while accepting that full settings sync is not wired in.

## Dependencies

- header mini-timer markup
- `timer-state.js`
- `mini-timer.js`
- absence of `mini-timer-sync.js`

## Happy Path Scenarios

- header renders the mini-timer slot
- timer-state and mini-timer scripts load successfully
- mini-timer can hydrate from local storage on the 404 page

## Negative / Edge Scenarios

- no server-side settings sync should be assumed because `mini-timer-sync.js` is absent
- 404 page must not silently drift to the full fragment contract without explicit template change
- broken partial script setup should be treated as a dedicated 404-page regression

## Accessibility / UI States

- mini-timer text remains readable before and after hydration
- error recovery controls must remain discoverable even if mini-timer is active

## Data / Auth / Storage Notes

- local storage may be read by the mini-timer
- no automatic authenticated settings fetch occurs on this page with the current template
