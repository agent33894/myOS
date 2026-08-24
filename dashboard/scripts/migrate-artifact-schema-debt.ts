import { access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  analyzeArtifactMigration,
  applyArtifactMigration,
  assertCleanGitCheckout,
  createArtifactMigrationSnapshot,
  recoverArtifactMigration,
} from '../electron/migration/artifact-schema-migration.ts';

interface CliOptions {
  vault?: string;
  report?: string;
  snapshot?: string;
  apply: boolean;
  recover: boolean;
  help: boolean;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveVaultRoot(explicitVault?: string): Promise<string> {
  if (explicitVault) {
    const vaultRoot = path.resolve(explicitVault);
    if (!(await pathExists(vaultRoot))) throw new Error(`Vault does not exist: ${vaultRoot}`);
    return vaultRoot;
  }
  const candidates = [
    path.resolve(process.cwd(), '../vault'),
    path.resolve(process.cwd(), 'vault'),
  ];
  for (const candidate of candidates) {
    if (await pathExists(candidate)) return candidate;
  }
  throw new Error(`Unable to locate vault directory. Checked: ${candidates.join(', ')}`);
}

function assertOutsideVault(vaultRoot: string, targetPath: string, label: string): void {
  const relative = path.relative(vaultRoot, path.resolve(targetPath));
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    throw new Error(`${label} must be outside the vault.`);
  }
}

function parseArguments(argumentsToParse: string[]): CliOptions {
  const options: CliOptions = { apply: false, recover: false, help: false };
  for (let index = 0; index < argumentsToParse.length; index += 1) {
    const argument = argumentsToParse[index];
    if (argument === '--apply') options.apply = true;
    else if (argument === '--recover') options.recover = true;
    else if (argument === '--help' || argument === '-h') options.help = true;
    else if (argument === '--vault' || argument === '--report' || argument === '--snapshot') {
      const value = argumentsToParse[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${argument} requires a path.`);
      options[argument.slice(2) as 'vault' | 'report' | 'snapshot'] = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (options.apply && options.recover) throw new Error('--apply and --recover are mutually exclusive.');
  if ((options.apply || options.recover) && !options.snapshot) {
    throw new Error(`${options.apply ? '--apply' : '--recover'} requires --snapshot.`);
  }
  return options;
}

function usage(): string {
  return `Artifact schema migration (report-only by default)

Usage:
  vite-node scripts/migrate-artifact-schema-debt.ts [--vault PATH] [--report FILE] [--snapshot DIR]
  vite-node scripts/migrate-artifact-schema-debt.ts --apply --vault PATH --snapshot DIR
  vite-node scripts/migrate-artifact-schema-debt.ts --recover --vault PATH --snapshot DIR

Options:
  --vault PATH     Vault to inspect. Defaults to ../vault or ./vault.
  --report FILE    Also write the deterministic JSON report to FILE.
  --snapshot DIR   In report mode, create a verified recovery snapshot in a new directory.
                   In apply/recover mode, use the existing snapshot in DIR.
  --apply          Apply only after a clean preflight, clean git checkout, and snapshot verification.
  --recover        Restore all planned source files from the verified snapshot.
  --help, -h       Show this help.
`;
}

async function runArtifactMigrationCli(argumentsToParse = process.argv.slice(2)): Promise<void> {
  const options = parseArguments(argumentsToParse);
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  const vaultRoot = await resolveVaultRoot(options.vault);
  if (options.report) assertOutsideVault(vaultRoot, options.report, 'Report file');
  if (options.recover) {
    const result = await recoverArtifactMigration(vaultRoot, options.snapshot as string);
    process.stdout.write(`${JSON.stringify({ mode: 'recover', ...result }, null, 2)}\n`);
    return;
  }

  const analysis = await analyzeArtifactMigration(vaultRoot);
  const serializedReport = `${JSON.stringify(analysis.report, null, 2)}\n`;
  if (options.report) {
    await writeFile(path.resolve(options.report), serializedReport, { encoding: 'utf8', flag: 'wx' });
  }
  if (options.apply) {
    await assertCleanGitCheckout(vaultRoot);
    const result = await applyArtifactMigration(vaultRoot, options.snapshot as string, analysis);
    process.stdout.write(`${JSON.stringify({ mode: 'apply', planHash: analysis.report.planHash, ...result }, null, 2)}\n`);
    return;
  }
  if (options.snapshot) {
    await createArtifactMigrationSnapshot(vaultRoot, options.snapshot, analysis);
  }
  process.stdout.write(serializedReport);
}

runArtifactMigrationCli().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
