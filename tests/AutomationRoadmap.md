# Test Automation Roadmap

This document translates the written scenario coverage under `tests/` into an implementation order for future automation.

## Goals

- convert the most critical documented scenarios into stable automated checks
- separate backend contract coverage from browser behavior coverage
- avoid writing brittle UI tests where lower-level tests can cover the same rule cheaper
- keep the current split page docs usable as direct input for automation backlog items

## Recommended Automation Stack

### 1. WebMvc / Spring Security / API Contract Layer

Use for:

- page controller smoke and auth guards
- session API contracts under `/api/user/**`
- JWT API contracts under `/api/jwt/**`
- CSRF behavior
- redirect behavior
- error response shape

Best fit for:

- `login`
- `user`
- `error-*`
- auth and transport-focused parts of `index`

### 2. Spring Boot Integration Layer

Use for:

- context startup
- authentication manager wiring
- persistence behavior around user and time settings
- exception handler and security filter integration
- DB-backed flows that are too coupled for pure `@WebMvcTest`

Recommended future upgrade:

- introduce Testcontainers for PostgreSQL when DB-backed automation becomes a priority

### 3. Playwright Browser Layer

Use for:

- timer UI
- settings panel interaction
- login browser flow
- user profile form behavior
- productivity page behavior
- cross-tab storage sync
- shared UI rendering across pages

Best fit for:

- `index`
- `productivity`
- `user`
- `header`
- `mini-timer-scripts`

### 4. Optional JS Unit Layer

Use only if the team wants faster and narrower feedback on pure frontend logic.

Best fit for:

- `timer-state.js`
- future extracted storage helpers from `productivity.js`

Recommendation:

- do not start here first
- add this layer only after WebMvc and Playwright coverage exist for the critical paths

## Phase Plan

### Phase 0: Automation Readiness

- add JaCoCo to Maven so backend coverage can be measured
- define naming/tagging convention for automated tests:
  - smoke
  - regression
  - auth
  - api
  - ui
- decide whether browser automation will live in Playwright or another runner and commit the config to the repo
- document DB reset strategy for mutable tests
- keep using the split docs as the source of truth for test cases

### Phase 1: P0 Backend Safety Net

Automate first:

- login success and invalid credentials
- protected `/user` route behavior
- session time-settings GET/PATCH contract
- session username/password PATCH contract
- JWT login contract
- JWT username/password/time-settings contract

Source docs to start from:

- `tests/login`
- `tests/user`
- `tests/index/08-authenticated-settings-sync.md`

### Phase 2: P0 Browser Journeys

Automate first:

- home page timer shell renders correctly
- start / pause / reset timer controls
- settings validation and save/cancel behavior
- authenticated settings sync visible in UI
- productivity todo and notes happy paths
- user page profile happy paths

Source docs to start from:

- `tests/index`
- `tests/productivity`
- `tests/user`

### Phase 3: Shared UI And Error Surfaces

Automate next:

- header anonymous/authenticated states
- footer presence across page types
- mini-timer runtime behavior on non-home pages
- 403 and 404 page recovery flows

Source docs to start from:

- `tests/header`
- `tests/footer`
- `tests/mini-timer-scripts`
- `tests/error-403`
- `tests/error-404`

### Phase 4: Secondary Static Coverage

Automate last:

- about page smoke
- helpus page smoke
- outbound link assertions
- generic error template rendering

Source docs to start from:

- `tests/about`
- `tests/helpus`
- `tests/error-generic`

## Selector And Hook Strategy

Prefer existing stable hooks before adding new ones.

Already stable enough for browser automation:

- `#startBtn`
- `#resetBtn`
- `#settingsToggle`
- `#pomodoroTime`
- `#shortBreakTime`
- `#longBreakTime`
- `#focusCycles`
- `#soundEnabled`
- `#timeDisplay`
- `#sessionProjectionText`
- `#todoInput`
- `#noteInput`
- `#username`
- `#oldPassword`
- `#newPassword`
- `#confirmNewPassword`
- `#miniTimer`

Use existing data attributes where present:

- `data-tab-trigger`
- `data-tab-panel`
- `data-entry-form`
- `data-item-list`
- `data-empty-state`
- `data-form-message`
- `data-action`

Only add `data-testid` later if:

- a selector is currently style-driven and brittle
- a block has no stable id/data hook
- shared UI is too expensive to target semantically

## Test Data And Reset Strategy

- use seeded users for read-only auth coverage
- create one dedicated mutable test user for username/password update flows
- clear `localStorage` before browser specs that hit timer/productivity pages
- treat `pomodoroSettings`, `pomodoroTimerState`, and `telos.productivity.v1` as part of test setup and teardown
- keep browser tests isolated from each other so cross-tab tests are explicit, not accidental

## CI Recommendation

- PR lane:
  - backend smoke
  - critical WebMvc/API contracts
  - a tiny browser smoke set
- nightly or pre-release lane:
  - full browser regression
  - cross-tab and storage sync flows
  - extended auth and error-page coverage

## Definition Of “Automation-Ready”

A page or fragment folder is automation-ready when:

- the README specifies the primary automation layer
- scenario files are granular enough to map to one future suite or spec file
- selectors/hooks are known
- auth/storage/API prerequisites are explicitly written
- no hidden product decisions are left inside the scenario text
