# About Shared UI Presence

## Purpose

Validate how shared fragments behave when rendered on the About page.

## Source Surface

- Template: [about.html](../../src/main/resources/templates/about.html)
- Shared fragments:
  - [header.html](../../src/main/resources/templates/fragments/header.html)
  - [footer.html](../../src/main/resources/templates/fragments/footer.html)
  - [mini-timer-scripts.html](../../src/main/resources/templates/fragments/mini-timer-scripts.html)

## User Story / Functional Slice

As a visitor, I get the standard Telos navigation, footer, and mini-timer shell while browsing a non-home public page.

## Dependencies

- active page key `about`
- shared header/footer docs
- shared mini-timer scripts on non-home page

## Happy Path Scenarios

- header renders with `About` navigation item highlighted
- footer renders below main content
- mini-timer anchor exists because this is not the home page
- shared scripts are injected after footer

## Negative / Edge Scenarios

- About page must not accidentally render as home state in the header
- mini-timer markup must not be missing on this non-home page
- footer must not disappear due to fragment resolution issues

## Accessibility / UI States

- shared navigation is reachable before main content
- footer link remains keyboard reachable
- mini-timer link has an accessible label through shared fragment behavior

## Data / Auth / Storage Notes

- mini-timer state, if shown, depends on shared storage and shared runtime docs
- the page itself introduces no additional auth or storage rules
