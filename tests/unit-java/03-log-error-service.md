# LogErrorServiceImpl Unit Scenarios

## Purpose

Define unit scenarios for error logging rules and persistence boundaries.

## Source Surface

- [LogErrorServiceImpl.java](../../src/main/java/com/example/telos/service/impl/LogErrorServiceImpl.java)

## User Story / Functional Slice

As the logging service, warn-level events should log without DB persistence, while 5xx errors should attempt persistence without breaking the main flow.

## Dependencies

- mocked `LogErrorRepository`
- mocked `HttpServletRequest`
- exception instance

## Happy Path Scenarios

- `logWarn` builds description from request method, path, and exception type
- `logWarn` does not persist to repository
- `logError` builds the same description format
- `logError` persists an `ErrorLog` for 5xx status
- persisted `ErrorLog` contains:
  - `httpError`
  - `errorDescription`

## Negative / Edge Scenarios

- `logError` for 4xx status does not persist
- repository failure during `logError` persistence is swallowed and does not rethrow
- unusual exception types still produce a compact description string

## Accessibility / UI States

- Not applicable at the pure service layer

## Data / Auth / Storage Notes

- Expected description format:
  - `status=<code>, method=<verb>, path=<uri>, exception=<type>`
- This unit should verify repository interactions rather than SLF4J output text
