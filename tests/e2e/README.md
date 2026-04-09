# E2E Test Plans

## Purpose

This folder captures browser-level user journeys that should later become executable end-to-end tests.

## Source Surface

- Public pages:
  - `/`
  - `/login`
  - `/about`
  - `/helpus`
  - `/productivity`
- Protected page:
  - `/user`
- Session APIs used by the UI:
  - `/login`
  - `/api/user/username`
  - `/api/user/password`
  - `/api/user/time-settings`

## Automation Notes

- Primary automation layer: Playwright
- Priority:
  - `P0` for auth, timer core, settings, user profile, productivity happy paths
  - `P1` for cross-tab sync and shared UI edge cases
  - `P2` for static/error-page smoke
- Test setup must reset:
  - `pomodoroSettings`
  - `pomodoroTimerState`
  - `telos.productivity.v1`
- Use one dedicated mutable test account for username/password mutation flows
- Remote smoke target:
  - `https://teclos.space`
- Executable remote auth smoke:
  - [login-remote.spec.js](login-remote.spec.js)
  - safe-by-default coverage uses anonymous and invalid-credentials flows
  - successful login is optional and enabled with:
    - `E2E_LOGIN_USERNAME`
    - `E2E_LOGIN_PASSWORD`

## Plans

- [01-auth-and-route-guards.md](01-auth-and-route-guards.md)
- [02-home-timer-core-flow.md](02-home-timer-core-flow.md)
- [03-home-settings-anonymous.md](03-home-settings-anonymous.md)
- [04-home-settings-authenticated.md](04-home-settings-authenticated.md)
- [05-user-profile-management.md](05-user-profile-management.md)
- [06-productivity-todo-flow.md](06-productivity-todo-flow.md)
- [07-productivity-notes-and-keyboard-flow.md](07-productivity-notes-and-keyboard-flow.md)
- [08-cross-tab-sync-and-mini-timer.md](08-cross-tab-sync-and-mini-timer.md)
- [09-static-and-error-pages-smoke.md](09-static-and-error-pages-smoke.md)
- [10-dev-deployment-smoke.md](10-dev-deployment-smoke.md)

## Executable Suites

- [login-remote.spec.js](login-remote.spec.js): live login smoke against `teclos.space`
- [dev-deployment-smoke.spec.js](dev-deployment-smoke.spec.js): remote dev-deployment smoke for `/`, `/productivity`, `/login`
- [home-timer.spec.js](home-timer.spec.js): remote browser flow for timer start/pause/resume/reset and reload recovery on `/`
- [negative-browser-flows.spec.js](negative-browser-flows.spec.js): browser-visible negative validation for home settings, login identifier blocking, and productivity forbidden-input handling

## Negative-Test Notes

- Browser negative tests use inline tags like `@ui-negative`.
- The current negative browser spec intentionally skips on [teclos.space](https://teclos.space) when the deployed assets are known to lag behind the current branch.
- See [NegativeTestLanes.md](../NegativeTestLanes.md) for lane separation and commands.
