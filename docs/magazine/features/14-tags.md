---
no: 14
name: Tags and filters
section: Notes and knowledge
headline: Hashtag, Finally Useful
dek: Every tag gets a page. Notes gets filters. A tag you add is now a way back to what you wrote.
howto: Type `#tag` in the palette (⌘K) to open a tag's page. In Notes, use the Project, Tag, Area, and Kind chips, or the # button for the Tags list.
caption: A tag page lists everything tagged, with related tags under Often with.
layout: framed
image: 14-tags-light
rect: 33 0 82 90
---
In 2.0 you could add tags to anything and use them to find nothing. The walkthrough searched ⌘K for "#family" and got "Nothing matches". There was no tag view and no way to filter Notes by tag or by project.

Now each tag has its own page at `/tags/<tag>`. The header counts what it holds, for example "3 notes · 2 tasks · 1 project", and the page lists Tasks, Notes, and Projects in turn. A row labelled **Often with** shows the tags that tend to travel alongside it. Typing `#tag` in the palette goes straight there.

The Notes list gains four filter chips: **Project**, **Tag**, **Area**, and **Kind**. Kind includes Journal, the only way journal pages appear in Notes. A # button in the Notes header opens the **Tags** list, most used first, with counts.

None of this adds a new place to maintain. Tags remain ordinary `tags` in each file's frontmatter, readable in any editor, and every view is computed from them on demand.
