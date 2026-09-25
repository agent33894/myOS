---
no: 15
name: History
headline: Every version of a note
dek: One list per note: the Git commits that touched it and the local copies the app kept, each with a diff and a restore.
how: Choose “Show history” in the command bar, or open the right panel with ⌥⌘B.
caption: History for Rate limits. Commits on the left; on the right, one commit’s diff and Restore this version.
---

The History panel lists a note’s past, newest first. **Commit** rows give the subject, author, and short hash; renames are followed, so the list continues past a note’s old name. **Local copy** rows are the copies the app keeps in its own data folder before saves, at most one every ten minutes, the last fifty for thirty days. A folder without Git still has local copies.

Click any entry for the History window. It shows what changed from that version to now, and **Restore this version** writes it back. The text it replaces becomes the newest local copy, and the confirmation offers Undo.

Local copies are kept outside your folder, under a separate subfolder for each folder you open. They never appear in `git status` and never travel with a sync service.
