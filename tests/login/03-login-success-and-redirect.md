# Login Success And Redirect

## Purpose

Validate the successful authentication path from the login page into the protected user area.

## Source Surface

- Template: [login.html](../../src/main/resources/templates/login.html)
- Security config:
  - form login page `/login`
  - default success URL `/user`

## User Story / Functional Slice

As a valid user, I can log in with either email or username and land on my account page.

## Dependencies

- `POST /login`
- `CustomUserDetailsService.findByEmailOrUsername`
- redirect target `/user`

## Happy Path Scenarios

- valid email and password create an authenticated session
- valid username and password create an authenticated session
- successful login redirects to `/user`
- resulting session can access protected session APIs and account page

## Negative / Edge Scenarios

- success path must not redirect back to `/login`
- identifier support for both email and username must stay intact after auth changes
- successful auth must not require JWT token issuance for browser flow

## Accessibility / UI States

- on successful submit, user receives a navigation transition instead of an inline error state

## Data / Auth / Storage Notes

- browser flow uses server session and `JSESSIONID`
- successful login affects authenticated rendering of shared header and protected routes
