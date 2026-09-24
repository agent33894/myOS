# myOS design system

myOS should feel warm, calm, and quietly delightful: a consumer notes-and-tasks app you enjoy opening, not a developer console or a newspaper. Clarity comes first, softness second, and delight shows up in small moments like completing a task, creating something, or reaching an empty inbox.

The source of truth is `dashboard/src/styles/tokens.css` (CSS custom properties, light and dark) and `dashboard/tailwind.config.mjs`, which maps Tailwind's theme onto those properties. Components use Tailwind utilities bound to tokens. They never use raw colors, arbitrary pixel values, or `[var(--x)]` escapes.

## Principles

1. **Content is the hero.** The interface recedes. Use sentence case, plain words, and one primary action per surface.
2. **Use depth instead of lines.** Separate surfaces with tone and soft shadow: canvas, raised, floating. Hairlines are a last resort and are always 1px.
3. **Use one voice.** One interface typeface, used at a readable size. There are no uppercase monospace labels.
4. **Be generous.** Build on a 4pt grid with comfortable hit targets (at least 32px for controls and 36px for list rows) and room to breathe.
5. **Motion explains state.** Motion is short and springy for delight, and never ambient or looping.
6. **Both themes are first-class.** Every token has a light and a dark value that are reviewed together.

## Typography

| Role | Family | Notes |
| --- | --- | --- |
| Interface and content | **Inter Variable** (bundled, `@fontsource-variable/inter`) | Features `cv11`, `ss01`, `ss03`; tracking tightens at display sizes |
| Reading (optional) | **Literata** (bundled) | Only for the document body when Appearance → Reading font is set to *Serif* |
| Code | **Geist Mono** (bundled) | Code blocks, inline code, and keyboard hints only |

The scale uses tokens `--text-*` mapped to Tailwind `text-*`:

| Token | Size / line height | Use |
| --- | --- | --- |
| `xs` | 12 / 16 | Metadata, counts, captions |
| `sm` | 13 / 18 | Secondary interface text, list metadata |
| `base` | 14 / 20 | **Interface default**: rows, buttons, inputs |
| `md` | 16 / 24 | Document body, dialog body |
| `lg` | 20 / 28 | Section titles |
| `xl` | 24 / 32 | Page titles |
| `2xl` | 32 / 40 | Document title, hero moments |

Use weights 400, 500 (interface emphasis and labels), and 600 (titles). Section labels use `text-sm font-medium text-text-secondary`, never uppercase.

## Color

Neutrals are warm but clean, not cream paper. The accent comes from one variable, `--accent`, with every other accent value derived from it through `color-mix(in oklch, …)`. Users can pick an accent in Appearance. The default is **Iris** (`#5B5BD6`).

| Token | Purpose |
| --- | --- |
| `--canvas` | Main content background |
| `--sidebar` | Navigation surface (one clear step darker or lighter than the canvas) |
| `--raised` | Cards, inputs, rows on hover |
| `--overlay` | Popovers, dialogs, menus, toasts |
| `--sunken` | Wells: code blocks, search field rest state |
| `--text`, `--text-secondary`, `--text-tertiary` | Text. All must meet **4.5:1** contrast on canvas and raised surfaces |
| `--border`, `--border-strong` | 1px separators, input borders |
| `--accent`, `--accent-hover`, `--accent-soft`, `--accent-text`, `--on-accent` | The accent ramp. `--on-accent` is white in both themes |
| `--success`, `--warning`, `--danger` (+ `-soft`) | Status |
| `--focus` | Focus ring (the accent at 55%, so the 2px ring stays visible on every surface) |

### Palette and contrast

WCAG 2.x ratios for the minimum across canvas, sidebar, raised, overlay, and sunken (text tokens) and against each status color's own `-soft` tint (status tokens).

