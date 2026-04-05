# Password Form

## Purpose

Validate the form used to change the current account password.

## Source Surface

- Template: [user.html](../../src/main/resources/templates/user.html)
- Script: [user-settings.js](../../src/main/resources/static/js/user-settings.js)

## User Story / Functional Slice

As an authenticated user, I can submit my current password and a new password pair to update account credentials.

## Dependencies

- form `#password-form`
- inputs:
  - `#oldPassword`
  - `#newPassword`
  - `#confirmNewPassword`
- message area `#password-message`
- session endpoint `PATCH /api/user/password`

## Happy Path Scenarios

- all three fields are submitted when present
- success response shows confirmation message
- successful password change resets the password form

## Negative / Edge Scenarios

- client-side submission is blocked when any field is empty
- wrong current password is surfaced from server response
- mismatch between new and confirm password is surfaced from server response
- fetch failure shows fallback server-error message

## Accessibility / UI States

- all password fields have visible labels
- success and error feedback appears in the password message area
- form remains usable after an error

## Data / Auth / Storage Notes

- page script does not store password values locally
- session API with CSRF headers is the active browser path
