# Dossier: the myOS overhaul (facts for the magazine)

All facts below are verified from the work itself. Numbers compare the pre-redesign `main` (commit `e6e159e`) with 2.0.

## The starting point (myOS 1.x, "Chronicle Mac v3")

- A local-first Electron app for Markdown notes, tasks, and projects on macOS and Linux (Omarchy/Hyprland), with no account, no sync, no telemetry, and no bundled AI.
- The owner's brief: "Something feels off with the app and I'm not sure what it is." They wanted a world-class, lovely, consumer-friendly product ("almost Meta's Muse-like") with elegant, modular code.
- A five-agent review looked at visual language, UI implementation, UX and information architecture, system architecture, and a live walkthrough with 46 screenshots.

## What the review found

- **The type.** The interface font, Geist Sans, was never loaded. On Linux the fallback chain resolved to Liberation Sans, an Arial clone, set next to carefully chosen serifs. Four typefaces competed. The dominant label was 10px uppercase monospace in tertiary ink at about 3.3:1 contrast, below accessibility minimums. The CSS had 34 distinct font sizes and 77 distinct pixel values.
- **Paper-and-ink cosplay.** CSS and copy used words like Daybook, masthead, ledger, "In Play" lamp, stamp, plate, garnish, dateline, and "Nothing on the books". The surfaces were nearly flat (1.06:1 steps) and relied on 0.5px hairlines. The Ultra Violet accent clashed with the cream paper.
- **A developer's filing cabinet.** 11 types × 4 domains decided where every file lived, so capture asked users to pick a type and a domain, and keyword heuristics guessed ("book" → Personal). A 20-entry glossary was needed to explain the vocabulary: Unfiled, Waiting, Refine, Process, In Play, Next, now line, The Record, sessions, Materials, Vitals, Dormant.
- **Broken promises.** Defer never hid anything. The Auto-save toggle was deliberately ignored. Notification history could be cleared but not viewed. The README advertised editor modes that did not exist. New projects saved literal "[What are you trying to change?]" placeholders into files.
- **Data safety.** External edits (from vim or a git pull) were silently overwritten by autosave, because the editor reloaded only when a frontmatter date changed. Undoing a delete lost custom frontmatter and moved the file. The same field list was hand-maintained in about 12 places.
- **Code.** There was a 3,659-line global stylesheet and a 1,005-line editor component with unreachable variants. About 1,900 duplicated lines were spread across five block editors, each with its own "Apply" button. IPC was typed on one side only, with four error styles. 42 direct bridge calls were spread over 15 files, and the renderer could set the workspace root to any folder.

## Decisions (each recorded in the owner's myOS workspace)

1. **Keep the on-disk schema and simplify only the product model.** Existing vaults, the CLI, and an external agent-tracking tool keep working. Four nouns: Note, Task, Project, Inbox. "Artifact" stays in the code only.
2. **Revision-checked writes and a conflict banner.** Every read and write carries a file revision (`mtimeMs:size`). A stale save returns CONFLICT, and the page asks "This page changed on disk: Load theirs / Keep mine". The app recognizes its own saves by revision, not by timing.
3. **One typed IPC table.** `Result<T>` errors with codes (NOT_FOUND, CONFLICT, INVALID, OUTSIDE_WORKSPACE, INTERNAL), a generic allow-listed preload, and a workspace that can only be chosen through the native dialog.
4. **Replace Chronicle with a warm, soft consumer design system.** Inter Variable is bundled (plus optional Literata for reading, Geist Mono for code only). A 12–32 type scale on a 14px base. Warm neutrals with three elevation levels. One `--accent` with an OKLCH color-mix ramp (default Iris #5B5BD6). A 4pt grid, radii of 6/10/14/20, three motion tokens plus one spring. Every text token is at least 4.5:1.
5. **Tailwind with primitives in `src/ui` as the single styling approach**, enforced by lint: no raw buttons or inputs, no hardcoded colors, no arbitrary values outside `src/ui`.

## How it was built

- Parallel specialist agents worked in isolated git worktrees: data core, design system, shell, content surfaces, and editor. An orchestrator wrote the contracts (navigation URLs and the editor interface), merged the branches, resolved conflicts, and ran a final end-to-end QA agent.
- After QA, two data-safety upgrades were made:
  - **Source-preserving Markdown.** Untouched blocks are written back byte for byte, using ProseMirror node identity as the test for "untouched". Editing one paragraph no longer restyles `*` bullets, aligned tables, or link definitions elsewhere.
  - **Literal inline tags.** Text like `Result<T>` or `Array<string>` had been parsed as HTML and silently dropped on save; it is now kept as literal text.
- Both were verified against a copy of the owner's real 82-note workspace: zero changes on open, and zero collateral changes on edit.

## Numbers (1.x → 2.0)

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

## 2.0 product in one breath

Capture anything with ⌘N (typing `tomorrow`, `#tag`, `@project`, or `!` is optional). Sort the Inbox one item at a time (T, N, P, D, ⌫, →) until "Inbox zero. Nice." Today shows what is overdue, due, flagged, or in progress, and completing a task ends with a spring and "Done · Undo". Notes are search-first. Projects gather a description, tasks, and notes. Every page edits its properties inline. Light and dark themes, accent choices, and a serif reading option.

## 3.0 (this issue's features)

The twenty features in `../roadmap-3.0.md`, chosen from research in `../research/`. Guardrails: no streaks, no guilt, opt-in nudges, honest progress, and private by construction.
