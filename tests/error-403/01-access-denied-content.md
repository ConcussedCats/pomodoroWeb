# 403 Access Denied Content

## Purpose

Validate the content contract of the custom 403 error page.

## Source Surface

- Template: [403.html](../../src/main/resources/templates/error/403.html)

## User Story / Functional Slice

As a user who reached a forbidden page, I see a clear access-denied explanation and a recognizably custom error screen.

## Dependencies

- error template rendering path for forbidden access

## Happy Path Scenarios

- page title is `403 • Access denied`
- visual `403` code is rendered
- heading `Access denied` is visible
- description explains the page requires additional permissions

## Negative / Edge Scenarios

- page must not render generic stack trace content
- forbidden page must not look identical to not-found page
- content should remain readable even if the SVG illustration fails

## Accessibility / UI States

- heading and description are present as text outside the illustration
- recovery action is available after the description

## Data / Auth / Storage Notes

- page explains a permission failure but does not itself mutate auth or storage state
