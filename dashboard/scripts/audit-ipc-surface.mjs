import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dashboardRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

function sourceFiles(directory, extensions, includeTests = true) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!includeTests && entry.name === '__tests__') return [];
      return sourceFiles(filePath, extensions, includeTests);
    }
    if (!extensions.includes(extname(filePath))) return [];
    if (!includeTests && (/\.test\.[^.]+$/.test(filePath) || filePath.endsWith('.d.ts'))) {
      return [];
    }
    return [filePath];
  });
}

function valuesBetween(source, startMarker, endMarker, pattern) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) {
    throw new Error(`Unable to find ${startMarker}`);
  }
  return [...source.slice(start, end).matchAll(pattern)].map((match) => match[1]);
}

function difference(left, right) {
  return [...left].filter((value) => !right.has(value)).sort();
}

const preloadPath = resolve(dashboardRoot, 'electron/preload.ts');
const contractsPath = resolve(dashboardRoot, 'shared/ipc/contracts.ts');
const preloadSource = readFileSync(preloadPath, 'utf8');
const contractsSource = readFileSync(contractsPath, 'utf8');

const exposedMethods = new Set(valuesBetween(
  preloadSource,
  'const electronAPI = {',
  '\n};',
  /^  ([A-Za-z_$][\w$]*):/gm
));
const invokedChannels = new Set(
  [...preloadSource.matchAll(/invokeIpc\(\s*['"]([^'"]+)['"]/g)].map((match) => match[1])
);
const contractedChannels = new Set(valuesBetween(
  contractsSource,
  'export const IPC_INVOKE_CHANNELS = [',
  '] as const',
  /['"]([^'"]+)['"]/g
));

const rendererFiles = sourceFiles(resolve(dashboardRoot, 'src'), ['.ts', '.tsx'], false);
const rendererSource = rendererFiles
  .map((filePath) => readFileSync(filePath, 'utf8'))
  .join('\n');
const usedMethods = new Set(
  [...rendererSource.matchAll(/electronAPI\s*(?:\?\.|\.)\s*([A-Za-z_$][\w$]*)/g)]
    .map((match) => match[1])
);

const electronFiles = sourceFiles(resolve(dashboardRoot, 'electron'), ['.ts'], false);
const mainProcessSource = electronFiles
  .map((filePath) => readFileSync(filePath, 'utf8'))
  .join('\n');
const registeredChannels = new Set(
  [...mainProcessSource.matchAll(/ipcMain\.handle\(\s*['"]([^'"]+)['"]/g)]
    .map((match) => match[1])
);

const problems = [
  ['Exposed methods without a production renderer caller', difference(exposedMethods, usedMethods)],
  ['Renderer calls missing from the preload bridge', difference(usedMethods, exposedMethods)],
  ['Preload channels without a main-process handler', difference(invokedChannels, registeredChannels)],
  ['Main-process handlers not exposed by the preload bridge', difference(registeredChannels, invokedChannels)],
  ['Preload channels missing from the shared contract list', difference(invokedChannels, contractedChannels)],
  ['Contracted channels not exposed by the preload bridge', difference(contractedChannels, invokedChannels)],
].filter(([, values]) => values.length > 0);

if (problems.length > 0) {
  for (const [label, values] of problems) {
    console.error(`${label}:`);
    console.error(values.map((value) => `  - ${value}`).join('\n'));
  }
  process.exitCode = 1;
} else {
  console.log(
    `IPC surface is aligned: ${exposedMethods.size} methods, ${invokedChannels.size} invoke channels.`
  );
  const rendererRoot = relative(dashboardRoot, resolve(dashboardRoot, 'src'));
  console.log(`Scanned ${rendererFiles.length} production renderer files from ${rendererRoot}.`);
}
