# UX research: persona walkthroughs of myOS 2.0

_Research input for [`roadmap-3.0.md`](../roadmap-3.0.md), September 2026._

The packaged app was run with an isolated profile, started with "Start fresh", and walked through as three personas. Everything described below happened in that session or is in the named code.

**The headline:** myOS captures well, but a task with no date, no flag and no project shows up nowhere. Tasks go in and can't be re-found, and that breaks trust in the whole system.

## 1. Persona journey maps

**Busy parent / household organizer (non-technical)**
- **Onboarding** works: two clear choices and a privacy promise (01). But the example files are written to `work/todos/`, `work/memos/` and so on (`electron/workspace/starter.ts`), and every capture lands under `work/`. Someone who opens the folder in Finder sees their family life filed as "work".
- **Capture** has three problems:
  - **Dropped words:** "Soccer practice pickup every tuesday" became a one-time Tuesday task titled "Soccer practice pickup every". "Sam dentist on friday" became "Sam dentist on" (04). The parser takes out the date words and leaves the words around them.
  - **Missed dates:** "Dentist for Sam fri @fam" got no date at all, because short weekday names only count at the end of the line (`shared/inbox.ts` DATE_PATTERNS) (03).
  - **No repeats:** there are no repeating tasks, even though `repeatRule` is already in `shared/spec/fields.ts`.
