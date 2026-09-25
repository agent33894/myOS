# The Folder Is the Product

**Why a directory of Markdown files is the right home for a developer's notes and tasks, and what an editor built around that idea chooses to do, and not do.**

By the myOS Editors

Open a terminal and type `ls` in the place where you keep your notes. What comes back is the whole of the data model. There are folders, and inside them there are files ending in `.md`. Some have a block of YAML at the top. Some have checkbox lines. Some link to each other with `[[double brackets]]`. That listing is everything myOS Next knows about, and everything it needs.

The product documentation puts it in one sentence: myOS Next "opens the folder as it is." It needs no special layout, no special fields, and no account. It reads Markdown, and when it writes, it writes Markdown. Nothing else is stored in the folder. Settings, the list of saved views, and the local copies of files it keeps for safety live in the app's own data folder: `~/.config/myOS Next` on Linux, `~/Library/Application Support/myOS Next` on macOS.

## Why plain files

The case for plain files is not new, but it is worth stating in terms a developer will recognize.

**Plain files are durable.** A Markdown file does not depend on a server, a sync service, or a database format to be read.

**Plain files are portable.** The same folder can be opened in Vim, in VS Code, in Obsidian, and in myOS Next, on the same afternoon. Each tool sees the same bytes.

**Plain files work with the tools you already use.** `grep` finds things in them. `git diff` shows exactly what changed. A shell script can append a line to one. A code review can include one.

**Plain files are already where the work is.** A project's `docs/` folder, a vault of meeting notes, a `TODO.md` at the top of a repository: the notes and tasks already exist. An app that requires moving them into its own structure asks you to maintain two copies, or to give up the one you had.

The decision record behind myOS Next states the context directly: developers and power users "already keep Markdown in folders, repos, and Obsidian vaults," and typed one-file-per-task storage and derived folder layouts "get in their way." The chosen approach, in its words, "works on existing vaults and repos with zero migration and interoperates with Obsidian and Git." Two alternatives were considered and set aside: keeping a typed model, which imposes structure, and a database index, which "breaks plain-file ownership."

> A database would have made some things easier. It would also have made the folder a copy of the truth instead of the truth.

## What the app does

The window has three columns. On the left, the folder's real folders and files, with Today, Tasks, and any pinned views above them. In the middle, the note, centered on a raised page. On the right, a panel with the note's Outline, Backlinks, Properties, Changes, and History. Both side columns fold away. A status bar along the bottom shows the branch, the number of changed files, the note's word count, and whether it is saved.

Within that frame, the app does a short list of things:

- **Shows files as they are.** Create, rename, move, and delete files and folders in the app or anywhere else. The file watcher picks up changes on disk, and the sidebar updates.
- **Finds tasks in any note.** A checkbox line such as `- [ ] Fix the login redirect 📅 2026-10-02 #auth` is a task, wherever it sits. The dates use the syntax of the Obsidian Tasks plugin; a plain `due:2026-10-02` works too.
- **Collects what is due.** Today shows today's daily note, and below it the tasks that are due, scheduled, or starting today, plus anything late. Tasks lists every open task in the folder.
- **Runs views.** A view is a search written as one line of text, such as `open due<=today #work group:file`. It can be saved to the sidebar or placed inside a note as a `view` block whose results update as files change.
- **Captures.** ⌘N, or `myos-next add "…"` in a terminal, adds one line to today's daily note.
- **Works with Git.** If the folder is in a Git repository, the app shows changed files, commits with a message, shows a file's history with diffs, and pulls or pushes when you click.
- **Keeps edits safe.** Saves check that the file has not changed on disk since it was loaded. Editing one block never rewrites the rest of the file. A local copy is kept before saves.
- **Exports.** PDF, HTML, or a copy as Markdown or rich text.

Frontmatter is optional. When a note has it, every key shows as an editable property. Changing a property rewrites only that key's lines; key order, quoting, list style, and comments stay as they were. Frontmatter that is not valid YAML is left untouched.

## What it deliberately does not do

The list of things left out is as considered as the list of features.

**It does not impose a structure.** There is no required folder for projects, no inbox directory, no file per task. New files go where you create them. The daily notes folder and file name pattern are settings, and when the folder is an Obsidian vault with daily notes configured, those settings are used.

**It does not add metadata you did not ask for.** Opening a note never changes it. The title shown above a note comes from its frontmatter `title` or its file name; nothing is written to the file to make a title. The lines the app does write, such as the completion date on a checked task, are documented, and they are the same lines the Obsidian Tasks plugin writes.

**It does not reformat your text.** If you edit one paragraph, the other paragraphs, tables, and lists are saved exactly as they were typed. A file with Windows line endings keeps them.

**It does not use the network, except when you click Pull or Push.** There is no account, no sync service, no telemetry, and no bundled AI.

**It does not replace your other tools.** Show in file manager puts any note in front of the programs you already use, and a terminal command runs the same queries as the app.

> The promise is narrow on purpose: the folder works the same in any other editor, in Obsidian, and in Git.

## The promise, in practice

That last sentence is listed in the product documentation under "Always true," and it is the test every feature has to pass.

In any other editor, the files are Markdown with no hidden fields. A task is a line you can edit by hand. A view block is a fenced code block named `view`; other editors show it as a line or two of query text.

In Obsidian, the task syntax is the Obsidian Tasks syntax, so dates, priorities, repeats, and completion markers mean the same thing in both. `[[Links]]` resolve by path, then file name, then title. Daily notes follow `.obsidian/daily-notes.json`. The first-run screen says it plainly when it finds a vault: "Obsidian vault found. Daily notes and links will work the same."

In Git, every change the app makes is a change to a text file, which shows up in `git status` and reads cleanly in a diff. When the open folder is a subfolder of a repository, such as a project's `docs/`, the Changes panel lists only files inside that folder and leaves the rest of the repository alone.

It all comes from one choice: the folder is the data, and every Markdown file in it is a note. The rest of this issue follows from that.

:::sidebar
**What myOS Next understands in a folder**

| Thing | On disk |
| --- | --- |
| Folder | The folder you opened, shown as it is, empty folders included |
| Note | Any `.md` file outside dot folders and `node_modules` |
| Task | A checkbox line in any note, or a file with `type: todo` |
| Daily note | `daily/2026-09-25.md` by default; folder and pattern are settings |
| View | One line of query text, saved to the sidebar or in a `view` block in a note |

Stored outside the folder: settings, saved views, local copies.
:::
