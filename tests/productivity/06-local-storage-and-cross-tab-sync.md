# Local Storage And Cross Tab Sync

## Purpose

Validate persistence, normalization, and cross-tab synchronization for the productivity page.

## Source Surface

- Script: [productivity.js](../../src/main/resources/static/js/productivity.js)

## User Story / Functional Slice

As a user, I can keep tasks and notes persisted in the browser and see updates reflected in another open tab.

## Dependencies

- local storage key `telos.productivity.v1`
- `window.addEventListener("storage", ...)`
- storage adapter load/save/normalize behavior

## Happy Path Scenarios

- tasks and notes survive page reload
- valid storage is normalized and rendered correctly
- updates in one tab trigger list refresh in another tab
- empty state is rebuilt correctly from stored data

## Negative / Edge Scenarios

- corrupted JSON falls back to empty safe state
- missing arrays or malformed items are filtered out during normalization
- cross-tab sync must not duplicate items or create stale editing state

## Accessibility / UI States

- storage-driven rerender should preserve understandable empty/non-empty states
- content should remain readable after sync updates

## Data / Auth / Storage Notes

- page is fully local-storage based in the current implementation
- backend tables for notes/todos exist but are not part of this page’s current runtime
