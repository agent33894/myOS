---
no: 10
name: Properties
headline: Frontmatter, key by key
dek: When a note has YAML frontmatter, every key is an editable property. Only the key you change is rewritten.
how: Open the right panel with ⌥⌘B, or choose “Edit properties” in the command bar.
caption: The Properties panel for a release note, with a status, an owner, a target date, and two tags.
---

Frontmatter is optional. When a note has it, the Properties panel on the right lists every key: text, dates, lists, whatever was there. Edit a value in place, or choose **Add property** for a new name and value. With no frontmatter at all, the panel offers to start a block.

The rewrite is narrow. Changing one property touches only that key’s lines. Key order, quoting, list style, and comments stay as they were. A list written one item per line is changed item by item; a list written `[a, b]` stays on one line. Dates are written unquoted. Removing the last property removes the block.

For larger changes, **Edit as YAML** shows the block as text, and still rewrites only the properties you change. Frontmatter that is not valid YAML is left alone; the note below it can still be edited.
