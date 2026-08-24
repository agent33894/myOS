import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourceRoot = join(root, 'src');
const extensions = ['.ts', '.tsx', '.js', '.jsx'];
const ignored = /(?:\.test|\.spec|\.stories)\.[jt]sx?$|\.d\.ts$/;

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function resolveModule(fromFile, specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null;
  const base = specifier.startsWith('@/')
    ? join(sourceRoot, specifier.slice(2))
    : resolve(fromFile, '..', specifier);
  const candidates = [base, ...extensions.map((extension) => `${base}${extension}`)];
  for (const extension of extensions) candidates.push(join(base, `index${extension}`));
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null;
}

function dependencies(file) {
  const source = readFileSync(file, 'utf8');
  const matches = source.matchAll(/(?:from\s*|import\s*(?:\()?\s*)['"]([^'"]+)['"]/g);
  return [...matches].map((match) => resolveModule(file, match[1])).filter(Boolean);
}

const all = walk(sourceRoot).filter((file) => extensions.includes(extname(file)) && !ignored.test(file));
const reachable = new Set();
// Vite loads the gray-matter engine shim through config, outside the renderer graph.
const configuredEntries = [join(sourceRoot, 'utils/gray-matter-engines.js')];
const queue = [join(sourceRoot, 'main.tsx'), ...configuredEntries];

while (queue.length) {
  const file = queue.pop();
  if (!file || reachable.has(file)) continue;
  reachable.add(file);
  queue.push(...dependencies(file));
}

const unreachable = all.filter((file) => !reachable.has(file)).map((file) => relative(root, file)).sort();
const reachableSourceFiles = all.filter((file) => reachable.has(file)).length;
console.log(JSON.stringify({
  entry: 'src/main.tsx',
  configuredEntries: configuredEntries.map((file) => relative(root, file)),
  sourceFiles: all.length,
  reachable: reachableSourceFiles,
  unreachable,
}, null, 2));
if (unreachable.length) process.exitCode = 1;
