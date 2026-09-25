---
no: 20
name: Version history
section: Files and trust
headline: Every Earlier Draft
dek: Quiet snapshots of every page, kept outside your folder, with a readable comparison and a way back.
howto: Choose Version history… in a page's ⋯ menu, or run "Version history" from the palette (⌘K).
caption: Version history. Earlier copies on the left; on the right, a readable diff compared with now, and Restore this version.
layout: split
image2: 20-version-history-dark
image: 20-version-history-light
---
The Git plugin for Obsidian has 3.2 million downloads, and Obsidian Sync sells version history as a feature. People want a way back. Most would rather not run version control to get one.

In 3.0, every save keeps a copy of the page as it was just before, at most one every ten minutes per file. myOS also takes a copy, regardless of the ten-minute limit, before every delete, retype, rename, area move, and restore. The latest 50 copies of each file are kept, and anything older than sixty days is pruned.

The copies live in the app's own data folder, keyed to your workspace. They are never written into your folder, so your Git history and your file tree stay exactly as clean as you left them. When a file is renamed or moved, its history follows it.

**Version history…** in a page's ⋯ menu lists the copies by day and time. Choose one to see a readable diff, "Compared with now", with lines added and removed. **Restore this version** is revision-checked, snapshots the current text first, and can be undone. Nothing is ever lost by looking back.
