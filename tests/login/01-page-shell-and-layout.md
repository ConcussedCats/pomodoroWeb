# Login Page Shell And Layout

## Purpose

Validate the visual and structural shell of the login page before form submission behavior is considered.

## Source Surface

- Template: [login.html](../../src/main/resources/templates/login.html)
- Route: `GET /login`

## User Story / Functional Slice

As a user, I can reach a dedicated login page with the standard site chrome and a clearly isolated authentication card.

## Dependencies

- public route `/login`
- shared header/footer/mini-timer fragments

## Happy Path Scenarios

- route returns `200`
- document title is `Login - Telos`
- auth shell and compact auth card render inside main content
- eyebrow `Account Access` and title `Login` are visible
- header and footer render correctly
- login page, as a non-home page, renders the mini-timer slot through the header

## Negative / Edge Scenarios

- page must remain accessible to anonymous users
- page should not require model attributes other than standard CSRF support
- missing shared fragment content is a layout regression

## Accessibility / UI States

- page has a single primary auth form region
- reading order is header, auth card, footer
- login UI remains understandable with no client-side scripting

## Data / Auth / Storage Notes

- page itself is public
- any mini-timer behavior comes from shared scripts, not a login-specific script
