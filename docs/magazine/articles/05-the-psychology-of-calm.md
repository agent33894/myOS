# The Psychology of Calm

*Productivity software has long borrowed from psychology, and not always its best ideas. For 3.0, myOS read the evidence first: what holds up, what quietly failed to replicate, and why the most humane feature is sometimes the one you decline to build.*

By the myOS Editors

---

There is a particular genre of app that congratulates you for seven days in a row and punishes you on the eighth. It lights a small flame, then threatens to put it out. It works, the way guilt works. It is not calm.

When myOS began planning its third season, one of the three research tracks was behavioral science. The brief was not to find levers. It was to find what the evidence actually supports, rate how strongly, and turn the answer into rules. What came back reads less like a growth playbook and more like a code of manners.

## What holds up

**Implementation intentions.** An "if-then" plan, *when X happens, I will do Y*, is among the sturdier findings in the field. The research brief cites an effect of d = .65 across 94 tests in Gollwitzer and Sheeran's 2006 review, and notes that the figure is probably inflated; a 2024 update covering 642 tests gives d = .27 to .66, with larger effects for "if-then" wording and plans that are rehearsed. The brief rates the evidence strong.

In 3.0 this becomes the quietest of features: an optional **When** cue on a task, "after lunch", "at the café", in the user's own words, shown softly beneath the title. There are no reminders tied to it, and no "you missed it" message.

**Plan-making.** In lab studies by Masicampo and Baumeister (2011), writing a specific plan removed the intrusive thoughts and interference caused by unfinished goals. The brief rates this moderate: several studies, few independent replications. Its lesson is precise. Capture alone is not enough; capture plus a next step is what quiets the mind. Hence **Next step** on every project, one click from becoming a task.

> Capture alone is not enough. Capture plus a next step is what quiets the mind.

**Peak-end.** People judge an experience mostly by its peak and its end; the brief cites r ≈ .58 across 174 effect sizes (Alaybek, 2022), and rates it strong. So the rituals in 3.0 are built to end well. **Close the day** begins with what got done, then settles each unfinished item, then closes with "That's a wrap." The **Weekly review** ends on an optional reflection and a link to **What moved**, a plain list of what was finished and written that week.

**Fresh starts.** Goal-directed behaviour rises after temporal landmarks such as a new week, month, or birthday (Dai, Milkman and Riis, 2014). The brief rates the evidence moderate, mostly correlational field data, and suggests a weekly clean slate. In 3.0, a gentle "Weekly review" item appears in the sidebar only on the day you choose, and goes away once you have finished the review or dismissed it with "Not this week".

**Retrieval practice.** Recalling beats rereading. The brief cites meta-analytic effects of g ≈ .50 in one analysis and .61 to .70 in another, and notes that spaced practice helps retention; it rates the evidence strong. **Recall** in 3.0 lets you mark any note for spaced review at 1, 3, 7, 16, and 35 days, stretching or shrinking with your answer. It shows the title first, "What do you remember?", before revealing the note. The queue caps at 10 a day, and the rest roll forward quietly.

**Self-determination theory.** Autonomy, competence, and relatedness predict lasting motivation and wellbeing (Peters, Calvo and Ryan, 2018). The brief treats SDT as a strong framework, and it underwrites the first and most important guardrail: every nudge is opt-in, and explains *why* something is there, never *that you must*.

## What does not

**Ego depletion.** The idea that willpower is a tank that drains through the day has a long shelf life in productivity writing. According to the brief, two large preregistered replications found effects near zero (d = .04; N = 3,531), and the famous "hungry judges" parole study has been reinterpreted as a case-ordering artefact. The brief's instruction is blunt: don't build features or copy on "willpower runs out."

**"21 days to form a habit."** The evidence the brief cites points elsewhere. In Lally's 2010 study, automaticity took a median of 66 days, with a range of 18 to 254, and missing a single day did not derail it. A 2024 review found 59 to 335 days. Nothing there supports a 21-day rule, and so the phrase appears nowhere in myOS.

**Unfinished tasks haunt you.** A 2025 meta-analysis of 59 studies (Ghibellini and Meier) found almost no memory advantage for unfinished tasks, a recall ratio of 0.99, though it did find a reliable urge to return to interrupted work. The brief rates the memory claim contested. myOS will not tell you your open loops are haunting you. It will make them easy to pick back up.

:::sidebar
**Words myOS will not use**

The 3.0 guardrails and the research brief call for evidence-honest copy. That rules out:

- "21 days to a habit"
- "Willpower runs out"
- Claims that unfinished tasks are remembered better
- Any promise of therapeutic benefit from journaling

"Mind like water" may stay, the brief says, as a metaphor, not a promise.
:::

## Why there are no streaks

A streak is a promise that turns into a threat. It counts up while you comply and resets to zero the moment life intervenes. The habit research cited above is the argument against it: automaticity takes weeks to months, varies enormously between people, and survives a missed day. A mechanic that treats one missed day as total failure is, on this evidence, simply wrong.

So 3.0's **Repeating tasks** show a different sentence. Not a chain of flames, but an honest record: "Done 9 of the last 10 times." The dates behind it are stored plainly, as the last 30 completion dates in the task's own frontmatter. Miss a week and the count simply reflects it. Nothing resets, and nothing scolds.

> Not a chain of flames, but an honest record: "Done 9 of the last 10 times."

The same reasoning renames a familiar word. "Overdue" becomes **Carried over**, in neutral styling with no red counts, next to a **Re-plan** action. The brief's argument, drawn from SDT, is that shame lowers the sense of autonomy and competence that motivation depends on. A task that slipped is not a failure. It is simply still here.

## The guardrails

The research ended in rules, and the 3.0 plan made eight of them binding for every feature.

:::sidebar
**The humane design guardrails**

1. **Autonomy first.** Every nudge is opt-in and can be switched off in one place.
2. **No loss framing.** No streaks, chains, badges, red aging counts, or guilt copy.
3. **Calm by default.** Only reminders the user sets make noise.
4. **Honest progress.** Progress comes from real files only. No fake head starts.
5. **Endings are features.** Rituals have a clear finish and end on what was accomplished.
6. **Private by construction.** Metrics are computed on demand from the files. No telemetry.
7. **Evidence-honest copy.** No "21 days" or "willpower runs out".
8. **Your files, your structure.** No placeholder text; no rewriting blocks you did not touch.
:::

Two are worth dwelling on. *Honest progress* answers the goal-gradient effect: people speed up as they near a goal, and, as the brief notes, fake head-start progress works too, which makes it a manipulation risk. myOS computes progress from real files and nothing else. *Private by construction* means the app has nowhere to send a metric even if it wanted to. There is no telemetry; anything stored is readable Markdown or frontmatter you can edit or delete.

The brief also proposes a test to run before anything ships: would this still be worth it if the user never opened the app more often? It is the right question for a calm app.

## The shape of a humane app

Put together, the research describes a product that behaves like a good friend with a good memory. It helps you decide what to do and when. It lets you end the day on what went well. It gives Monday its sense of a fresh page. It helps you remember what you read. And when you skip a day, a review, or a whole week, it says nothing at all.

Leaving things alone always works. That, finally, is the psychology of calm.
