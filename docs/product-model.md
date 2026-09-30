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

Users never choose a folder or type directory. Paths are derived. The `domain` field is shown as an **Area** (Work, Personal, Learning stored as `research`, Creative). A new item inherits its project's area, and otherwise takes the default area from Settings (Personal unless changed). Journal pages live at `journal/YYYY-MM-DD.md` and templates in `templates/`; neither has an area.

## Navigation

```
Search                        + New
Inbox        (count)   captures waiting to be sorted
Today        (count)   carried over · due or planned today · flagged · in progress
Tasks                  Anytime · Upcoming · Someday, by project or area
Notes                  every note, search-first; tags, filters, review
Journal                one page per day
Projects               index; active projects are listed underneath
Mail         (count)   email that needs an action or a reply
Weekly review          only on the review day you choose, until opened or dismissed
─────
Settings  (General · Appearance · Advanced)
```

Every sidebar count equals exactly the number of rows its page shows. Tasks has no count: an Anytime task that is also planned for today is listed in both places, but counted only in Today.

## Core journeys

- **Capture (⌘N from anywhere, `myos --capture`).** Type and press ⏎. This makes zero decisions. Inline syntax is optional: `tomorrow`, `fri`, `next week`, and `in 3 days` set a date; `#tag` adds a tag; `@project` files it into a project; `!` flags it. Anything with a date, flag, or project becomes a Task in that place. Everything else lands in the Inbox.
- **Sort the Inbox.** A single keyboard-first flow handles one item at a time: *Make task* (t), *Make note* (n), *Move to project* (p), *Delete* (⌫), *Skip* (→). Nothing else is required.
- **Plan today.** Today is one list: **Carried over** (neutral, never red, with a **Re-plan** batch action), **Today** (due or planned today, flagged, or in progress, in your order), project **Next steps**, then a quiet **Upcoming** (next 7 days) and **Done today**. Dated `- [ ]` lines in notes appear beside tasks. Deferred and Someday tasks stay hidden until their time. Completing a task plays a short spring animation and shows "Done · Undo"; a repeating task records the date and moves to its next occurrence.
- **Rituals, only when you want them.** *Plan my day* picks today's tasks against your available hours. *Close the day* starts with what got done, gives each unfinished planned task a new day, and can add one line to the journal. The *Weekly review* clears the Inbox, carried-over tasks, projects without a next step, and quiet projects, then glances at Someday. *What moved* is a list of the week's work, never a score. None of them starts on its own.
- **Write.** Choose *New note* (⌘⇧N or the palette) to open a blank page with the cursor in the title. `/` opens the insert menu with basic blocks first; charts, KPIs, roadmaps, and diagrams sit under *More blocks*.
- **Manage a project.** The project page shows a title, a short description (free text, no template), **Tasks** with inline add, and **Notes** with inline add. Properties (status, color, dates) sit in a small property row. When every task is done, the page offers **Mark project done** (or *Not yet*); it never closes a project on its own.
- **Find.** ⌘K searches titles and full text together, with recent items first, and also lists commands (New note, New task, New project, Toggle theme, Settings, …).

## Every page has properties, inline

The top of a Task page shows a property row: **Status · Due · Defer · Flag · Repeat · When · Estimate · Project · Tags · Area**. Notes show **Project · Tags · Spaced review · Area**. Projects show **Status · Next step · Color · Tags · Area**. Journal pages show their date; templates say what they are for. Every property can be edited in place, and choosing an area moves the file to that area's folder.

## Mail

Mail is the seventh place (⌘7). It watches the user's own mailboxes (iCloud and Gmail with app-specific passwords, or any IMAP account) and shows only what needs them. Mail is not the Inbox: the Inbox holds captures; Mail holds email.

- **Views.** *Needs you* (*Needs action* and *Needs a reply*; the sidebar count), *FYI* (worth knowing, nothing to do), *Waiting* (questions the user sent that have had no answer for a few days), *Handled* (what myOS filed, with Undo on every move), and *Outbox* (drafts waiting for approval).
- **Deciding.** Every email gets a lane, a kind (person, newsletter, receipt, bill, …), a one-line summary, the reasons it is there, and a deadline when the text states one. myOS decides from headers and words on its own; the user's rules, *Always show* and *Muted* lists, and optionally an assistant command they choose refine it. Mail from a person is never filed without the user's own rule.
- **Acting.** *Done* (e) archives; *Make task* (t) creates a Task with the deadline and matched project, linked back to the email; *Reply* (r) starts a draft, written by hand or by the assistant. *Go through* handles everything one at a time. "Not right?" moves an email and teaches a rule for that sender.
- **How much myOS may do.** *Watch only* (the default) changes nothing in the mailbox and shows what it would file; *Sort for me* files mail that needs no attention as it arrives, into `myOS/<Kind>` folders (Gmail labels) or the archive. Tasks from mail can be off, suggested, or automatic.
- **Always on.** Closing the window leaves myOS in the tray, still checking; *Start at login* launches it there. A notification arrives when new mail needs the user. `myos mail` prints the same briefing in a terminal.
- **Never on its own.** Nothing is sent without the user reading the draft and confirming *Send*. Nothing is deleted. The assistant only advises: it cannot send, and its verdicts pass the same rules and guards.

## Things that are advanced, not gone

Git ignore rules live under **Settings → Advanced**; "Open in editor" and "Show in folder" live in a page's ⋯ menu, which ends with the page's length, reading time, and when it was created and last edited; commit links in a note preview their changes and open the diff. The interface never mentions frontmatter or YAML.

## Data safety

- Every save is conditional on the revision the editor last read. If the file changed on disk (another editor, Git, sync), myOS shows **"This page changed on disk"** with *Load theirs* and *Keep mine* and never overwrites silently.
- Undo restores exactly: same path, same frontmatter (including custom keys), same body. A page follows its file when it is renamed, moved to another area, or either is undone.
- Opening a page never rewrites its file. Editing one block rewrites only that block; every untouched block keeps the exact Markdown it was written in. Changing a property rewrites only that property's line in the frontmatter, and a save with no property changes touches only `updated:`. Ticking a checklist item from Today or a project changes that one line.
- File names follow titles: after you stop editing a title, the file is renamed to `<slug>.md` in its folder (unique, revision-checked, undoable; off in Settings). Moves leave no empty folders behind.
- New items start empty. There are no template placeholders.
- Mail: myOS only moves messages and sets read flags, logs each change with an Undo, and sends only a draft the user confirmed. App passwords are encrypted with the system keychain; the mail cache lives under the app's data directory, never in the folder.
- Version history keeps a copy before saves (at most one per file every ten minutes) and before every delete, retype, rename, or move, outside the folder under the app's data directory, one tree per workspace: the latest 50 per file, for 60 days. Restoring a version is revision-checked and undoable.
