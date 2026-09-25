# One Line of Query

**A view in myOS Next is a search written as a single line of text. The same line runs on the Tasks screen, in the sidebar, inside a note, and in the terminal.**

By the myOS Editors

Many task apps give you a set of fixed lists: inbox, today, upcoming, someday. myOS Next gives you two screens, Today and Tasks, and a way to write any other list yourself. That way is a view: one line of text, such as

```text
open due<=today #work group:file
```

Read it left to right. Open tasks, due today or earlier, tagged `#work`, grouped by the file they live in. Terms are combined with AND. A `-` in front of a filter negates it. There is no nesting, no parentheses, and no OR. The whole language fits in a table, and it is printed in the box at the end of this article.

## The terms

**Status.** `open` and `done` match open or done tasks. `overdue` matches open tasks with a due date before today.

**Dates.** Any of the four task dates can be compared: `due`, `scheduled`, `start`, and `done`. The operators are `<`, `<=`, `=`, `>=`, and `>`. The right-hand side can be `today`, `tomorrow`, `yesterday`, an offset such as `today+7` or `today-7`, or a date like `2026-10-01`. `due=none` finds tasks with no due date.

**Tags.** `#release` matches tasks or notes with that tag, and nested tags below it: `#work` also finds `#work/api`. `-#someday` leaves them out.

**Places.** `path:notes/` matches files whose path starts with `notes/`. `file:api` matches files whose name contains `api`.

**Words.** Anything else is text to look for. In a task view it matches the task's text; in a notes view it matches a note's title and body. A phrase in quotes is searched as a phrase.

**Options.** `sort:due`, `sort:priority`, or `sort:file` order tasks (the default is `due`). Notes sort by `file`, `title`, or `modified`. `group:file`, `group:folder`, `group:tag`, and `group:date` split the results into sections. `limit:20` caps the count.

When a term cannot be used, it is left out and the view says why in one sentence, for example that a term "works in task views only," or "needs a date such as today, tomorrow, or 2026-10-01." The rest of the view still runs.

> Terms are combined with AND. There is no nesting, no parentheses, and no OR. The whole language fits in one table.

## Some real examples

The week ahead, by day:

```text
open due<=today+7 group:date
```

Grouping by date puts late tasks first under "Overdue," then each date in order, with "Today" and "Tomorrow" named, and undated tasks last.

Everything in a project's docs folder that has no date yet:

```text
open path:docs/ due=none
```

What got done last week, for a status update:

```text
done done>=today-7 sort:file
```

High-priority work that is not blocked on someone else:

```text
open sort:priority -#waiting limit:10
```

Tasks that mention the parser, anywhere:

```text
open parser
```

A view lists tasks unless it asks for notes. In a note or at the terminal, `kind:notes` does that. The ten most recently changed meeting notes:

```text
kind:notes #meeting sort:modified limit:10
```

## The Tasks screen

The Tasks screen is the plainest place to write a view. It starts with `open`, which lists every open task in the folder. Type in the query bar to narrow it. Each result is a task row you can check off, reschedule, tag, or open at its line. When a query is worth keeping, save it.

## Saved and pinned views

Save as view asks for a name, such as "Release week," and pins the view to the sidebar, below Today and Tasks. The view is stored in the app's settings, not in your folder, so saving and removing views never changes a file. Remove, on the view's own screen, shows a confirmation with Undo, which puts the view back in the same place.

## Views inside a note

A view can also live in a note, as a fenced code block named `view`. The query can follow the block's name, fill the lines inside, or both. It lists tasks unless the query includes `kind:notes`:

````markdown
```view
open due<=today+7 #work
group:file
```

```view kind:notes #meeting sort:modified limit:10
```
````

In the app, the block shows live results that update as files change. The header shows the query in monospace and a count, and an Open as view button opens it as a full view. Checking a task inside the block writes to that task's own file, not to the note the block sits in.

In any other editor, and in Obsidian, the block is a fenced code block with a line or two of text. Nothing breaks, and nothing is hidden. This is the difference between a view block and an embedded database: the note holds the question, not a copy of the answer.

> The note holds the question, not a copy of the answer.

A project page might hold a short paragraph of context, a list of links, and a `view` block with `open path:. group:file`. Inside a block, `path:.` means the note's own folder, `path:./drafts/` and `path:../` are read from there, and `file:this` is the note itself, so the block keeps working when the folder is moved or renamed. As tasks are added in meeting notes and daily notes under that folder, the page shows them without anyone editing it.

## The same query in the terminal

Because the query engine is shared code, the command line runs the same language:

```bash
myos-next tasks "open #release due<=today+7"
```

It prints one task per line, with its dates and its `path:line`, grouped when the query asks for groups. The terminal article later in this issue has the details.

The decision record behind the app names this as a consequence of the folder-first approach: "a small query engine is shared by app, fenced blocks, and CLI." One syntax to learn, in four places.

:::sidebar
**View syntax**

| Term | Matches |
| --- | --- |
| `open`, `done` | Open or done tasks |
| `overdue` | Open tasks due before today |
| `due<=today`, `scheduled=tomorrow`, `start>=today-7`, `done=yesterday` | Tasks by date; operators `< <= = >= >` |
| `due=none` | Tasks with no due date |
| `#tag`, `-#tag` | With or without a tag (nested tags included) |
| `path:notes/` | Paths starting with `notes/` |
| `file:api` | File names containing `api` |
| `words`, `"a phrase"` | Task text, or a note's title and text |
| `sort:due` · `sort:priority` · `sort:file` | Task order (default `due`) |
| `sort:file` · `sort:title` · `sort:modified` | Note order |
| `group:file` · `folder` · `tag` · `date` | Sections (`date` for tasks only) |
| `limit:20` | At most this many results |
| `path:.` · `file:this` | In a block: the note's folder · the note |
| `kind:notes` | In a block or the terminal: list notes |

Fence it: ```` ```view ````, with the query after the name or on the lines inside.
:::
