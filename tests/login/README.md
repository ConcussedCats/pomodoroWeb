# Login Page Test Plans

## Source Surface

- Template: [login.html](../../src/main/resources/templates/login.html)
- Shared fragments:
  - [header.html](../../src/main/resources/templates/fragments/header.html)
  - [footer.html](../../src/main/resources/templates/fragments/footer.html)
  - [mini-timer-scripts.html](../../src/main/resources/templates/fragments/mini-timer-scripts.html)

## Linked JS / API Dependencies

- Session auth entrypoint: `POST /login`
- Security redirect target: `/user`
- CSRF hidden form field
- No page-owned JavaScript file

## Covered Blocks

- page shell and layout
- login form fields and CSRF
- successful login and redirect
- error states for invalid credentials

## Plans

- [01-page-shell-and-layout.md](01-page-shell-and-layout.md)
- [02-login-form-fields-and-csrf.md](02-login-form-fields-and-csrf.md)
- [03-login-success-and-redirect.md](03-login-success-and-redirect.md)
- [04-login-error-and-invalid-credentials.md](04-login-error-and-invalid-credentials.md)
