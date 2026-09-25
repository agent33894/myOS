---
no: 02
name: Notes & links
headline: Any file is a note
dek: A note is any Markdown file in the folder. A link is two square brackets.
how: Type `[[` to link a note, `/` for a block. ⌘-click opens a link to the side.
caption: A rendered note: a code block, a benchmark table, and three tasks, followed by two `[[links]]` at the foot of the note.
---

There is no note type and no required field. Any `.md` file in the folder is a note, and its title is its frontmatter `title` or, without one, its file name.

Each tab shows a note rendered, with headings, lists, tables, code, and diagrams set as formatted text, or as Markdown source. Type `/` for a menu of blocks. Type `[[` and the app suggests notes to link; the last suggestion creates a new one.

Links resolve by path, then file name, then title, ignoring case, so `[[Retry budget]]`, `[[retry budget]]`, and `[[notes/Retry budget]]` all reach the same file. Ordinary Markdown links to `.md` files work too, read from the linking note’s folder. Clicking a link to a note that does not exist creates it next to the note you are in, and opens it.

When you edit one paragraph, only that paragraph is written again. Tables keep their spacing, lists keep their markers, and the rest of the file is saved byte for byte.
