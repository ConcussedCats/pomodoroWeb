# JwtService Unit Scenarios

## Purpose

Define pure unit scenarios for token generation, claim extraction, and validity rules.

## Source Surface

- [JwtService.java](../../src/main/java/com/example/telos/security/JwtService.java)

## User Story / Functional Slice

As the JWT helper, token generation and validation must be deterministic and safe for downstream authentication logic.

## Dependencies

- valid base64 secret
- configurable `jwt.expiration`
- mocked or simple `UserDetails`

## Happy Path Scenarios

- constructor accepts valid base64 secret of sufficient length
- `generateToken` creates a signed token with subject equal to the provided login
- generated token has `issuedAt`
- generated token has expiration after issue time
- `extractLogin` returns token subject
- `isTokenValid` returns true when token subject matches user details username and token is not expired

## Negative / Edge Scenarios

- invalid base64 secret fails fast during service construction
- too-short decoded secret fails key creation
- `isTokenValid` returns false when token subject does not match user details username
- expired token is treated as invalid
- malformed token passed to claim extraction raises parser failure

## Accessibility / UI States

- Not applicable at the pure service layer

## Data / Auth / Storage Notes

- Token subject currently stores the user email for downstream auth
- Keep expiration assertions tolerant to clock drift in implementation
