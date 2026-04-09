# JwtFilter Unit Scenarios

## Purpose

Define unit scenarios for request filtering and security-context population in `JwtFilter`.

## Source Surface

- [JwtFilter.java](../../src/main/java/com/example/telos/security/JwtFilter.java)

## User Story / Functional Slice

As the JWT request filter, bearer-token requests should populate authentication when valid and short-circuit with `401` when the token is malformed or expired.

## Dependencies

- mocked `UserDetailsService`
- mocked `JwtService`
- mocked `RestAuthenticationEntryPoint`
- mocked request, response, and filter chain
- `SecurityContextHolder`

## Happy Path Scenarios

- missing `Authorization` header passes request through unchanged
- non-bearer `Authorization` header passes request through unchanged
- valid bearer token extracts login, loads user details, validates token, and sets authentication in `SecurityContextHolder`
- valid token continues the filter chain
- already-authenticated security context does not get overwritten unnecessarily

## Negative / Edge Scenarios

- `JwtException` during token extraction clears context and invokes `restAuthenticationEntryPoint`
- `IllegalArgumentException` during token handling clears context and invokes `restAuthenticationEntryPoint`
- invalid token must not continue the filter chain after entry point handles the error
- token mismatch with loaded user details must not authenticate the request

## Accessibility / UI States

- Not applicable at the pure filter layer

## Data / Auth / Storage Notes

- Unit implementation should reset `SecurityContextHolder` before and after each test
- Verify:
  - filter chain interaction count
  - entry point invocation count
  - authentication presence/absence in context
