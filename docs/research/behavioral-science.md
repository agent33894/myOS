# Behavioral science brief

_Research input for [`roadmap-3.0.md`](../roadmap-3.0.md), September 2026._

Evidence-rated principles, humane feature ideas, and design guardrails for a calm, private notes and tasks app.

# Behavioral science brief for myOS

## 1. Evidence table

| Principle | Finding | Strength / replication | Implication for myOS |
|---|---|---|---|
| **Open loops (Zeigarnik / Ovsiankina)** | A 2025 meta-analysis of 59 studies found almost no memory advantage for unfinished tasks (recall ratio 0.99), but it did find a reliable urge to go back to interrupted tasks. [Ghibellini & Meier 2025](https://www.nature.com/articles/s41599-025-05000-w) | "Unfinished tasks stick in memory" is **contested**. The urge to resume is **moderate**. | Don't claim "unfinished tasks haunt you." Do make it easy to pick work back up. |
| **Plan making offloads goals** | Writing a specific plan removed intrusive thoughts and interference from unfinished goals. [Masicampo & Baumeister 2011, doi:10.1037/a0024192](https://users.wfu.edu/masicaej/MasicampoBaumeister2011JPSP.pdf) | **Moderate**: several lab studies, few independent replications. | Capture alone isn't enough. Capture plus a next step is what quiets the mind. |
| **Implementation intentions** | d = .65 across 94 tests. The 2024 update (642 tests) gives d = .27–.66, with larger effects for "if-then" wording and plans that are rehearsed. [Gollwitzer & Sheeran 2006, doi:10.1016/S0065-2601(06)38002-1](https://kops.uni-konstanz.de/handle/123456789/10973); [Sheeran et al. 2024](https://www.tandfonline.com/doi/abs/10.1080/10463283.2024.2334563) | **Strong** (the 2006 figure is probably inflated) | Offer an optional "when/where" cue on tasks. |
| **Planning fallacy / segmentation** | Breaking a task into parts and estimating each gives longer, more accurate totals. [Forsyth & Burt 2008](https://link.springer.com/article/10.3758/MC.36.4.791) | **Moderate–strong** | Let totals of the parts inform how much goes on Today. |
| **Progress principle** | In about 12,000 work-diary entries, small steps forward on meaningful work were the strongest driver of good days. [Amabile & Kramer 2011](https://www.amanet.org/articles/the-worth-of-small-wins-teresa-amabile-and-steven-kramer-on-the-progress-principle/) | **Moderate**: correlational diary data | Make finished work visible and meaningful, not gamified. |
| **Goal gradient** | People speed up as they get close to a goal. Fake head-start progress also works, which makes it a manipulation risk. [Kivetz et al. 2006](https://journals.sagepub.com/doi/abs/10.1509/jmkr.43.1.39) | **Moderate** | Show honest project progress only. No invented head starts. |
| **Self-determination theory (SDT)** | Autonomy, competence and relatedness predict lasting motivation and wellbeing. [Peters, Calvo & Ryan 2018](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2018.00797/full) | **Strong** as a framework | Every nudge is opt-in. Explain why, never pressure. |
| **Habit formation** | Automaticity took a median of 66 days (range 18–254). Missing one day didn't derail it. A 2024 review found 59–335 days. [Lally 2010, doi:10.1002/ejsp.674](https://onlinelibrary.wiley.com/doi/10.1002/ejsp.674); [Singh 2024](https://pubmed.ncbi.nlm.nih.gov/39685110/) | **Moderate** (small samples) | Streaks are wrong on the evidence. A missed day is fine. |
| **Cues vs reminders** | Reminders helped people repeat a behaviour but slowed habit formation. Event-based cues ("after X") built automaticity. [Stawarz et al. CHI 2015](https://dl.acm.org/doi/10.1145/2702123.2702230) | **Preliminary** | Prefer "after X" anchors over timed notifications. |
| **Retrieval and spacing** | Recalling beats rereading: g ≈ .50 in one meta-analysis and .61–.70 in another. Spaced practice helps retention. [Rowland 2014](https://pubmed.ncbi.nlm.nih.gov/25150680/); [Adesope 2017](https://journals.sagepub.com/doi/10.3102/0034654316689306); [Cepeda 2006](https://www.yorku.ca/ncepeda/publications/CPVWR2006.html) | **Strong** | Offer optional recall of notes. |
| **Generation effect** | Producing material yourself beats reading it: d ≈ .40 across 86 studies. [Bertsch et al. 2007, doi:10.3758/BF03193441](https://link.springer.com/article/10.3758/BF03193441) | **Strong** | Nudge "in your own words" summaries. |
| **Expressive writing** | Writing about your experiences has a small benefit: r ≈ .075 across 146 studies. [Frattaroli 2006](https://www.researchgate.net/publication/6721971_Experimental_Disclosure_and_its_moderators_A_meta-analysis) | **Small but real** | Offer a private reflection space. Promise nothing. |
| **Interruptions / attention residue** | Interrupted people work faster but feel more stress. Leftover attention from an unfinished task hurts the next one. [Mark et al. 2008](https://dl.acm.org/doi/10.1145/1357054.1357072); [Leroy 2009](https://ideas.repec.org/a/eee/jobhdp/v109y2009i2p168-181.html) | **Moderate** | Help people park a task cleanly. No interruptions from the app. |
| **Fresh start effect** | Goal-directed behaviour rises after temporal landmarks such as a new week, month or birthday. [Dai, Milkman & Riis 2014](https://pubsonline.informs.org/doi/10.1287/mnsc.2014.1901) | **Moderate**: field data, mostly correlational | Offer a weekly "clean slate" review. |
| **Peak-end rule** | People judge an experience mostly by its peak and its end: r ≈ .58 across 174 effect sizes. [Alaybek 2022](https://www.sciencedirect.com/science/article/abs/pii/S0749597822000334) | **Strong** | End the day and the review on what got done, not on the backlog. |
| **Choice overload** | The average effect is about zero, but overload appears when decisions are hard or preferences unclear. [Scheibehenne 2010](https://academic.oup.com/jcr/article-abstract/37/3/409/1827647); [Chernev 2015](https://chernev.com/wp-content/uploads/2017/02/ChoiceOverload_JCP_2015.pdf) | **Mixed** | Keep Today short when the list is heavy. Don't over-apply this. |
| **Decision fatigue / ego depletion** | Two large preregistered replications found effects near zero (d = .04; N = 3,531). The "hungry judges" parole study has been reinterpreted as a case-ordering artefact. [Hagger 2016](https://pubmed.ncbi.nlm.nih.gov/27474142/); [Vohs 2021](https://journals.sagepub.com/doi/abs/10.1177/0956797621989733); [Weinshall-Margel & Shapard 2011](https://www.researchgate.net/publication/51707318_Overlooked_factors_in_the_analysis_of_parole_decisions) | **Weak / failed replication** | Don't build features or copy on "willpower runs out." |
| **Attention restoration** | Nature exposure improved a few attention measures; 10 of 13 meta-analyses showed no clear benefit. [Ohly 2016](https://www.tandfonline.com/doi/full/10.1080/10937404.2016.1196155) | **Weak–mixed** | No "restorative" feature claims. |
| **Calm technology / dark patterns** | Technology should stay in the periphery (calm). A crawl of 11,000 shopping sites found 1,818 dark-pattern instances. [Weiser & Brown 1995](https://people.csail.mit.edu/rudolph/Teaching/weiser.pdf); [Amber Case](https://calmtech.com/); [Mathur 2019](https://arxiv.org/abs/1907.07032) | Design ethics, not effect sizes | Use as guardrails (section 3). |

## 2. Feature ideas

Everything below is stored as plain Markdown or frontmatter in the user's folder, or computed on demand in the main process. Nothing goes over the network. Any new field must be defined in `dashboard/shared/spec/`.

1. **Next step on projects.** *Mechanism:* plan making closes open loops (Masicampo). Add one optional line to the project property row, "Next: …", which also shows on Today. *Humane:* free text, never required, and no warning when it's empty. *Local:* a `next:` frontmatter field.

2. **"When" cue on tasks.** *Mechanism:* if-then plans (d ≈ .27–.65). Add an optional property phrased "When ___ (after standup, at the café)". Capture could accept `when:`. *Humane:* the user writes it in their own words, and there's no "you missed your plan" message. *Local:* frontmatter.

3. **Close the day.** *Mechanism:* offloading goals, clearing attention residue, and a good ending (peak-end). A two-minute, keyboard-first flow: tick off what's done, set a next step or new date for open items, and add an optional one-line note. It ends on a quiet "Done today" summary. *Humane:* opt-in, started by the user, no scheduled prompt, can be skipped any time. *Local:* appends to a dated Note.

4. **Weekly fresh-start review.** *Mechanism:* the fresh start effect plus the GTD weekly review. On a landmark day the user picks, offer a review of stale Inbox items, overdue tasks, and projects with no next step. *Humane:* shown once in the sidebar and never repeated. Wording: "A fresh week," not "You have 23 overdue." *Local:* date logic only.

5. **Rename and soften Overdue.** *Mechanism:* shame lowers autonomy and competence (SDT). Consider a label like "Carried over", plus a batch "Re-plan" action (reschedule, defer, or move to Someday). *Humane:* no red counts and no ageing colours.

6. **Someday / parked state.** *Mechanism:* choosing to drop or park something ends the open loop just as a plan does. This makes "not now" a real decision, not a failure. *Local:* a status value. It stays hidden from Today and its count.

7. **Honest capacity check on Today.** *Mechanism:* planning fallacy and choice overload. Tasks get optional estimates, and Today shows "About 6 h planned" next to a "hours available" figure the user sets. *Humane:* information only; the app never refuses to add tasks. *Local:* an `estimate:` field.

8. **Break it down.** *Mechanism:* segmentation improves estimates, and the first small step is what starts a task. Offer "Split into steps" as checkboxes in the task body. Each step can carry an estimate, and they add up. *Humane:* the body starts empty, per the spec.

9. **"Where I left off."** *Mechanism:* the urge to resume (Ovsiankina) plus a way to clear leftover attention (Leroy). When leaving a task or project, offer an optional one-liner; it reappears at the top when the page is reopened. *Local:* a small frontmatter field that's replaced each time, so no history builds up.

10. **Single-task focus view.** *Mechanism:* interruptions cost stress (Mark 2008). Open one task full-screen with its next step, and hide the sidebar counts. *Humane:* no timer and no "focus score." A plain countdown can be opt-in.

11. **What moved.** *Mechanism:* the progress principle. A weekly view listing finished tasks and edited notes, grouped by project, with the user's own close-of-day notes. *Humane:* a list, not a chart score. No comparing weeks, no leaderboard with past selves. *Local:* computed from modification times and `completed` dates.

12. **Recall blocks for learning.** *Mechanism:* retrieval practice plus spacing (g ≈ .5). A `/recall` block with a question and a hidden answer. Notes marked "Review" come back at widening intervals inside a Review list the user opens themselves. *Humane:* opt-in per note, no due-card pile-up, no penalty for skipping. Pending cards cap at a small number and the rest roll forward quietly. *Local:* a `review:` date in frontmatter.

13. **"In your own words" prompt.** *Mechanism:* the generation effect (d ≈ .40). When a note mostly holds pasted material, show a dismissible ghost prompt: "Summarise in a sentence." *Humane:* it's placeholder text only and is never written to the file, which keeps the empty-body rule.

14. **Private reflection page.** *Mechanism:* expressive writing (a small effect) and self-distancing. An optional dated page type with no project and no tags required. It's excluded from Today and search results unless the user includes it. *Humane:* no mood tracking, analysis, or sentiment scoring, and no claims of therapeutic benefit. *Local:* plain files, which the user can keep out of Git via the existing ignore rules.

15. **Anchored routines instead of streaks.** *Mechanism:* event-based cues build automaticity, and Lally found a missed day doesn't matter. Repeating tasks are phrased "after ___". Only "done 9 of the last 14 times" is shown, never a chain. *Humane:* no reset to zero and no loss framing.

## 3. Guardrails for humane design

1. **Autonomy first (SDT).** Every nudge is opt-in, can be switched off in one place, and is off by default where it would interrupt. Explain *why* something is there, never *that you must*.
2. **No loss framing.** No streaks, chains, badges, "don't break it," ageing red counts, or guilt copy. Sidebar counts stay informational, which matches the existing rule that each count equals its page's rows.
3. **Calm by default.** Only reminders the user set can make noise. No re-engagement pings, no "we miss you," no marketing inside the app.
4. **Honest progress.** No fake head-start progress bars and no inflated completion numbers. Progress is computed from real files.
5. **Ending is a feature.** Flows such as close the day, the weekly review, and Inbox sorting have a clear finish and end on what was accomplished (peak-end). Don't add endless feeds.
6. **Private by construction.** Any metric is computed on demand, shown only to the user, and never stored as a hidden score. Anything saved lives as readable Markdown the user can edit or delete. Still no telemetry. Learn from opt-in interviews and diary studies, not usage tracking.
7. **Evidence-honest copy.** Don't cite ego depletion, "21 days to form a habit," or the claim that unfinished tasks are remembered better. Keep "mind like water" as a metaphor, not a promise.
8. **Your files, your structure.** Features never require a template, never write placeholder text into files, and never rewrite blocks the user didn't touch.
9. **Consistency is not the goal.** Treat a missed day, an unsorted Inbox, or an unfinished review as normal and don't punish them. Leaving everything alone should always work.
10. **A pre-ship dark-pattern check.** Before shipping any feature, ask: would this still be worth it if the user never opened the app more often? Does it steer, hide, nag, or shame, using the [Mathur 2019 taxonomy](https://arxiv.org/abs/1907.07032)? Does it add work for the user's attention, which calm technology says it shouldn't?

**Biggest wins:** ideas 1–3 (next step, "when" cue, close the day), 5 (softer Overdue), and 12 (recall blocks). They rest on the strongest evidence and fit the four existing nouns without adding new ones.
