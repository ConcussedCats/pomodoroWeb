# Login Form Fields And CSRF

## Purpose

Validate the structure and security-critical fields of the login form.

## Source Surface

- Template: [login.html](../../src/main/resources/templates/login.html)
- Form action: `POST /login`

## User Story / Functional Slice

As a user, I can submit my identifier and password through a standard, CSRF-protected form.

## Dependencies

- form fields:
  - `username`
  - `password`
- hidden CSRF input
- Spring Security form login

## Happy Path Scenarios

- login form renders with method `post`
- form action targets `/login`
- identifier field label reads `Email or Username`
- password field label reads `Password`
- hidden CSRF field is present
- autocomplete hints are present for username and current password

## Negative / Edge Scenarios

- missing CSRF hidden input is a security regression
- wrong field names would break Spring Security form login
- page should not rely on client-side validation to provide required fields

## Accessibility / UI States

- each input has a visible label
- error containers are present for field-level feedback
- submit button is keyboard reachable

## Data / Auth / Storage Notes

- no page-owned local storage
- auth submission is session-based, not JWT-based
