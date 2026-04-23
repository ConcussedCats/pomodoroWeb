# 403 Recovery Navigation

## Purpose

Validate the recovery path offered from the 403 page.

## Source Surface

- Template: [403.html](../../src/main/resources/templates/error/403.html)

## User Story / Functional Slice

As a blocked user, I can navigate back to the main timer page from the error screen.

## Dependencies

- recovery anchor to `/`

## Happy Path Scenarios

- button-like link `Back to Timer` is visible
- link points to `/`
- activating the recovery link returns the user to the home page

## Negative / Edge Scenarios

- recovery link must not point back to the forbidden route
- missing recovery link is a usability regression

## Accessibility / UI States

- recovery control is keyboard focusable
- link text clearly describes the destination

## Data / Auth / Storage Notes

- clicking the recovery link does not clear session by itself
