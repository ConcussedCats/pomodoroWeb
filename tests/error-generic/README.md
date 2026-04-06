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

## Plans

- [01-model-rendering-code-and-message.md](01-model-rendering-code-and-message.md)
- [02-minimal-template-behavior.md](02-minimal-template-behavior.md)
