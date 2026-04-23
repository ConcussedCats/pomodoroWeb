# JWT API Parity Notes

## Purpose

Document the relationship between the user page’s current session APIs and the parallel JWT API surface.

## Source Surface

- Session controllers:
  - [UserRestController.java](../../src/main/java/com/example/telos/controller/api/session/UserRestController.java)
- JWT controllers:
  - [UserJwtController.java](../../src/main/java/com/example/telos/controller/api/jwt/UserJwtController.java)

## User Story / Functional Slice

As a future API or automation author, I can understand that the page currently uses session endpoints while equivalent JWT endpoints already exist.

## Dependencies

- session routes under `/api/user`
- JWT routes under `/api/jwt/user`

## Happy Path Scenarios

- username update contract is functionally mirrored between session and JWT controllers
- password update contract is functionally mirrored between session and JWT controllers
- business DTO responses should remain aligned across both surfaces

## Negative / Edge Scenarios

- current browser page should not accidentally start calling JWT endpoints without explicit product change
- parity drift between session and JWT validation/response behavior should be tracked as an API consistency issue

## Accessibility / UI States

- no direct UI state in the current page depends on JWT endpoints

## Data / Auth / Storage Notes

- session flow uses CSRF and cookies
- JWT flow uses bearer token and no CSRF
- this file exists to keep transport concerns explicit instead of hiding them inside form-only docs
