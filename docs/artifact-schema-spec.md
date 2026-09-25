# Artifact schema

An artifact is one Markdown file: YAML frontmatter plus a body. The app, the `myos` CLI, and external tools all read and write the same files, so the on-disk schema stays stable.

## Frontmatter

`dashboard/shared/spec/fields.ts` holds the one field table, `ARTIFACT_FIELDS`. Every known key is listed there once, with its kind (`string`, `strings`, `date`, `dates`, `number`, `boolean`), in the order myOS writes them:

`id, title, type, tags, created, updated, status, related, domain, project, priority, due, planned, parentId, deferDate, estimatedMinutes, sequential, flagged, completedDate, repeatRule, completions, when, next, review, reviewInterval, localPath, repoUrl, isExternalProject, language, order, pinned, swatch`

The 3.0 additions:

| Key | Kind | Meaning |
| --- | --- | --- |
| `planned` | date | The day chosen for a task in Plan my day; `order` is its place in that day's list |
| `repeatRule` | string | `every day`, `every weekday`, `every week`, `every 2 weeks`, `every tue`, `every mon, thu`, `every month`, `every month on 15`, `every year`, `every 3 days` (parsed by `shared/recurrence.ts`) |
| `completions` | dates | Completion days of a repeating task, oldest first, the last 30 kept |
| `when` | string | A task's cue, such as "after lunch" |
| `next` | string | A project's next step |
| `review`, `reviewInterval` | date, number | A note's next spaced review and the interval in days that led to it (`shared/recall.ts`) |

The table drives parsing (`readFields`), writing (`writeFields`), and patch validation (`normalizeField`):

- Unknown keys are kept in `Artifact.extra` and written back after the known ones, unchanged.
- A known key whose value doesn't fit its kind also stays in `extra`, so it still round-trips.
- YAML is read with the core schema, so dates stay the strings that were written.
- Frontmatter-only changes (`artifacts:patch`, `artifacts:retype`) rewrite the frontmatter and keep the body byte for byte.

Missing values are inferred when a file is read, not written until the file is next changed. `id` comes from the path. `title` is the first `# heading`, or else the file name. `type` comes from the storage folder, or else `memo`. `status` is the type's default. `domain` comes from the first path segment, or else the type's default.

## Types

`dashboard/shared/spec/types.ts` has one row per type:

| Type | Folder | Statuses (default first) | Domain |
| --- | --- | --- | --- |
| todo | `<domain>/todos/` | pending, in-progress, done, cancelled, someday | personal |
| memo | `<domain>/memos/` | active, draft, archived, done | personal |
| project | `<domain>/projects/` | active, draft, archived, done, cancelled | personal |
| inbox | `inbox/` | draft, active, archived | none |
| journal | `journal/` (`journal/YYYY-MM-DD.md`, id is the date) | active, archived | none |
| template | `templates/` | active, archived | none |
| decision | `<domain>/decisions/` | active, superseded, archived | personal |
| meeting | `<domain>/meetings/` | active, draft, archived | personal |
| research | `<domain>/topics/` | active, draft, archived | research |
| query | `<domain>/queries/` | active, archived | personal |
| snippet | `<domain>/code/` | active, archived | personal |
| prompt | `<domain>/prompts/` | active, draft, archived | personal |
| development | `<domain>/development/` | active, draft, archived, done | personal |

The domain column is the fallback. The interface calls a domain an **Area** (`AREAS`: `work` Work, `personal` Personal, `research` Learning, `creative` Creative), and the renderer sends the user's default area with every new item.

Helpers: `defaultStatusFor`, `isStatusAllowed`, `domainFor`, `canonicalPath(id, type, domain)`, `typeFromPath`.

## Writes

The main process owns every write (`dashboard/electron/documents/artifacts.ts`):

- **create**: a new file at the canonical path, with an empty body unless the draft has content. Its area is the project's, then the draft's `domain` (the default area), then the type's fallback. A draft may name its `id` (journal pages use the date).
- **save**: frontmatter changes plus the whole body. It requires the `rev` (`mtimeMs:size`) the editor loaded, and fails with `CONFLICT` if the file changed since then.
- **patch**: frontmatter only. `null` removes an optional key. Statuses are checked against the type.
- **retype**: changes the type and moves the file to that type's folder.
- **delete**: returns a full snapshot. **restore** writes the snapshot back to the same path (the original bytes when the app still has them) and refuses to replace a file that exists.
- **toggle-check**: flips one `- [ ]`/`- [x]` line, after checking the line still reads as expected, and changes no other byte. Listing reports each note's checkbox lines as `checks` (1-based line in the whole file, text, done, and a due date from `📅 YYYY-MM-DD` or a trailing `due YYYY-MM-DD`), skipping code fences, tasks, and templates.
- **rename**: moves the file to `<slug of title>.md` in its folder (`-2`, `-3`, … when taken) with its bytes unchanged. Journal pages keep their date. **move** puts a file at an exact new path, and **move-area** sets `domain` and moves the file to that area's folder for its type.

## Version history

Before a save (at most one snapshot per file every ten minutes) and before every delete, retype, rename, area move, and version restore, the main process keeps the file's current text under the app's data directory, never in the workspace:

`<userData>/history/<sha1 of the workspace root>/<relative path>/<ISO timestamp with - for : and .>.md`

The latest 50 per file are kept, and none older than 60 days; pruning happens when a snapshot is written. History follows a file when it moves. `history:list`, `history:read`, and `history:restore` accept only snapshot ids that exist for that file.

## Tests

- `dashboard/electron/documents/documents.test.ts` covers round trips, conflicts, body-preserving patches, exact restore, renames and area moves that keep bytes, and version restore.
- `dashboard/electron/workspace/paths.test.ts` covers workspace containment.
- `dashboard/shared/today.test.ts` covers the Today and Tasks sections; `inbox.test.ts` covers capture parsing; `recurrence.test.ts` covers repeat dates; `checklist.test.ts` covers the byte-exact checkbox toggle.
