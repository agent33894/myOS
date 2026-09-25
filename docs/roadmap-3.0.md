# myOS 3.0: twenty features

This plan comes from three research tracks: the market (Obsidian and its most-downloaded plugins, Things, Todoist, Sunsama, NotePlan, Bear, Logseq, Tana, Anytype), UX (heuristic walkthroughs as a household organizer, a student, and an indie developer), and behavioral science (implementation intentions, plan-making, the fresh-start effect, peak-end, retrieval practice, self-determination theory).

It holds to the product contract: local files, plain Markdown, no account, no network, no bundled AI. The four nouns stay: Note, Task, Project, Inbox. Everything here builds on the 2.0 foundation (see `product-model.md`, `design/design-system.md`, `architecture-overview.md`).

## Humane design guardrails

These are binding for every feature.

1. **Autonomy first.** Every nudge is opt-in, can be switched off in one place, and explains *why* something is there, never *that you must*.
2. **No loss framing.** No streaks, chains, badges, red aging counts, or guilt copy. A missed day, an unsorted Inbox, or a skipped review is normal. Leaving things alone always works.
3. **Calm by default.** Only reminders the user sets make noise.
4. **Honest progress.** Progress comes from real files only. No fake head starts.
5. **Endings are features.** Rituals have a clear finish and end on what was accomplished.
6. **Private by construction.** Metrics are computed on demand from the files. Anything stored is readable Markdown or frontmatter the user can edit. There is no telemetry.
7. **Evidence-honest copy.** No "21 days to a habit" or "willpower runs out" claims.
8. **Your files, your structure.** Features never write placeholder text into files and never rewrite blocks the user did not touch.

## Storage additions (source of truth: `dashboard/shared/spec/`)

| Field or type | Kind | Meaning |
| --- | --- | --- |
| `repeatRule` (existing) | string | `every day`, `every weekday`, `every week`, `every 2 weeks`, `every tue`, `every mon, thu`, `every month`, `every month on 15`, `every year`, `every 3 days` |
| `completions` | string[] (dates) | The last 30 completion dates of a repeating task, used for the honest "done 9 of the last 10 times" line |
| `planned` | date | The day the user chose for this task in *Plan my day*. Today shows tasks planned for today |
| `estimatedMinutes` (existing) | number | Written as `~30m` / `~2h` in capture |
| `when` | string | Implementation intention cue, for example "after standup" |
| `next` | string | A project's next step |
| `review`, `reviewInterval` | date, number (days) | Spaced-review schedule for a note |
| todo status `someday` | status | Parked. Hidden from Today and counts, listed under Tasks → Someday |
| type `journal` | type | One page per day at `journal/YYYY-MM-DD.md` (id = the date). Statuses: active, archived. Not tied to a domain |
| type `template` | type | Stored at `templates/<slug>.md`. Never shown in Notes. Statuses: active, archived. Not tied to a domain |

Everything else, including unknown keys, round-trips unchanged. `domain` is surfaced to users as an **Area**: Work, Personal, Learning (stored as `research`), and Creative.

## The twenty features

### Tasks and planning

