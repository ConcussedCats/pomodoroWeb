# Authenticated Settings Sync

## Purpose

Validate the difference between anonymous local-only settings behavior and authenticated server-synced settings behavior.

## Source Surface

- Script: [settings.js](../../src/main/resources/static/js/settings.js)
- Session API:
  - `GET /api/user/time-settings`
  - `PATCH /api/user/time-settings`

## User Story / Functional Slice

As an authenticated user, I can load and save timer settings against the server, while anonymous users continue to use local-only settings.

## Dependencies

- `is-authenticated` meta tag
- CSRF meta tags
- request headers built from `_csrf` and `_csrf_header`
- storage listener for settings key

## Happy Path Scenarios

- anonymous page load reads settings from `pomodoroSettings`
- authenticated page load fetches server settings and normalizes them locally
- authenticated save sends `PATCH /api/user/time-settings` with mapped DTO fields
- successful authenticated sync updates storage and dispatches `settings:loaded` plus `settings:updated`
- second tab reacts to settings storage changes

## Negative / Edge Scenarios

- failed authenticated fetch shows fallback sync error and retains local settings
- failed authenticated save surfaces server message or fallback failure message
- missing CSRF headers cause session PATCH failures
- malformed server response should not corrupt local state silently

## Accessibility / UI States

- sync failures surface in the shared settings error area
- values should remain visible even when server sync fails

## Data / Auth / Storage Notes

- local storage key: `pomodoroSettings`
- authenticated sync maps between local field names and DTO names:
  - `pomodoro` <-> `pomodoroMinutes`
  - `shortBreak` <-> `shortBreakMinutes`
  - `longBreak` <-> `longBreakMinutes`
  - `focusCycles` <-> `pomoCycles`
  - `soundEnabled` <-> `soundsEnabled`
