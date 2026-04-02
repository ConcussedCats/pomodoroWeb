# Session API Feedback And CSRF

## Purpose

Validate the transport-level contract used by the user page’s browser script.

## Source Surface

- Script: [user-settings.js](../../src/main/resources/static/js/user-settings.js)
- Session APIs:
  - `PATCH /api/user/username`
  - `PATCH /api/user/password`

## User Story / Functional Slice

As an authenticated browser user, I can send profile changes through session-protected APIs and get understandable responses.

## Dependencies

- meta tags `_csrf` and `_csrf_header`
- JSON request bodies
- JSON error/success responses

## Happy Path Scenarios

- script reads CSRF token/header from meta tags
- session PATCH requests send JSON bodies with the expected field names
- successful responses are parsed and rendered into the correct message area

## Negative / Edge Scenarios

- missing CSRF metadata causes session PATCH failures
- malformed JSON response should not crash the whole page silently
- non-OK response should show `data.message` when available
- generic network failure should fall back to hardcoded server-error copy

## Accessibility / UI States

- feedback remains local to the relevant form instead of appearing globally
- messages stay readable after repeated submissions

## Data / Auth / Storage Notes

- transport is session-authenticated and CSRF-protected
- current page does not use local storage for profile forms
