# Productivity Page Test Plans

## Source Surface

- Template: [productivity.html](../../src/main/resources/templates/productivity.html)
- Script: [productivity.js](../../src/main/resources/static/js/productivity.js)
- Shared fragments:
  - [header.html](../../src/main/resources/templates/fragments/header.html)
  - [footer.html](../../src/main/resources/templates/fragments/footer.html)
  - [mini-timer-scripts.html](../../src/main/resources/templates/fragments/mini-timer-scripts.html)

## Linked JS / API Dependencies

- Session APIs:
  - `/api/productivity/todos`
  - `/api/productivity/notes`
- Keyboard behavior for editing:
  - `Enter` for todo save
  - `Ctrl+Enter` / `Cmd+Enter` for note save

## Covered Blocks

- page shell and tabs
- todo form and empty state
- todo item lifecycle
- todo deadline and priority validation
- notes form and empty state
- note item lifecycle
- API hydration and load-error handling
- keyboard and accessibility states
- tab behavior execution results

## Related Shared Docs

- [Header](../header/README.md)
- [Footer](../footer/README.md)
- [Mini timer scripts](../mini-timer-scripts/README.md)

## Automation Notes

- Primary automation layer: `Playwright`
- Secondary layer: future lightweight JS-unit coverage only if storage logic gets extracted
- Priority: `P0`
- Stable hooks already available:
  - `#todoInput`
  - `#todoDescriptionInput`
  - `#todoPriorityInput`
  - `#todoDeadlineInput`
  - `#noteInput`
  - `data-tab-trigger`
  - `data-tab-panel`
  - `data-entry-form`
  - `data-item-list`
  - `data-empty-state`
  - `data-form-message`
  - `data-action`
- First automation slices to implement:
  - tab switching
  - todo happy path
  - todo deadline negative path
  - notes happy path
  - productivity API error feedback

## Executable Suites

- [productivity-tabs.test.mjs](../unit-js/productivity-tabs.test.mjs): tabs, active state, panel visibility, no-route-change behavior
- [productivity-interactions.test.mjs](../unit-js/productivity-interactions.test.mjs): todo and note forms, deadline validation, edit/delete flows, keyboard save behavior, invalid states
- [productivity-api.test.mjs](../unit-js/productivity-api.test.mjs): initial API hydration and load-failure fallback
- [09-executable-coverage-results.md](09-executable-coverage-results.md): consolidated executed result for current productivity coverage

## Plans

- [01-page-shell-and-tabs.md](01-page-shell-and-tabs.md) — `Playwright smoke`
- [02-todo-form-and-empty-state.md](02-todo-form-and-empty-state.md) — `Playwright P0`
- [03-todo-item-lifecycle.md](03-todo-item-lifecycle.md) — `Playwright P0`
- [04-notes-form-and-empty-state.md](04-notes-form-and-empty-state.md) — `Playwright P0`
- [05-note-item-lifecycle.md](05-note-item-lifecycle.md) — `Playwright P0`
- [06-local-storage-and-cross-tab-sync.md](06-local-storage-and-cross-tab-sync.md) — `Playwright P1`
- [07-keyboard-and-a11y-states.md](07-keyboard-and-a11y-states.md) — `Playwright P1`
- [08-tab-behavior-execution-results.md](08-tab-behavior-execution-results.md) — executed JS frontend suite
- [09-executable-coverage-results.md](09-executable-coverage-results.md) — consolidated executable productivity coverage
