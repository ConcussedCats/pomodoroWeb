# Test Plan 01

## 1. Document Purpose

This document defines the technical test strategy for the current state of the `feature/setup-tests` branch of the `pomodoroWeb` project.

The goal is to produce a test plan that another engineer or QA teammate can use to:

- understand the real system surface area
- identify what is already covered and what is missing
- derive unit, MVC, integration, API, and browser-level tests
- execute regression checks consistently before merge or release

This document is intentionally more technical than a product-level checklist. It is anchored to the current codebase, runtime configuration, and contracts exposed by the application.

## 2. Project Snapshot

### 2.1 Stack

- Backend: Spring Boot `3.5.11`
- Language: Java `21`
- Templates/UI: Thymeleaf
- Security:
  - session-based web authentication for `/login`, `/user`, `/api/**`
  - JWT-based stateless authentication for `/api/jwt/**`
- Database: PostgreSQL
- Persistence: Spring Data JPA
- Validation: Jakarta Validation
- Frontend behavior: vanilla JavaScript with `localStorage`, `storage` events, `Web Worker`, and browser audio

### 2.2 Current Runtime Configuration

From `src/main/resources/application.properties`:

- `spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5432/telos_db}`
- `spring.datasource.username=${DB_USERNAME:postgres}`
- `spring.datasource.password=${DB_PASSWORD:postgres}`
- `spring.jpa.hibernate.ddl-auto=none`
- `spring.sql.init.mode=always`
- `jwt.secret=${JWT_SECRET:5hLWRyorOP4B/z4D5PO0ta/YEZJjLdFai+XuOV99DA4=}`
- `jwt.expiration=${JWT_EXPIRATION:3600000}`

### 2.3 Current Test Baseline

The branch currently contains only:

- `TelosApplicationTests` with `contextLoads`
- `@WebMvcTest` smoke tests for page controllers:
  - home
  - login
  - about
  - helpus
  - productivity
  - user

There is currently no evidence of:

- repository tests
- service tests
- security tests
- REST contract tests
- JWT tests
- database integration tests
- browser automation
- coverage reporting
- Testcontainers
- H2
- JaCoCo
- Playwright configuration in repo-tracked source

## 3. Test Objectives

### 3.1 Primary Objectives

- validate correctness of authentication and authorization across both session and JWT paths
- validate API behavior, response contracts, validation rules, and error payloads
- validate timer state transitions and browser-driven state hydration
- validate user settings and profile update flows
- validate resilience of client-side state in reload and multi-tab scenarios
- validate database integrity for current relational model and seed data
- define a clear regression gate for future feature work

### 3.2 Non-Goals

This plan does not assume implementation of features not currently wired into the UI or controllers, including:

- registration flow
- admin-only features
- role-based authorization beyond `ROLE_USER`
- backend CRUD for productivity notes/todos in the current UI

## 4. System Surface Under Test

### 4.1 HTML Routes

| Route | Auth Mode | Expected Output |
|---|---|---|
| `/` | Public | `index` template |
| `/login` | Public | `login` template |
| `/productivity` | Public | `productivity` template |
| `/about` | Public | `about` template |
| `/helpus` | Public | `helpus` template |
| `/user` | Authenticated | `user` template with `curUsername` |

### 4.2 Session REST Routes

| Method | Route | Auth | CSRF | Purpose |
|---|---|---|---|---|
| `PATCH` | `/api/user/username` | Required | Required | Update username |
| `PATCH` | `/api/user/password` | Required | Required | Update password |
| `GET` | `/api/user/time-settings` | Required | Not required | Read time settings |
| `PATCH` | `/api/user/time-settings` | Required | Required | Update time settings |

### 4.3 JWT Routes

