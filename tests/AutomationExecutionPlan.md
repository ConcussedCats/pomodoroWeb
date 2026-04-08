# Automation Execution Plan

This document turns the current testing strategy into a concrete implementation backlog.

Use it as the working plan for adding automated coverage in the repository.

## Goals

- close the current gap between documented coverage and executable coverage
- prioritize cheaper and more stable checks before expensive browser flows
- keep each phase small enough to review and merge safely
- introduce `anti-67` testing as a cross-cutting validation rule without hiding where product logic must be added first

## Delivery Rules

- Prefer lower layers first:
  - `WebMvc` before `Playwright` when a contract can be validated without a browser
  - Java unit before integration when logic is isolated enough
- Add executable tests in the same phase as the underlying implementation, not before it exists.
- For `anti-67`, do not leave browser-only validation as the single enforcement layer.
- Keep smoke suites environment-safe and reusable on `https://teclos.space` or another remote target.

## Phase 0. Infrastructure And Readiness

### Outcome

Stabilize the test environment so the later suites can be added without ad hoc setup.

### Tasks

- Add JaCoCo to Maven so backend coverage is measurable.
- Introduce a committed Playwright project config if the team wants browser automation to scale beyond ad hoc commands.
- Define naming/tagging conventions:
  - `smoke`
  - `regression`
  - `api`
  - `auth`
  - `ui`
  - `anti-67`
- Document reusable environment variables:
  - `E2E_BASE_URL`
  - `E2E_DEV_BASE_URL`
  - `E2E_LOGIN_USERNAME`
  - `E2E_LOGIN_PASSWORD`
- Decide how mutable test data is reset for username/password mutation flows.

### Deliverables

- `pom.xml` updated with JaCoCo
- Playwright config committed to the repo
- short contributor note in `tests/` or `README.md` describing how to run the main suites

## Phase 1. WebMvc And Integration For Session APIs

### Outcome

Lock down the main session-based contracts under `/api/user/**`.

### Test Files To Add

- `src/test/java/com/example/telos/api/UserTimeSettingsControllerTest.java`
- `src/test/java/com/example/telos/api/UserProfileControllerTest.java`
- `src/test/java/com/example/telos/integration/UserTimeSettingsIntegrationTest.java`
- `src/test/java/com/example/telos/integration/UserProfileIntegrationTest.java`

### Coverage

- `GET /api/user/time-settings`
  - anonymous -> unauthorized
  - authenticated -> `200`
  - response JSON shape
- `PATCH /api/user/time-settings`
  - authenticated valid payload
  - invalid bounds
  - malformed JSON
  - missing CSRF
  - unauthorized access
- `PATCH /api/user/username`
  - happy path
  - blank username
  - conflict path
  - missing CSRF
  - unauthorized access
- `PATCH /api/user/password`
  - happy path
  - wrong current password
  - mismatched confirmation
  - missing required fields
  - missing CSRF
  - unauthorized access

### Anti-67 Coverage In This Phase

- If username validation is extended with the easter egg:
  - reject `67`
  - reject `six seven`
  - reject case-insensitive variants
- If time-settings inputs should reject literal `67` in any field, encode that rule here too.
- API responses must be stable and explicit when an `anti-67` validation rule fires.

### Dependencies

- `spring-security-test`
- stable error response contract
- seeded authenticated test user or mocked auth principal

## Phase 2. WebMvc And Integration For JWT APIs

### Outcome

Lock down the JWT-facing contracts under `/api/jwt/**`.

### Test Files To Add

- `src/test/java/com/example/telos/api/AuthJwtControllerTest.java`
- `src/test/java/com/example/telos/api/UserJwtControllerTest.java`
- `src/test/java/com/example/telos/integration/JwtAuthIntegrationTest.java`

### Coverage

- `POST /api/jwt/auth/login`
  - valid credentials
  - invalid credentials
  - response token shape
- `PATCH /api/jwt/user/username`
  - valid JWT auth
  - invalid JWT
  - blank/conflict validation
- `PATCH /api/jwt/user/password`
  - valid JWT auth
  - mismatched confirmation
  - wrong current password
- JWT time-settings endpoints if present

### Anti-67 Coverage In This Phase

- Mirror the same rejection rules for `anti-67` on JWT username/password-related inputs if those fields are in scope.
- Session and JWT APIs must not diverge on `anti-67` behavior.

## Phase 3. Java Unit Tests

### Outcome

Cover pure Java logic cheaply before growing the integration matrix further.

### Test Files To Add

- `src/test/java/com/example/telos/service/UserServiceImplTest.java`
- `src/test/java/com/example/telos/service/UserTimeSettingsServiceImplTest.java`
- `src/test/java/com/example/telos/security/JwtServiceTest.java`
- `src/test/java/com/example/telos/security/JwtFilterTest.java`
- `src/test/java/com/example/telos/service/LogErrorServiceImplTest.java`

