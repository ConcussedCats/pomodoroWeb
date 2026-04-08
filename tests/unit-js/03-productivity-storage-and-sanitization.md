# Productivity Storage And Sanitization Scenarios

## Purpose

Define JS unit-like scenarios for the pure logic portions inside `productivity.js`, especially storage normalization and escaping.

## Source Surface

- [productivity.js](../../src/main/resources/static/js/productivity.js)

## User Story / Functional Slice

As the client-side productivity state logic, the code must persist safe records, reject malformed stored data, and avoid unsafe HTML rendering.

## Dependencies

- `localStorage`
- helper logic around:
  - storage normalization
  - ID generation
  - HTML escaping
  - timestamp formatting

## Happy Path Scenarios

- empty state returns `{ todo: [], notes: [] }`
- valid stored todo items survive normalization
- valid stored note items survive normalization
- `create` prepends new items with timestamps
- `update` mutates target item and refreshes `updatedAt`
- `delete` removes target item only
- `escapeHtml` neutralizes HTML-sensitive characters
- `formatTimestamp` returns formatted text for valid dates

## Negative / Edge Scenarios

- corrupted storage JSON falls back to empty state
- todo items missing string `id` or string `text` are filtered out
- note items missing string `id` or string `content` are filtered out
- invalid timestamps degrade to empty string instead of throwing
- HTML/script payloads are escaped before rendering

## Accessibility / UI States

- Not applicable at the pure helper/state layer

## Data / Auth / Storage Notes

- Key under test: `telos.productivity.v1`
- If helper extraction happens later, these scenarios should migrate into real narrow unit specs first
