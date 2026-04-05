# Header Anonymous Auth Controls

## Purpose

Validate the header behavior shown to anonymous users.

## Source Surface

- Fragment: [header.html](../../src/main/resources/templates/fragments/header.html)

## User Story / Functional Slice

As an anonymous visitor, I can find the login entry point from the shared header.

## Dependencies

- `sec:authorize="isAnonymous()"`
- route `/login`

## Happy Path Scenarios

- login/profile entry renders for anonymous user
- label reads `Login`
- link points to `/login`
- `profile-entry--active` is applied when the active page is `login`

## Negative / Edge Scenarios

- anonymous view must not show authenticated account menu
- login link must not disappear on public pages
- active styling must not leak to other pages

## Accessibility / UI States

- login entry is keyboard reachable
- icon remains decorative while link label communicates purpose
- anonymous header remains understandable without SVG rendering

## Data / Auth / Storage Notes

- visibility depends only on Spring Security template authorization state
