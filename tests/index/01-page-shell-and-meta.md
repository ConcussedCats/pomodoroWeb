# Index Page Shell And Meta

## Purpose

Validate the home page shell, its server-rendered metadata, and the base layout assumptions required by the timer scripts.

## Source Surface

- Template: [index.html](../../src/main/resources/templates/index.html)
- Route: `GET /`

## User Story / Functional Slice

As a visitor, I can open the main timer page and receive all server-rendered metadata required for timer and settings behavior.

## Dependencies

- meta tags:
  - `_csrf`
  - `_csrf_header`
  - `is-authenticated`
- page sections:
  - `timerSection`
  - `settingsSection`

## Happy Path Scenarios

- route returns `200`
- document title is `Telos`
- `_csrf` and `_csrf_header` meta tags render
- exactly one authenticated-state meta tag is effectively present depending on auth state
- page intro renders before the timer surface
- home page omits the header mini-timer slot because `activePage == 'home'`

## Negative / Edge Scenarios

- missing CSRF meta tags break authenticated settings update flow
- incorrect `is-authenticated` meta output breaks anonymous vs authenticated settings logic
- page shell must not hide both timer and settings sections at first render

## Accessibility / UI States

- main content has a clear reading order: intro, timer surface, settings surface
- settings section starts hidden
- heading and intro copy remain readable before scripts execute

## Data / Auth / Storage Notes

- page decides client behavior partly from server-rendered auth metadata
- no mini-timer slot is expected on the home page header
