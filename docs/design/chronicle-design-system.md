# Chronicle Mac v3

Chronicle is myOS's editorial paper-and-ink interface. The implementation source of truth is `dashboard/shared/design-system/tokens.ts`, its generated CSS, and the design-token audit.

## Type law

- Instrument Serif speaks about the user's work: page titles, document headings, project names, and reading surfaces.
- Geist Sans handles controls, navigation, and dense operational text.
- Geist Mono speaks about time and system state: dates, counts, labels, statuses, and keyboard hints.

Fonts are bundled so the packaged app retains its identity offline.

## Color and material

- Use opaque paper surfaces and ink text in both themes.
- The stamp is one restrained, user-chosen accent ink (default Pantone 18-3838 Ultra Violet), not a general background color. Accents come from the curated Pantone set in `dashboard/shared/design-system/accents.ts`, the Omarchy theme, or a custom pick, and are contrast-fitted to at least 4.5:1 on paper in each theme.
- Use semantic tokens; never add raw component colors that bypass the audit.
- No decorative gradients, glow, glass, or cold generic shadows.
- Use only the lifted-paper and floating-control shadow recipes.

## Hierarchy

- Build structure with spacing, typography, and faint/standard/strong hairlines.
- Rows are rhythmic and primarily boxless.
- Use one stamped affordance per surface.
- Controls use the shared chip, control, and overlay radii.
- Prefer a single strong composition over nested cards.

## Motion

- Motion should explain state: completion, selection, insertion, or a surface entering.
- Use the shared duration and easing tokens.
- Honor `prefers-reduced-motion` and keep reduced states fully understandable.

## Accessibility

- Primary and small essential text meet WCAG AA contrast on their paper surface.
- Tertiary text is reserved for nonessential metadata.
- Focus indicators, labels, keyboard navigation, and minimum hit targets are required.
- Light and dark themes must be reviewed independently.

## Verification

```bash
cd dashboard
npm run design-system:check
npm run audit:design-tokens
npm run lint
```

For visible changes, inspect the packaged application at normal and narrow window sizes in both themes.
