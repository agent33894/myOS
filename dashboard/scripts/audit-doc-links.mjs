import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dashboardRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(dashboardRoot, '..');
const ignoredPrefixes = [
  'docs/archive/',
  'docs/design/mockups/',
  'docs/mobile-redesign/',
  'vault/',
];
const placeholderTargets = new Set(['url']);

function documentationFiles() {
  const output = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '--', '*.md'],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
    }
  );
  const files = output.trim().split('\n').filter(Boolean);
  if (existsSync(resolve(repositoryRoot, '.cursorrules'))) {
    files.push('.cursorrules');
  }
  return files.filter(
    (filePath) => !ignoredPrefixes.some((prefix) => filePath.startsWith(prefix))
  );
}

function normalizeTarget(rawTarget) {
  const unwrapped = rawTarget.trim().replace(/^<|>$/g, '');
  const withoutAnchor = unwrapped.split('#')[0];
  return withoutAnchor.split('?')[0];
}

function isLocalTarget(target) {
  if (!target || placeholderTargets.has(target)) return false;
  if (target.startsWith('#') || isAbsolute(target)) return false;
  return !/^[a-z][a-z0-9+.-]*:/i.test(target);
}

function lineNumber(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

const brokenLinks = [];
for (const relativeFilePath of documentationFiles()) {
  const absoluteFilePath = resolve(repositoryRoot, relativeFilePath);
  const source = readFileSync(absoluteFilePath, 'utf8');
  const links = source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g);

  for (const match of links) {
    const target = normalizeTarget(match[1]);
    if (!isLocalTarget(target)) continue;

    const resolvedTarget = resolve(dirname(absoluteFilePath), decodeURIComponent(target));
    if (!existsSync(resolvedTarget)) {
      brokenLinks.push(
        `${relativeFilePath}:${lineNumber(source, match.index)} -> ${match[1]}`
      );
    }
  }
}

if (brokenLinks.length > 0) {
  console.error(`Broken local documentation links (${brokenLinks.length}):`);
  console.error(brokenLinks.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Documentation links are valid.');
}