| Method | Route | Auth | CSRF | Purpose |
|---|---|---|---|---|
| `POST` | `/api/jwt/auth/login` | Public | Disabled | Obtain JWT token |
| `PATCH` | `/api/jwt/user/username` | Bearer token | Disabled | Update username |
| `PATCH` | `/api/jwt/user/password` | Bearer token | Disabled | Update password |
| `GET` | `/api/jwt/user/time-settings` | Bearer token | Disabled | Read time settings |
| `PATCH` | `/api/jwt/user/time-settings` | Bearer token | Disabled | Update time settings |

### 4.4 Browser State and Client Contracts

- `localStorage` key `pomodoroSettings`
- `localStorage` key `pomodoroTimerState`
- `localStorage` key `telos.productivity.v1`
- `settings.js` sync with `/api/user/time-settings`
- `user-settings.js` sync with `/api/user/username` and `/api/user/password`
- `mini-timer-sync.js` sync with `/api/user/time-settings`
- `timer.js` uses `Worker("js/worker.js")` with fallback timer interval
- `timer-state.js` owns timer normalization, hydration, persistence, and transition logic

## 5. Test Environments

### 5.1 Mandatory Environments

- Local developer environment with PostgreSQL running
- JDK 21
- Maven Wrapper `./mvnw`
- Chrome latest stable

### 5.2 Recommended Secondary Environments

- Firefox latest stable
- Safari latest available on macOS

### 5.3 Browser Notes

- Safari background audio limitation is already documented in project docs and must be treated as known behavior, not automatically as a defect
- multi-tab sync and worker fallback must be verified in a real browser, not only in mocked test environments

## 6. Test Data Strategy

### 6.1 Seeded Users

From `data.sql`:

| Username | Email | Notes |
|---|---|---|
| `user` | `user@test.com` | baseline user |
| `guest` | `guest@test.com` | duplicate-conflict reference |
| `demo` | `demo@test.com` | alternate settings profile |

### 6.2 Seeded Time Settings

| User ID | Pomodoro | Short Break | Long Break | Cycles | Sound |
|---|---|---|---|---|---|
| `1` | `25` | `5` | `15` | `4` | `true` |
| `2` | `30` | `5` | `20` | `4` | `true` |
| `3` | `50` | `10` | `30` | `3` | `false` |

### 6.3 Additional Test Data Rules

- keep at least one known-good account for positive auth flows
- keep at least one second account to test username uniqueness conflicts
- avoid mutating seed data permanently across shared test runs unless the suite resets DB state
- for password-change tests, isolate by transaction rollback or dedicated disposable user

## 7. Risk-Based Prioritization

### 7.1 P0 Critical

- app boot and DB initialization
- session login/logout
- JWT login and token-protected endpoints
- `/api/**` auth and CSRF behavior
- timer core state transitions
- settings persistence and sync
- multi-tab state consistency

### 7.2 P1 High

- REST error contract stability
- profile update flows
- password hashing and invalid password behavior
- server logging behavior for 4xx vs 5xx
- browser fallback behavior when worker is unavailable

### 7.3 P2 Medium

- accessibility, visual sanity, and keyboard support
- broader browser sanity checks
- performance and drift sanity checks

## 8. Detailed Test Matrix

### 8.1 Application Boot and Configuration

Validate:

- Spring context starts successfully with required beans:
  - `SecurityFilterChain`
  - `AuthenticationManager`
  - `JwtService`
  - `JwtFilter`
  - controllers
  - repositories
- application starts with valid defaults for DB and JWT settings
- invalid `JWT_SECRET` format or too-short key behavior is understood and surfaced clearly
- DB schema and seed scripts execute in the intended order
- startup does not depend on Hibernate DDL generation because `ddl-auto=none`

Failure conditions to target:

- malformed JWT secret
- missing database connection
- SQL init failure
- missing bean wiring in split controller/security package structure

### 8.2 HTML Page Controllers

Validate for each page route:

- status code is `200` for public routes
- correct view name is returned
- common fragments render without missing model attributes
- static assets referenced in templates resolve successfully

