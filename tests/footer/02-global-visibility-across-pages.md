# Footer Global Visibility Across Pages

## Purpose

Validate where the footer is intentionally present or absent across templates.

## Source Surface

- Fragment: [footer.html](../../src/main/resources/templates/fragments/footer.html)
- Host templates in `src/main/resources/templates`

## User Story / Functional Slice

As a user, I experience a consistent footer across standard pages and understand exceptions for ultra-minimal error rendering.

## Dependencies

- host template inclusion decisions

## Happy Path Scenarios

- footer is present on standard pages:
  - index
  - login
  - about
  - helpus
  - productivity
  - user
  - 403
  - 404
- generic error template intentionally omits the footer

## Negative / Edge Scenarios

- standard page missing footer is a regression
- generic error page unexpectedly inheriting full footer may indicate unintended template drift

## Accessibility / UI States

- footer remains the last major content block on pages where it is included

## Data / Auth / Storage Notes

- visibility is a template composition rule, not a runtime state rule
