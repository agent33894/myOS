# File format

myOS Next reads and writes plain Markdown. This page lists everything it understands in a file, and exactly what it writes. Anything not listed here is left as it is.

## Notes

Any `.md` file in the open folder is a note, except inside dot folders (`.git`, `.obsidian`) and `node_modules`. Folders are shown as they are on disk, empty ones included.

A note's title is its frontmatter `title`, or else its file name without `.md`.

## Frontmatter

Frontmatter is optional YAML between `---` lines at the top of the file. Every key is shown as a property and can be edited.

- Changing a property rewrites only that key's lines. Key order, quoting, list style, and comments stay as they were.
- Removing the last property removes the block.
- Frontmatter that isn't valid YAML is left untouched: the note's text can still be edited, but its properties can't until the YAML is fixed.
- Dates are written unquoted (`due: 2026-10-01`).

Keys with a meaning:

| Key | Meaning |
| --- | --- |
| `title` | The note's title. |
| `tags` | A list or a comma-separated string. `#` is optional. |
| `type: todo` | The whole file is a task (older myOS folders). It is done when `status: done`. Checking it off writes `status: done` and `completedDate`; unchecking writes `status: pending`. Its dates come from `due`, `scheduled`, and `start`. |

## Tags

Tags come from frontmatter `tags` and from `#tag` in the text, outside code. A tag has at least one character that is not a digit and may be nested (`#work/api`). Searching for `#work` also finds `#work/api`.

## Tasks

A task is a checkbox list item at any depth, outside code blocks:

```markdown
- [ ] Fix the login redirect ⏫ 🔁 every week 🛫 2026-09-28 ⏳ 2026-09-30 📅 2026-10-02 #auth
  * [x] Write the test ✅ 2026-09-25
1. [ ] Call Sam due:2026-10-02
- [-] Dropped idea
```

| Syntax | Meaning |
| --- | --- |
| `[ ]` | Open. Any other mark except `x`, `X`, and `-` also counts as open. |
| `[x]` | Done. |
| `[-]` | Cancelled. |
| `📅 date` or `due:date` | Due. |
| `⏳ date` | Scheduled. |
| `🛫 date` | Start. |
| `✅ date` | Done on. |
| `🔁 rule` | Repeats. Rules such as `every day`, `every weekday`, `every 2 weeks`, `every week on Tuesday`, `every month on the 15th`, and `every year`; `when done` counts from the day it was checked off. |
| `🔺 ⏫ 🔼 🔽 ⏬` | Priority: highest, high, medium, low, lowest. |
| `#tag` | A tag on the task. |

Dates are `YYYY-MM-DD`. This is the syntax of the Obsidian Tasks plugin, so a folder works the same in both.

What myOS Next writes, always on that one line only:

- **Check:** `[ ]` becomes `[x]` and ` ✅ today` is added at the end (before a `^block-id`).
- **Uncheck:** `[x]` becomes `[ ]` and the ✅ date is removed.
- **Check a repeating task:** as above, and a new unchecked copy is added on the line directly above, with each date moved forward by one step of the rule, counted from the due date (else scheduled, else start). The copy has no ✅ date or block id. A task without dates repeats without dates.
- **Set a date:** the existing token's date is changed, or a new token is added before the ✅ date. A plain `due:` stays plain.
- **Edit the text:** everything after the checkbox is replaced.

Every edit is checked first: if the line no longer reads what the app last saw, nothing is written.

## Daily notes

A daily note is a file named by a date, `daily/2026-09-25.md` by default. The folder and the name pattern are settings. When the folder has Obsidian's `.obsidian/daily-notes.json`, its `folder` and `format` are used unless you change them. The pattern uses `YYYY`, `YY`, `MMMM`, `MMM`, `MM`, `M`, `DD`, `D`, `Do`, `dddd`, and `ddd`; text in `[brackets]` is kept as written. Slashes make subfolders (`YYYY/MM/YYYY-MM-DD`).

Today's note is made the first time something is written to it.

## Capture

A capture adds one line to the end of today's daily note, or of the file chosen in Settings, or to the end of a heading's section when a capture heading is set (the heading is added when it is missing).

- Plain text becomes a list item: `- Read the RFC`.
- Text that starts with `[ ]`, has a date (`tomorrow`, `fri`, `in 3 days`, `📅 2026-10-01`, `due:2026-10-01`), a repeat (`every tue`), or `!` becomes a task in the syntax above: `Call Sam tomorrow !` becomes `- [ ] Call Sam ⏫ 📅 2026-09-26`.

## Views

A view is one line of text. Terms are combined with AND; a `-` in front of a filter negates it.

| Term | Matches |
| --- | --- |
| `open`, `done` | Open or done tasks. |
| `overdue` | Open tasks due before today. |
| `due<=today`, `due<2026-10-01`, `due=tomorrow`, `scheduled=today`, `start>=today-7`, `done=yesterday` | Tasks by date. Operators `<`, `<=`, `=`, `>=`, `>`; dates `today`, `tomorrow`, `yesterday`, `today+N`, `today-N`, or `YYYY-MM-DD`. `due=none` finds tasks without a due date. |
| `#tag`, `-#tag` | Tasks (or notes) with or without a tag. |
| `path:notes/` | Files whose path starts with this. |
| `file:api` | Files whose name contains this. |
| `words`, `"a phrase"` | Task text, or a note's title and text. |
| `sort:due`, `sort:priority`, `sort:file` | Task order (default `due`). Notes sort by `file`, `title`, or `modified`. |
| `group:file`, `group:folder`, `group:tag`, `group:date` | Groups (`date` is for tasks). |
| `limit:20` | At most this many results. |

A note shows a live view with a fenced block. The query can follow the block's name or fill its lines:

````markdown
```tasks
open due<=today+7 #work
group:file
```

```notes #meeting sort:modified limit:10
```
````

## Links

`[[Note]]`, `[[Note|label]]`, and `[[folder/Note]]` link by path, then file name, then title. Ordinary Markdown links to `.md` files resolve from the linking note's folder. Clicking a link to a missing note makes it next to the linking note.

## What stays outside the folder

Settings, the list of the open folder, and the local copy kept before each save (at most one per ten minutes per file, the last fifty, for thirty days) live in the app data folder: `~/.config/myOS Next` on Linux, `~/Library/Application Support/myOS Next` on macOS.
