# E2E Static And Error Pages Smoke

## Purpose

Define lightweight browser smoke checks for static public pages and custom error pages.

## Source Surface

- Pages:
  - `/about`
  - `/helpus`
  - 403 rendering path
  - 404 rendering path

## User Story / Functional Slice

As a user, I can reach static content pages and get navigable custom error pages when something goes wrong.

## Dependencies

- browser navigation
- recovery links on error pages

## Happy Path Scenarios

- about page loads and shows expected heading/copy
- helpus page loads and shows support links and donation image
- custom 404 page renders and recovers to home page
- custom 403 page renders and recovers to home page

## Negative / Edge Scenarios

- broken external links on helpus page are regressions
- error pages must not show blank screens or raw exceptions

## Accessibility / UI States

- headings and recovery links remain keyboard reachable
- static content remains visible without user interaction

## Data / Auth / Storage Notes

- keep this suite smoke-only; do not spend deep browser-runtime coverage budget here first
