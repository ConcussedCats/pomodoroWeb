# UserTimeSettingsServiceImpl Unit Scenarios

## Purpose

Define unit scenarios for time-settings business logic without HTTP or browser concerns.

## Source Surface

- [UserTimeSettingsServiceImpl.java](../../src/main/java/com/example/telos/service/impl/UserTimeSettingsServiceImpl.java)

## User Story / Functional Slice

As the service layer, user time settings must be retrievable and updatable consistently for the current user.

## Dependencies

- mocked `UserTimeSettingsRepository`
- mocked `UserService`
- DTOs:
  - `UserTimeSettingsDto`
  - `UserTimeSettingsResponseDto`

## Happy Path Scenarios

- `findById` returns settings when repository finds one
- `create` saves non-null settings
- `update` saves existing settings with non-null `settingsId`
- `delete` deletes settings with non-null `settingsId`
- `findByUser` returns settings for existing user with `userId`
- `findAll` returns repository result
- `updateSettings` updates all mutable fields and returns response DTO
- `findSettings` returns a DTO matching persisted values

## Negative / Edge Scenarios

- `findById` throws `EntityNotFoundException` when missing
- `create(null)` throws `NullEntityReferenceException`
- `update(null)` throws `NullEntityReferenceException`
- `update` with null `settingsId` throws `NullEntityReferenceException`
- `delete(null)` throws `NullEntityReferenceException`
- `delete` with null `settingsId` throws `NullEntityReferenceException`
- `findByUser(null)` throws `NullEntityReferenceException`
- `findByUser` with null `userId` throws `NullEntityReferenceException`
- `findByUser` throws `EntityNotFoundException` when settings record is missing
- `updateSettings` fails when user lookup fails
- `updateSettings` fails when looked-up user has null `userId`
- `findSettings` fails when looked-up user has null `userId`

## Accessibility / UI States

- Not applicable at the pure service layer

## Data / Auth / Storage Notes

- Verify that `updateSettings` persists:
  - `pomodoroMinutes`
  - `shortBreakMinutes`
  - `longBreakMinutes`
  - `pomoCycles`
  - `soundsEnabled`
- Verify no hidden fallback or partial-save behavior is assumed
