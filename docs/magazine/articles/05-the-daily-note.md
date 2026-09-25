# Where Things Land

**The daily note is the one fixed place in myOS Next: a file named for today, where every captured line goes unless you say otherwise.**

By the myOS Editors

A folder of notes needs somewhere for loose things to go: a thought in a meeting, a reminder to call someone, a bug noticed while reading a log.

myOS Next answers with the daily note: a file named for the date, `daily/2026-09-25.md` by default. It is the default target for captures, and the top of the Today screen. It is an ordinary Markdown file. You can open it in any editor, grep it, commit it, or delete it.

## Made when it is needed

Today's note does not exist until something is written to it. Opening the app on a new morning creates nothing. The Today screen shows the note's path in small monospace type above an empty editor with the placeholder "Write about today, or press / for blocks". The file appears on disk with your first keystroke or your first capture, and not before.

In a folder you share with Git, a day on which you wrote nothing leaves no empty file to commit or clean up.

> A day on which you wrote nothing leaves no empty file behind.

## Obsidian's settings, respected

Many people who keep a folder of Markdown already keep daily notes in Obsidian, with their own folder and file name format. myOS Next reads those settings. When the open folder has `.obsidian/daily-notes.json`, its `folder` and `format` are used, unless you change them in myOS Next's Settings. Your changes are stored in the app's own settings file; the Obsidian file is only read.

The name pattern uses the same tokens Obsidian uses: `YYYY`, `YY`, `MMMM`, `MMM`, `MM`, `M`, `DD`, `D`, `Do`, `dddd`, and `ddd`. Text in `[brackets]` is kept as written. Slashes make subfolders, so `YYYY/MM/YYYY-MM-DD` files each day under its year and month. A pattern like `YYYY-MM-DD [Log]` gives `2026-09-25 Log.md`.

## The Today screen

Today puts the daily note on top, editable in place, with a button to open it in its own tab. Below it are the tasks for today, drawn from the whole folder: a "Late" section for open tasks whose due date has passed, and a "Today" section for tasks due today, scheduled for today or earlier, or starting today. The header gives the date and a short count, such as "3 for today · 1 late." When nothing is due, it says so, "Nothing is due today", and offers a button to capture a task.

Checking a task off here writes `[x]` and the ✅ date in the task's own file, which may be a meeting note from last week. The daily note is where you write; the task list is where you see what is owed.

## Capture from the app

Press ⌘N anywhere in the app. A single field opens, with the example "Ship the parser fix tomorrow #release" as its placeholder. Below the field, the app shows where the line will go and, in monospace, the exact line it will write. Enter adds it and closes the field. Shift-Enter adds it and keeps the field open for the next one. A confirmation names the file, "Added to daily/2026-09-25.md," with Undo.

The rules for turning text into a line are short. Plain text becomes a list item:

| Typed | Written |
| --- | --- |
| `Read the RFC` | `- Read the RFC` |

Text that starts with `[ ]`, contains a date, a repeat, or a `!` becomes a task, in the Obsidian Tasks syntax described elsewhere in this issue. Dates can be words. Captured on Friday 25 September 2026:

| Typed | Written |
| --- | --- |
| `Ship the parser fix tomorrow #release` | `- [ ] Ship the parser fix #release 📅 2026-09-26` |
| `Call Sam tomorrow !` | `- [ ] Call Sam ⏫ 📅 2026-09-26` |
| `Dentist on friday` | `- [ ] Dentist 📅 2026-10-02` |
| `Water the plants every tue` | `- [ ] Water the plants 🔁 every week on Tuesday 📅 2026-09-29` |
| `[ ] Reply to the review` | `- [ ] Reply to the review` |

A weekday means its next occurrence, never today, which is why Friday's "on friday" lands a week out. Date words count only as whole words, so "today's news" is not a date. Short forms such as "sun" and "sat" count only after a word like "on" or "by," before a time, or at the end, so "sat with Joe" stays a sentence. The word that introduced a date is removed with it: "Dentist on friday" becomes "Dentist."

## Capture somewhere else

The daily note is the default, not a rule. In Settings, the capture target can be any `.md` file, such as `inbox.md` or `notes/log.md`. A capture heading can also be set, for example "Log." Then each capture goes to the end of that heading's section rather than the end of the file, and the heading is added if the file does not have it yet.

## Capture from the terminal

The same capture runs from a shell, without opening a window:

```bash
myos-next add "Ship the parser fix tomorrow #release"
```

It prints `Added to daily/2026-09-25.md` and exits. With no text, it reads from standard input, so other tools can pipe into it. If the app is open, its file watcher picks up the new line and the Today screen updates.

On Linux, the desktop entry installed with the app includes a Capture action, which runs `myos-next --capture` and opens the capture field in myOS Next.

> One line, one file, one place to look.

:::sidebar
**Daily notes and capture**

| Setting | Default |
| --- | --- |
| Daily folder | `daily` (or Obsidian's `folder`) |
| Name pattern | `YYYY-MM-DD` (or Obsidian's `format`) |
| Capture target | Today's daily note, or any `.md` file |
| Capture heading | None; when set, captures go to that section |

| Type | Becomes a task because of |
| --- | --- |
| `[ ] …` | The checkbox |
| `tomorrow`, `fri`, `in 3 days`, `next week`, `📅 2026-10-01`, `due:2026-10-01` | A date |
| `every tue`, `every 2 weeks` | A repeat |
| `!` | High priority (⏫) |

⌘N in the app · `myos-next add "…"` in a terminal
:::
