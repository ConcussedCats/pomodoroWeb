# Productivity API And Sanitization Scenarios

## Purpose

Define JS unit-like scenarios for the API-backed helper portions inside `productivity.js`, especially payload mapping, error fallback, and escaping.

## Source Surface

- [productivity.js](../../src/main/resources/static/js/productivity.js)

## User Story / Functional Slice

As the client-side productivity state logic, the code must map safe records from API payloads, reject invalid user input before submit, and avoid unsafe HTML rendering.

## Dependencies

- `/api/productivity/todos`
- `/api/productivity/notes`
- helper logic around:
  - API payload mapping
  - deadline formatting
  - HTML escaping
  - timestamp formatting

## Happy Path Scenarios

- valid todo API payloads are mapped into rendered todo items
- valid note API payloads are mapped into rendered note items
- valid deadlines are formatted into the edit form correctly
- `create`, `update`, and `delete` requests update the rendered lists
- `escapeHtml` neutralizes HTML-sensitive characters
- `formatTimestamp` returns formatted text for valid dates

## Negative / Edge Scenarios

- failed todo or note loads fall back to a safe empty state
- forbidden `67` / `six seven` values are rejected before submit
- past deadlines are rejected before submit
- invalid timestamps degrade to empty string instead of throwing
- HTML/script payloads are escaped before rendering

## Accessibility / UI States

- Not applicable at the pure helper/state layer

## Data / Auth / Storage Notes

- API-backed runtime assumes authenticated session plus CSRF meta tags for mutate flows
- If helper extraction happens later, these scenarios should migrate into real narrow unit specs first
