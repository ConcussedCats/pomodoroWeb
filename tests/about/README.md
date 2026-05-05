# About Page Test Plans

## Source Surface

- Template: [about.html](../../src/main/resources/templates/about.html)
- Shared fragments:
  - [header.html](../../src/main/resources/templates/fragments/header.html)
  - [footer.html](../../src/main/resources/templates/fragments/footer.html)
  - [mini-timer-scripts.html](../../src/main/resources/templates/fragments/mini-timer-scripts.html)

## Linked JS / API Dependencies

- No page-owned JavaScript
- Shared mini-timer scripts are included through the fragment
- No page-owned API calls

## Covered Blocks

- comprehensive product overview
- step-by-step usage guidance
- product benefits
- About us team roster
- shared UI presence on a simple public page

## Automation Notes

- Primary automation layer: `WebMvc smoke`
- Secondary layer: `JS template-content smoke`
- Tertiary layer: `Playwright smoke` if this page is used in a full public-pages suite
- Priority: `P2`
- Selectors can stay semantic unless the page gains interactive UI later

## Plans

- [01-page-shell-and-static-copy.md](01-page-shell-and-static-copy.md) — `WebMvc smoke`
- [02-shared-ui-presence.md](02-shared-ui-presence.md) — `Playwright smoke`
