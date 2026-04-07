# Footer Fragment Test Plans

## Source Surface

- Fragment: [footer.html](../../src/main/resources/templates/fragments/footer.html)

## Linked JS / API Dependencies

- No fragment-owned JavaScript
- External GitHub issues link

## Covered Blocks

- footer copy and link
- footer visibility across page types

## Automation Notes

- Primary automation layer: `Playwright smoke`
- Priority: `P2`
- Stable hooks currently rely on semantic/footer selectors; add `data-testid` only if selectors become brittle
- First automation slices to implement:
  - footer presence on standard pages
  - footer absence on generic error page

## Plans

- [01-footer-copy-and-link.md](01-footer-copy-and-link.md) — `Playwright smoke`
- [02-global-visibility-across-pages.md](02-global-visibility-across-pages.md) — `Playwright`
