# 404 Not Found Content

## Purpose

Validate the content contract of the custom 404 page.

## Source Surface

- Template: [404.html](../../src/main/resources/templates/error/404.html)

## User Story / Functional Slice

As a user who hits a missing route, I see a clear not-found explanation instead of a blank or generic failure.

## Dependencies

- error template rendering path for missing resources

## Happy Path Scenarios

- page title is `404 • Page Not Found`
- visual `404` code is rendered
- heading `Page Not Found` is visible
- description explains the page was missing or moved

## Negative / Edge Scenarios

- not-found page must remain distinct from forbidden page
- content must not leak server exception details
- illustration failure must not remove core explanatory text

## Accessibility / UI States

- heading and description remain readable as plain text
- recovery action remains visible after the description

## Data / Auth / Storage Notes

- page is informational and does not mutate auth or storage state
