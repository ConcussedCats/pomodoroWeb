# Manual Regression Checklists

## Purpose

This folder contains reusable manual checklists for demo, staging, and pre-release regression passes.

## How To Use

- Pick the checklist that matches the scope of the run.
- Record the execution date, environment URL, tester name, and result next to each item.
- Mark each item as:
  - `PASS`
  - `FAIL`
  - `BLOCKED`
  - `N/A`
- If an item fails, add the observed behavior, browser, and reproduction notes.

## Available Checklists

- [01-core-flows-regression-checklist.md](01-core-flows-regression-checklist.md)

## Notes

- These checklists are intended for repeated use before demos and releases.
- Keep them lightweight and execution-oriented; deeper edge-case coverage lives in the page and E2E plans under `tests/`.