1. **Repeating tasks.** Capture understands `every tue`, `every 2 weeks`, `every weekday`, `every month on 15`, and similar phrases. Completing a repeating task records the date in `completions` and moves `due` to the next occurrence. The task stays open, and undo reverses both changes. The page's property row has a Repeat control. The row shows "Repeats every Tue". The page shows "Done 9 of the last 10 times", never a streak.
2. **Capture that understands you.** The parser keeps meaning: weekdays are recognized anywhere ("Sam dentist fri at 4"), connector words left behind are trimmed ("on", "by", "at" before a removed date), and `next week` means next Monday everywhere. `~30m` sets an estimate. `@` and `#` autocomplete (projects and existing tags) in Quick Capture, AddTask, and property editors. An unknown `@name` pill is a button: **Create project "name"**. The destination text never names a place that does not exist.
3. **Tasks: Anytime and Someday.** A new **Tasks** page (sidebar, `/tasks`) lists every open task. Sections are Anytime (no date), Upcoming (dated beyond this week), and Someday. You can group by project or by area. A task you create always has a visible home, which fixes "invisible tasks". The old `/tasks` redirect to Inbox is removed.
4. **Checklists become tasks.** `- [ ]` lines inside any note are real tasks. A line with a date (`📅 2026-09-30`, Obsidian Tasks compatible, or a trailing `due 2026-09-30`) appears in Today and Upcoming. Every open checkbox in a note that belongs to a project appears on that project's page under "From notes". Checking one off in Today or on the project page ticks the line in the source file (a revision-checked, single-line edit). Nothing else in the file changes.
5. **Carried over, gently.** "Overdue" becomes **Carried over**, in neutral styling with no red counts. A **Re-plan** action opens a quick batch dialog with Today, Tomorrow, Next week, Someday, and No date, applied per item or to all.
6. **Estimates and capacity.** You set an optional estimate on a task (`~45m`). Today's header shows an honest line: "About 3 h planned · 6 h available". Available hours and an off switch live in Settings. This is information only; the app never blocks you from adding tasks.
7. **Next steps and "when" cues.** Projects get a **Next step** property. It shows on the project card, on the project page, and in Today under "Next steps", with one click to turn it into a task. Tasks get an optional **When** cue ("after lunch", "at the café"), shown quietly under the title. There are no reminders tied to it and no "you missed it" message.
8. **Plan my day.** A calm morning flow, opened from Today's header or the palette. On the left are candidates: carried over, due soon, flagged, Anytime, and project next steps. On the right is today's plan with a running estimate against available hours. Picking a task sets `planned` to today. It finishes with "Your day is set", and Today lists the plan in your chosen order (`order`).

### Rituals and reflection

9. **Close the day.** A two-minute evening flow. It starts with what got done today (the peak). Then each unfinished planned task gets Tomorrow, Later, Someday, or Keep. An optional one-line note is appended to today's journal page under "Evening". It ends with "That's a wrap." The flow is only ever started by the user.
10. **Weekly review.** A guided review in five steps: clear the Inbox, carried-over tasks, projects without a next step, quiet projects (no activity in 21 days: keep, move to Someday, or mark done), and a glance at Someday. It ends with an optional reflection written to that day's journal page. A gentle "Weekly review" item appears in the sidebar only on the day you choose (Settings; default Friday) and only until you open it. Last review date is kept in settings.
11. **Journal.** One page per day (the `journal` type). A **Journal** sidebar entry opens today's page (created only when you start typing) with a scrollable list of earlier days. A small month strip shows which days have entries, with no chain styling. Journal pages are excluded from Notes and search unless you include them.
12. **What moved.** A weekly look back (`/review/week`): tasks finished, notes written or edited, and journal lines, grouped by project, with previous and next week. It is a list, not a score, with no comparison between weeks. Weekly review ends by linking here.

### Notes and knowledge

13. **Links that help.** Typing `[[` in the editor opens suggestions (fuzzy title match, recent first) with **Create "…"**. Links to pages that do not exist look different (dashed, muted). Clicking one creates the note and opens it. Each page lists **Linked from** and **Unlinked mentions** (other notes mentioning its title as plain text), with a one-click **Link** that rewrites only that occurrence.
14. **Tags and filters.** Each tag has its own page at `/tags/<tag>`, listing its notes and tasks. `#tag` in the palette jumps there. Notes has filter chips for Project, Tag, Area, and Kind (including Journal). A Tags list lives in Notes.
15. **Recall.** On any note, **Review this note** schedules it for spaced review, with intervals of 1, 3, 7, 16, and 35 days that stretch or shrink with your answer. The Review queue (from the palette and the Notes header) shows the title first ("What do you remember?"). **Show note** reveals the body, and you answer Again, Hard, Good, or Easy. The queue caps at 10 a day and the rest roll forward quietly. There is no backlog pile-up and no penalty for skipping.
16. **Templates.** Notes of the `template` type live in `templates/`. Starter templates (Meeting notes, Lecture notes, Weekly plan, Project brief) contain headings only, never bracketed placeholders. `{{date}}`, `{{time}}`, and `{{title}}` expand on use. You can create from a template through the New menu, the palette ("New from template…"), or a project's New note menu. **Save as template** is in a page's ⋯ menu, and templates can be managed in Settings.
17. **Focus mode.** ⌘. / Ctrl+. hides the sidebar and page chrome, centers the text at reading width, keeps the caret line vertically centered (typewriter scrolling), and softly dims other paragraphs (optional). On a task page, focus shows the task, its When cue, and its checklist. There is no timer and no score. Esc exits.

