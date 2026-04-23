# 403 Shared Header Footer Behavior

## Purpose

Validate which shared fragments are present on the 403 page and how they behave.

## Source Surface

- Template: [403.html](../../src/main/resources/templates/error/403.html)
- Shared fragments:
  - [header.html](../../src/main/resources/templates/fragments/header.html)
  - [footer.html](../../src/main/resources/templates/fragments/footer.html)

## User Story / Functional Slice

As a user on the 403 page, I still see familiar site chrome and can recover using standard navigation.

## Dependencies

- header fragment with blank `activePage`
- footer fragment
- no `mini-timer-scripts` fragment

## Happy Path Scenarios

- header renders with no active primary nav item
- footer renders below error content
- header fragment still includes mini-timer slot markup because blank active page is not `home`

## Negative / Edge Scenarios

- 403 page should not silently include the full mini-timer scripts fragment
- mini-timer slot, if visually present, may remain static because scripts are absent
- missing footer or header is a composition regression

## Accessibility / UI States

- navigation and footer remain keyboard reachable
- static mini-timer slot must not obscure the main recovery action

## Data / Auth / Storage Notes

- this page is an important exception: header markup may contain mini-timer DOM ids without corresponding runtime scripts
