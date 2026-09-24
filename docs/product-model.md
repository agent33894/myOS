# Product model

myOS turns a folder of Markdown files into a calm place to capture thoughts, plan the day, and keep projects moving. The model has four nouns and no filing ceremony.

## Nouns

| Noun | What it is | Stored as |
| --- | --- | --- |
| **Note** | Any page of writing | `type: memo` for new notes. Older typed files (decision, meeting, research, query, snippet, prompt, development) are Notes too; their type shows as a subtle *kind* label |
| **Task** | Something to do, with an optional date, flag, and project | `type: todo` |
| **Project** | A page that gathers related tasks and notes | `type: project` |
| **Inbox** | Where captures wait to be sorted. It is a place, not a noun users create | `type: inbox` captures |

Plain Markdown files without frontmatter are Notes.

Users never choose a folder, "domain", or type directory. Paths are derived. A new item inherits its project's `domain`, and otherwise uses the spec default. The `domain` field is still read and written for compatibility, but the interface never asks for it or shows it.

## Navigation

```
Search ⌘K                     + New ⌘N
Inbox        (count)   captures waiting to be sorted
Today        (count)   overdue · due today · flagged · in progress
Notes                  every note, search-first
Projects               index; active projects are listed underneath
─────
Settings  (General · Appearance · Advanced)
```

Every sidebar count equals exactly the number of rows its page shows.

## Core journeys

- **Capture (⌘N from anywhere, `myos --capture`).** Type and press ⏎. This makes zero decisions. Inline syntax is optional: `tomorrow`, `fri`, `next week`, and `in 3 days` set a date; `#tag` adds a tag; `@project` files it into a project; `!` flags it. Anything with a date, flag, or project becomes a Task in that place. Everything else lands in the Inbox.
- **Sort the Inbox.** A single keyboard-first flow handles one item at a time: *Make task* (t), *Make note* (n), *Move to project* (p), *Delete* (⌫), *Skip* (→). Nothing else is required.
- **Plan today.** Today is one list: **Overdue**, **Today** (due today, flagged, or in progress), then a quiet **Upcoming** (next 7 days) and **Done today**. Deferred tasks stay hidden until their defer date. Completing a task plays a short spring animation and shows "Done · Undo".
- **Write.** Choose *New note* (⌘⇧N or the palette) to open a blank page with the cursor in the title. `/` opens the insert menu with basic blocks first; charts, KPIs, roadmaps, and diagrams sit under *More blocks*.
- **Manage a project.** The project page shows a title, a short description (free text, no template), **Tasks** with inline add, and **Notes** with inline add. Properties (status, color, dates) sit in a small property row.
- **Find.** ⌘K searches titles and full text together, with recent items first, and also lists commands (New note, New task, New project, Toggle theme, Settings, …).

## Every page has properties, inline

The top of a Task page shows a property row: **Status · Due · Defer · Flag · Project · Tags**. Notes show **Project · Tags**. Projects show **Status · Color · Tags**. Every property can be edited in place.

## Things that are advanced, not gone

Git activity for projects linked to a repository, Git ignore rules, "Open in editor", and "Show in folder" live under **Settings → Advanced** or in a page's ⋯ menu. The interface never mentions frontmatter or YAML.

## Data safety

- Every save is conditional on the revision the editor last read. If the file changed on disk (another editor, Git, sync), myOS shows **"This page changed on disk"** with *Load theirs* and *Keep mine* and never overwrites silently.
- Undo restores exactly: same path, same frontmatter (including custom keys), same body.
- Opening a page never rewrites its file. Editing one block rewrites only that block; every untouched block keeps the exact Markdown it was written in.
- New items start empty. There are no template placeholders.
