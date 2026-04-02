# Header Branding And Home Link

## Purpose

Validate the branding block and primary home navigation entry in the shared header fragment.

## Source Surface

- Fragment: [header.html](../../src/main/resources/templates/fragments/header.html)

## User Story / Functional Slice

As a user, I can identify the product and navigate back to the timer page from the header logo area.

## Dependencies

- static icon asset
- root route `/`

## Happy Path Scenarios

- logo image renders with `Telos Logo` alt text
- logo link points to `/`
- brand name `Telos` is visible next to the logo
- clicking the branding area returns the user to the timer page

## Negative / Edge Scenarios

- broken logo asset path is a shared-ui regression
- missing home link target is a navigation regression
- branding must not disappear based on auth state

## Accessibility / UI States

- image has alt text
- home link is keyboard focusable
- brand remains identifiable without CSS

## Data / Auth / Storage Notes

- no storage behavior
- no auth-specific differences in branding block