Additional page-specific checks:

- `/user` requires authenticated principal
- `/user` provides `curUsername`
- `/login` includes form fields and CSRF hidden field
- non-home pages render mini-timer entry point

### 8.3 Session Security

Validate:

- unauthenticated request to `/user` is redirected to login flow
- unauthenticated request to `/api/user/**` returns JSON `401`
- authenticated request without CSRF to session `PATCH` endpoints is rejected
- authenticated request with valid CSRF succeeds
- logout clears `JSESSIONID`
- post-login redirect is always `/user`

Negative cases:

- wrong login credentials
- authenticated user hitting unsupported method
- missing principal in controller path after auth middleware

### 8.4 JWT Security

Validate:

- `/api/jwt/auth/login` is public
- `/api/jwt/**` other than auth is protected
- valid bearer token authenticates principal for downstream controllers
- invalid token returns `401`
- expired token returns `401`
- malformed token returns `401`
- missing bearer prefix behaves as unauthenticated request
- JWT routes are stateless and do not depend on session cookies or CSRF

Technical checks:

- token subject matches email returned by `CustomUserDetailsService`
- generated token expiration equals `now + jwt.expiration`
- `SecurityContextHolder` is populated only when token is valid

### 8.5 Auth JWT Controller

Validate request and response contract for `POST /api/jwt/auth/login`:

- request body shape: `{ "login": "...", "password": "..." }`
- response body shape: `{ "token": "..." }`
- success via username login
- success via email login
- invalid credentials produce `401 UNAUTHORIZED`
- blank login/password behavior is consistent with controller and exception handler behavior
- malformed JSON returns `400 MALFORMED_BODY`

### 8.6 Session and JWT User APIs

For both session and JWT variants, validate:

- username update success path
- trimming of leading/trailing whitespace
- blank username rejected
- duplicate username rejected with `409 USERNAME_CONFLICT`
- password update success path
- incorrect current password rejected with `400 INVALID_ARGUMENT`
- mismatch between `newPassword` and `confirmNewPassword` rejected
- null or missing fields rejected
- success responses match DTO contract

Cross-mode comparison:

- business response body should be functionally identical between session and JWT endpoints
- auth failure envelope differs only by auth mechanism, not by DTO shape for business success

### 8.7 Time Settings APIs

For both session and JWT variants, validate:

- GET returns current settings for authenticated principal
- PATCH updates:
  - `pomodoroMinutes`
  - `shortBreakMinutes`
  - `longBreakMinutes`
  - `pomoCycles`
  - `soundsEnabled`
- boundaries:
  - pomodoro `1..120`
  - short break `1..30`
  - long break `1..80`
  - cycles `1..12`
- malformed JSON gives `400`
- wrong type payload gives validation/readability failure
- response DTO mirrors persisted values

Data integrity checks:

- user cannot read another user’s settings through current API surface
- update operation persists to the record linked by FK `user_id`

### 8.8 Service Layer

#### `UserServiceImpl`

Validate:

- `findById`, `findByEmail`, `findByUsername`, `findByEmailOrUsername`
- create/update/delete null protections
- update username conflict rules
- update username allows same current username for same user
- password change uses `PasswordEncoder.matches`
- password update stores encoded value, not raw text

#### `UserTimeSettingsServiceImpl`

Validate:

- `findByUser` with existing linked settings
- `findByUser` failures when user/settings missing
- `updateSettings` overwrites all mutable fields consistently
- `findSettings` response mirrors DB record

#### `LogErrorServiceImpl`

Validate:

- `logWarn` does not persist to DB
- `logError` persists only when status is 5xx
- failed error-log persistence does not break main request path

### 8.9 Exception Handling and Error Contract

Validate `RestExceptionHandler` mappings:

