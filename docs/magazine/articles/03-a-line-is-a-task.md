# A Line Is a Task

**In myOS Next a task is a checkbox line in any note. Everything the app does to it is a precise edit to that one line.**

By the myOS Editors

Here is a task:

```markdown
- [ ] Fix the login redirect 📅 2026-10-02 #auth
```

It is a Markdown list item with a checkbox, some text, a due date, and a tag. It can sit in a meeting note, a project plan, a daily note, or a `TODO.md` at the root of a repository. It can be indented under another item. It can start with `*` or `1.` instead of `-`. The only place it does not count is inside a fenced code block, where it is example text.

myOS Next reads every such line in the folder and treats it as a task. There is no task database and no separate task file. The task is the line, and the line lives where you wrote it.

## The date tokens

The app reads the syntax of the Obsidian Tasks plugin, so a folder behaves the same in both. Dates are written `YYYY-MM-DD` after an emoji:

```markdown
- [ ] Fix the login redirect ⏫ 🔁 every week 🛫 2026-09-28 ⏳ 2026-09-30 📅 2026-10-02 #auth
  * [x] Write the test ✅ 2026-09-25
1. [ ] Call Sam due:2026-10-02
- [-] Dropped idea
```

📅 is due, ⏳ is scheduled, 🛫 is start, and ✅ is the date it was done. 🔁 introduces a repeat rule. Five emoji set priority, from 🔺 highest to ⏬ lowest. For people who would rather not type emoji, a plain `due:2026-10-02` works as a due date.

The checkbox itself has three states that matter. `[ ]` is open, `[x]` is done, and `[-]` is cancelled. Any other character in the box also counts as open, so custom markers from other tools do not break anything.

> There is no task database. The task is the line, and the line lives where you wrote it.

## Completing a task

When you check a task off, in the note, on the Today screen, in the Tasks list, or in a view, the app makes one edit to one line. `[ ]` becomes `[x]`, and ` ✅` with today's date is added at the end. If the line ends in a block id such as `^a1b2`, the date goes before it.

```markdown
- [x] Fix the login redirect 📅 2026-10-02 #auth ✅ 2026-09-29
```

Unchecking reverses it: `[x]` becomes `[ ]` and the ✅ date is removed. Nothing else in the file moves.

## Repeating

A repeating task is where most task tools start rewriting things. Here the rule is the same one Obsidian Tasks follows. When you check off a task with a 🔁 rule, the checked line stays where it is as a record, and a new unchecked copy is written on the line directly above it, with each date moved forward by one step of the rule.

Before, checked on 29 September:

```markdown
- [ ] Review open pull requests 🔁 every week 📅 2026-09-28 #team
```

After:

```markdown
- [ ] Review open pull requests 🔁 every week 📅 2026-10-05 #team
- [x] Review open pull requests 🔁 every week 📅 2026-09-28 #team ✅ 2026-09-29
```

The step is counted from the due date, or the scheduled date if there is no due date, or the start date if there is neither. Every date on the line moves by that same step, so a task that starts two days before it is due still does. A rule ending in `when done` counts from the day it was checked instead. The new copy has no ✅ date and no block id. A repeating task with no dates at all repeats without dates.

The rules read like speech: `every day`, `every weekday`, `every 2 weeks`, `every week on Tuesday`, `every month on the 15th`, `every year`.

## Rescheduling

Setting a date is also a one-line edit. If the token is already there, only the date changes. If it is not, a new token is added before the ✅ date, which is the order Obsidian Tasks writes. A plain `due:` stays plain: moving `- [ ] Call Sam due:2026-10-02` to the fifth gives `- [ ] Call Sam due:2026-10-05`, and no emoji appears.

In any task list, a task row has a menu with Due date and Scheduled date, each offering Today, Tomorrow, Next week (the coming Monday), and Pick a date…, plus Clear when the task already has that date. From the keyboard, a focused row takes `d` for the due date, `s` for scheduled, `t` to add a tag, and `x` or Space to check it off. `j` and `k` move between rows. Enter opens the note at that line; ⌘Enter opens it to the side.

Adding a tag puts `#tag` at the end of the task's text, before any dates or repeat, and leaves every other character as it was.

## Why edits are checked

Each of these edits carries the exact text of the line as the app last read it, along with its line number. Before writing, the app checks that the line still reads that way. If you edited the file in another editor a moment ago, or a `git pull` moved things around, the check fails, nothing is written, and the app says so. A stale edit never lands on the wrong line. When an edit does go through, a short confirmation such as "Done · Fix the login redirect" offers Undo, and undo restores the file exactly.

## Files with `type: todo`

Some folders keep one file per task, with frontmatter like this:

```yaml
---
type: todo
status: pending
due: 2026-10-01
---
```

myOS Next counts those files as tasks too. The file is done when `status: done`. Checking it off writes `status: done` and a `completedDate`; unchecking writes `status: pending`. Its dates come from `due`, `scheduled`, and `start`. Only those frontmatter lines change.

## Why not one file per task

It is a fair question, since some tools work that way and the app supports it. The answer is about where tasks come from. A developer's tasks show up in the middle of other writing: a follow-up in meeting notes, a loose end in a design doc, a reminder in today's log. Moving each one into its own file separates it from the reason it exists. It also fills the folder with small files that are awkward to read in any other editor.

A checkbox line keeps the task next to its context. It reads as a list in every Markdown viewer. It diffs as one line in Git. And because the syntax is shared with Obsidian Tasks, the same line works in both apps without translation.

> A task written in the middle of a meeting note should stay in the meeting note.

The decision record behind the app puts the choice plainly: "tasks are checkbox lines anywhere (Obsidian Tasks compatible)," and "type: todo files still count as tasks." One model for new work, and room for the files you already have.

:::sidebar
**Task syntax**

| Write | Meaning |
| --- | --- |
| `[ ]` · `[x]` · `[-]` | Open · done · cancelled |
| `📅 2026-10-02` or `due:2026-10-02` | Due |
| `⏳ 2026-09-30` | Scheduled |
| `🛫 2026-09-28` | Start |
| `✅ 2026-09-29` | Done on (written when you check it off) |
| `🔁 every week on Tuesday` | Repeats; add `when done` to count from completion |
| `🔺 ⏫ 🔼 🔽 ⏬` | Priority, highest to lowest |
| `#auth`, `#work/api` | Tags; `#work` also finds `#work/api` |

**Row keys:** `x` or Space check · `d` due · `s` scheduled · `t` tag · `j`/`k` move · Enter open at line · ⌘Enter open to the side
:::
