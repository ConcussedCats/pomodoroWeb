# Help Us Donation Block And Image

## Purpose

Validate the donation-specific content block, including the QR image and surrounding text.

## Source Surface

- Template: [helpus.html](../../src/main/resources/templates/helpus.html)
- Asset: `@{/assets/pictures/monobank.jpeg}`

## User Story / Functional Slice

As a visitor, I can identify the donation method, see the QR code asset, and use the fallback link if I do not scan the image.

## Dependencies

- static image asset for Monobank
- donation copy block
- Monobank anchor link

## Happy Path Scenarios

- QR container renders in the donation section
- image loads from the expected static asset path
- image alt text identifies it as a QR code for Monobank donation
- donation text explains scan-or-link usage

## Negative / Edge Scenarios

- broken image path should be treated as a page defect
- missing alt text should be treated as an accessibility defect
- donation block must still be usable if the image fails and only the link remains

## Accessibility / UI States

- image has meaningful alternative text
- surrounding paragraph gives non-visual users a fallback path
- donation section remains understandable in reading order

## Data / Auth / Storage Notes

- static asset only
- no auth requirement
- no page-owned storage behavior