- `NullEntityReferenceException` -> `400 NULL_ENTITY`
- `IllegalArgumentException` -> `400 INVALID_ARGUMENT`
- `MethodArgumentNotValidException` -> `400 VALIDATION_ERROR`
- `HttpMessageNotReadableException` -> `400 MALFORMED_BODY`
- `EntityNotFoundException` -> `404 ENTITY_NOT_FOUND`
- `NoResourceFoundException` -> `404 ENDPOINT_NOT_FOUND`
- `UsernameAlreadyTakenException` -> `409 USERNAME_CONFLICT`
- `HttpRequestMethodNotSupportedException` -> `405 METHOD_NOT_ALLOWED`
- `AuthenticationException` -> `401 UNAUTHORIZED`
- unexpected exception -> `500 INTERNAL_ERROR`

Validate `ErrorDto` contract:

- `timestamp`
- `status`
- `error`
- `message`
- `path`
- `method`
- `errorCode`

### 8.10 Database Integrity

Validate schema assumptions:

- `users.username` is unique
- `users.email` is unique
- `user_time_settings.user_id` is unique
- `notes.user_id`, `todos.user_id`, `user_time_settings.user_id` use FK to `users.user_id`
- cascade delete removes dependent rows
- `todos.todo_priority` accepts only `LOW`, `MEDIUM`, `HIGH`

Important note:

- the current productivity UI is local-storage based and does not yet consume seeded `notes` or `todos` rows
- DB tests must therefore distinguish schema correctness from actual UI feature coverage

### 8.11 Timer State Engine

Technical unit scope is primarily `src/main/resources/static/js/timer-state.js`.

Validate:

- default settings normalization
- normalization of invalid settings values
- timer default state generation
- `startTimerState`
- `pauseTimerState`
- `resetTimerState`
- `setModeState`
- `applySettingsToTimerState`
- `hydrateTimerState`
- `getRemainingSeconds`
- `getCurrentPomodoroNumber`
- `getCurrentFocusCycleNumber`
- `getProjectedSessionEndTime`
- `isFocusSessionFinished`
- `areStatesEqual`

State-machine scenarios:

- fresh pomodoro start
- pause mid-session
- resume mid-session
- completion of pomodoro to short break
- completion of fourth pomodoro to long break
- completion of long break with remaining focus cycles
- completion of final long break when focus session is finished
- hydration after simulated elapsed wall-clock time
- idle break states being reset back to default pomodoro on load

Boundary scenarios:

- remaining seconds `0`
- invalid negative remaining seconds in stored JSON
- invalid mode in stored JSON
- corrupted JSON in local storage
- excessively large stored numeric values

### 8.12 Timer Browser Integration

Technical targets:

- `timer.js`
- `worker.js`
- `settings.js`
- `mini-timer.js`
- `mini-timer-sync.js`

Validate:

- timer starts and pauses correctly through UI
- button label toggles `Start` / `Pause`
- reset restores default display
- settings button is disabled while timer runs
- progress ring updates within valid range
- audio plays only when enabled
- worker tick drives updates when available
- fallback interval works when worker creation fails
- reload restores timer state from storage
- `settings:updated` and `timer:state-updated` events drive dependent widgets

Projection and counters:

- current pomodoro label
- total pomodoros per cycle
- current focus cycle count
- total focus cycle count
- projected session end time text
- focus session complete text at terminal state

### 8.13 Settings UI

Validate:

- settings form opens and closes correctly
- `Save & Close` persists only validated values
- `Cancel` reverts form to saved values
- field-level invalid styling is applied and removed correctly
- anonymous mode saves only to `localStorage`
- authenticated mode reads from and writes to `/api/user/time-settings`
- server sync failure falls back to local data and surfaces visible message
- storage event sync updates open settings form in second tab

### 8.14 User Profile UI

Validate:

- username form prevents blank submit client-side
- password form prevents submit with any empty field
- success and error messages render in correct message containers
- success updates visible username value
- successful password change resets form
- fetch failures show fallback server-error messages
- CSRF headers are sent for session-based updates

