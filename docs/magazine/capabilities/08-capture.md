---
no: 08
name: Capture
headline: One line, from anywhere
dek: ⌘N opens a single field. Enter writes one line to today’s daily note.
how: ⌘N in the app, or `myos-next add "…"` in a terminal.
caption: The capture field over a release note, with the target, `daily/2026-09-25.md`, and the line it will write: a task with its tag, a high priority, and a date.
---

Capture is for the thing you will forget in a minute. Press ⌘N from anywhere in the app and type. Under the field, the app shows the file the line will go to and, in monospace, the exact line it will write, before anything is written.

Plain text becomes a list item. Text that starts with `[ ]`, or has a date, a repeat, or `!`, becomes a task. Dates can be words: “tomorrow”, “fri”, “in 3 days”, “next week”. The word that introduced a date is removed with it, so “Dentist on friday” becomes `- [ ] Dentist 📅 2026-10-02`.

Enter adds the line and closes the field. Shift-Enter adds it and keeps the field open for the next. A confirmation names the file, with Undo.

In Settings, captures can go to any `.md` file instead of the daily note, and under a heading such as “Log”, which is added when the file does not have it.
