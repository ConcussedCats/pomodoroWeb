# Help Us External Link Behavior

## Purpose

Validate the HTML safety and usability contract of external links on the Help Us page.

## Source Surface

- Template: [helpus.html](../../src/main/resources/templates/helpus.html)

## User Story / Functional Slice

As a visitor, I can open external contribution and donation resources safely without disrupting the current session.

## Dependencies

- external anchors with `target="_blank"`
- `rel="noopener noreferrer"`

## Happy Path Scenarios

- each external link opens in a new tab/window
- each external link includes `rel="noopener noreferrer"`
- the current page remains intact after activating an external link

## Negative / Edge Scenarios

- missing `rel` on any `target="_blank"` link is a security regression
- links should not point to empty or malformed URLs
- internal app routes must not accidentally be marked as external support links

## Accessibility / UI States

- focus order reaches all external links
- links remain visible and actionable without hover
- support options stay understandable if the user does not open the links

## Data / Auth / Storage Notes

- link activation leaves the Telos app and does not mutate internal state