### Coverage

- `UserServiceImpl`
  - find/load behavior
  - username update rules
  - password update rules
  - encoding behavior
  - conflict handling
- `UserTimeSettingsServiceImpl`
  - load settings for current user
  - update all fields
  - persistence-facing rules without MVC
- `JwtService`
  - token generation
  - parsing
  - expiry validation
  - subject extraction
- `JwtFilter`
  - skip when no header exists
  - authenticate when token is valid
  - ignore invalid token safely
- `LogErrorServiceImpl`
  - save only expected error cases

### Anti-67 Coverage In This Phase

- If `anti-67` is implemented through a dedicated validator/helper, add direct unit coverage here.
- Preferred implementation shape:
  - one shared backend validation helper
  - one small suite verifying:
    - exact `67`
    - exact `six seven`
    - uppercase/lowercase variants
    - trimmed variants
    - safe non-matching values

## Phase 4. Playwright Core Browser Flows

### Outcome

Cover the main user-visible flows that cannot be trusted without a real browser.

### Test Files To Add

- `tests/e2e/home-timer.spec.js`
- `tests/e2e/home-settings.spec.js`
- `tests/e2e/user-profile.spec.js`
- `tests/e2e/productivity.spec.js`

### Coverage

- Home timer
  - page shell
  - start
  - pause
  - reset
  - mode visibility
  - reload recovery
- Home settings
  - open/close
  - validation
  - save/cancel
  - authenticated sync if test creds exist
- User profile
  - page render
  - username form
  - password form
  - visible feedback
- Productivity
  - tab switching
  - todo add/edit/delete
  - notes add/edit/delete
  - storage persistence

### Anti-67 Coverage In This Phase

- Browser-visible validation must be checked anywhere the user can type text:
  - login identifier
  - username field
  - productivity task input
  - productivity note input
- Browser expectations:
  - invalid value is visibly rejected
  - form submit is blocked where client validation exists
  - error state clears after valid input

## Phase 5. Cross-Page And Shared UI Browser Coverage

### Outcome

Cover shared behavior that currently exists only in documentation or manual checks.

### Test Files To Add

- `tests/e2e/mini-timer-sync.spec.js`
- `tests/e2e/header-footer.spec.js`
- `tests/e2e/error-pages.spec.js`
- `tests/e2e/static-pages.spec.js`

### Coverage

- mini timer visibility on non-home pages
- mini timer state reflection after timer changes
- header nav visibility and route links
- footer presence across target pages
- 403 and 404 recovery navigation
- about/helpus smoke

### Anti-67 Coverage In This Phase

- none by default unless a shared input surface is added later

## Phase 6. Anti-67 Feature Matrix

This is the easter egg validation matrix that should be applied only where it makes sense for user-entered values.

### Candidate Inputs

- login identifier
- profile username
- productivity todo text
- productivity note content
- any future free-text field

### Default Rule Proposal

- reject exact `67`
- reject text containing `67` as a distinct token
- reject `six seven` case-insensitively
- accept unrelated values such as:
  - `667`
  - `sixty seven`
  - `alpha`

### Questions To Lock Before Full Implementation

- Should `abc67xyz` be rejected or allowed?
- Should `67` inside passwords be rejected or should passwords stay out of scope for the joke rule?
- Should numeric timer settings reject `67`, or is the easter egg text-only?

### Recommended Implementation Shape

- frontend:
  - small reusable validator/helper for text inputs
- backend:
  - one reusable validation rule or helper
- tests:
  - unit
  - `WebMvc`
  - Playwright only where user-visible feedback matters

## Concrete Backlog Order

1. Add JaCoCo and Playwright config.
2. Add `WebMvc` session API tests for `/api/user/time-settings`.
3. Add `WebMvc` session API tests for `/api/user/username` and `/api/user/password`.
4. Add `WebMvc` JWT auth and user API tests.
5. Add Java unit tests for `UserServiceImpl` and `UserTimeSettingsServiceImpl`.
6. Add Java unit tests for `JwtService` and `JwtFilter`.
7. Add Playwright home timer and settings flows.
8. Add Playwright user profile flows.
9. Add Playwright productivity flows.
10. Add shared UI and error/static smoke suites.
11. Lock `anti-67` scope in product behavior.
12. Add backend `anti-67` tests.
13. Add frontend and browser `anti-67` tests.

## Done Criteria

The plan is considered implemented when:

- each phase has executable tests in the repo
- the planned files exist or their scope is covered by equivalent test files
- `anti-67` behavior is either implemented with tests or explicitly marked out of scope in the docs
- remote smoke and local automation can both be run using documented commands
