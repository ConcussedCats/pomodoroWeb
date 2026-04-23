# Productivity Page Shell And Tabs

## Purpose

Validate the page shell and the tab system that separates To-do and Notes workflows.

## Source Surface

- Template: [productivity.html](../../src/main/resources/templates/productivity.html)
- Script: [productivity.js](../../src/main/resources/static/js/productivity.js)

## User Story / Functional Slice

As a user, I can open the Productivity page, understand its purpose, and switch between task and note workflows.

## Dependencies

- tab buttons:
  - `productivity-tab-todo`
  - `productivity-tab-notes`
- tab panels:
  - `productivity-panel-todo`
  - `productivity-panel-notes`

## Happy Path Scenarios

- route `/productivity` returns the page shell
- page intro copy renders before the tools surface
- todo tab is active by default
- notes tab is inactive by default
- clicking each tab updates active styles and visible panel
- current implementation exposes two tabs only: `To-do` and `Notes`

## Negative / Edge Scenarios

- both panels must not be simultaneously active by default
- both tabs must not show `aria-selected="true"` at the same time
- missing tab-to-panel mapping is a regression
- a `Reminders` tab is not present in the current template and should be treated as out of scope until implemented

## Accessibility / UI States

- tablist has an accessible label
- tabs use `role="tab"`
- panels use `role="tabpanel"`
- `aria-selected`, `aria-controls`, and `aria-hidden` remain synchronized

## Data / Auth / Storage Notes

- no backend API dependency
- page is public
- shared mini-timer may still reflect timer state through shared scripts
