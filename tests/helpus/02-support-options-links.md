# Help Us Support Options And Links

## Purpose

Validate the informational support choices and the external links that accompany them.

## Source Surface

- Template: [helpus.html](../../src/main/resources/templates/helpus.html)

## User Story / Functional Slice

As a visitor, I can discover where to report issues and where to support the project financially.

## Dependencies

- GitHub issues URL
- Monobank donation URL
- GitHub Sponsors URL

## Happy Path Scenarios

- GitHub issues link is present in the support list
- Monobank link is present in the donation copy
- GitHub Sponsors link is present as an alternative method
- visible copy around each link matches the intended support action

## Negative / Edge Scenarios

- no support link should render as plain text when a link is expected
- broken href values should be treated as regression
- duplicate or contradictory support messaging should be treated as content regression

## Accessibility / UI States

- all links are keyboard focusable
- link text is descriptive enough to distinguish destinations
- support options remain understandable without image loading

## Data / Auth / Storage Notes

- these are outbound links only
- no local or server-side state is created by visiting the page
