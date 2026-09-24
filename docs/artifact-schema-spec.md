# Artifact schema

An artifact is one Markdown file: YAML frontmatter plus a body. The app, the `myos` CLI, and external tools all read and write the same files, so the on-disk schema stays stable.

## Frontmatter

`dashboard/shared/spec/fields.ts` holds the one field table, `ARTIFACT_FIELDS`. Every known key is listed there once, with its kind (`string`, `strings`, `date`, `number`, `boolean`), in the order myOS writes them:

`id, title, type, tags, created, updated, status, related, domain, project, priority, due, parentId, deferDate, estimatedMinutes, sequential, flagged, completedDate, repeatRule, localPath, repoUrl, isExternalProject, language, order, pinned, swatch`

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
| todo | `<domain>/todos/` | pending, in-progress, done, cancelled | work |
| memo | `<domain>/memos/` | active, draft, archived, done | work |
| project | `<domain>/projects/` | active, draft, archived, done, cancelled | work |
| inbox | `inbox/` | draft, active, archived | none |
| decision | `<domain>/decisions/` | active, superseded, archived | work |
| meeting | `<domain>/meetings/` | active, draft, archived | work |
| research | `<domain>/topics/` | active, draft, archived | research |
| query | `<domain>/queries/` | active, archived | work |
| snippet | `<domain>/code/` | active, archived | work |
| prompt | `<domain>/prompts/` | active, draft, archived | work |
| development | `<domain>/development/` | active, draft, archived, done | work |

Helpers: `statusesFor`, `defaultStatusFor`, `isStatusAllowed`, `domainFor`, `canonicalPath(id, type, domain)`, `typeFromPath`.

## Writes

The main process owns every write (`dashboard/electron/documents/artifacts.ts`):

- **create**: a new file at the canonical path, with an empty body unless the draft has content. A draft that names a `project` and no `domain` takes the project's domain.
- **save**: frontmatter changes plus the whole body. It requires the `rev` (`mtimeMs:size`) the editor loaded, and fails with `CONFLICT` if the file changed since then.
- **patch**: frontmatter only. `null` removes an optional key. Statuses are checked against the type.
- **retype**: changes the type and moves the file to that type's folder.
- **delete**: returns a full snapshot. **restore** writes the snapshot back to the same path (the original bytes when the app still has them) and refuses to replace a file that exists.

## Tests

- `dashboard/electron/documents/documents.test.ts` covers round trips, conflicts, body-preserving patches, and exact restore.
- `dashboard/electron/workspace/paths.test.ts` covers workspace containment.
- `dashboard/shared/today.test.ts` covers the Today buckets and capture parsing.
