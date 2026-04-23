# Login Error And Invalid Credentials

## Purpose

Validate how the login page surfaces incorrect credentials and failed authentication attempts.

## Source Surface

- Template: [login.html](../../src/main/resources/templates/login.html)
- Error binding: `param.error`

## User Story / Functional Slice

As a user, I get a visible failure signal when my login credentials are wrong.

## Dependencies

- failed `POST /login`
- redirect/query-param error flow from Spring Security

## Happy Path Scenarios

- invalid credentials return the user to the login page
- `Username or password is incorrect` message is rendered when `param.error` is present
- previously public page remains accessible after auth failure

## Negative / Edge Scenarios

- failed login must not authenticate the session
- page must not expose stack traces or backend exception details
- error rendering should not depend on page-owned JavaScript

## Accessibility / UI States

- error message appears in a readable location above the inputs
- inputs remain usable after a failed attempt
- submit button remains available for retry

## Data / Auth / Storage Notes

- failed login should not mutate client storage
- failed login should not switch the header into authenticated mode
