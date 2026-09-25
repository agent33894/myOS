---
no: 03
name: Tasks as lines
headline: A task is a line
dek: A checkbox line in any note is a task. Every change the app makes to it is an edit to that one line.
how: Type `- [ ]` in any note. In a task list, a focused row takes `x` to check off, `d` for due, `s` for scheduled, `t` for a tag.
caption: The checklist in a release note: one task done with its ✅ date, the others with due and scheduled dates and a priority.
---

Write `- [ ] Freeze the public API for 0.9 #release 📅 2026-09-25` anywhere: a project note, a meeting note, today’s daily note. It is a task. The dates use the Obsidian Tasks syntax: 📅 due, ⏳ scheduled, 🛫 start, ✅ done, and 🔁 for a repeat. A plain `due:2026-09-25` works as well.

Checking a task off writes `[x]` and ` ✅` with today’s date at the end of the line. Unchecking removes both. Checking a repeating task leaves the done line as a record and writes the next occurrence directly above it, with its dates moved forward. Setting a date changes the token that is already there, or adds one.

Every edit carries the exact text of the line as the app last read it. If the file changed since, the edit is refused and nothing is written. Undo in the confirmation puts the file back exactly. Files with `type: todo` in their frontmatter count as tasks too.
