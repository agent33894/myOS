---
no: 18
name: Terminal
headline: The same folder, from a prompt
dek: The `myos-next` command captures, lists, and finds in the folder the app has open, without opening a window.
how: `myos-next add "…"` · `today` · `tasks "query"` · `find words` · `open path`
caption: add, today, and tasks in a terminal on harbor, each task ending in the file and line where it lives.
---

`myos-next add` appends one line to today’s daily note with the same rules as the capture field, and prints where it went. With no text, it reads standard input, so other tools can pipe into it.

`myos-next today` prints the daily note’s path, then the late tasks and today’s tasks. `myos-next tasks` takes a view in the same one-line language as the app, including `group:` and `kind:notes`. Each task prints as its checkbox, text, dates, and `path:line`, so an editor can jump straight to it. `myos-next find` lists matching notes as title, a tab, and the full path, ready for `cut` or `fzf`. `myos-next open` shows a file in the app.

`tasks` and `find` return 1 when nothing matched, for use in a shell `if`. If the app is running, its watcher picks up whatever the command wrote.
