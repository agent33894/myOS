# Five Decisions That Made 2.0

*Great collections are defined as much by what the designer refuses as by what goes down the runway. The overhaul of myOS came down to five recorded choices. Here is each one: the problem it answered, the road it took, the road it left, and what it cost.*

By the myOS Editors

---

Each of these decisions was written down in the owner's own myOS workspace, as a Markdown file, in the same folder the app manages. Each record has four parts: context, decision, rationale, and consequences, and the rationale names the alternatives that were weighed. It is a small, fitting detail. The record of how the product was remade lives in the product, and the roads not taken below are quoted from it.

What follows is not a list of features. It is a list of commitments, the kind that make later choices easier because some things are simply settled.

## 1. Keep the files. Simplify the story.

**The context.** myOS 1.x filed everything by eleven types across four domains. Capture asked people to choose both. A 20-entry glossary explained the result. Yet underneath, those files were real, and people and tools depended on them: existing folders, the `myos` command-line tool, and an external agent-tracking tool that writes into the same workspace.

**The choice.** Keep the on-disk schema exactly as it was, and simplify only the product model. The interface now speaks four nouns: Note, Task, Project, Inbox. "Artifact" stays in the code only. Users never choose a folder, a domain, or a type directory; paths are derived. The `domain` field is still read and written for compatibility, but the interface never asks for it or shows it.

**The roads not taken.** The record names two. A new document type with a migration, which it calls "risky" because it would break the CLI and the tracking tool. And a full rename of "artifact" to "Doc" throughout the code: "large churn, no user value". What the chosen road bought instead is listed just as plainly: zero migration, round-trip safety for user files and agent records, and no churn across more than 400 call sites.

**The consequence.** The simplification happened where people feel it and nowhere they would be hurt by it. Older typed files, decisions, meetings, research, and the rest, are simply Notes now, with their type shown as a subtle *kind* label.

> The simplification happened where people feel it, and nowhere they would be hurt by it.

## 2. Every write knows what it is replacing.

**The context.** In 1.x, if a file changed on disk, from vim or a git pull, autosave overwrote it silently. The editor reloaded only when a frontmatter date changed, so anything else slipped through.

**The choice.** Revision-checked writes and a conflict banner. Every read and write carries a file revision, written as `mtimeMs:size`. A save that arrives with a stale revision returns `CONFLICT`, and the page says: "This page changed on disk", with two choices, *Load theirs* and *Keep mine*. The app recognizes its own saves by revision, not by timing.

**The roads not taken.** The record weighs two alternatives. Content hashing, fingerprinting every file, was rejected as slower on large workspaces. Last-write-wins, letting whichever save arrives last simply win, was rejected in one word: unsafe. The revision was chosen because it is "deterministic, cheap, needs no content hashing of every file", and it retired the old timing-based autosave gate, the one that had mistaken real outside edits for the app's own echo.

**The consequence.** If there are no unsaved local edits, a changed file reloads silently. If there are, you are asked. Nothing is overwritten until you choose.

## 3. One table for every conversation.

**The context.** The channel between the app's interface and its file system was typed on one side only and spoke four different error styles. There were 42 direct bridge calls across 15 files, and the renderer could set the workspace root to any folder at all.

**The choice.** One typed IPC table. Every channel, its arguments, and its result live in a single contract. Errors come back as `Result<T>` with a small set of codes: `NOT_FOUND`, `CONFLICT`, `INVALID`, `OUTSIDE_WORKSPACE`, and `INTERNAL`. A generic preload exposes one allow-listed `invoke`. And the workspace can be chosen only through the native folder dialog.

**The road not taken.** Here the record lists no rival design, only reasons, and they read like a specification for trust: one place to add a channel, compile-time checks on both sides, stable error codes instead of matched error strings, and a smaller attack surface.

**The consequence.** Direct Electron bridge calls went from 42 in 15 files to 2 in one file. The interface can no longer wander outside the folder it was given.

:::sidebar
**The error vocabulary**

Five codes cover every way a request to the file system can fail:

- `NOT_FOUND`: the file is not there.
- `CONFLICT`: the file changed since you read it.
- `INVALID`: the request does not make sense.
- `OUTSIDE_WORKSPACE`: the path leaves your folder.
- `INTERNAL`: something unexpected, reported honestly.
:::

## 4. Replace the costume with clothes.

**The context.** The Chronicle design language dressed a notes app as a newspaper: Daybook, ledger, masthead, stamp. The interface font never loaded, so Linux users saw an Arial clone. Labels were 10px uppercase monospace at about 3.3:1 contrast. Surfaces were nearly flat and held apart by 0.5px hairlines. An Ultra Violet accent clashed with the cream.

**The choice.** Replace Chronicle entirely with a warm, soft consumer design system. Inter Variable is bundled, with Literata as an optional reading serif and Geist Mono for code only. A 12 to 32 type scale on a 14px base. Warm neutrals with three elevation levels. One `--accent` with an OKLCH `color-mix` ramp, defaulting to Iris, `#5B5BD6`. A 4pt grid, radii of 6, 10, 14, and 20, three motion tokens and one spring. Every text token at least 4.5:1.

**The roads not taken.** Two, according to the record. Refining Chronicle was rejected because it "keeps the root causes": the metaphor itself was part of what felt off, and a better-made costume is still a costume. Geist Sans, the font the old interface had meant to load, was rejected as "more technical, less warm". The rationale for the rest is practical: bundled, legible type fixes the biggest visual flaw, and depth made from tone and shadow reads well on non-retina Linux screens. Tokens are now written directly in CSS, which removed a code-generation step.

**The consequence.** Distinct CSS font sizes went from 34 to 10. CSS as a whole went from 5,220 lines to 763.

> A better-made costume is still a costume.

## 5. One way to dress a component.

**The context.** Two styling systems lived side by side: a 3,659-line global stylesheet in the features, and raw Tailwind carrying 288 arbitrary values in the editor and its blocks. There were 91 uses of `!important` and 119 raw controls outside any design system.

**The choice.** Tailwind, with primitives in `src/ui`, as the single styling approach, enforced by lint. No raw buttons or inputs outside that folder. No hardcoded colours. No arbitrary values outside `src/ui`.

**The road not taken.** Per-feature CSS modules. The record dismisses them in three words: "still two systems". The chosen approach offered one language, styles kept next to the components they dress, and primitives that enforce consistency on their own.

**The consequence.** Raw controls outside the design system: zero. `!important`: two. The rule lives in the linter, so it does not depend on anyone remembering it.

:::sidebar
**What the five have in common**

Each decision moves a promise from intention into structure. The schema is kept by not touching it. Safety is kept by a revision on every write. The boundary is kept by one table and one dialog. The look is kept by tokens. The discipline is kept by lint. None of them relies on good behaviour to stay true.
:::

## Afterword

Read together, the five decisions describe a temperament more than a plan. Keep what people rely on. Refuse to guess. Put the rules where they cannot be forgotten. Change the surface boldly once the ground beneath it is sound.

That temperament carries straight into 3.0, whose twenty features sit on this foundation and are held to the same kind of written rules: its guardrails.
