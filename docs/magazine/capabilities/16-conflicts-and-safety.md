---
no: 16
name: Conflicts & safety
headline: Nothing overwritten by surprise
dek: Every save checks that the file on disk is still the one the app loaded. When it is not, you choose.
how: Nothing to press until it matters. Then choose Load theirs or Keep mine.
caption: The banner on a note named Timeouts, after the file changed on disk while it had unsaved edits.
---

Each open note has a revision, taken from the file’s size and modification time. The app saves against that revision. If the file changed on disk in the meantime, through another editor, a script, or a `git pull`, the save is refused and nothing is written.

With no unsaved edits, the note simply reloads. With unsaved edits, a banner appears above the note: “This note changed on disk. Load the saved version, or keep your edits and save over it.” **Load theirs** takes the file on disk. **Keep mine** saves your text over it. The app does not merge and does not guess.

The same care runs through everything else. Task edits check the exact text of their line. Undo puts back the exact bytes. Unchanged blocks are saved as they were typed. The network is used only when you click Pull or Push.
