# Generic Error Model Rendering Code And Message

## Purpose

Validate the data contract of the minimal generic error template.

## Source Surface

- Template: [error.html](../../src/main/resources/templates/error/error.html)

## User Story / Functional Slice

As a user who hits a server-side fallback error page, I see the provided code and message values rendered directly.

## Dependencies

- model attributes:
  - `code`
  - `message`

## Happy Path Scenarios

- `code` model attribute renders in the first heading
- `message` model attribute renders in the second heading
- template succeeds without shared fragments

## Negative / Edge Scenarios

- missing `code` or `message` should be treated as a controller/model defect
- page must not render raw placeholder syntax to the user

## Accessibility / UI States

- both values render as text headings
- content remains understandable even without styling

## Data / Auth / Storage Notes

- this template is pure server-rendered output with no auth or storage logic