### Files and trust

18. **Areas and readable files.** Onboarding asks which areas the space is for (Work, Personal, Learning, Creative) and which one is the default. New items take their project's area, then the default. There is no more hidden `work/`. An Area property on every page moves the file to that area's folder. File names follow titles: after you stop editing a title, the file is renamed to `<slug>.md` in the same folder (unique, revision-checked, undoable). You can turn this off in Settings. Existing files are renamed only when their title is edited.
19. **Export and share.** A page's ⋯ menu offers Export as PDF, Export as HTML (a single self-contained file with the design system's reading styles and inlined images), Copy as rich text, and Copy as Markdown. Export uses the native save dialog. Rich blocks render as they appear, with charts as SVG.
20. **Version history.** Every save keeps a snapshot, at most one per file every 10 minutes, plus one before every delete, retype, or rename. Snapshots are stored under the app's data directory (never inside the user's folder), keyed by workspace. The latest 50 per file are kept, pruned after 60 days. **Version history** in a page's ⋯ menu lists the snapshots with a readable diff against now and **Restore this version**, which is revision-checked and undoable.

## Delivery

- **Wave A (platform).** Spec fields and types, shared logic (recurrence, capture 2.0, Today/Tasks selectors, checklist extraction, recall scheduling, template expansion), main-process capabilities (`artifacts:toggle-check`, `artifacts:rename`, `artifacts:move-area`, history list/read/restore, export PDF/HTML, templates list), and renderer data hooks and gateway functions. Each gets the minimum critical tests.
- **Wave B (surfaces, in parallel).** Tasks and planning (1–8), rituals (9–12), notes and knowledge (13–17), files and trust (18–20).
- **Wave C.** End-to-end QA and polish in both themes at 900px and 1600px, packaged smoke test, install.
- **Wave D.** The launch magazine.

## Wave A contracts

What Wave B builds on. Everything below is in place, typed, and covered where it guards data.

### Shared rules (`dashboard/shared/`)

| Module | Exports |
| --- | --- |
| `spec` | Fields `planned`, `completions`, `when`, `next`, `review`, `reviewInterval`; todo status `someday`; types `journal` and `template`; `AREAS` (domain → Work, Personal, Learning, Creative). Types with an area fall back to `personal` |
| `date.ts` | `nextMonday` (the one meaning of "next week"), `dayOf`, `parseLocalDate`, `shiftDate` |
| `recurrence.ts` | `parseRule`, `formatRule` (stored text), `describeRule` ("Every Tue"), `nextOccurrence`, `firstOccurrence`, `completionSummary(completions, rule, today)` → `{ done, of }` over the last ten, `weekdayIndex` |
| `inbox.ts` | `parseCapture` (adds `repeatRule`, `estimatedMinutes`), `captureDraft(parsed, defaultArea)`, `suggest(text, caret)` → `{ trigger: '@' \| '#', query, start, end } \| null`, `matchProject` |
| `today.ts` | `selectToday(tasks, now, checks)` → `{ carriedOver, today, upcoming, doneToday }` (entries are tasks or `CheckEntry`), `plannedMinutes(entries)`, `isOpenTask`, `UPCOMING_DAYS` |
| `tasks.ts` | `selectTasks` → `{ anytime, upcoming, someday }`, `groupByProject(items, projects)`, `groupByArea(items)` → `{ key, label, items }[]` |
| `checklist.ts` | `CheckEntry { kind: 'check', path, line, text, due, done, project, noteTitle }`, `isCheckEntry`, `checkEntries`, `extractChecks`, `toggleCheckLine` |
| `recall.ts` | `schedule(answer, interval, today)` → `{ review, reviewInterval }`, `dueForReview(notes, today, cap = 10)` |
| `templates.ts` | `expandTemplate(body, { title, date, time })`, `STARTER_TEMPLATES` |
| `journal.ts` | `journalPath(date)`, `journalDate(item)`, `appendUnderHeading(content, heading, line)` |
| `week.ts` | `selectWeek(artifacts, weekStart)` → `{ start, end, groups: [{ project, finished, written, edited }], journal: [{ date, path, lines }] }` |

