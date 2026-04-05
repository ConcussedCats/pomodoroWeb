# Username Form

## Purpose

Validate the profile form used to update the current username.

## Source Surface

- Template: [user.html](../../src/main/resources/templates/user.html)
- Script: [user-settings.js](../../src/main/resources/static/js/user-settings.js)

## User Story / Functional Slice

As an authenticated user, I can change my public username and receive immediate feedback.

## Dependencies

- form `#username-form`
- input `#username`
- message area `#username-message`
- session endpoint `PATCH /api/user/username`

## Happy Path Scenarios

- trimmed non-empty username is submitted
- success response updates the input value with server-returned username
- success message is shown in the username message area
- duplicate and validation messages are displayed in the same form scope

## Negative / Edge Scenarios

- blank username is rejected client-side before fetch
- duplicate username from server is surfaced to the user
- fetch failure shows fallback server-error message
- username form behavior must not interfere with password form state

## Accessibility / UI States

- field has a visible label
- message area uses `aria-live`
- error and success styles remain visually distinguishable

## Data / Auth / Storage Notes

- current page uses session API with CSRF headers
- JWT parity is documented separately and is not used directly by this page script
