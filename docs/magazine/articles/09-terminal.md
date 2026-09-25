# From the Prompt

**The `myos-next` command reads and writes the same folder as the app, with no window. Here is what each subcommand does and what it prints.**

By the myOS Editors

Some people keep a terminal open all day and would rather not switch to another window to write down a task. For them, myOS Next installs a command, `myos-next`. On Linux, the local install links it into `~/.local/bin`.

The command works on the folder the app last opened. `add`, `today`, `tasks`, and `find` run without starting a window, whether or not the app is running. If it is running, its file watcher picks up whatever the command wrote. If no folder has been chosen yet, the command says so: "No folder is open yet. Open myOS Next once to choose one."

> The command and the app share one query engine and one capture parser. Nothing is translated between them.

## add

```bash
$ myos-next add "Bump the go.mod minimum to 1.22 tomorrow #release"
Added to daily/2026-09-25.md
```

`add` appends one line to today's daily note, or to the capture file and heading chosen in Settings. The rules are the same as in the app's capture field. Plain text becomes a list item. Text that starts with `[ ]`, or has a date, a repeat, or `!`, becomes a task. The example above writes:

```markdown
- [ ] Bump the go.mod minimum to 1.22 #release 📅 2026-09-26
```

With no text, `add` reads from standard input, so it can take the output of another command:

```bash
$ echo "Rotate the staging keys fri" | myos-next add
```

## today

```bash
$ myos-next today
Daily note: daily/2026-09-25.md
Late (3)
  [ ] Answer the security review on redirects  (due 2026-09-23)  daily/2026-09-24.md:1
  [ ] Add a test for an HTTP date in `Retry-After` #bug  (due 2026-09-24)  daily/2026-09-23.md:2
  [ ] Idle connections leak on `Connection: close` #bug  (due 2026-09-24)  notes/Connection pooling.md:31
Today (7)
  [ ] Reply to Priya about the `WithBudget` name #release  (due 2026-09-25)  daily/2026-09-25.md:2
  [ ] Freeze the public API for 0.9 #release  (due 2026-09-25)  notes/Release 0.9.md:14
  [ ] Draft the release notes for 0.9 #release #docs  (scheduled 2026-09-25)  daily/2026-09-24.md:3
  [ ] Look at the p99 numbers on the pool change  (scheduled 2026-09-25)  daily/2026-09-25.md:3
  [ ] Re-run the pool benchmark on arm64 #release  (scheduled 2026-09-25)  notes/Connection pooling.md:32
  [ ] RFC 9110 on `503` and `Retry-After` #reading  (scheduled 2026-09-25)  notes/Reading list.md:5
  [ ] Triage new GitHub issues  (scheduled 2026-09-25)  notes/Triage.md:5
```

`today` prints the path of today's daily note, with "(not written yet)" if the file does not exist, then two sections: late tasks, and tasks due, scheduled, or starting today. These are the same tasks the Today screen shows.

Each task line has the same shape everywhere in the command: the checkbox, the task's text with its tags, its dates in parentheses, and `path:line`. The path is relative to the open folder, so from there `vim +14 "notes/Release 0.9.md"` goes straight to the line.

## tasks

```bash
$ myos-next tasks "open #release group:file"
2026-09-24 (1)
  [ ] Draft the release notes for 0.9 #release #docs  (scheduled 2026-09-25)  daily/2026-09-24.md:3
2026-09-25 (2)
  [ ] Reply to Priya about the `WithBudget` name #release  (due 2026-09-25)  daily/2026-09-25.md:2
  [ ] Bump the go.mod minimum to 1.22 #release  (due 2026-09-26)  daily/2026-09-25.md:5
Connection pooling (1)
  [ ] Re-run the pool benchmark on arm64 #release  (scheduled 2026-09-25)  notes/Connection pooling.md:32
Release 0.9 (6)
  [ ] Freeze the public API for 0.9 #release  (due 2026-09-25)  notes/Release 0.9.md:14
  [ ] Rename `WithRetryBudget` to `WithBudget` before the freeze #release  (due 2026-09-26)  notes/Release 0.9.md:15
  [ ] Write the migration guide for `Client.Do` changes #release #docs  (due 2026-09-29)  notes/Release 0.9.md:16
  [ ] Tag `v0.9.0-rc.1` #release  (due 2026-09-30, scheduled 2026-09-28)  notes/Release 0.9.md:17
  [ ] Publish the release notes #release #docs  (due 2026-10-02)  notes/Release 0.9.md:18
  [ ] Announce on the mailing list #release  (due 2026-10-03, starts 2026-10-02)  notes/Release 0.9.md:19
```

`tasks` takes a view, in the same one-line language as the app, the sidebar, and fenced blocks. Without a query, it lists open tasks. When the query groups, each group is printed as a heading with its count; when grouping by file, the heading is the note's title (its frontmatter `title`, or else its file name), and groups follow the order of their paths. A term the view cannot use is reported on standard error, and the rest of the query still runs.

## find

```bash
$ myos-next find "rate limit"
Rate limits	/home/maya/code/harbor/docs/rate-limits.md
2026-09-23	/home/maya/code/harbor/daily/2026-09-23.md
Reading list	/home/maya/code/harbor/notes/Reading list.md
Retry budget	/home/maya/code/harbor/notes/Retry budget.md
getting-started	/home/maya/code/harbor/docs/getting-started.md
README	/home/maya/code/harbor/README.md
```

`find` lists notes whose title or text contains every word, most recently changed first. Each line is the title, a tab, and the full path, which makes it easy to pass to `cut`, `fzf`, or an editor.

## open

```bash
$ myos-next open notes/api.md
```

`open` shows a file in the app, starting it if needed. The path is read relative to the current directory first, so `open ./api.md` works from inside the folder, and otherwise as a path inside the open folder. `--capture` opens the capture field in the running window.

## Exit codes

`add` and `today` return 0 on success; `add` with nothing to add returns 1. `tasks` and `find` return 0 when something matched and 1 when nothing did, so they can be used in a shell `if`. Errors go to standard error.

:::sidebar
**`myos-next` at a glance**

| Command | Does |
| --- | --- |
| `myos-next` | Open the app |
| `myos-next add <text>` | Add a line to today's daily note (reads stdin without text) |
| `myos-next today` | Daily note path, late tasks, today's tasks |
| `myos-next tasks [query]` | Tasks matching a view (default `open`) |
| `myos-next find <words>` | Notes containing every word: title, tab, path |
| `myos-next open <path>` | Show a file in the app |
| `myos-next --capture` | Open capture in the running app |
| `myos-next --install-desktop-entry` | Linux: launcher entry, `myos-next:` links, link in `~/.local/bin` |

Task line: `  [ ] text #tags  (due …, scheduled …)  path:line`
:::
