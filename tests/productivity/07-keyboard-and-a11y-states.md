# Keyboard And Accessibility States

## Purpose

Validate keyboard behavior and accessibility states across the productivity page.

## Source Surface

- Template: [productivity.html](../../src/main/resources/templates/productivity.html)
- Script: [productivity.js](../../src/main/resources/static/js/productivity.js)

## User Story / Functional Slice

As a keyboard or assistive-technology user, I can switch tabs, enter content, edit items, and understand form/list feedback.

## Dependencies

- tab semantics
- `aria-live` message regions
- invalid-state toggling
- keyboard save shortcuts

## Happy Path Scenarios

- tab buttons are keyboard reachable
- todo edit saves on `Enter`
- note edit saves on `Ctrl+Enter` or `Cmd+Enter`
- form messages appear in the correct live region
- invalid inputs receive invalid styling and state

## Negative / Edge Scenarios

- `Enter` should not trigger save when not editing the current todo item
- note textarea should not lose ordinary multi-line editing behavior unless modifier key is used
- focus should not disappear after rerenders

## Accessibility / UI States

- tab/panel ARIA attributes remain synchronized
- empty-state text is readable and not purely decorative
- action buttons have clear visible labels

## Data / Auth / Storage Notes

- keyboard flows still mutate local storage through the same save/update paths
