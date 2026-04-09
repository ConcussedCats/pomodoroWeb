# Java Unit Test Plans

## Purpose

This folder captures pure Java unit-level scenario coverage that should later be implemented without full MVC or browser overhead.

## Source Surface

- Services:
  - [UserServiceImpl.java](../../src/main/java/com/example/telos/service/impl/UserServiceImpl.java)
  - [UserTimeSettingsServiceImpl.java](../../src/main/java/com/example/telos/service/impl/UserTimeSettingsServiceImpl.java)
  - [LogErrorServiceImpl.java](../../src/main/java/com/example/telos/service/impl/LogErrorServiceImpl.java)
- Security:
  - [JwtService.java](../../src/main/java/com/example/telos/security/JwtService.java)
  - [JwtFilter.java](../../src/main/java/com/example/telos/security/JwtFilter.java)

## Automation Notes

- Primary automation layer: JUnit + Mockito
- Priority: `P0` for `UserServiceImpl`, `UserTimeSettingsServiceImpl`, `JwtService`
- Priority: `P1` for `JwtFilter`, `LogErrorServiceImpl`
- Keep these tests isolated from Spring context unless behavior cannot be exercised meaningfully without it
- Prefer fixed clock-like assertions where possible for token semantics and deterministic expectations

## Plans

- [01-user-service.md](01-user-service.md)
- [02-user-time-settings-service.md](02-user-time-settings-service.md)
- [03-log-error-service.md](03-log-error-service.md)
- [04-jwt-service.md](04-jwt-service.md)
- [05-jwt-filter.md](05-jwt-filter.md)

## Executable Suites

- [UserServiceImplTest.java](../../src/test/java/com/example/telos/service/UserServiceImplTest.java): username trimming/conflict handling, password validation, password encoding
- [UserTimeSettingsServiceImplTest.java](../../src/test/java/com/example/telos/service/UserTimeSettingsServiceImplTest.java): settings lookup, field updates, persistence handoff, null-user guards
- [JwtServiceTest.java](../../src/test/java/com/example/telos/security/JwtServiceTest.java): token generation, claim extraction, expiry behavior, malformed-token handling
- [JwtFilterTest.java](../../src/test/java/com/example/telos/security/JwtFilterTest.java): bearer header handling, security-context population, invalid-token short-circuit behavior
