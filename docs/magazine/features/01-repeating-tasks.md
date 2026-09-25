---
no: 1
name: Repeating tasks
section: Tasks and planning
headline: The Return
dek: Some things come back every Tuesday. Now the task does too, and it keeps an honest record instead of a streak.
howto: Type `every tue`, `every 2 weeks`, `every weekday`, or `every month on 15` in Quick Capture (⌘N), or set Repeat in the task's properties.
caption: "A task's Repeat menu: Every day, Every weekday, Every Tue, Every 2 weeks, Every month on the 29th, Every year, and Custom…, beside the line Done 9 of the last 10 times."
layout: bleed
image: 01-repeating-tasks-light
rect: 33 12 82 50
---
Every task app has repeating tasks. The market research called them table stakes: the Obsidian Tasks plugin alone has 4.3 million downloads, and myOS already stored a `repeatRule` field that did nothing at all. In 3.0 it finally does something.

Write the rule the way you would say it. Capture understands `every day`, `every weekday`, `every other week`, `every mon, thu`, and `every month on the 15th`. The row shows a quiet "Every Tue". When you tick the task off, it does not disappear. The date goes into the file's `completions` list, `due` moves to the next occurrence, and the toast says so plainly: "Done · next Tue". Undo reverses both changes at once.

What the page will never show is a streak. The behavioral research is clear that habits take weeks to months to form, with a median of 66 days in one study, and that a missed day does not derail them. A chain that resets to zero punishes the one thing that does not matter. So the page keeps a truthful line instead: "Done 9 of the last 10 times."

The record is plain frontmatter in your own file, computed from real dates. Nothing is stored anywhere else.
