# Help Us Page Test Plans

## Source Surface

- Template: [helpus.html](../../src/main/resources/templates/helpus.html)
- Shared fragments:
  - [header.html](../../src/main/resources/templates/fragments/header.html)
  - [footer.html](../../src/main/resources/templates/fragments/footer.html)
  - [mini-timer-scripts.html](../../src/main/resources/templates/fragments/mini-timer-scripts.html)

## Linked JS / API Dependencies

- No page-owned JavaScript
- No page-owned internal API calls
- External links to GitHub, Monobank, and GitHub Sponsors

## Covered Blocks

- page shell and copy
- support options list
- donation block and QR image
- external link behavior

## Automation Notes

- Primary automation layer: `Playwright`
- Secondary layer: `WebMvc smoke` for page render only
- Priority: `P2`
- Good candidates for browser assertions:
  - external links
  - QR image presence
  - support copy visibility

## Plans

- [01-page-shell-and-static-copy.md](01-page-shell-and-static-copy.md) — `WebMvc smoke`
- [02-support-options-links.md](02-support-options-links.md) — `Playwright`
- [03-donation-block-and-image.md](03-donation-block-and-image.md) — `Playwright`
- [04-external-link-behavior.md](04-external-link-behavior.md) — `Playwright`
