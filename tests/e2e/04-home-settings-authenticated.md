# E2E Home Settings Authenticated Flow

## Purpose

Define the browser journey for authenticated timer settings sync.

## Source Surface

- Pages: `/login`, `/`
- Session API: `/api/user/time-settings`

## User Story / Functional Slice

As an authenticated user, I can load server-backed timer settings and update them through the UI.

## Dependencies

- authenticated browser session
- same stable hooks as anonymous settings flow

## Happy Path Scenarios

- authenticated user lands on home page with server-backed settings applied
- changing and saving settings persists through page reload
- settings update affects visible timer-related text and counts

## Negative / Edge Scenarios

- running timer keeps settings toggle disabled
- failed save should show visible error and preserve previous good values

## Accessibility / UI States

- sync-related messages remain visible in the shared settings message area

## Data / Auth / Storage Notes

- assertions should include visible UI change, not just network success
- use dedicated mutable account or reset strategy after run
