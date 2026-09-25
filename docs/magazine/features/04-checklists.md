---
no: 4
name: Checklists become tasks
section: Tasks and planning
headline: Small Boxes, Real Work
dek: A checkbox written in a note is now a task in its own right, and ticking it off anywhere ticks it in the note.
howto: Write `- [ ] Order tiles 📅 2026-09-30` (or end the line with `due 2026-09-30`) in any note. Dated lines appear in Today; open lines in a project's notes appear under From notes.
caption: A project page gathers open checklist lines from its notes under From notes, beside its own tasks.
layout: framed
image: 04-checklists-light
rect: 33 12 81 80
---
People write lists where they think, which is usually inside a note. In 2.0 those lines were only text. In 3.0 every `- [ ]` line in any note is a real task.

Give a line a date, either the Obsidian Tasks style `📅 2026-09-30` or a trailing `due 2026-09-30`, and it appears in Today when it comes due, and in Today's Upcoming section when it is close. If the note belongs to a project, every open checkbox in it also appears on that project's page under **From notes**: "Open checklist items in this project's notes. Checking one off ticks it in the note."

That last promise is the careful part. Ticking a line from Today or a project page makes a single-line edit to the source file, and the edit is revision-checked. If the line has changed since the app last read it, nothing is written, and you are told: "That line changed in the note. Open it to check it off." Nothing else in the file moves. It is the guardrail *your files, your structure* at the scale of one character.
