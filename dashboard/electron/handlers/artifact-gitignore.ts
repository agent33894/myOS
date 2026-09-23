import { constants } from 'fs';
import { access, readFile, writeFile } from 'fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'path';
import type { ArtifactGitRule, ArtifactGitRulesConfig } from '../../shared/ipc/contracts';
import { getVaultPath } from '../utils/paths.js';

const MANAGED_BLOCK_START = '# >>> myOS Artifact Git Activity (managed) >>>';
const MANAGED_BLOCK_END = '# <<< myOS Artifact Git Activity (managed) <<<';
const ARTIFACT_DOMAIN_FOLDERS = ['work', 'personal', 'research', 'creative', 'inbox'] as const;

function toPosixPath(value: string): string {
  return value.replace(/\\/g, '/');
}

function normalizeRulePattern(value: string): string {
  return toPosixPath(value.trim())
    .replace(/^!+/, '')
    .replace(/^\.\/+/, '')
    .replace(/^\/+/, '')
    .replace(/\/{2,}/g, '/');
}

function getArtifactDomainPrefixes(artifactRootPrefix: string): string[] {
  const rootPrefix = artifactRootPrefix ? `${artifactRootPrefix}/` : '';
  return ARTIFACT_DOMAIN_FOLDERS.map((folder) => `${rootPrefix}${folder}`);
}

function isRuleInArtifactSpace(pattern: string, artifactRootPrefix: string): boolean {
  const normalized = normalizeRulePattern(pattern);
  const prefixes = getArtifactDomainPrefixes(artifactRootPrefix);
  return prefixes.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

function parseRuleLine(line: string): ArtifactGitRule | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  if (trimmed.startsWith('!')) {
    const includePattern = normalizeRulePattern(trimmed);
    if (!includePattern) {
      return null;
    }
    return { mode: 'include', pattern: includePattern };
  }

  const excludePattern = normalizeRulePattern(trimmed);
  if (!excludePattern) {
    return null;
  }

  return { mode: 'exclude', pattern: excludePattern };
}