| Token | Light | Dark |
| --- | --- | --- |
| `--canvas` · `--sidebar` · `--raised` · `--overlay` · `--sunken` | `#FCFBF9` · `#F4F2EF` · `#FFFFFF` · `#FFFFFF` · `#F1EFEB` | `#171716` · `#1E1D1C` · `#252423` · `#2B2A28` · `#121211` |
| `--text` | `#1D1C1A` (14.8:1) | `#EDECE9` (12.1:1) |
| `--text-secondary` | `#56534D` (≥6.7:1) | `#ABA7A0` (≥6.0:1) |
| `--text-tertiary` | `#67635C` (≥5.2:1) | `#9A968F` (≥4.9:1) |
| `--success` · `--warning` · `--danger` | `#236B40` · `#8A5100` · `#AF2D27` (≥4.7:1 on soft) | `#5DBE85` · `#E0A546` · `#F4857B` (≥4.9:1 on soft) |
| `--accent` (Iris) | `#5B5BD6`, white text 5.4:1 | same |
| `--accent-text` | accent 80% toward `--text` (6.0:1) | accent 55% toward `--text` (5.7:1) |
| `--accent-soft` | accent at 12% | accent at 20% |

The accent fill is the same in both themes so white text on it always reaches 4.5:1. Custom and desktop-theme accents are darkened just enough to keep that true; `--accent-text` does the per-theme lightening.

Project colors come from the `projectSwatches` list in `shared/design-system/accents.ts`. They are decorative (dots, covers) only.

## Shape, space, and elevation

- **Spacing:** 4pt grid through Tailwind's default spacing scale (1 = 4px). Avoid odd values.
- **Radius:** `--radius-sm` 6 for chips and checkboxes, `--radius-md` 10 for controls, inputs, and rows, `--radius-lg` 14 for cards and panels, `--radius-xl` 20 for dialogs and sheets, and `full` for pills.
- **Elevation:** three soft layered shadows. `--shadow-raised` is barely there (cards), `--shadow-overlay` is for menus and popovers, and `--shadow-dialog` is for dialogs. The dark theme relies more on surface tone than on shadow.
- **Scrim:** a translucent black scrim with a 2px background blur behind dialogs.

## Iconography

Icons are Lucide, always rendered through `ui/Icon` or the primitives. Use a 1.75 stroke, 16px in the interface, 14px in dense metadata, and 20px for empty-state glyphs. Icons inherit `currentColor`.

## Motion

| Token | Value | Use |
| --- | --- | --- |
| `--dur-fast` | 120ms | Hover, press, color |
| `--dur-base` | 200ms | Popovers, selection, list insert |
| `--dur-slow` | 320ms | Dialogs, page transitions, completion |
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | Default |
| `--ease-spring` | `cubic-bezier(0.34, 1.4, 0.64, 1)` | Delight moments only: checking a task, creating an item |

Overlays scale from 0.98 and fade in from their origin. Nothing loops forever. A single `prefers-reduced-motion` rule turns off transforms and keeps opacity changes.

## Components

Every control comes from `dashboard/src/ui/`. Lint forbids raw `<button>`, `<input>`, `<textarea>`, and `<select>` outside that folder.

- **Primitives:** `Button` (primary · secondary · ghost · danger, in sizes sm · md, plus an `icon` form), `IconButton` (requires a label and shows a tooltip), `Input`, `Textarea`, `Field` (label, hint, and error, wired up automatically), `Select`, `Menu` (dropdown and context), `Popover`, `Tooltip`, `Dialog` (owns focus, Escape, and layering), `Kbd`, `Checkbox` (the task circle), `Switch`, `SegmentedControl`, `DatePicker`.
- **Patterns:** `EmptyState` (glyph, one warm sentence, one action), `ErrorState`, `LoadingState`, `ListRow`, `SectionHeader`, `Pill` (tags and properties), `PropertyRow`.

## Voice

Write in plain, warm sentence case. Use **Note, Task, Project, Inbox, Today**, never "artifact", "vault", "filing", or "domain". Empty states invite action: "Your inbox is clear. Press ⌘N to capture a thought." Confirmations are short: "Done · Undo".

## Accessibility

Keep 4.5:1 contrast for all text, visible focus rings on every interactive element, full keyboard reachability, a label on every control, and a `forced-colors` fallback for the focus ring and selected states.

## Verification

```bash
cd dashboard
npm run typecheck && npm run lint && npm test
```

For visible changes, look at the packaged app in both themes at 900px and 1600px widths.
