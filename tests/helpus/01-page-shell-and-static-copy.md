# Help Us Page Shell And Static Copy

## Purpose

Validate the baseline render and informational copy of the Help Us page.

## Source Surface

- Template: [helpus.html](../../src/main/resources/templates/helpus.html)
- Route: `GET /helpus`

## User Story / Functional Slice

As a visitor, I can open the Help Us page and understand that the team accepts both contribution feedback and financial support.

## Dependencies

- public page controller for `/helpus`
- no page-specific JavaScript

## Happy Path Scenarios

- route returns `200`
- document title is `Help Us - Telos`
- heading `Help Us` is visible
- intro paragraph explains there are two ways to support the project
- list of support options renders as a visible list

## Negative / Edge Scenarios

- static copy should render without any server-side model data
- page should remain meaningful if external assets fail to load
- page must remain publicly accessible without login

## Accessibility / UI States

- main content order remains heading, intro, list, donation block
- list semantics remain preserved for support options
- page contains a single visible primary heading

## Data / Auth / Storage Notes

- no page-owned storage
- no page-owned internal API requests
- no auth gate
