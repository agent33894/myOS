# How We Chose Twenty

*A season is edited, not accumulated. Three research tracks produced far more ideas than one release could hold. Here is how myOS narrowed them to twenty, what it found along the way, and what it left on the cutting-room floor.*

By the myOS Editors

---

Every collection has a moodboard that is larger than the collection. The discipline is in the edit.

For 3.0, the moodboard was three research documents, each written in September 2026 and each approaching the product from a different side. Between them they listed forty-five candidate features, many overlapping. The plan that emerged holds twenty. This is the story of the edit.

## Three tracks

**The market.** The first track read the landscape: Obsidian and its most-downloaded plugins, Things, Todoist, Sunsama, NotePlan, Bear, Logseq, Tana, Anytype, and more. It asked what users praise, what they complain about, and where each app keeps its data. It produced a list of table-stakes gaps and a list of differentiating opportunities.

**The people.** The second track ran the packaged 2.0 app with an isolated profile, started from "Start fresh", and walked through it as three personas: a busy parent organizing a household, a student and researcher, and an indie developer. It scored what it found against Nielsen's usability heuristics, by severity.

**The mind.** The third track read the behavioral science of planning, memory, and motivation, rating each finding by the strength of its evidence, and turned the result into humane design guardrails.

> Three documents, each approaching the product from a different side. The plan sits where they overlap.

## The finding that reordered everything

The persona walkthroughs produced one headline, and it was not flattering. myOS captured well. But a task with no date, no flag, and no project showed up nowhere.

The household organizer typed "Pay water bill !high". The capture dialog promised the destination "Tasks", a place that did not exist, and the task vanished. Today shows only what is due, flagged, or in progress, and there was no page listing all tasks. It turned up again only through ⌘K search. The walkthrough rated this a severity-4 problem, the highest on the scale, and named the consequence: tasks go in and cannot be re-found, and that breaks trust in the whole system. The research cites Bellotti and colleagues (CHI '04), who found that people manage tasks well when those tasks stay visible.

The same session found capture dropping words. "Soccer practice pickup every tuesday" became a one-time task titled "Soccer practice pickup every". "Sam dentist on friday" became "Sam dentist on". "Dentist for Sam fri @fam" got no date at all, because short weekday names only counted at the end of the line.

Those two findings set the order of the season. Feature 3, **Tasks: Anytime and Someday**, gives every task a visible home, and the plan says in so many words that it fixes "invisible tasks". Feature 2, **Capture that understands you**, keeps meaning: weekdays recognized anywhere, stranded connector words trimmed, one rule for "next week", and a destination that never names a place that does not exist.

:::sidebar
**The three personas, in one line each**

- **The household organizer** saw family life filed under `work/`, lost words in capture, and lost a task entirely.
- **The student** found `[[` offered no suggestions, broken links looked like working ones, and tags could not be used to find anything.
- **The indie developer** found no next action on projects, no weekly review, and "next week" meaning two different dates.
:::

## Table stakes and differentiators

The market research drew a clear line between the two.

**Table stakes** are what people assume. Repeating tasks: every task app has them, the Obsidian Tasks plugin has 4.3 million downloads as reported by obsidianstats, and myOS already had a `repeatRule` field that did nothing. A daily note or journal. Export and share. Checkboxes inside notes that behave as real tasks. These became **Repeating tasks**, **Journal**, **Export and share**, and **Checklists become tasks**, the last of them compatible with the Obsidian Tasks `📅` date syntax.

**Differentiators** are what nobody else combines. The research named a calm, Sunsama-style daily routine on plain files, on Linux, as one of the clearest. That became **Plan my day**, **Close the day**, and the **Weekly review**. Its idea of "Obsidian without the plugin tax" shaped **Templates** and **Version history**, answering the demand behind the Templater and Git plugins with small built-in defaults.

The behavioral track then shaped how each of them behaves. It named its biggest wins: a next step on projects, a "when" cue on tasks, close the day, a softer Overdue, and recall for notes. All five are in the twenty.

## The cutting-room floor

The harder part of the edit is what did not make it. The plan itself does not list its omissions, but the decision that adopted it does. Recorded in the owner's myOS workspace as "Twenty features chosen from market, UX, and behavioral research", it names four rejections and gives each a reason in a few words. Every one of them answers to the product's own contract: local files, plain Markdown, no account, no network, no bundled AI.

**A mobile companion.** The market research calls a way onto the phone a table-stakes gap, noting that every competitor has a mobile story. The decision record rejects it anyway, for two reasons: it is the largest effort on the list, and it is "a separate product", not a feature of this one.

**Calendar URL subscriptions.** A read-only calendar in Today appears in both the market and UX research. The record's reason for leaving it out is a single word: network. A subscribed URL has to be fetched, and the 3.0 plan holds to no network.

**Importers.** Tools to bring notes in from Notion, Apple Notes, Bear, Things, and Todoist were rated medium to large effort, and the record judges them "lower leverage now". The twenty chose instead to make myOS better at what it already reads: plain Markdown, and Obsidian's conventions.

> A season is edited, not accumulated.

**Gamification.** This one was not a matter of effort. The record rejects streaks and gamification on "evidence and ethics". The behavioral research found that streaks are wrong on the evidence, since habit formation takes weeks to months and survives a missed day, and that fake head-start progress works in a way that makes it a manipulation risk. The guardrails forbid streaks, chains, badges, and red aging counts outright. What remains is an honest line: "Done 9 of the last 10 times."

:::sidebar
**The twenty, by section**

- **Tasks and planning:** Repeating tasks · Capture that understands you · Tasks: Anytime and Someday · Checklists become tasks · Carried over, gently · Estimates and capacity · Next steps and "when" cues · Plan my day
- **Rituals and reflection:** Close the day · Weekly review · Journal · What moved
- **Notes and knowledge:** Links that help · Tags and filters · Recall · Templates · Focus mode
- **Files and trust:** Areas and readable files · Export and share · Version history
:::

## The test every feature passed

Every feature in the plan answers to eight binding guardrails, and the behavioral research adds one final question to ask before anything ships: would this still be worth it if the user never opened the app more often?

It is a demanding filter. It rules out anything whose value is attention rather than help. And it explains the shape of 3.0 better than any list: twenty features that make the app more useful, and none designed to make it harder to put down.

The making followed a second recorded decision: "Platform wave first, then four parallel surface agents." Twenty features touch the same shared spec, selectors, and IPC, and parallel agents collide on shared files. So the first wave built all the storage, shared logic, IPC, and data hooks, and the contracts were reviewed once. Then four agents, each in its own worktree and each owning its own surfaces, built tasks and planning, rituals, notes and knowledge, and files and trust side by side, forbidden to change the spec or the IPC without coordination. A third wave ran end-to-end QA and polish in both themes. The fourth is the magazine in your hands.

The edit is done. The collection follows.