### IPC channels (`shared/ipc/contracts.ts`)

`artifacts:toggle-check(path, line, expectedText, expectRev?)`, `artifacts:rename(path, expectRev?)`, `artifacts:move(path, to, expectRev?)`, `artifacts:move-area(path, domain, expectRev?)`, `history:list(path)` → `VersionInfo[]`, `history:read(path, id)` → text, `history:restore(path, id, expectRev?)`, `export:pdf(path, html)` and `export:html(path, html)` → saved path or null; `export:reveal(savedPath)` shows a file this session exported (only those) in the file manager. Templates and journal pages come through `artifacts:list` and `artifacts:create` (a draft may carry `id`; journal pages use the date). Listed notes carry `checks`.

### Renderer data (`dashboard/src/data/`)

- **Hooks** (`selectors.ts`): `useToday`, `useTasks`, `useChecks`, `useTemplates`, `useJournal` → `{ date, page }[]`, `useReviewQueue`, `useWeek(weekStart)`, `useCounts` (Today = carried over + today), `useNotes` (no journal pages or templates), `useProjects` (each project has `checks` for "From notes").
- **Gateway** (`gateway.ts`): `create` and `capture` send the default area; `toggleCheck(entry)`, `rename(item)`, `moveToArea(item, domain)`, `listVersions(item)`, `readVersion(item, id)`, `restoreVersion(item, id)`. Each write records one undo step. `rename` and `moveToArea` resolve to the file at its new path, so a page showing the old path must follow it.
- **Planning** (`planning.ts`): `completeTask`, `toggleComplete` (repeating tasks advance `due` and record `completions`), `plan(task, date?, order?)`, `unplan`, `reorderToday(paths)`, `setSomeday`, `replan(tasks, 'today' | 'tomorrow' | 'next-week' | 'someday' | 'none')`, `startReviewing`, `stopReviewing`, `answerReview(note, answer)`.
- **Pages** (`pages.ts`): `createFromTemplate(template, { title, project?, domain? })`, `createProjectFromTemplate(template, { title, domain? })`, `ensureStarterTemplates()`, `openJournal(date)` → path, `createJournal(date)`, `appendToJournal(date, section, line)`.
- **Export** (`exporter.ts`): `buildExportDocument({ title, bodyHtml, css? })`, `exportPdf(item, html)`, `exportHtml(item, html)`, `copyAsRichText(html, markdown)`, `copyAsMarkdown(markdown)`.
- **Settings** (`store/settings.ts`, set any with `setSetting(key, value)`): `defaultArea` (personal), `availableHours` (6), `showCapacity` (true), `weeklyReviewDay` (5, Friday), `lastWeeklyReview` (null), `renameFilesWithTitles` (true), `focusDimParagraphs` (true), `includeJournalInSearch` (false), `usedAreas` (all four; the areas chosen in onboarding, listed first in the Area menu).

### Left for Wave B

Search still includes journal pages (apply `includeJournalInSearch`), nothing calls `ensureStarterTemplates` yet, `src/data/pages.ts` is listed as a knip entry until a screen imports it.

### Files and trust (Wave B)

`src/features/files/` owns the Area property, export and copy (`export/`: the open editor's DOM is serialized with the app's `.prose` rules and inlined styles for rich blocks, always in the light theme, with the bundled fonts embedded), Version history (`history/`), and `useRenameWithTitle(item, title, onMoved, flush)`. That hook is called with one line in `page/Page.tsx` and `projects/ProjectHome.tsx`: after a title edit settles (two seconds idle, not while typing elsewhere, or on leaving the page) and the save lands, the file is renamed and the page follows it.
