# The New Silhouette

*Out went the newsprint and the costume jewellery. In came one typeface, warm neutrals, soft depth, a single accent, and a spring you feel more than see. A close reading of the cloth, the cut, and the tailoring of myOS.*

By the myOS Editors

---

Every collection begins with a fabric decision, and the rest follows from how the cloth wants to fall. For myOS 2.0 the cloth is type.

The previous season wore four typefaces at once, with a 10px uppercase monospace label doing most of the talking. The new season wears one. **Inter Variable** is bundled with the app, so it arrives on every machine exactly as intended, with no fallback chain to betray it. It is set with its alternate forms switched on, `cv11`, `ss01`, and `ss03`, and its tracking tightens as it grows toward display sizes. It is the kind of detail nobody notices and everybody registers, like a hem finished by hand.

The design system states the principle in four words: use one voice.

## The scale

The old CSS held 34 distinct font sizes. The new wardrobe holds seven, from 12 to 32, on a 14px base.

Twelve is for metadata and captions. Thirteen carries secondary interface text. Fourteen is the house default for rows, buttons, and inputs. Sixteen is the document body. Twenty titles a section, twenty-four titles a page, and thirty-two is reserved for a document's title and the rare hero moment. Weights are kept to three: 400, 500 for emphasis and labels, 600 for titles.

Section labels, once shouted in small capitals, now speak in `text-sm font-medium text-text-secondary`. Never uppercase.

> One typeface, used at a readable size. It is the most restrained sentence in the design system, and the most transforming.

Two accessories are permitted, each for a single occasion. **Literata**, a bundled serif, dresses the document body only when a reader chooses Appearance, then Reading font, then *Serif*. **Geist Mono** is for code blocks, inline code, and keyboard hints, and nothing else. Monospace went from the voice of the interface to a specialist's tool.

## Warm, not cream

The old palette was paper and ink: cream stock and an Ultra Violet accent that clashed with it. The new neutrals are warm but clean. In light, the canvas is `#FCFBF9`, the sidebar one clear step deeper at `#F4F2EF`, raised cards and overlays a true `#FFFFFF`, wells like code blocks `#F1EFEB`. In dark, the canvas drops to `#171716` and the surfaces climb in soft tone from there: `#1E1D1C`, `#252423`, `#2B2A28`, with wells at `#121211`.

Both themes are first-class. Every token has a light and a dark value, and they are reviewed together, like a garment fitted in daylight and again under evening light.

The ink is measured. Primary text reaches 14.8:1 against the light canvas and 12.1:1 against the dark. Even the quietest tertiary text clears 4.5:1 on every surface. The 10px label that once whispered at about 3.3:1 has no successor.

## Depth instead of hairlines

The previous interface held its surfaces apart with 0.5px hairlines, because the surfaces themselves barely differed, stepping at about 1.06:1. It was all seams.

2.0 cuts with tone and shadow instead. There are three levels, canvas, raised, and floating, and three soft layered shadows to match: `--shadow-raised`, barely there under cards; `--shadow-overlay` for menus and popovers; `--shadow-dialog` for dialogs, which sit over a translucent scrim with a 2px blur. The dark theme leans more on tone than on shadow, as dark cloth does. Where a line is truly needed, it is a last resort, and it is always 1px.

> It was all seams. Now the surfaces are held apart the way good tailoring holds a lapel: by structure, not by stitching you can see.

Shape is tailored to a grid. Spacing follows 4 points. Radii come in four sizes: 6 for chips and checkboxes, 10 for controls, inputs, and rows, 14 for cards and panels, 20 for dialogs and sheets, and a full pill where a pill belongs. Hit targets are generous, at least 32px for controls and 36px for list rows.

:::sidebar
**The measurements**

- **Type:** Inter Variable, 12 / 13 / 14 / 16 / 20 / 24 / 32, on a 14px base. Weights 400, 500, 600.
- **Reading:** Literata, optional. **Code:** Geist Mono, only.
- **Grid:** 4pt. **Radii:** 6 · 10 · 14 · 20.
- **Elevation:** raised, overlay, dialog.
- **Accent:** one `--accent`, default Iris `#5B5BD6`, ramp derived with `color-mix(in oklch, …)`.
- **Motion:** 120ms, 200ms, 320ms, and one spring, `cubic-bezier(0.34, 1.4, 0.64, 1)`.
- **Contrast:** every text token at least 4.5:1.
:::

## One accent

Think of the accent as the single piece of colour in an otherwise tonal look. There is one variable, `--accent`, and every other accent value, hover, soft tint, text, is derived from it with `color-mix` in the OKLCH colour space. Change the one, and the whole ramp follows in key.

The default is **Iris**, `#5B5BD6`, which carries white text at 5.4:1. The accent fill is the same in both themes precisely so that white on accent always clears 4.5:1; any custom accent is darkened just enough to keep that promise, and `--accent-text` does the per-theme lightening. On Linux under Omarchy, the accent can follow the desktop theme. Project colours exist too, but they are decorative only: dots and covers, never meaning.

## The spring

Movement is where calm software most often loses its composure. The rule here is that motion explains state. It is short and springy for delight, and never ambient or looping.

There are three durations: 120ms for hover, press, and colour; 200ms for popovers, selection, and a row arriving in a list; 320ms for dialogs, page transitions, and completion. Overlays scale up from 0.98 and fade in from their origin. And there is exactly one spring, `cubic-bezier(0.34, 1.4, 0.64, 1)`, reserved for two moments: checking off a task and creating something. Tick a task in Today and the circle gives a small, bright overshoot before settling, then the toast reads "Done · Undo". A single `prefers-reduced-motion` rule removes the transforms and keeps the fades.

## The voice

A silhouette is also how a thing speaks. The costume vocabulary, Daybook, ledger, masthead, "In Play", has gone. The design system names the words to use, Note, Task, Project, Inbox, Today, and the words never to use in the interface: artifact, vault, filing, domain.

The new voice is plain, warm, and in sentence case. Empty states invite rather than scold: "Your inbox is clear. Press ⌘N to capture a thought." A finished Inbox earns "Inbox zero. Nice." and, beneath it, "Everything has a place. Enjoy the clear head." A clear Today says "All clear for today." Confirmations are short enough to read at a glance.

:::sidebar
**Wardrobe rules, enforced**

Every control is cut from one pattern book, `dashboard/src/ui`: `Button`, `IconButton`, `Input`, `Select`, `Menu`, `Dialog`, `Checkbox` (the task circle), `Switch`, `DatePicker`, and friends. Lint forbids a raw `<button>`, `<input>`, `<textarea>`, or `<select>` anywhere else, and forbids hardcoded colours and arbitrary values outside that folder. Raw controls outside the design system went from 119 to zero.
:::

## The fit

Put it on and the effect is not of a design being noticed but of one receding. That is the first principle in the book: content is the hero. The interface steps back, one primary action per surface, and lets a folder of plain Markdown be the thing you look at.

The old look was a costume. The new one is simply well made.
