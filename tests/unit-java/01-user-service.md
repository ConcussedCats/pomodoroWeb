# UserServiceImpl Unit Scenarios

## Purpose

Define unit scenarios for `UserServiceImpl` so username, password, and repository interaction rules are covered without HTTP or browser layers.

## Source Surface

- [UserServiceImpl.java](../../src/main/java/com/example/telos/service/impl/UserServiceImpl.java)

## User Story / Functional Slice

As the service layer, user lookup and profile mutation logic must enforce null checks, uniqueness rules, and password rules consistently.

## Dependencies

- mocked `UserRepository`
- mocked `PasswordEncoder`
- DTOs:
  - `UserPasswordDto`
  - `UserUsernameResponseDto`
  - `UserPasswordResponseDto`

## Happy Path Scenarios

- `findById` returns user when repository finds one
- `findByEmail` returns user when repository finds one
- `findByUsername` returns user when repository finds one
- `findByEmailOrUsername` returns user when repository finds one
- `create` saves a non-null user
- `update` saves an existing user with non-null `userId`
- `delete` deletes an existing user with non-null `userId`
- `findAll` returns repository result
- `updateUsername` trims input and returns success DTO
- `updateUsername` allows saving the same username for the same user
- `updatePassword` encodes new password and returns success DTO

## Negative / Edge Scenarios

- `findById` throws `EntityNotFoundException` when missing
- `findByEmail` throws `EntityNotFoundException` when missing
- `findByUsername` throws `EntityNotFoundException` when missing
- `findByEmailOrUsername` throws `EntityNotFoundException` when missing
- `create(null)` throws `NullEntityReferenceException`
- `update(null)` throws `NullEntityReferenceException`
- `update` with null `userId` throws `NullEntityReferenceException`
- `delete(null)` throws `NullEntityReferenceException`
- `delete` with null `userId` throws `NullEntityReferenceException`
- `updateUsername` with null/blank username throws `NullEntityReferenceException`
- `updateUsername` with another user already owning that username throws `UsernameAlreadyTakenException`
- `updatePassword(null dto)` throws `NullEntityReferenceException`
- `updatePassword` with any null password field throws `NullEntityReferenceException`
- `updatePassword` with mismatched new/confirm passwords throws `IllegalArgumentException`
- `updatePassword` with wrong old password throws `IllegalArgumentException`

## Accessibility / UI States

- Not applicable at the pure service layer

## Data / Auth / Storage Notes

- Treat login lookup as a service input, not an HTTP principal concern
- Verify repository interactions precisely:
  - save called once on success
  - delete called once on success
  - no save on validation failure
- Verify password encoding happens only after old password match succeeds
