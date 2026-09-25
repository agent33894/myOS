# A Sheet on a Tinted Table

**The design of myOS Next, garment by garment: one raised page, two thin columns that fold away, a monospace for facts, and a lot of room left empty.**

By the myOS Editors

Fashion editors talk about restraint as a choice you can see: the dress with no print, the room with one chair. The design of myOS Next makes the same kind of choice, and it can be described in exact terms. There are few pieces. Each one has a job. Nothing is there for decoration.

## The sheet

The window itself is the canvas. It is a soft neutral with a small amount of the accent color mixed in: five percent in the light theme, six in the dark. On it sits one raised page, the sheet, where the note is. In the light theme the sheet is a warm near-white, `#FFFEFC`, with a shadow so faint it is closer to an edge than a shadow. In the dark theme the sheet is a slightly lighter charcoal than the canvas, and the separation comes mostly from tone.

The sheet is centered and only as wide as the text column plus 56 pixels of margin on each side. The text column has three widths, set in Settings under Editor → Line width: Narrow, Normal, and Wide, at 36, 42, and 52 rem. The design documentation lists "Use depth instead of lines" as a principle: surfaces are told apart by tone and soft shadow, and a hairline is a last resort.

> The window is the table. The note is the sheet laid on it.

The plan for the app describes the intended feel in one line: "The note sits on a slightly raised sheet in the middle of a tinted canvas, with wide margins." The effect is closer to paper on a desk than to a document in a program.

## The side columns

On the left is the file list: Today, Tasks, pinned views, and then the folder's real folders and files. On the right is the panel: Outline, Backlinks, Properties, Changes, and History. Both columns are the same color as the canvas, so they sit on the window without a dividing line. There is no frame around them, only text and small icons.

They are thin. The file list starts at 248 pixels. Its rows are 28 pixels tall, the one place denser than the 36-pixel rows used in lists elsewhere, so that a project's `docs/` folder fits on screen. The right panel starts folded away. Both columns fold with a key, ⌘B and ⌥⌘B, and with both folded you see only the tabs and the text.

The active tab, the active place in the sidebar, and the open file are marked the same way: a small raised pill in the sheet's color. The selected item looks like a piece of the page, which is what it is.

## Mono for facts

The app uses three typefaces, all bundled.

**Inter** is the interface and the text, at a readable default of 14 pixels for the interface and 16 for the body of a note. Section labels are sentence case in a medium weight. The design rules say it plainly: "There are no uppercase monospace labels."

**Geist Mono** is used for facts: file paths, the status bar, source mode, code, keyboard hints, and file names while you type them. The path of today's daily note sits above it in small monospace. The query in a view block is shown in monospace. The status bar reads like a line of `git status`: the branch, a dot and a count of changed files, arrows for ahead and behind.

**Literata** is optional. When Settings → Editor → Reading font is set to Serif, the body of a note is set in it. The interface stays in Inter.

> Monospace marks what is literal: a path, a branch, a query. Everything else is set in Inter.

## Color, and one accent

The palette is mostly warm neutrals. The design documentation describes them as "warm but clean, not cream paper." There is one accent, chosen in Appearance; the default is Iris, `#5B5BD6`. Every other accent shade is mixed from that one value, so changing it changes everything together. The accent fill is the same in both themes, so white text on it always meets a 4.5:1 contrast ratio.

All text meets 4.5:1 contrast on every surface it can sit on, in both themes.

## Light and dark

Both themes are first-class. Every color token has a light and a dark value, and the two are reviewed together. The dark theme is not an inversion: it relies more on surface tone than on shadow, and the sheet is set apart by being a step lighter than the canvas. Changes to the design are checked in both themes, at a narrow and a wide window.

## Motion and shape

Motion is short. Hover and press take 120 milliseconds, popovers 200, dialogs 320. A slightly springy curve is kept for two moments only: checking a task and creating something. Nothing loops. When the system asks for reduced motion, movement is turned off and only fades remain.

Corners are measured, not decorative: 6 pixels for chips and checkboxes, 10 for controls and rows, 14 for cards, 20 for dialogs and the sheet. Spacing follows a 4-point grid. Icons are Lucide, with a 1.75 stroke, at 16 pixels in the interface.

## What restraint means here

It would be easy to describe all this as minimal and leave it there. The more accurate word is edited. Each surface was asked what it is for. The sidebar is for finding files, so it shows files. The status bar is for state, so it shows state, in mono. The sheet is for the note, so it is the brightest thing in the window. Everything else is canvas.

:::sidebar
**The wardrobe**

| Piece | Specification |
| --- | --- |
| Canvas | Neutral with 5% (light) or 6% (dark) accent |
| Sheet | `#FFFEFC` light; a step above the canvas in dark; `--shadow-sheet` |
| Text column | 36, 42, or 52 rem, plus 56 px margins |
| Side columns | Canvas color, no rule; files 248 px; 28 px rows |
| Type | Inter (interface and text), Geist Mono (paths, status, source), Literata (optional serif) |
| Accent | Iris `#5B5BD6` by default; one value, all shades mixed from it |
| Motion | 120 / 200 / 320 ms; spring only for checking a task or creating something |
| Radius | 6 · 10 · 14 · 20 px |
:::
