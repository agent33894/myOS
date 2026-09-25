# Under the Hood

*The calm you see is held up by a quieter kind of craft: a revision on every write, one table for every request, one list of fields, and a Markdown writer that leaves your words exactly where you put them. A tour of the lining.*

By the myOS Editors

---

In couture, the lining is where the real work hides. Nobody photographs it. Everybody feels it when it is wrong.

myOS 2.0 spent as much care on its lining as on its silhouette. The result is a product that is smaller, stricter, and far harder to hurt your files with. The overhaul removed 40,273 lines and added 14,861. What remained was not merely less. It was better arranged.

## The shape of the thing

The app has three layers and one domain object. A selected folder of Markdown sits at the bottom, watched by the Electron main process. Above it, a shared layer holds the domain, the field schema, the IPC contract, and the rules for Today and capture. At the top, the interface: one data store, derived selectors, and a single gateway through which every write passes.

The domain object is the artifact: one Markdown file, YAML frontmatter plus a body. It is the only thing myOS persists. The word never reaches the screen. In the interface, artifacts are Notes, Tasks, Projects, and Inbox captures, and Task, Project, and Inbox are selectors over that one shape rather than separate stored things.

## A revision on every write

The most important line of code in 2.0 is almost invisible. Every artifact carries `rev`, a file revision in the form `mtimeMs:size`, stamped by the main process on every read and every write.

The editor keeps the `rev` it loaded. Autosave sends it back as `expectRev`. If the file on disk no longer matches, the save is refused with `CONFLICT`. When the watcher reports a new revision, the editor reloads silently if you have no unsaved edits, and shows the banner if you do: "This page changed on disk", *Load theirs* or *Keep mine*.

The app knows its own saves because the returned revision matches, not because a save happened recently. Timing lies. Revisions do not.

> Timing lies. Revisions do not.

## One table

`shared/ipc/contracts.ts` is the single table of channels, argument types, and result types. In the main process, `handle(channel, impl)` is type-checked against it and wraps every result as `Result<T>`. The preload exposes one generic `invoke(channel, ...args)`, restricted to allow-listed channels. On the interface side, `src/data/ipc.ts` unwraps each result and throws an `IpcError` with one of five codes: `NOT_FOUND`, `CONFLICT`, `INVALID`, `OUTSIDE_WORKSPACE`, `INTERNAL`.

Every path the interface supplies is resolved by one function, `resolveInWorkspace()`, which follows real paths and symlinks and is used by every handler and by the app's `myos://` asset protocol. The workspace itself can be set only through the native folder dialog or starter creation. Before, there were 42 direct bridge calls in 15 files. Now there are 2, in one file.

## One field table

In 1.x, the list of frontmatter fields was maintained by hand in about 12 places. In 2.0 it lives in one table, `ARTIFACT_FIELDS`, in `shared/spec/`. That table drives parsing, serialization, the set of known keys, and undo snapshots. The per-type table of statuses, default status, and storage folder is data, and normalization and validation derive from it.

Anything the table does not recognize goes into `extra` and is written back unchanged. Your own frontmatter keys are yours. The frontmatter spec itself shrank from 734 lines to 201. Undo now restores exactly: the same path, the same frontmatter including custom keys, the same body.

:::sidebar
**The lining, itemized**

- **Revision:** `mtimeMs:size` on every read and write; stale saves return `CONFLICT`.
- **Contract:** one IPC table, one allow-listed `invoke`, `Result<T>` everywhere.
- **Boundary:** every path through `resolveInWorkspace()`; the folder chosen only by native dialog.
- **Schema:** one `ARTIFACT_FIELDS` table; unknown keys round-trip through `extra`.
- **Writing:** untouched Markdown blocks written back byte for byte.
- **Network:** none required. No sync, authentication, telemetry, or model provider.
:::

## Leave my words alone

After the redesign passed QA, two further upgrades were made, both about respect.

The first is source-preserving Markdown. A rich-text editor reads Markdown into a document tree and, when it saves, writes Markdown back out. The usual consequence is that saving normalizes everything: your `*` bullets are restyled, your carefully aligned tables are re-spaced, your link definitions are rewritten. You edit one paragraph and the diff lights up the whole file.

myOS 2.0 now writes untouched blocks back byte for byte. The test for "untouched" is ProseMirror node identity: if a block in the document is the very same node that was parsed from disk, its original source is reused. Only the blocks you actually changed are re-serialized. Opening a page never rewrites its file.

The second is a bug with a certain poetry to it. Inline text that looked like an HTML tag, such as `Result<T>` or `Array<string>`, was being parsed as HTML and silently dropped on save. The very type name at the heart of the new IPC design was the kind of text the editor used to eat. It is now kept as literal text.

> The very type name at the heart of the new IPC design was the kind of text the editor used to eat.

Both upgrades were verified against a copy of the owner's real 82-note workspace. Zero changes on open. Zero collateral changes on edit.

## Many hands, one contract

The rebuild was done by parallel specialist agents, each working in its own isolated git worktree: one for the data core, one for the design system, one for the shell, one for the content surfaces, and one for the editor. An orchestrator wrote the contracts that let them work apart, the navigation URLs and the editor interface, then merged the branches, resolved the conflicts, and ran a final end-to-end QA agent.

When the boundaries are written down first, the pieces can be cut separately and still meet at the seams.

The `Editor` component is the clearest example of what that discipline produced. It went from 1,005 lines, with variants no one could reach, to 121. Five block editors that had shared about 1,900 duplicated lines, each with its own "Apply" button, now render as React node views through a shared frame.

## The numbers

Every figure below compares the pre-redesign `main` (commit `e6e159e`) with 2.0.

| Measure | Before | After |
| --- | --- | --- |
| Total source lines | 42,197 | 17,200 (−59%) |
| Files | 318 | 236 |
| Renderer (non-test) | 24,440 | 12,151 |
| CSS | 5,220 | 763 (−85%) |
| Tests | 4,547 lines / 262 cases | 519 lines / 33 cases (only critical invariants) |
| Editor and rich blocks | 9,079 | 4,175 (the `Editor` component went from 1,005 to 121 lines) |
| Renderer data layer | 2,578 | 762 |
| Frontmatter spec | 734 | 201 |
| Files over 400 lines | 14 | 1 |
| Raw controls outside the design system | 119 | 0 |
| Direct Electron bridge calls | 42 in 15 files | 2 in 1 file |
| `useEffect` / `useState` | 97 / 197 | 40 / 63 |
| `!important` | 91 | 2 |
| Distinct CSS font sizes | 34 | 10 |
| Diff | | +14,861 / −40,273 lines |

:::sidebar
**On fewer tests**

The test suite shrank from 262 cases to 33. That is deliberate. The project keeps tests to critical invariants only: the things that must never break. Among them: a save made against a stale revision is rejected; a deleted file is restored byte for byte at the same path; editing one block rewrites only that block. Fewer tests, each one load-bearing.
:::

## Why it matters to someone who never reads code

Because the lining decides how the garment behaves in the rain. You can edit a note in vim, pull changes with Git, or open the folder in another app, and myOS will not quietly undo your work. You can add your own frontmatter and it will survive. You can close the app for a decade and your files will be the same plain Markdown you left.

None of that is visible. All of it is the reason the calm is real.
