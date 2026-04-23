# E2E Dev Deployment Smoke

## Purpose

Define a lightweight post-deploy smoke suite for the remote dev environment.

## Source Surface

- Pages:
  - `/`
  - `/productivity`
  - `/login`

## User Story / Functional Slice

As a team, we can verify that the deployed dev environment is reachable and that the core public pages render without critical browser/runtime failures.

## Dependencies

- remote base URL:
  - `E2E_DEV_BASE_URL`
  - fallback: `E2E_BASE_URL`
  - default: `https://teclos.space`
- browser automation:
  - Playwright

## Happy Path Scenarios

- dev deployment opens by URL
- home page renders timer controls and main timer UI
- productivity page renders tab shell and default todo panel
- login page renders form fields and submit action
- each page completes basic navigation without critical browser console errors

## Negative / Edge Scenarios

- blank page, broken route, or failed deploy is a smoke regression
- missing key UI hooks on any target page is a smoke regression
- `console.error` or uncaught `pageerror` during base navigation is treated as critical
- obvious horizontal overflow is treated as a layout-break signal

## Accessibility / UI States

- target UI elements remain visible without interaction
- productivity default tab state is preserved on first load

## Data / Auth / Storage Notes

- suite is anonymous-only and safe for shared remote environments
- do not mutate user data in this smoke layer