function dedupeRules(rules: ArtifactGitRule[]): ArtifactGitRule[] {
  const seen = new Set<string>();
  const deduped: ArtifactGitRule[] = [];

  for (const rule of rules) {
    const key = `${rule.mode}:${rule.pattern}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(rule);
  }

  return deduped;
}

function findManagedBlock(lines: string[]): { start: number; end: number } | null {
  const start = lines.findIndex((line) => line.trim() === MANAGED_BLOCK_START);
  if (start < 0) {
    return null;
  }

  const end = lines.findIndex((line, index) => index > start && line.trim() === MANAGED_BLOCK_END);
  if (end < 0) {
    return null;
  }

  return { start, end };
}

function serializeRule(rule: ArtifactGitRule): string {
  return rule.mode === 'include' ? `!${rule.pattern}` : rule.pattern;
}

function normalizeRule(
  rule: ArtifactGitRule,
  repositoryRoot: string,
  artifactRootPrefix: string
): ArtifactGitRule {
  const mode = rule.mode;
  if (mode !== 'exclude' && mode !== 'include') {
    throw new Error(`Unsupported rule mode: ${String(rule.mode)}`);
  }

  if (typeof rule.pattern !== 'string') {
    throw new Error('Rule pattern must be a string');
  }

  if (rule.pattern.includes('\n') || rule.pattern.includes('\r')) {
    throw new Error('Rule pattern cannot contain new lines');
  }

  const rawPattern = toPosixPath(rule.pattern.trim()).replace(/^!+/, '');
  let normalizedPattern = '';
  if (isAbsolute(rawPattern)) {
    const relativePattern = toPosixPath(relative(repositoryRoot, resolve(rawPattern)));
    if (!relativePattern || relativePattern.startsWith('..') || isAbsolute(relativePattern)) {
      throw new Error('Absolute patterns must be inside your myOS workspace');
    }
    normalizedPattern = normalizeRulePattern(relativePattern);
  } else {
    normalizedPattern = normalizeRulePattern(rawPattern);
  }

  if (!normalizedPattern) {
    throw new Error('Rule pattern cannot be empty');
  }

  if (artifactRootPrefix) {
    const withRootPrefix = `${artifactRootPrefix}/`;
    if (
      normalizedPattern !== artifactRootPrefix &&
      !normalizedPattern.startsWith(withRootPrefix)
    ) {
      const prefixed = `${withRootPrefix}${normalizedPattern}`;
      if (isRuleInArtifactSpace(prefixed, artifactRootPrefix)) {
        normalizedPattern = prefixed;
      }
    }
  }

  if (!isRuleInArtifactSpace(normalizedPattern, artifactRootPrefix)) {
    const rootHint = artifactRootPrefix ? `${artifactRootPrefix}/` : '';
    throw new Error(
      `Pattern must target an artifact path (${rootHint}{work|personal|research|creative|inbox}/...)`
    );
  }

  return { mode, pattern: normalizedPattern };
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function findRepositoryRoot(vaultPath: string): Promise<string> {
  const resolvedVaultPath = resolve(vaultPath);
  let cursor = resolvedVaultPath;
  while (true) {
    const gitDirectory = join(cursor, '.git');
    if (await pathExists(gitDirectory)) {
      return cursor;
    }

    const parent = dirname(cursor);
    if (parent === cursor) {
      break;
    }
    cursor = parent;
  }

  // Outside a repository, keep rules in the workspace itself. The parent is
  // often ~/Documents or ~, which myOS must never write to.
  return resolvedVaultPath;
}

function getArtifactRootPrefix(repositoryRoot: string, vaultPath: string): string {
  const relativePath = toPosixPath(relative(repositoryRoot, vaultPath));
  if (!relativePath || relativePath === '.') {
    return '';
  }
  return normalizeRulePattern(relativePath);
}

async function readGitignore(gitignorePath: string): Promise<string> {
  try {
    return await readFile(gitignorePath, 'utf-8');
  } catch {
    return '';
  }
}

export function parseArtifactRulesFromGitignore(
  gitignoreContent: string,
  artifactRootPrefix: string
): { rules: ArtifactGitRule[]; hasManagedBlock: boolean } {
  const lines = gitignoreContent.split(/\r?\n/);
  const managedBlock = findManagedBlock(lines);

  if (managedBlock) {
    const managedLines = lines.slice(managedBlock.start + 1, managedBlock.end);
    const managedRules = managedLines
      .map(parseRuleLine)
      .filter((rule): rule is ArtifactGitRule => Boolean(rule))
      .filter((rule) => isRuleInArtifactSpace(rule.pattern, artifactRootPrefix));
    return { rules: dedupeRules(managedRules), hasManagedBlock: true };
  }

  const legacyRules = lines
    .map(parseRuleLine)
    .filter((rule): rule is ArtifactGitRule => Boolean(rule))
    .filter((rule) => isRuleInArtifactSpace(rule.pattern, artifactRootPrefix));
  return { rules: dedupeRules(legacyRules), hasManagedBlock: false };
}

export function upsertArtifactManagedBlock(
  gitignoreContent: string,
  rules: ArtifactGitRule[],
  artifactRootPrefix: string
): string {
  const lines = gitignoreContent.split(/\r?\n/);
  const managedBlock = findManagedBlock(lines);
  const ruleLines = dedupeRules(rules).map(serializeRule);

  const blockLines = [
    MANAGED_BLOCK_START,
    '# Managed by myOS Settings > Git Activity > Artifact Git Activity.',
    '# Exclude rules are written as-is. Include rules are written with ! prefix.',
    ...ruleLines,
    MANAGED_BLOCK_END,
  ];

  let nextLines: string[];
  if (managedBlock) {
    nextLines = [
      ...lines.slice(0, managedBlock.start),
      ...blockLines,
      ...lines.slice(managedBlock.end + 1),
    ];
  } else {
    const withoutLegacyArtifactRules = lines.filter((line) => {
      const parsedRule = parseRuleLine(line);
      if (!parsedRule) {
        return true;
      }
      return !isRuleInArtifactSpace(parsedRule.pattern, artifactRootPrefix);
    });

    nextLines = [...withoutLegacyArtifactRules];
    while (nextLines.length > 0 && nextLines[nextLines.length - 1].trim() === '') {
      nextLines.pop();
    }
    if (nextLines.length > 0) {
      nextLines.push('');
    }
    nextLines.push(...blockLines);
  }

  return `${nextLines.join('\n')}\n`;
}

async function resolveGitignoreContext(): Promise<{
  repositoryRoot: string;
  artifactRootPrefix: string;
  gitignorePath: string;
}> {
  const vaultPath = resolve(getVaultPath());
  const repositoryRoot = await findRepositoryRoot(vaultPath);
  const artifactRootPrefix = getArtifactRootPrefix(repositoryRoot, vaultPath);
  const gitignorePath = join(repositoryRoot, '.gitignore');

  return {
    repositoryRoot,
    artifactRootPrefix,
    gitignorePath,
  };
}

export async function getArtifactGitRules(): Promise<ArtifactGitRulesConfig> {
  const { artifactRootPrefix, gitignorePath } = await resolveGitignoreContext();
  const gitignoreContent = await readGitignore(gitignorePath);
  const { rules } = parseArtifactRulesFromGitignore(gitignoreContent, artifactRootPrefix);

  return {
    gitignorePath,
    artifactRootPrefix,
    rules,
  };
}

export async function setArtifactGitRules(rules: ArtifactGitRule[]): Promise<ArtifactGitRulesConfig> {
  if (!Array.isArray(rules)) {
    throw new Error('Rules must be an array');
  }

  const { repositoryRoot, artifactRootPrefix, gitignorePath } = await resolveGitignoreContext();
  const normalizedRules = dedupeRules(
    rules.map((rule) => normalizeRule(rule, repositoryRoot, artifactRootPrefix))
  );
  const gitignoreContent = await readGitignore(gitignorePath);
  const nextContent = upsertArtifactManagedBlock(
    gitignoreContent,
    normalizedRules,
    artifactRootPrefix
  );

  if (nextContent !== gitignoreContent) {
    await writeFile(gitignorePath, nextContent, 'utf-8');
  }

  return {
    gitignorePath,
    artifactRootPrefix,
    rules: normalizedRules,
  };
}
