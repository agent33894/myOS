# Market research: the 2025–2026 landscape

_Research input for [`roadmap-3.0.md`](../roadmap-3.0.md), September 2026._

Before researching, the team checked the code for what myOS already has: wiki links with backlinks ("Linked from"), `- [ ]` checkboxes, image and file attachments, `/` blocks, capture that understands dates, Inbox, Today, and a conflict prompt when a file changes on disk. One thing to know: `repeatRule` is defined in `dashboard/shared/spec/fields.ts` but nothing uses it, so tasks can't repeat yet.

# myOS market research: competitive landscape, 2025–2026

## 1. Competitor matrix

| App | Core loop | What users praise | Top complaints | Price | Storage |
|---|---|---|---|---|---|
| **Obsidian** (+plugins) | Write linked Markdown; plugins turn it into a task or database system | Owns files, plugins, Bases (built-in database views, [1.9/1.10](https://alternativeto.net/news/2025/8/obsidian-launches-new-bases-plugin-for-database-workflows-and-property-format-changes)) | "Plugin rabbit hole", more tweaking than writing ([Substack](https://productivematters.substack.com/p/obsidian-is-too-complicated)) | Free; Sync $4–5/mo; Publish $8/mo ([pricing](https://obsidian.md/pricing)) | Local .md |
| Top plugins | Excalidraw 8.2M downloads, Templater 5.7M, Dataview 5.0M, Tasks 4.3M, Git 3.2M, Calendar 3.1M, Kanban 2.7M, Remotely Save 2.3M ([obsidianstats](https://www.obsidianstats.com/most-downloaded)) | Tasks: due, scheduled and repeating tasks written as plain text | Query syntax to learn; fragile setups | Free | .md |
| **Logseq** | Daily-journal outliner | Journals, block references | DB version (beta July 2026) makes the database the source of truth, not Markdown ([HN](https://news.ycombinator.com/item?id=48896229), [forum](https://discuss.logseq.com/t/database-version-too-drastic-choice/20346)) | Free | Moving from .md to DB |
| **Bear** | Tag-first writing | Beautiful editor, nested #tags | Paid sync; SQLite, not files ([Toolradar](https://toolradar.com/tools/bear)) | $29.99/yr | Proprietary DB |
| **Craft** | Polished docs | "Prettiest notes app" | Now built around AI and MCP; subscription | Free / $8/mo ([aiproductivity](https://aiproductivity.ai/pricing/craft/)) | Cloud |
| **Apple Notes** | Quick capture | Free, everywhere on Apple devices | Apple-only; Markdown import/export only arrived in iOS 26 ([MacRumors](https://www.macrumors.com/how-to/ios-import-export-markdown-apple-notes/)) | Free | iCloud |
| **Notion** | Databases plus docs | Flexible | Slow; offline mode feels "fake"; databases export as CSV; lock-in ([AFFiNE](https://affine.pro/blog/notion-offline), [Raccoon](https://raccoon.page/blog/notion-export-limitations/)) | Free / paid | Cloud |
| **Things 3** | Inbox → Today → Upcoming | Calm, pay once | Apple-only, no collaboration, slow development ([AsianEfficiency](https://www.asianefficiency.com/task-management/things-3-review/)) | About $80 across devices | Proprietary |
| **Todoist** | Natural-language quick add | Best date parsing ("every other Tue 3pm") ([2sync](https://2sync.com/blog/ticktick-vs-todoist)) | Price rise of about 40% in Dec 2025 | Pro about $4–5/mo | Cloud |
| **TickTick** | Tasks + calendar + habits + Pomodoro | Everything in one app, cheap | Weaker parsing of repeat rules | $35.99/yr | Cloud |
| **Sunsama** | Guided morning plan and evening shutdown | The daily routine itself ([ClickUp](https://clickup.com/learn/topic/productivity/tools/sunsama/)) | $16/mo, no free tier | $16/mo | Cloud |
| **Amie** | Calendar + to-dos | Design | Has pivoted to an AI notetaker; pricey ([Ellie](https://ellieplanner.com/comparisons/amie-calendar-review)) | Free / $20/mo | Cloud |
| **Reflect** | Daily notes + backlinks | End-to-end encryption, simple | No free tier, AI-centric | $10/mo | Cloud (E2EE) |
| **Capacities / Tana** | Object types / supertags | Structure | Tana: weeks to learn, cloud-only, 2.15★ Android ([Saner](https://www.saner.ai/blogs/tana-reviews)) | About $10–12/mo | Cloud |
| **Heptabase** | Visual whiteboard research | Spatial thinking | No free tier | $11.99/mo | Offline-first, proprietary |
| **Anytype** | Objects, peer-to-peer sync | End-to-end encryption, privacy | Types and relations confuse people; many clicks to add a tag ([Toolradar](https://toolradar.com/tools/anytype)) | Free / $4 | Local, encrypted DB |
| **NotePlan** | Markdown daily note + calendar + tasks | Everything in one place, plain Markdown | Gets complex; Apple-only | From $6.99/mo ([Capterra](https://www.capterra.com/p/217998/NotePlan-3/)) | .md |
| **Agenda** | Notes placed on a timeline | Project timeline | Apple-only | $34.99/yr | Proprietary |
| **iA Writer / Ulysses** | Focused writing | Typography, focus mode | Not a task or project tool | $49.99 once / $49.99/yr ([Unmarkdown](https://unmarkdown.com/blog/bear-vs-ia-writer-vs-ulysses)) | .md / library |
| **UpNote** | Simple notebooks | $39.99 lifetime ([Toolradar](https://toolradar.com/tools/upnote)) | Basic | Lifetime | Cloud |

**Pattern:** the calm apps (Things, Bear, Agenda, NotePlan, iA Writer) are Apple-only and mostly lock data in their own formats. The apps built on open files (Obsidian, Logseq OG, Joplin) are free but complicated. No one offers calm, plain Markdown files, a strong task model and Linux support together. That is myOS's opening.

## 2. Table-stakes features myOS lacks

1. **Repeating tasks.** Every task app has them, and so does the Obsidian Tasks plugin (4.3M downloads). The spec field exists but does nothing.
2. **Daily note or journal.** Obsidian's core Daily notes, the Calendar plugin (3.1M), Logseq, Reflect and NotePlan all have one.
3. **A way onto the phone.** Every competitor has a mobile story. myOS has no mobile app and no documented recipe for Syncthing, iCloud or Git (the [XDA](https://www.xda-developers.com/replaced-every-cloud-notes-app-with-synced-markdown-folder/) "synced folder" pattern).
4. **Calendar view or read-only calendar overlay.** NotePlan, TickTick, Amie and Sunsama all put events next to tasks.
5. **Export and share.** PDF, HTML, or copy as rich text (Bear exports to 7 formats).
6. **Checkboxes inside notes showing up as tasks.** In Obsidian Tasks, Logseq and NotePlan a `- [ ]` anywhere is a real task. In myOS, checklists in notes probably never reach Today; I found no code that collects them there.
7. **Importers** for Notion, Apple Notes, Bear, Things and Todoist. Obsidian's Importer plugin has 1.7M downloads.
8. **Board and table views** of tasks and projects, like Kanban (2.7M) and Obsidian Bases.

## 3. Differentiating opportunities

- **Refuge from lock-in.** Logseq is moving its source of truth to a database, Bear and Anytype use their own databases, and Notion exports are lossy. Marketing angle: "Your files will still open in 2046." Byte-exact round-trips of unedited blocks are already a technical moat.
- **Calm Things/Sunsama-style planning on plain files, on Linux.** Things and Sunsama are Apple-only or cloud-only. Linux users are left with Joplin or a heavily configured Obsidian ([usevoicy](https://usevoicy.com/blog/best-linux-note-taking-apps)).
- **"Obsidian without the plugin tax."** Ship the most-downloaded plugin behaviours (Tasks, Calendar, Kanban, Templater-lite, Git) as a small set of built-in, opinionated defaults.
- **Privacy that is literal, not a policy promise.** No account and no network, compared with Reflect or Anytype, which ask you to trust their encryption.
- **Interoperable with Obsidian.** Read and write Obsidian's `[[links]]`, frontmatter properties and Tasks emoji syntax, so the same folder works in both apps. The switching cost drops to zero.
- **No AI in the app, but friendly to AI tools.** Craft now ships MCP, and Obsidian's Claudian and Copilot plugins have 2M+ downloads each. Plain files plus the `myos` CLI already let users bring their own tools without breaking the no-bundled-AI rule.

## 4. The 15 most valuable candidate features

| # | Feature | Rationale / evidence | Effort | Fit |
|---|---|---|---|---|
| 1 | **Repeating tasks** (`every mon`, `every 2 weeks` in capture) | Table stakes; Todoist's parsing is its most praised feature ([2sync](https://2sync.com/blog/ticktick-vs-todoist)); the spec field already exists | M | Full |
| 2 | **Checkboxes in any note show up in Today and projects** | Core of Obsidian Tasks (4.3M), Logseq and NotePlan; keeps tasks inside the writing | M | Full (read-only index) |
| 3 | **Daily note, opt-in, one per day** from Today | Daily notes and Calendar (3.1M) are the most common journaling habit; Reflect and Logseq are built around it | S | Full (empty body, spec-derived path) |
| 4 | **Guided morning plan and evening shutdown** | Sunsama's reason for existing, at $16/mo ([ClickUp](https://clickup.com/learn/topic/productivity/tools/sunsama/)) | M | Full; very on-brand |
| 5 | **Read-only local calendar (.ics file or URL) in Today** | NotePlan, Amie and TickTick all merge calendar and tasks. A subscribed URL needs the network, so make it optional | M | Partial: must be opt-in, no account |
| 6 | **Sync guide plus conflict-copy handling** for Syncthing, iCloud, Dropbox and Git | Mobile is the biggest gap; the XDA synced-folder pattern shows demand; the on-disk conflict prompt already exists | S (docs) / M (conflict-copy UI) | Full |
| 7 | **Obsidian compatibility mode** (Tasks emoji dates, `[[link\|alias]]`, embeds) | Makes an existing Obsidian vault usable instantly; Obsidian is the largest local-Markdown community | M | Full |
| 8 | **Importers** for Notion, Apple Notes, Bear, Things, Todoist → .md | Lock-in anger at Notion and Bear; Apple Notes now exports Markdown ([AppleInsider](https://appleinsider.com/inside/ios-26/tips/how-to-import-and-export-markdown-with-apple-notes-in-ios-26)) | M–L | Full (one-way, local) |
| 9 | **Export to PDF, HTML, or copy as rich text** | Bear's export range is a praised strength; needed to share with people who don't use myOS | S | Full |
| 10 | **Board view for project tasks** (by status) | Kanban plugin has 2.7M downloads | M | Full (status stays in frontmatter) |
| 11 | **Saved views / smart lists** (filter by tag, project, date) | Obsidian Bases and Dataview (5M); keep it no-code | M | Full; guard the "calm" feel |
| 12 | **Automatic local history/snapshots, or one-click Git commit** | Git plugin has 3.2M downloads; Obsidian Sync sells version history | M | Full |
| 13 | **Minimal mobile companion** (capture to Inbox, view Today, over a synced folder) | Every competitor is on mobile; Tana's poor mobile app is a top complaint | L | Full if it only uses the synced folder |
| 14 | **Sketch/whiteboard block saved as local SVG or .excalidraw file** | Excalidraw is Obsidian's #1 plugin (8.2M) | M | Full |
| 15 | **Focus and review aids**: focus/typewriter mode, weekly review, reading stats | iA Writer's core value; weekly review is the GTD habit Things users do by hand | S–M | Full |

**Suggested order:** 1, 2, 3, 6 and 9 close the table-stakes gaps cheaply. After that, 4 and 7 are the clearest differentiators: a calm Sunsama-style daily routine, running on Obsidian-compatible plain files, on Linux.

Some figures come from secondary review sites and should be spot-checked before publishing. These are Todoist's exact post-increase price, Things' ~$80 total, and Notion's pricing, which I didn't look up. Download counts are cumulative as of today on obsidianstats.
