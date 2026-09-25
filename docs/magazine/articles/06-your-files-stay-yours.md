# Your Files Stay Yours

**An editor that works on a folder other tools also touch has to be careful. Here is exactly how myOS Next saves, what it refuses to overwrite, and when it uses the network.**

By the myOS Editors

A folder of Markdown is shared ground. You edit it in myOS Next, in Vim, in Obsidian. A `git pull` rewrites half of it. A script appends to a log. Any editor that saves into that folder needs to know whether the file on disk is still the one it loaded. myOS Next is built around that question.

## Saves that check first

Every note the app opens has a revision, taken from the file's modification time and size. When you type, the app saves in the background against the revision it loaded. If the file on disk has a different revision, the save is refused. Nothing is written.

What happens next depends on whether you have unsaved edits. If you do not, the note reloads with the new text and the caret stays about where it was. If you do, a banner appears above the note: "This note changed on disk. Load the saved version, or keep your edits and save over it." Two buttons follow, **Load theirs** and **Keep mine**. The app does not guess, merge, or pick the newer one. Nothing is overwritten until you choose.

The app recognizes its own saves by their revision, not by timing, so a save it just made does not trigger a false alarm. Task edits from lists carry the exact text of the line too, as the article on tasks describes, so a checkmark never lands on a line that has moved.

## Byte-exact edits, untouched blocks

The rendered editor shows Markdown as formatted text: headings, lists, tables, code. Editors like this usually work by parsing the file into a tree and printing the tree back out as Markdown. That round trip is where formatting drifts. A table's columns get realigned. `*` bullets become `-`. Blank lines change. A file you edited in one paragraph shows forty changed lines in `git diff`.

myOS Next keeps a map from each block in the editor to the exact source text it came from. When you save, blocks you did not touch are written back from that source, byte for byte. Only the block you edited is printed fresh. In Markdown source mode, the rule is simpler still: what you type is what is saved, and a file with Windows line endings keeps them.

> Edit one paragraph, and the diff shows one paragraph.

The same care applies to frontmatter. Changing a property rewrites only that key's lines. Key order, quoting, list style, and comments stay as they were. Frontmatter that is not valid YAML is left alone entirely; the text below it can still be edited.

Undo is exact as well. Undoing a file change, a task check, a capture, a move, or a delete puts back the bytes that were there.

## Local copies

Before a save, the app keeps a copy of the file as it was. These copies live in the app's data folder, never in your folder, under a subfolder for each open folder so two folders never mix. At most one copy is kept per file every ten minutes during saves. Copies are also kept before a delete and before a restore. Each file keeps its last fifty, and none older than thirty days.

Copies follow a file when it is renamed or moved in the app. They are listed in the note's History panel as "Local copy," with the time, next to Git commits if the folder has any. Each entry shows what changed from that version to now, and **Restore this version** puts it back. Restoring is itself undoable, and the text it replaces becomes the newest local copy.

Deleting a folder takes a local copy of each note in it first, and moves the files to the system trash when there is one.

## Git, when the folder has it

If the open folder is in a Git repository, the app uses the `git` binary you already have, run inside that folder.

**Changes.** The file list marks changed files with a dot. The Changes panel lists them with their diffs, and has a Summary field and an optional Description. Press ⌘⇧Enter to commit. Outside the panel, the same keys open it with the cursor in the Summary field. A commit can include all changes or only the files you select.

**History.** Each note has a History panel: the commits that touched it, newest first, each with its subject, author, and diff. Renames are followed, so a note's history continues back past its old name. Restoring a file from a commit writes that commit's bytes into the file, and the replaced text is kept as a local copy.

**A folder inside a repository.** Many developers keep notes in a repository's `docs/` folder. When that subfolder is what you open, the Changes panel shows only files inside it, and committing all changes includes only changes inside it. The rest of the repository is left alone.

**No repository yet.** Outside a repository, the Changes panel says "Not a Git repository" and offers `git init` in the open folder. It will not create a repository inside one that already exists.

Paths are passed to Git after `--` as literal pathspecs, so a file named `-rf.md` is only ever a file name. Commit hashes are validated before use. Git's own error messages are shown as Git wrote them.

## Pull and Push, only on click

The Changes panel shows the branch and its upstream, and two buttons: Pull and Push, each with a count when the branch is behind or ahead. Pull runs `git pull --rebase --autostash`. Push runs `git push`. Each runs only when you click it, and the result is shown in one line.

Git runs with prompts turned off. If a remote needs a password the app cannot supply, the command fails with Git's message instead of waiting for input nobody can see.

## No network otherwise

That is the whole list. myOS Next uses the network for Git pull and push, when you click them, and for nothing else. It has no account, no sync service, no telemetry, and no bundled AI or model provider. It reads and writes only the folder you open, plus its own settings and local copies in its data folder.

Sync, if you want it, is whatever you already use for files: Git, a synced drive, or nothing at all. The app does not need to know.

:::sidebar
**What is kept, and where**

| Item | Where | Kept |
| --- | --- | --- |
| Your notes | The folder you open | As you wrote them |
| Settings and saved views | `settings.json` in the app data folder | Until changed |
| Local copies | `history/` in the app data folder | 50 per file, 30 days, at most one per 10 minutes of saving |

App data folder: `~/.config/myOS Next` (Linux), `~/Library/Application Support/myOS Next` (macOS).

**Network:** Pull and Push, on click. Nothing else.
:::
