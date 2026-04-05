# Header Primary Navigation

## Purpose

Validate the main page navigation and active-page highlighting rules.

## Source Surface

- Fragment: [header.html](../../src/main/resources/templates/fragments/header.html)
- Pages consuming the fragment:
  - `index`
  - `productivity`
  - `about`
  - `helpus`
  - `login`
  - `user`
  - error pages with blank active key

## User Story / Functional Slice

As a user, I can navigate to the main public sections of the application and see which primary section is active.

## Dependencies

- fragment parameter `activePage`
- routes `/`, `/productivity`, `/about`, `/helpus`

## Happy Path Scenarios

- Timer, Productivity, About, and Help Us links render in the nav
- matching page gets `nav-btn--active`
- Help Us keeps its accent variant while also being able to show active state
- blank active page on error templates results in no primary item being active

## Negative / Edge Scenarios

- wrong active nav item is a page-state regression
- multiple active nav items at once is a regression
- missing route link target is a shared navigation defect

## Accessibility / UI States

- all primary nav links are keyboard reachable
- active state remains distinguishable beyond color where possible
- nav order stays stable across pages

## Data / Auth / Storage Notes

- nav links do not require storage
- primary nav visibility is not conditional on auth state
