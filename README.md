# myOS Next

myOS Next is a quiet editor for a folder of Markdown files, for macOS and Linux. It opens the folder as it is: your notes, docs, to-dos, or Obsidian vault. It needs no special layout, no special fields, and no account, and it adds nothing to your files that you did not type.

## What it does

- **Files as they are.** The sidebar shows the folder's real folders and files. Create, rename, move, and delete them in the app or anywhere else; changes on disk show up right away.
- **Tasks in any note.** `- [ ] Fix the login redirect 📅 2026-10-02 #auth` is a task. Obsidian Tasks dates and repeats work, and so does a plain `due:2026-10-02`.
- **Today and Tasks.** Today shows today's daily note and the tasks that are due, scheduled, or late. Tasks lists every open task, narrowed with a one-line view such as `open due<=today #work group:file`.
- **Views.** Save a view to the sidebar, or put one in a note as a fenced ```` ```tasks ```` block that updates live.
- **Capture.** ⌘N (or `myos-next add "…"`) adds a line to today's daily note. A date, a repeat, `!`, or `[ ]` makes it a task.
- **Git.** If the folder is a Git repository, see changed files, commit, read a file's history, and pull or push when you choose.
- **Safe edits.** Saves check that the file hasn't changed on disk, undo is exact, a local copy is kept before each save, and editing one block never rewrites the rest of the file.

The details are in [`docs/product-model.md`](docs/product-model.md) and [`docs/file-format.md`](docs/file-format.md).

## Install

From source on Linux:

```bash
cd dashboard
npm ci
npm run install:local
```

This installs to `~/Applications/myOS Next`, adds a launcher entry, and links the `myos-next` command. myOS 3.0, if installed, stays as it is. See [building and updating](docs/building-and-updating.md) for macOS builds and packages.

## Develop

```bash
cd dashboard
npm ci
npm run dev
npm run typecheck && npm run lint && npm test
```

The code layout is in [`docs/architecture-overview.md`](docs/architecture-overview.md).

## Privacy

myOS Next reads and writes only the folder you open. Its settings and local copies stay in the app's data folder. The network is used only when you click Pull or Push. There is no account, telemetry, or bundled AI.

## License

[MIT](LICENSE)
