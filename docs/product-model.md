# myOS Next

myOS Next is a quiet editor for a folder of Markdown files. It is made for people who already keep their notes, docs, and to-dos in plain files: developers, writers of technical notes, people with an Obsidian vault, people who live in a terminal. It opens the folder as it is. It does not ask for a special layout, special fields, or an account, and it adds nothing to your files that you did not type.

It should feel soft and unhurried to look at, and fast and precise to use from the keyboard.

## What you work with

| Thing | What it is on disk |
| --- | --- |
| **Folder** | The folder you opened. The sidebar shows its real folders and files. |
| **Note** | Any `.md` file. Frontmatter is optional and shown as editable properties when present. |
| **Task** | A checkbox line in any note: `- [ ] Fix the login redirect 📅 2026-10-02 #auth`. Obsidian Tasks dates are understood (📅 due, ⏳ scheduled, 🛫 start, ✅ done, 🔁 repeat), and so is a plain `due:2026-10-02`. Files with frontmatter `type: todo` also count as tasks, so older folders keep working. |
| **Daily note** | `daily/2026-09-25.md`. The folder and file name pattern can be changed. It is the default place where captures land. |
| **View** | A saved search written as one line of text, such as `open due<=today #work`. A view can be pinned to the sidebar, or placed inside any note as a ```` ```view ```` block so the results update live. |

Nothing else is stored. Settings live in the app's settings file and never in your folder.

## Layout

```
┌ files ─────┬ tabs ───────────────────────────────┬ panel ──────┐
│ Today      │                                     │ Outline     │
│ Tasks      │   the note, centered, readable      │ Backlinks   │
│ Views ▸    │                                     │ Properties  │
│ ─────────  │                                     │ Changes     │
│ folders    │                                     │ History     │
│ and files  │                                     │             │
└────────────┴─────────────────────────────────────┴─────────────┘
  status bar: branch · changes · words · saved
```

Both side columns fold away. With both folded you see only the text.

## Everyday actions

- **Capture:** ⌘N or `myos-next add "…"` in a terminal. It appends a line to today's daily note, or to a file you choose. A line starting with `[ ]` becomes a task.
- **Open anything:** ⌘P opens the file switcher (fuzzy search over paths and titles; recent files first).
- **Do anything:** ⌘K lists every command with its shortcut.
- **Today:** today's daily note on top, and below it the tasks that are due, scheduled, or started today, plus anything late. Checking a task off writes `- [x] … ✅ 2026-09-25` in its own file.
- **Tasks:** every open task in the folder. It can be grouped by file, folder, tag, or date and narrowed with the view syntax.
- **Write:** each tab can show the note rendered (⌘E toggles) or as plain Markdown source with optional Vim keys. Links (`[[…]]` and relative links), backlinks, `/` blocks, tables, code, and diagrams work in both.
- **Split:** ⌘\ opens the current tab side by side with another. Drag the line between them to share the width.
- **Git:** if the folder is a Git repository, the file list shows changed files, the Changes panel commits with a message (⌘⇧Enter), each note has a History panel with diffs, and Pull and Push run only when you click them.
- **Keep work safe:** saves check that the file hasn't changed on disk (if it has, you choose which version to keep), undo is exact (a confirmation's Undo reverses that change and no other), each save keeps a local copy in the app's data folder for thirty days, and editing one block never rewrites the rest of the file.
- **Export:** PDF, HTML, or copy as Markdown or rich text.
- **Focus:** ⌘. hides everything but the text.

## Terminal

`myos-next` works without opening a window:

```
myos-next add "Ship the parser fix tomorrow #release"
myos-next today
myos-next tasks "open #release"
myos-next find "rate limit"
myos-next open notes/api.md
```

## Writing style

The interface and docs use short, plain sentences and name things for what they are: file, folder, note, task, view, change, history. Don't write marketing: no "seamless", "powerful", "supercharge", "effortless", "delightful", or "game-changing". Say what a button does. Empty states say what to do next in one sentence.

## Always true

- Plain Markdown in, plain Markdown out. Untouched text is never reformatted.
- No account, no telemetry, no bundled AI. The network is used only when you click Pull or Push.
- The folder works the same in any other editor, in Obsidian, and in Git.
