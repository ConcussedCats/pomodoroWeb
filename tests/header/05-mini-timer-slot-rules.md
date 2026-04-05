# Header Mini Timer Slot Rules

## Purpose

Validate where the mini-timer slot appears and how that fragment-level rule interacts with host pages.

## Source Surface

- Fragment: [header.html](../../src/main/resources/templates/fragments/header.html)

## User Story / Functional Slice

As a user on non-home pages, I can see a compact timer entry point in the header.

## Dependencies

- fragment parameter `activePage`
- DOM ids:
  - `miniTimer`
  - `miniTimerMode`
  - `miniTimerTime`
  - `miniTimerStatus`
- host-page script inclusion rules

## Happy Path Scenarios

- mini-timer slot is omitted when `activePage == 'home'`
- mini-timer slot is rendered for non-home pages
- mini-timer link targets `/`
- default static values are present before scripts hydrate state

## Negative / Edge Scenarios

- home page must not render the mini-timer slot
- non-home pages must not omit the slot unless intentionally minimal
- fragment alone does not guarantee runtime behavior if host page omits supporting scripts

## Accessibility / UI States

- slot has `aria-label="Open timer page"`
- mode, time, and status remain readable as text
- slot remains keyboard reachable as a single anchor

## Data / Auth / Storage Notes

- functional behavior depends on shared script docs in `mini-timer-scripts`
- some host pages intentionally include partial or no script support, so slot presence and slot runtime behavior must be tested separately
