# Test Plan 01 Index

This file is the entrypoint for the split test-plan structure under `tests/`.

The original monolithic page plan has been decomposed into page-level and shared-UI folders so each functional slice can later map cleanly to manual checks, automated specs, or implementation tasks.

For the implementation order and automation strategy, see [AutomationRoadmap.md](AutomationRoadmap.md).

## How To Use This Structure

- Start with the page or fragment you want to test.
- Open that folder's `README.md` for source paths, dependencies, and block map.
- Use the numbered Markdown files inside the folder for smaller scenario groups.
- Treat shared docs in `header`, `footer`, and `mini-timer-scripts` as canonical for cross-page behavior.

## Cross-Cutting Technical Areas

- Session auth: `/login`, `/logout`, `/user`, `/api/user/**`
- JWT auth: `/api/jwt/auth/login`, `/api/jwt/user/**`, `/api/jwt/user/time-settings`
- Client storage:
  - `pomodoroSettings`
  - `pomodoroTimerState`
  - `telos.productivity.v1`
- Shared browser mechanics:
  - CSRF meta tags
  - `storage` events
  - `Web Worker`
  - mini-timer custom events

## Split Plan Map

### Routable Pages

- [Index page](index/README.md)
  - [01-page-shell-and-meta](index/01-page-shell-and-meta.md)
  - [02-timer-modes](index/02-timer-modes.md)
  - [03-timer-display-and-progress](index/03-timer-display-and-progress.md)
  - [04-timer-controls-start-pause-reset](index/04-timer-controls-start-pause-reset.md)
  - [05-session-counters-and-projection](index/05-session-counters-and-projection.md)
  - [06-settings-panel-fields](index/06-settings-panel-fields.md)
  - [07-settings-save-cancel-validation](index/07-settings-save-cancel-validation.md)
  - [08-authenticated-settings-sync](index/08-authenticated-settings-sync.md)
- [Login page](login/README.md)
  - [01-page-shell-and-layout](login/01-page-shell-and-layout.md)
  - [02-login-form-fields-and-csrf](login/02-login-form-fields-and-csrf.md)
  - [03-login-success-and-redirect](login/03-login-success-and-redirect.md)
  - [04-login-error-and-invalid-credentials](login/04-login-error-and-invalid-credentials.md)
- [About page](about/README.md)
  - [01-page-shell-and-static-copy](about/01-page-shell-and-static-copy.md)
  - [02-shared-ui-presence](about/02-shared-ui-presence.md)
- [Help Us page](helpus/README.md)
  - [01-page-shell-and-static-copy](helpus/01-page-shell-and-static-copy.md)
  - [02-support-options-links](helpus/02-support-options-links.md)
  - [03-donation-block-and-image](helpus/03-donation-block-and-image.md)
  - [04-external-link-behavior](helpus/04-external-link-behavior.md)
- [Productivity page](productivity/README.md)
  - [01-page-shell-and-tabs](productivity/01-page-shell-and-tabs.md)
  - [02-todo-form-and-empty-state](productivity/02-todo-form-and-empty-state.md)
  - [03-todo-item-lifecycle](productivity/03-todo-item-lifecycle.md)
  - [04-notes-form-and-empty-state](productivity/04-notes-form-and-empty-state.md)
  - [05-note-item-lifecycle](productivity/05-note-item-lifecycle.md)
  - [06-local-storage-and-cross-tab-sync](productivity/06-local-storage-and-cross-tab-sync.md)
  - [07-keyboard-and-a11y-states](productivity/07-keyboard-and-a11y-states.md)
- [User page](user/README.md)
  - [01-page-shell-and-auth-guard](user/01-page-shell-and-auth-guard.md)
  - [02-username-form](user/02-username-form.md)
  - [03-password-form](user/03-password-form.md)
  - [04-session-api-feedback-and-csrf](user/04-session-api-feedback-and-csrf.md)
  - [05-jwt-api-parity-notes](user/05-jwt-api-parity-notes.md)

### Error Pages

- [403 page](error-403/README.md)
  - [01-access-denied-content](error-403/01-access-denied-content.md)
  - [02-recovery-navigation](error-403/02-recovery-navigation.md)
  - [03-shared-header-footer-behavior](error-403/03-shared-header-footer-behavior.md)
- [404 page](error-404/README.md)
  - [01-not-found-content](error-404/01-not-found-content.md)
  - [02-recovery-navigation](error-404/02-recovery-navigation.md)
  - [03-mini-timer-script-inclusion](error-404/03-mini-timer-script-inclusion.md)
- [Generic error page](error-generic/README.md)
  - [01-model-rendering-code-and-message](error-generic/01-model-rendering-code-and-message.md)
  - [02-minimal-template-behavior](error-generic/02-minimal-template-behavior.md)

### Shared UI

- [Header fragment](header/README.md)
  - [01-branding-and-home-link](header/01-branding-and-home-link.md)
  - [02-primary-navigation](header/02-primary-navigation.md)
  - [03-anonymous-auth-controls](header/03-anonymous-auth-controls.md)
  - [04-authenticated-account-menu](header/04-authenticated-account-menu.md)
  - [05-mini-timer-slot-rules](header/05-mini-timer-slot-rules.md)
- [Footer fragment](footer/README.md)
  - [01-footer-copy-and-link](footer/01-footer-copy-and-link.md)
  - [02-global-visibility-across-pages](footer/02-global-visibility-across-pages.md)
- [Mini timer scripts fragment](mini-timer-scripts/README.md)
  - [01-script-injection-order](mini-timer-scripts/01-script-injection-order.md)
  - [02-mini-timer-runtime-contract](mini-timer-scripts/02-mini-timer-runtime-contract.md)
  - [03-settings-sync-side-effects](mini-timer-scripts/03-settings-sync-side-effects.md)

## Folder Conventions

- Every folder contains a `README.md` with the source surface and file index.
- Numbered files like `01-...md`, `02-...md` define smaller scenarios by block, user story, or functionality.
- Dynamic pages separate rendering from stateful behavior so future automation can map one file to one test suite concern.
- Page folders may reference shared behavior, but shared docs remain the canonical source for repeated UI rules.

## Automation Conventions

- Prefer `WebMvc` for route/auth/contract checks.
- Prefer browser automation for JS-driven UI behavior and cross-tab state.
- Use the folder README as the place to declare automation priority, stable selectors, and first implementation slices.
- Treat the split docs as backlog-ready inputs, not just narrative notes.

## Implementation Notes

- This structure documents current behavior only.
- No executable tests are added by these files.
- Template coverage is based on `src/main/resources/templates`, including `error/*.html` and `fragments/*.html`.
