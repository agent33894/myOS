# Artifact Schema Migration Runbook

Use this runbook for `dashboard/scripts/migrate-artifact-schema-debt.ts`. Run
all commands from `dashboard/`. Report mode is read-only; `--apply` is the only
mode that changes a vault.

> Implementation status (verified 2026-08-12): the report/apply/recovery engine
> passed deterministic parity, idempotency, collision, dirty-checkout,
> snapshot-tampering, rollback, and interrupted-recovery tests. The production
> vault was audited and snapshotted only; **no real-vault apply has been
> authorized or run**. Generate and review a fresh report before any future
> operator action rather than relying on the historical Phase 1 plan.

## Safety Contract

- Stop myOS before snapshot, apply, or recovery so file watchers cannot race
  the operator.
- Begin from a clean git checkout. Apply checks the entire containing checkout,
  including untracked files, and refuses a dirty state.
- Keep the report and snapshot outside the vault. Snapshot creation refuses a
  path inside the vault and refuses to reuse an existing directory.
- Inspect `cleanPreflight`, every `artifacts` entry, and every `issues` array in
  the report. Do not apply a blocked report.
- Never edit the vault, report, or snapshot between snapshot and apply. Apply
  recalculates the report, verifies its plan hash, then verifies every live
  source and backup hash.
- Preserve a separate whole-vault backup in addition to the targeted migration
  snapshot when operating on the production vault.

## 1. Generate and Review the Report

Choose a new report path. The command will not overwrite an existing report.

```bash
npm run migrate:artifact-schema -- \
  --vault ../vault \
  --report /tmp/myos-artifact-migration-report.json
```

With no flags, `npm run migrate:artifact-schema` prints the same report to
standard output and performs no writes. A stable repeated run has the same
`planHash`, counts, artifact ordering, source/result hashes, path changes, and
frontmatter changes.

Review the summary and blocking issues:

```bash
jq '{planHash, cleanPreflight, counts, issues}' \
  /tmp/myos-artifact-migration-report.json
```

Review each proposed artifact change:

```bash
jq '.artifacts[] | {id, action, path, frontmatterChanges}' \
  /tmp/myos-artifact-migration-report.json
```

Resolve every destination collision, duplicate ID, and parse error manually,
then generate a new report. The migration command never guesses through these
conditions.

## 2. Create and Verify the Snapshot

Choose a new directory outside the vault:

```bash
npm run migrate:artifact-schema -- \
  --vault ../vault \
  --snapshot /tmp/myos-artifact-migration-snapshot
```

The snapshot stores an untouched copy of every planned source file under
`files/` plus `artifact-migration-snapshot.json`. The manifest records source
and destination paths, source/result SHA-256 hashes, byte sizes, the report
plan hash, and restoration guidance.

```bash
jq '{migrationPlanHash, entries: (.entries | length), restorationGuidance}' \
  /tmp/myos-artifact-migration-snapshot/artifact-migration-snapshot.json
```

Retain this directory until apply, post-apply validation, and application smoke
testing are complete.

## 3. Apply

Only use `--apply` after explicit approval of the reviewed report:

```bash
npm run migrate:artifact-schema -- \
  --apply \
  --vault ../vault \
  --snapshot /tmp/myos-artifact-migration-snapshot
```

Apply refuses unless preflight is clean, the containing git checkout is clean,
the report plan matches the snapshot, and all live source and backup hashes
match. It stages result files, parks every original in a same-filesystem
transaction directory, and only then atomically renames results into place.
Handled failures automatically restore from the snapshot.

After success, rerun report mode. An idempotent migration reports zero touched,
moved, and frontmatter-updated artifacts. Then run the complete dashboard
validation gate and smoke test the packaged application before deleting the
snapshot.

## 4. Recover an Interrupted Run

If the process was killed or the machine stopped before automatic recovery,
leave myOS stopped and run:

```bash
npm run migrate:artifact-schema -- \
  --recover \
  --vault ../vault \
  --snapshot /tmp/myos-artifact-migration-snapshot
```

Recovery verifies every backup before changing the vault. It also refuses to
overwrite any related live path whose hash is not one of the recorded before or
after states. It restores all original source paths and removes the incomplete
transaction directory. Rerun report mode afterward; the original plan and plan
hash should be reproduced.

If recovery refuses an unrecognized hash, stop. Preserve the vault, transaction
directory, report, and snapshot, then compare the unexpected file manually. Do
not delete or overwrite it to force recovery.
