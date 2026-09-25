# Something Felt Off

*It began with a feeling nobody could name. It ended with a notes and tasks app that finally sits still. This is the story of how myOS took itself apart and came back calm.*

By the myOS Editors

---

The brief was a single sentence, and it was not a specification. "Something feels off with the app and I'm not sure what it is."

Anyone who has stood in front of a mirror in a jacket that fits on paper and wrong on the body knows the feeling. The measurements are all there. The cloth is good. And yet the whole thing pulls somewhere you cannot point to.

myOS, in its 1.x life, was a garment like that. It was already principled: a local-first Electron app for Markdown notes, tasks, and projects on macOS and Linux, including Omarchy and Hyprland, with no account, no sync, no telemetry, and no bundled AI. Its owner did not want to change any of that. They wanted something harder to spec. They wanted a world-class, lovely, consumer-friendly product, "almost Meta's Muse-like", built on elegant, modular code.

So before a line was rewritten, the app was sent for a fitting.

## The fitting

Five reviewers, all of them agents, each took one angle: visual language, UI implementation, UX and information architecture, system architecture, and a live walkthrough that produced 46 screenshots. What came back was not one flaw. It was a pattern of small ones, each defensible alone, which together explained the unease.

Start with the type, because the eye always does. The interface font, Geist Sans, was never loaded. On Linux the fallback chain quietly resolved to Liberation Sans, an Arial clone, which then sat beside carefully chosen serifs. Four typefaces competed on one screen. The dominant label was 10px uppercase monospace in tertiary ink, at about 3.3:1 contrast, below accessibility minimums. Behind it, the CSS held 34 distinct font sizes and 77 distinct pixel values.

> The measurements were all there. The cloth was good. And yet the whole thing pulled somewhere you could not point to.

Then there was the costume. The code and the copy were dressed as a newspaper: Daybook, masthead, ledger, an "In Play" lamp, stamp, plate, garnish, dateline, and the empty-state line "Nothing on the books". The surfaces were nearly flat, stepping at about 1.06:1, and leaned on 0.5px hairlines to hold themselves apart. An Ultra Violet accent sat on cream paper and argued with it. The review had a name for it: paper-and-ink cosplay.

Underneath the costume was a filing cabinet. Eleven types multiplied by four domains decided where every file lived, so capture asked people to choose a type and a domain before they had finished a thought. Where they did not choose, keyword heuristics guessed: the word "book" sent an item to Personal. Explaining it all took a 20-entry glossary: Unfiled, Waiting, Refine, Process, In Play, Next, now line, The Record, sessions, Materials, Vitals, Dormant, and more. It was a developer's filing cabinet, and it showed.

## The promises that were not kept

Some of what felt off was simply untrue. Defer never hid anything. The Auto-save toggle was deliberately ignored. Notification history could be cleared but never viewed. The README advertised editor modes that did not exist. New projects wrote the literal placeholder "[What are you trying to change?]" into the user's files.

And some of it was quietly dangerous. If a file was edited elsewhere, in vim or by a git pull, autosave overwrote the change without a word, because the editor reloaded only when a frontmatter date changed. Undoing a delete lost custom frontmatter and moved the file. The same list of fields was maintained by hand in about 12 places.

The code carried the same weight as the interface. A 3,659-line global stylesheet. A 1,005-line editor component with variants no one could reach. About 1,900 duplicated lines across five block editors, each with its own "Apply" button. IPC typed on one side only, with four error styles, 42 direct bridge calls across 15 files, and a renderer that could point the workspace root at any folder.

:::sidebar
**The glossary, retired**

myOS 1.x needed a 20-entry glossary. Among the words it had to explain: *Unfiled, Waiting, Refine, Process, In Play, Next, now line, The Record, sessions, Materials, Vitals, Dormant.*

myOS 2.0 needs four nouns: **Note, Task, Project, Inbox.** The word "artifact" survives, but only inside the code.
:::

## The alteration

The response was not a new coat of paint. It was a recut, made in five recorded decisions (see "Five Decisions That Made 2.0" in this issue). The on-disk schema stayed, so existing folders, the CLI, and an external agent-tracking tool kept working, but the product model shrank to four nouns. Every read and write began carrying a file revision. IPC became one typed table. The Chronicle design language was replaced by a warm, soft consumer system built on Inter. And styling collapsed into a single approach, Tailwind over primitives, enforced by lint.

The work was done in parallel. Specialist agents took the data core, the design system, the shell, the content surfaces, and the editor, each in its own git worktree, while an orchestrator wrote the contracts between them, merged, resolved conflicts, and handed the result to a final end-to-end QA agent.

After QA came two upgrades that nobody would see and everybody would feel. Untouched Markdown blocks are now written back byte for byte. Inline text like `Result<T>`, once swallowed as HTML on save, now stays exactly as typed. Both were checked against a copy of the owner's real 82-note workspace: zero changes on open, zero collateral changes on edit.

> Opening a page never rewrites its file. It is the least glamorous sentence in the product, and the one it is built on.

## What it feels like now

Press ⌘N from anywhere and type. Words like `tomorrow`, `#tag`, `@project`, or `!` are welcome and never required. Sort the Inbox one item at a time with single keys (T, N, P, D, ⌫, →) until the screen says, simply, "Inbox zero. Nice." Today gathers what is overdue, due, flagged, or in progress; completing a task ends in a small spring and a toast that reads "Done · Undo". Notes are search-first. Projects gather a description, tasks, and notes. Every page edits its properties in place.

If a file changes under you, the page no longer pretends otherwise. It says "This page changed on disk" and offers two honest choices: *Load theirs* or *Keep mine*.

The numbers tell the rest in the language of tailoring: the cloth was taken in. Total source lines went from 42,197 to 17,200, down 59 percent. CSS went from 5,220 lines to 763. Files over 400 lines went from 14 to one. Raw controls outside the design system went from 119 to zero.

:::sidebar
**2.0, in one breath**

Capture anything with ⌘N. Sort the Inbox one item at a time until "Inbox zero. Nice." Today shows what is overdue, due, flagged, or in progress. Complete a task, feel the spring, read "Done · Undo". Notes are search-first; projects gather a description, tasks, and notes. Light and dark themes, a choice of accents, and a serif reading option.
:::

## And now, 3.0

A calm product is not a finished one. The next season of myOS brings twenty features, chosen from three tracks of research: the market, persona walkthroughs, and behavioral science. They arrive under binding guardrails: no streaks, no guilt, opt-in nudges, honest progress, and privacy by construction.

The feeling that something was off has a name now, and a fix. What remains is the quieter pleasure of a thing that fits.
