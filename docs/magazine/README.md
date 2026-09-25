# myOS Next · Issue 04 · Winter 2026 · The Plain Text Issue

A print magazine about myOS Next, built from the Markdown in this folder. 230 × 300 mm, 66 pages.

## Rebuild

```bash
node docs/magazine/build.mjs
```

The build needs Node, ImageMagick (`magick`), Chromium (`/usr/bin/chromium`, or set `CHROMIUM`), and Poppler (`pdftoppm`). It uses `marked` from `dashboard/node_modules`. Each run:

1. Crops every picture it uses from the screenshots in `/tmp/next-shots/final/` (set `MYOS_SHOTS` to change this) into `issue/images/` as JPEG. Pictures the issue no longer uses are removed.
2. Renders `articles/*.md` and `capabilities/*.md` into a source page, paginates it in headless Chromium with `issue/paginate.js`, and saves the result as `issue/index.html`.
3. Prints `myOS-Next-Issue-04.pdf` and writes page previews to `/tmp/next-magazine-previews/` (set `MYOS_PREVIEWS` and `PREVIEW_DPI` to change these).

The build prints the page count, the PDF size, and any layout warnings: text that does not fit, a pull quote or figure with no room, or a sparse last page.

## Pictures

Every picture names a key rectangle, in percent of the screenshot (`x0 y0 x1 y1`). The build widens that rectangle around its centre to the shape of the box on the page, as far as the screenshot allows, and fills any remainder with the screenshot's own canvas colour. The key rectangle is never cropped, so dialogs, popovers, and buttons stay whole. The rectangles and layouts are set in `ARTICLES` and `LAYOUT` in `build.mjs`.

## What's inside

| Path | Contents |
| --- | --- |
| `articles/` | The letter and eight articles. Each opens with a `#` headline, a bold dek, and a byline. Pull quotes are `>` lines; each article has one `:::sidebar` … `:::` reference card. `README.md` lists them. |
| `capabilities/NN-slug.md` | One page per capability (18). Frontmatter holds the name, headline, dek, `how` line, and caption. |
| `build.mjs` | The build: running order, openers, picture rectangles, capability layouts (`sheet`, `column`, `panel`, `duo`, `noir`, `spread`), and the static pages (cover, contents, letter, Always true, divider, quick reference, colophon, back cover). |
| `issue/magazine.css` | The design. Instrument Serif for display, Source Serif 4 for text, Geist and Geist Mono for labels, numerals, and anything literal. Paper `#FFFEFC`, ink, and one accent, Iris `#5B5BD6`. Dark pages use the app's dark canvas. |
| `issue/paginate.js` | Pours article text into two-column frames, puts pull quotes and figures in the outer margin, places each reference card, adds teaser pages so picture spreads face their openers, and numbers the pages. |
| `issue/fonts/` | WOFF2 files: Instrument Serif and Source Serif 4 (from `@fontsource`), Geist and Geist Mono (from the app's `non.geist` dependency), and two small subsets for the ⌘ ⌥ ⇧ key symbols and the task emoji. |
| `issue/index.html` | The paginated issue. Open it in a browser, or print it. |
| `myOS-Next-Issue-04.pdf` | The printed issue. |

To refresh the text fonts, run `npm install @fontsource/instrument-serif @fontsource/source-serif-4` in `.fonts-src/` (gitignored) and copy the Latin WOFF2 files into `issue/fonts/`.
