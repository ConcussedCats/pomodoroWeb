# E2E Auth And Route Guards

## Purpose

Define browser journeys for authentication entry, route protection, and basic session transitions.

## Source Surface

- Pages:
  - `/login`
  - `/user`
- Session auth flow:
  - `POST /login`
  - `POST /logout`

## User Story / Functional Slice

As a user, I can log in, reach protected pages, and log out; as an anonymous user, I cannot access protected content directly.

## Dependencies

- seeded or dedicated test user
- stable hooks:
  - `#loginIdentifier`
  - `#loginPassword`
  - `#loginForm`

## Happy Path Scenarios

- anonymous user opens `/login`
- valid email login redirects to `/user`
- valid username login redirects to `/user`
- authenticated user opens `/user` successfully
- logout returns the user to `/`

## Negative / Edge Scenarios

- anonymous direct navigation to `/user` does not reveal protected content
- invalid credentials stay in login flow and show visible error message
- logged-out user loses access to `/user`

## Accessibility / UI States

- login form is keyboard-usable end-to-end
- auth error state remains visible after failed login

## Data / Auth / Storage Notes

- Prefer a dedicated mutable account so later profile tests can reuse the same session safely
