# Productivity Executable Coverage Results

## Purpose

Summarize the current executable test coverage for the productivity page and tie it back to the split README plan.

## Source Surface

- Template: [productivity.html](../../src/main/resources/templates/productivity.html)
- Script: [productivity.js](../../src/main/resources/static/js/productivity.js)
- Executable suites:
  - [productivity-tabs.test.mjs](../unit-js/productivity-tabs.test.mjs)
  - [productivity-interactions.test.mjs](../unit-js/productivity-interactions.test.mjs)
  - [productivity-api.test.mjs](../unit-js/productivity-api.test.mjs)

## User Story / Functional Slice

As an authenticated user, I can use the productivity page tabs, manage todos and notes through the productivity API, validate deadline input, and keep a stable single-page workflow without route changes.

## Dependencies

- `/api/productivity/todos`
- `/api/productivity/notes`
- `data-tab-trigger`
- `data-tab-panel`
- `data-entry-form`
- `data-item-list`
- `data-empty-state`
- `data-form-message`
- list action hooks through `data-action`

## Happy Path Scenarios

- tabs render and switch between `To-do` and `Notes`
- todo form creates tasks and hides the empty state
- todo form accepts valid `priority` and future `deadline` values
- todo items support complete, edit, keyboard save, cancel, and delete
- notes form creates notes and hides the empty state
- notes support edit, modifier-key save, and delete
- initial API data hydrates the page correctly
- API-backed load flow keeps empty states and list rendering in sync

## Negative / Edge Scenarios

- blank todo and note submissions show invalid state and inline errors
- past deadlines are rejected before submit
- `67` / `six seven` input is rejected for todos and notes
- API load failures fall back to a safe empty state with user-visible error feedback
- note content is escaped instead of executing HTML/script payloads
- plain `Enter` on note editing does not save without modifier keys
- current implementation has no `Reminders` tab, so that behavior remains out of scope until implemented

## Accessibility / UI States

- active tabs keep `aria-selected` and `aria-hidden` synchronized
- tab switching does not change the route
- focused editors are preserved during edit mode
- invalid fields expose `aria-invalid`

## Data / Auth / Storage Notes

- productivity page is API-backed in the current implementation
- anonymous users see the guest/login-required variant
- executable JS suite uses a fake DOM plus mocked `fetch` layer instead of browser storage

## Execution Result

- Executed locally with:
  - `node --test tests/unit-js/productivity-tabs.test.mjs tests/unit-js/productivity-interactions.test.mjs tests/unit-js/productivity-api.test.mjs`
- Result:
  - `15/15` tests passed
- Covered README blocks:
  - page shell and tabs
  - todo form and empty state
  - todo item lifecycle
  - todo deadline and priority validation
  - notes form and empty state
  - note item lifecycle
  - API hydration and load-error handling
  - keyboard and accessibility states
