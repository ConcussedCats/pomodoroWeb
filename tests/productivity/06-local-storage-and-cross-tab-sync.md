# API Hydration And Load Failure Handling

## Purpose

Validate initial API hydration and safe fallback behavior when productivity data cannot be loaded.

## Source Surface

- Script: [productivity.js](../../src/main/resources/static/js/productivity.js)

## User Story / Functional Slice

As a user, I can open the productivity page and either see current todos/notes from the backend or a safe empty state with readable feedback if the API fails.

## Dependencies

- `GET /api/productivity/todos`
- `GET /api/productivity/notes`
- list renderers and empty-state handling in `productivity.js`

## Happy Path Scenarios

- tasks and notes are loaded from the backend on page init
- valid API payloads are mapped into rendered todo and note items
- empty states hide when API returns existing items
- guest/authenticated split keeps the tabbed workspace hidden from anonymous users

## Negative / Edge Scenarios

- todo load failure falls back to an empty safe state
- note load failure falls back to an empty safe state
- backend error message is surfaced in the correct form message container
- partial API data must not crash the page shell

## Accessibility / UI States

- API-driven rerender preserves understandable empty/non-empty states
- content remains readable after initial hydration or error fallback

## Data / Auth / Storage Notes

- page is API-backed in the current implementation
- authenticated session and CSRF meta tags are required for mutate flows
