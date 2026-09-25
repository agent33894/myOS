---
no: 06
name: Views
headline: A search, written down
dek: A view is one line of query text. It runs on the Tasks screen, in the sidebar, inside a note, and at the terminal.
how: Write a query on the Tasks screen and choose Save as view. Settings → Views edits, reorders, and removes them.
caption: Saved views in Settings. Each is a name, one line of query, and whether it lists tasks or notes, in the order the sidebar shows them.
---

The language is small enough to print on one popover. `open` and `done` pick a status; `overdue` finds what is late. Dates compare with `<`, `<=`, `=`, `>=`, and `>` against `today`, `tomorrow`, `yesterday`, an offset such as `today+7`, or a date. `#tag` and `-#tag` include or leave out a tag, nested tags included. `path:docs/` and `file:api` pick places. Other words search the text.

Terms combine with AND. There are no parentheses and no OR. `sort:`, `group:`, and `limit:` shape the result.

A saved view has a name and sits in the sidebar, below Today and Tasks. Its screen has a button to copy it as a block for a note, and Remove, which offers Undo. When a term cannot be used, the view keeps running and says in one sentence what it left out, and why.
