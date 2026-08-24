# Artifact Schema Spec

## Purpose

myOS artifact creation and updates now use a machine-readable schema/spec contract in `dashboard/shared/spec/`.
This contract is the single source of truth for:

- Required fields and defaults
- Allowed status and domain values per artifact type
- Canonical vault storage paths
- Minimal scaffold sections for new artifact content

`AGENTS.md`, skills, and slash commands describe orchestration and workflow behavior, but they should not redefine validation or storage rules.

## Spec Modules

- `dashboard/shared/spec/artifact-spec.ts`
  - Contract types (`ArtifactSpec`, `FieldRule`, `StatusRule`, `StorageRule`, `ScaffoldRule`)
- `dashboard/shared/spec/artifact-rules.ts`
  - Per-type spec map (`ARTIFACT_SPECS`)
  - Normalization, validation, and path derivation helpers
- `dashboard/shared/spec/artifact-scaffold.ts`
  - Generic scaffold builder for heading/placeholder sections
- `dashboard/shared/spec/index.ts`
  - Shared exports for Electron and renderer

## Runtime Helpers

Use these helpers instead of local per-feature maps or defaults:

- `getArtifactSpec(type)`
- `getDefaultStatusForType(type)`
- `getDefaultDomainForType(type)`
- `getAllowedStatusesForType(type)`
- `isStatusAllowedForType(type, status)`
- `deriveArtifactPathFromSpec({ id, type, domain })`
- `buildScaffoldForType(type, options)`
- `normalizeDraftFromSpec(draft, options)`
- `validateArtifactAgainstSpec(artifact)`

## Canonical Behavior

### Create Flow

1. Normalize draft with spec defaults (`normalizeDraftFromSpec`)
2. Validate normalized artifact (`validateArtifactAgainstSpec`)
3. Derive/write canonical path (`deriveArtifactPathFromSpec`)
4. Persist markdown frontmatter + content

### Update Flow

1. Keep existing file location for compatibility (warn if not canonical)
2. Re-validate type/domain/status using spec
3. Preserve legacy/custom frontmatter fields on roundtrip
4. Persist updated artifact

## Compatibility

- Existing markdown artifacts in `vault/` remain valid; no bulk migration required.
- Runtime/UI template management is removed from Electron IPC + renderer settings.

## Testing

Schema-spec coverage lives in:

- `dashboard/shared/spec/__tests__/artifact-spec.test.ts`
- `dashboard/shared/spec/__tests__/artifact-normalize.test.ts`
- `dashboard/shared/spec/__tests__/artifact-paths.test.ts`
- `dashboard/shared/spec/__tests__/artifact-scaffold.test.ts`

Roundtrip preservation coverage lives in:

- `dashboard/electron/handlers/file-operations/__tests__/artifact-format.test.ts`
