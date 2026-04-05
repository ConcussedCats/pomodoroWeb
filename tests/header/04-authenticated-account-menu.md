# Header Authenticated Account Menu

## Purpose

Validate the header behavior shown to authenticated users.

## Source Surface

- Fragment: [header.html](../../src/main/resources/templates/fragments/header.html)

## User Story / Functional Slice

As an authenticated user, I can open the account menu, navigate to account settings, and log out safely.

## Dependencies

- `sec:authorize="isAuthenticated()"`
- route `/user`
- form `POST /logout`
- CSRF hidden field in logout form

## Happy Path Scenarios

- authenticated account menu renders instead of anonymous login link
- summary label shows `Account`
- menu contains `Account settings` link to `/user`
- logout button is present inside a POST form
- hidden CSRF input is rendered in the logout form

## Negative / Edge Scenarios

- authenticated header must not show anonymous login entry simultaneously
- missing CSRF field in logout form is a security regression
- account settings link must not point to a public page by mistake

## Accessibility / UI States

- summary element is keyboard focusable
- menu links/buttons remain reachable when expanded
- caret/icon do not carry required meaning without text label

## Data / Auth / Storage Notes

- visibility depends on authenticated template state
- logout mutates session state but not local storage directly
