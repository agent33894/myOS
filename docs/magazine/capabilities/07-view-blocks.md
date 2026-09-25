---
no: 07
name: View blocks
headline: The note holds the question
dek: A fenced `view` block in any note shows live results, and stays plain text on disk.
how: Type a fence named `view` with a query, or use Copy as a block for a note on a saved view.
caption: A release note in the dark theme with two blocks, the open `#release` tasks and, below, the docs changed most recently.
---

Put a query inside a code fence named `view`, on the first line or on the lines inside. The block lists tasks, or notes when the query includes `kind:notes`:

````markdown
```view
open #release sort:due
```
````

In myOS Next the block becomes a small live list. Its header shows the query in monospace and a count, and **Open as view** opens it on its own screen. Checking a task in the block writes to that task’s own file, not to the note the block sits in. Results update as files change.

Inside a block, `path:.` means the note’s own folder and `file:this` means the note itself, so a project page keeps working after its folder is renamed.

In any other editor the block is three lines of text in a code fence. Nothing is hidden, and no results are copied into the file.
