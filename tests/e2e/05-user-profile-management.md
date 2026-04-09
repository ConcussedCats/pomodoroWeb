# E2E User Profile Management

## Purpose

Define end-to-end journeys for username and password management on the user page.

## Source Surface

- Page: `/user`
- Script: `user-settings.js`

## User Story / Functional Slice

As an authenticated user, I can update my username and password and receive visible feedback directly in the UI.

## Dependencies

- authenticated session
- stable hooks:
  - `#username`
  - `#username-form`
  - `#username-message`
  - `#oldPassword`
  - `#newPassword`
  - `#confirmNewPassword`
  - `#password-form`
  - `#password-message`

## Happy Path Scenarios

- username update success shows success message and updated field value
- password update success shows success message and clears password fields

## Negative / Edge Scenarios

- duplicate username shows server validation message
- empty username is rejected
- wrong current password shows error message
- mismatched new passwords show error message

## Accessibility / UI States

- both forms remain independently usable after an error in one of them
- feedback messages are visible and localized to the relevant form

## Data / Auth / Storage Notes

- this suite should use a dedicated mutable account to avoid polluting seeded users