- **The biggest problem:** "Pay water bill !high" showed the destination "Tasks" (a place that doesn't exist) and then vanished. `selectToday` only shows tasks that are due, flagged or in progress, and there is no page listing all tasks. Priority is saved to the file but no list displays it (`TaskRow.tsx`). I only found the task through ⌘K (05).
- **Unknown project:** the "@fam · New project?" pill is only a label. It asks a question but you can't click it.

**Student / researcher**
- **New note:** fast and calm (09, 10). But the file stays named `untitled-mugfblfq.md` after the title is set, and nothing renames it. That undermines the "plain files you own" promise.
- **Linking:**
  - Typing `[[` offers no suggestions (`editor/links/wikiLinks.ts` only styles the link).
  - A link to a note that doesn't exist looks the same as a working one.
  - Clicking it just says "No note called 'Lecture 3' yet", with no option to create it (11).
- **Tags can't be used to find anything:** ⌘K "#family" gives "Nothing matches". There is no tag view and no filter by tag or project in Notes (`noteSearch.ts`).
- **Search:** only exact substring matches. No typo tolerance, no search by date or kind, no saved searches.

**Knowledge worker / indie developer**
- **Projects** are pleasant to set up (13, 14b). Gaps:
  - Tasks are always sorted by date. You can't set your own order, mark a next action, add subtasks or sections, or give the project itself a deadline. The product model says projects have "dates", but the UI shows only Status, Color and Tags.
  - The project's address stays `untitled-project-…` after you name it.
- **"Next week" means two different things:** typed in a capture it means +7 days (Oct 1); in the date menus it means next Monday (`dates.ts` `quickDates`).
- **Navigation:** clicking "Projects" in the sidebar while on a project reopens that project instead of the list (`navigationMemory.ts`). In a narrow window, the project rail shows unlabeled colored dots (16).
- **Planning and review:** the only view is the next 7 days, and there's no weekly review. Nothing flags a project with no next action or one that hasn't been touched in weeks.

## 2. Nielsen heuristic findings (ranked by severity)

1. **Match with the real world / visibility of system status (severity 4):** captures and "Make task" from the Inbox without a date create invisible tasks. The capture dialog promises a "Tasks" destination that doesn't exist (`resolveCapture.ts`).
2. **Error prevention (4):** the parser silently eats "every", leaves "on" dangling, and ignores "fri" in mid-sentence. The preview pills show what was picked up, but not what was lost from the title.
3. **Recognition over recall (3):**
   - No autocomplete for `@project`, `[[link]]` or `#tag`.
   - The task-row keys (d, f, x, ⌫) aren't listed in the shortcuts sheet (`shortcuts.ts` only lists Inbox keys).
   - Row actions only appear on hover and are skipped by Tab (`tabIndex={-1}`).
4. **Consistency (3):** "Next week" (see above); "Project" in Inbox sorting always makes a task, so you can't file a note into a project; and household items go into `work/`.
5. **User control and freedom (3):** broken links are a dead end; the sidebar can't take you back to the Projects list; you can't reorder tasks.
6. **Flexibility and efficiency (2):** no bulk actions on the Inbox or tasks; no templates or daily note; no quick filters.
7. **Accessibility (2):**
   - The task row's screen-reader label is just the title, without due date, project or state.
   - The checkbox is skipped by Tab.
   - Some actions exist only as drag (WCAG 2.5.7), though keyboard and menu alternatives mostly exist. Reduced motion is respected (`motion.css`).
8. **Help and documentation (2):** the "Getting started" tasks teach capture but never explain where undated tasks go, how tags are used, or what defer means.

## 3. The 15 highest-impact missing capabilities

1. **A place for tasks with no date (an "All tasks" list, or a Someday section on Today).** It fixes the invisible-task problem in section 1. Bellotti et al. (CHI '04) found that people manage tasks well when those tasks stay visible.
2. **Repeating tasks** using the existing `repeatRule` field, plus capture phrases like "every tue". Household routines depend on this.
3. **A capture parser that keeps meaning:** leave unparsed connecting words out of the title, recognize weekdays anywhere with a clear pill, and make one rule for "next week".
4. **Autocomplete for `@`, `#` and `[[`** in capture and the editor, with "Create project '…'" as a clickable option.
5. **Tag pages and filters** (tag view, filter chips in Notes, `#tag` search in ⌘K). Today tags can be added but never used to find anything.
6. **Guided weekly review** following the GTD steps (Get Clear, Get Current, Get Creative): clear the Inbox, review overdue tasks, check each project has a next action, review stale projects and someday items.
7. **A "plan my day" step:** pick from undated and upcoming tasks into Today, and allow manual ordering in Today and projects.
8. **Backlinks you can act on:** clicking a missing link creates the note, missing links look different, and mentions of a note without a link are listed.
9. **Rename files when the title changes** (asking first, keeping it safe to undo), so the folder stays readable outside myOS.
10. **Browsing, not just search:** filter notes by project, kind and date. Teevan et al. found that 61% of directed searches are step-by-step navigation rather than keyword search.
11. **Project structure:** a next action, a deadline, sections or milestones, and a "no next action" / stale warning on project cards.
12. **Processing prompts for notes** (to fight the "collector's fallacy", Tietze): "unlinked" or "never revisited" notes, and resurfacing older notes.
13. **Areas or life contexts** (e.g. Home, School, Work) instead of the hidden default `work` domain, chosen once during onboarding.
14. **Templates and a daily note:** meeting notes, lecture notes, a weekly plan, all as ordinary Markdown in a folder.
15. **Timed reminders** ("remind me at 5pm") and optionally a read-only local calendar (`.ics`) shown in Today, going beyond today's one notification a day in `useDueReminder.ts`.

On onboarding: activation benchmarks put top-quartile time-to-value under 5 minutes, and users who don't engage in the first 3 days mostly churn (Userpilot). myOS reaches first value fast. The risk is in week one, when a capture disappears.

## 4. Jobs-to-be-done statements

- When I think of something I have to do with no deadline, I want to know it will come back up at the right time, so I can stop holding it in my head.
- When a chore repeats every week, I want to enter it once, so I stop re-typing my family's routines.
- When I'm writing about a topic, I want to link to and find related notes without remembering exact titles, so my notes build on each other instead of piling up.
- When I look at a tag, project or class, I want to see everything in it, so I can prepare for an exam, a meeting or a launch.
- When my week ends, I want a short guided review that tells me what's stuck, so I start Monday trusting my system.
- When I start my day, I want to choose what I'll actually do from everything I could do, so Today is a plan and not just a list of due dates.
- When I open my folder in another tool, I want files named and organized the way I think, so I never feel locked in.
- When I use only a keyboard or a screen reader, I want every task action reachable and announced, so the calm design works for me too.

Sources:
- [Teevan et al., The perfect search engine is not enough (CHI '04)](https://www.researchgate.net/publication/200110503_The_perfect_search_engine_is_not_enough_a_study_of_orienteering_behavior_in_directed_search)
- [GTD Weekly Review checklist](https://gettingthingsdone.com/wp-content/uploads/2014/10/Weekly_Review_Checklist.pdf)
- [Asian Efficiency, GTD weekly review](https://www.asianefficiency.com/productivity/gtd-weekly-review/)
- [Tietze, The Collector's Fallacy](https://zettelkasten.de/posts/collectors-fallacy/)
- [Matuschak, Collecting material feels more useful than it usually is](https://notes.andymatuschak.org/Collecting_material_feels_more_useful_than_it_usually_is)
- [Bellotti et al., What a to-do (CHI '04)](https://dl.acm.org/doi/10.1145/985692.985785)
- [Userpilot activation benchmark 2024](https://userpilot.com/blog/user-activation-rate-benchmark-report-2024/)
- [Userpilot time-to-value benchmark](https://userpilot.com/blog/time-to-value-benchmark-report-2024/)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Deque, WCAG 2.2 updates](https://dequeuniversity.com/resources/wcag-2.2/)
