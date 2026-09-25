---
no: 14
name: Git changes
headline: Commit from the panel
dek: In a Git repository, the app shows what changed and commits it with a message. Pull and Push run only when you click.
how: ⌘⇧Enter opens Changes; ⌘⇧Enter again commits.
caption: The diff for one changed file, dark theme: one line replaced, two added. The Changes panel waits behind it.
---

If the open folder is in a Git repository, the app uses the `git` you already have. Changed files carry a dot in the file list. The Changes panel lists them with checkboxes, above a **Summary** field and an optional **Description**. Click a file to see its diff against the last commit.

⌘⇧Enter opens the panel with the cursor in Summary; type a sentence and press it again to commit the selected files. When the open folder is a subfolder of a repository, such as a project’s `docs/`, the panel lists only files inside it and leaves the rest alone.

The panel shows the branch and its upstream, with **Pull** and **Push** and a count when you are behind or ahead. Pull runs `git pull --rebase --autostash`; Push runs `git push`. Git runs without prompts, and its errors are shown as Git wrote them. Outside a repository, the panel offers to initialize one.
