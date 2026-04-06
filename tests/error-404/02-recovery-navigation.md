# 404 Recovery Navigation

## Purpose

Validate the recovery path offered from the 404 page.

## Source Surface

- Template: [404.html](../../src/main/resources/templates/error/404.html)

## User Story / Functional Slice

As a user on a missing page, I can return to the timer page quickly.

## Dependencies

- recovery anchor to `/`

## Happy Path Scenarios

- `Back to Timer` action is visible
- action points to `/`
- navigation away from the 404 page is successful

## Negative / Edge Scenarios

- missing recovery link is a usability defect
- recovery link must not target another error route

## Accessibility / UI States

- recovery control is keyboard reachable
- text clearly communicates what happens on activation

## Data / Auth / Storage Notes

- no state mutation is required beyond standard navigation
