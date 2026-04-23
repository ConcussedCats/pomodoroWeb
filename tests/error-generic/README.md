# Generic Error Page Test Plans

## Source Surface

- Template: [error.html](../../src/main/resources/templates/error/error.html)

## Linked JS / API Dependencies

- Requires model attributes:
  - `code`
  - `message`
- No header, footer, or scripts

## Covered Blocks

- model rendering for code and message
- intentionally minimal template behavior

## Automation Notes

- Primary automation layer: `integration`
- Priority: `P2`
- This page is better covered through server-side rendering assertions than browser-heavy tests because it is intentionally minimal

## Plans

- [01-model-rendering-code-and-message.md](01-model-rendering-code-and-message.md) — `integration`
- [02-minimal-template-behavior.md](02-minimal-template-behavior.md) — `integration`