### 8.15 Productivity UI

Technical target:

- `src/main/resources/static/js/productivity.js`

Validate:

- default tab is `todo`
- tab switching updates active classes and ARIA state
- add task
- add note
- edit task
- edit note
- save edit by click
- save task edit by `Enter`
- save note edit by `Ctrl+Enter` or `Cmd+Enter`
- delete task
- delete note
- toggle task completion
- empty-state visibility toggles correctly
- empty input is rejected
- invalid input marks field with invalid state
- timestamps render for notes
- XSS payloads are escaped, not executed
- corrupted productivity storage resets to empty safe state
- cross-tab storage sync updates lists in another tab

### 8.16 Logging and Observability

Validate:

- 4xx scenarios generate warn logs, not DB log rows
- 5xx scenarios generate error logs and DB persistence attempts
- error log row contains correct HTTP status and compact description
- description format matches `status=<code>, method=<verb>, path=<uri>, exception=<type>`

## 9. Non-Functional Test Areas

### 9.1 Accessibility

Validate:

- keyboard navigation through header, forms, and tabs
- visible focus indication
- `aria-live` behavior for feedback messages
- accessible labels for form inputs
- mini-timer link accessibility on non-home pages

### 9.2 Performance and Stability

Validate:

- app boot time is reasonable on local environment
- page load is not blocked by local storage parsing
- timer drift remains acceptable during normal usage
- multi-tab sync does not create runaway event loops
- repeated settings changes do not corrupt saved timer state

### 9.3 Compatibility

Validate:

- Chrome full regression path
- Firefox sanity path
- Safari sanity path with explicit acknowledgment of background-audio limitation

## 10. Proposed Automation Mapping

### 10.1 Unit Layer

Best candidates:

- `timer-state.js`
- `UserServiceImpl`
- `UserTimeSettingsServiceImpl`
- `JwtService`

### 10.2 MVC/API Layer

Best candidates:

- page controllers with security-aware tests
- session REST controllers
- JWT REST controllers
- `RestExceptionHandler`
- `SecurityConfig` behavior

### 10.3 Integration Layer

Best candidates:

- DB initialization
- repositories
- password hashing and authentication
- session-auth protected API calls
- JWT login then JWT-protected API calls

### 10.4 Browser/E2E Layer

Best candidates:

- login flow
- timer workflow
- settings sync
- profile settings update
- productivity UI
- multi-tab synchronization

## 11. Execution Order

Recommended order for implementation and regression:

1. Boot and security smoke
2. Session REST contracts
3. JWT login and JWT contracts
4. Service-layer business rules
5. Timer-state unit coverage
6. Browser-level timer and settings flows
7. Productivity UI and multi-tab scenarios
8. Accessibility and compatibility sanity checks

## 12. Exit Criteria

This plan should be considered satisfied when:

- all P0 scenarios pass
- no unresolved blocker or critical defects remain in auth, API, timer, or settings
- session and JWT flows both have coverage for happy path and key failure modes
- timer state is resilient to reload, bad storage, and elapsed-time hydration
- REST error contract is stable and documented by tests
- the team can derive an implementation backlog directly from this file without guessing missing behavior

## 13. Explicit Assumptions

- this document targets the code currently present on `feature/setup-tests`
- the current UI uses session APIs and does not yet use JWT endpoints directly
- JWT endpoints exist primarily as an API surface and must still be tested independently
- the productivity page is client-side only in current behavior, despite existing DB tables for notes/todos
- PostgreSQL is the reference database for test planning

## 14. Suggested Backlog Breakdown

If this document is converted into implementation tasks, the cleanest split is:

- task set A: boot, security, and exception tests
- task set B: session API and service tests
- task set C: JWT auth and JWT API tests
- task set D: timer-state and client sync tests
- task set E: browser E2E for timer, settings, profile, and productivity

