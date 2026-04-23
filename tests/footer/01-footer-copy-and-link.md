# Footer Copy And Link

## Purpose

Validate the content contract of the shared footer fragment.

## Source Surface

- Fragment: [footer.html](../../src/main/resources/templates/fragments/footer.html)

## User Story / Functional Slice

As a user, I can see a consistent footer with product attribution and a bug-report link.

## Dependencies

- GitHub issues external link

## Happy Path Scenarios

- copyright line renders
- year `2026` and product name `Telos` are visible
- GitHub issues link is present in the copy
- footer note `Stay focused, stay productive` is visible

## Negative / Edge Scenarios

- missing external link is a shared-footer regression
- broken footer copy is a regression because it appears globally
- footer should not depend on page-specific model state

## Accessibility / UI States

- external link is keyboard reachable
- footer remains readable without CSS
- footer content remains understandable in screen-reader reading order

## Data / Auth / Storage Notes

- no auth dependency
- no storage dependency
