# Productivity Page Test Plans

## Source Surface

- Template: [productivity.html](../../src/main/resources/templates/productivity.html)
- Script: [productivity.js](../../src/main/resources/static/js/productivity.js)
- Shared fragments:
  - [header.html](../../src/main/resources/templates/fragments/header.html)
  - [footer.html](../../src/main/resources/templates/fragments/footer.html)
  - [mini-timer-scripts.html](../../src/main/resources/templates/fragments/mini-timer-scripts.html)

## Linked JS / API Dependencies

- Local storage key: `telos.productivity.v1`
- No page-owned backend API
- Keyboard behavior for editing:
  - `Enter` for todo save
  - `Ctrl+Enter` / `Cmd+Enter` for note save

## Covered Blocks

- page shell and tabs
- todo form and empty state
- todo item lifecycle
- notes form and empty state
- note item lifecycle
- local storage and cross-tab sync
- keyboard and accessibility states

## Related Shared Docs

- [Header](../header/README.md)
- [Footer](../footer/README.md)
- [Mini timer scripts](../mini-timer-scripts/README.md)

## Plans

- [01-page-shell-and-tabs.md](01-page-shell-and-tabs.md)
- [02-todo-form-and-empty-state.md](02-todo-form-and-empty-state.md)
- [03-todo-item-lifecycle.md](03-todo-item-lifecycle.md)
- [04-notes-form-and-empty-state.md](04-notes-form-and-empty-state.md)
- [05-note-item-lifecycle.md](05-note-item-lifecycle.md)
- [06-local-storage-and-cross-tab-sync.md](06-local-storage-and-cross-tab-sync.md)
- [07-keyboard-and-a11y-states.md](07-keyboard-and-a11y-states.md)
