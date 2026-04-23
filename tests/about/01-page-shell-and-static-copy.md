# About Page Shell And Static Copy

## Purpose

Validate the base render contract of the About page as a simple public content page.

## Source Surface

- Template: [about.html](../../src/main/resources/templates/about.html)
- Route: `GET /about`

## User Story / Functional Slice

As a visitor, I can open the About page and see the page identity plus the current placeholder product story.

## Dependencies

- public page controller for `/about`
- no page-specific JavaScript

## Happy Path Scenarios

- route returns `200`
- document title is `About - Telos`
- main content renders heading `About Telos`
- both explanatory paragraphs render in order inside the main container
- content is readable without authentication

## Negative / Edge Scenarios

- page must not depend on missing model attributes
- page should remain meaningful if shared scripts fail to load
- placeholder copy should still render even if styling fails

## Accessibility / UI States

- semantic reading order is title, heading, paragraph, paragraph
- page has a single main content region
- content is readable without interactive controls

## Data / Auth / Storage Notes

- no page-owned storage
- no page-owned API calls
- no authenticated state required
