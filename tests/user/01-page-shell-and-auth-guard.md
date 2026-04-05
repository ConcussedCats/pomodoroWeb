# User Page Shell And Auth Guard

## Purpose

Validate the protected account page shell and its server-rendered preconditions.

## Source Surface

- Template: [user.html](../../src/main/resources/templates/user.html)
- Route: `GET /user`

## User Story / Functional Slice

As an authenticated user, I can open my account page and see my current username preloaded into the profile form.

## Dependencies

- authenticated route `/user`
- model attribute `curUsername`
- CSRF meta tags

## Happy Path Scenarios

- authenticated request returns the user page
- page title is `Profile - Telos`
- page renders profile intro and two-panel layout
- username field is prefilled from `curUsername`
- CSRF meta tags are present for later PATCH requests

## Negative / Edge Scenarios

- anonymous request must not receive the protected page directly
- missing `curUsername` model binding is a controller regression
- page must not expose password values server-side

## Accessibility / UI States

- both forms are discoverable with clear section titles
- page remains readable before `user-settings.js` executes

## Data / Auth / Storage Notes

- page requires authenticated session rendering
- shared header should render authenticated account controls
