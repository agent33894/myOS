# myOS Magazine · Issue 03 · Autumn 2026 · The Calm Issue

A print-style editorial magazine for the myOS 3.0 launch, built from the Markdown in this folder.

## Rebuild

```bash
node docs/magazine/build.mjs
```

The build needs Node, ImageMagick (`magick`), Chromium (`/usr/bin/chromium`), and Poppler (`pdftoppm`). It uses `marked` from `dashboard/node_modules`. Each run:

1. Re-imports every screenshot from `/tmp/myos3-shots/*.png` (override with `MYOS_SHOTS=…`) into `issue/images/` as JPEG (quality 82, at most 2400 px wide). Stale images are removed first.
2. Renders `articles/*.md` and `features/*.md` into a source page, paginates it in headless Chromium with `issue/paginate.js`, and saves the static result as `issue/index.html`.
3. Prints `myOS-Issue-03.pdf` (230 × 300 mm trim) and writes 40 dpi page previews to `/tmp/magazine-previews/` (override with `MYOS_PREVIEWS=…`).

The build prints the page count, the PDF size, and any layout warnings (overflowing text, figures without room).

## What's inside

| Path | Contents |
| --- | --- |
| `dossier.md` | Verified facts about the 2.0 overhaul. |
| `articles/` | Eight articles and the letter from the editor. Pull quotes are `>` blockquotes; sidebars are `:::sidebar` … `:::` blocks. |
| `features/NN-slug.md` | One page of copy per 3.0 feature. The frontmatter holds the headline, dek, how-to line, caption, and layout (`bleed`, `split`, `panorama`, `framed`, `noir`, `export`), plus the screenshot, `focus` (the point to centre, as x% y%), and `zoom`. |
| `build.mjs` | The build script. The article running order, opener styles, and figures are set in `ARTICLES`. |
| `issue/magazine.css` | The design: Bodoni Moda for display, Newsreader for text, and Inter for captions and labels, on paper white and ink, with the Iris accent used sparingly. |
| `issue/paginate.js` | Flows article text into fixed page frames, places pull quotes in the margin, numbers the pages, and fills in the contents. |
| `issue/fonts/` | WOFF2 files for Bodoni Moda and Newsreader (from `@fontsource`), and Inter Variable (from the app's own dependencies). |
| `issue/index.html` | The paginated issue. Open it in a browser, or print it. |
| `myOS-Issue-03.pdf` | The printed issue. |

To refresh the fonts, run `npm install @fontsource/bodoni-moda @fontsource/newsreader` in `.fonts-src/` (gitignored) and copy the Latin WOFF2 files into `issue/fonts/`.
