# About Page Shell And Static Copy

## Purpose

Validate the base render contract of the About page as a simple public content page.

## Source Surface

- Template: [about.html](../../src/main/resources/templates/about.html)
- Route: `GET /about`

## User Story / Functional Slice

As a visitor, I can open the About page and understand what Telos is, how to use the product, why it helps, and who built it.

## Dependencies

- public page controller for `/about`
- no page-specific JavaScript

## Happy Path Scenarios

- route returns `200`
- document title is `About - Telos`
- main content renders heading `Telos turns Pomodoro into a complete focus system.`
- product overview renders with core timer, progress, productivity, and synchronization descriptions
- product copy explains the Pomodoro technique and why the structured rhythm helps
- usage section explains timer settings, start/pause/reset/skip, cycle tracking, productivity, and persistence
- benefits section explains focus structure, reduced context switching, sustainable breaks, flexible patterns, automatic transitions, and saved settings
- About us section renders the named team members, roles, and role descriptions
- content is readable without authentication

## Negative / Edge Scenarios

- page must not depend on missing model attributes
- page should remain meaningful if shared scripts fail to load
- product and team copy should still render even if styling fails

## Accessibility / UI States

- semantic reading order starts with product identity, then product guidance, benefits, and team roster
- page has a single main content region
- content is readable without interactive controls

## Data / Auth / Storage Notes

- no page-owned storage
- no page-owned API calls
- no authenticated state required
