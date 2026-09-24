// Checks what the compiler can't: every contracted channel has a main-process
// handler, and only src/data/ipc.ts touches the preload bridge.
import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return ['.ts', '.tsx'].includes(extname(path)) && !/\.test\.tsx?$/.test(path) ? [path] : [];
  });
}

const contracts = readFileSync(resolve(root, 'shared/ipc/contracts.ts'), 'utf8');
const invokeMap = contracts.slice(contracts.indexOf('export interface IpcInvokeMap {'));
const contracted = new Set(
  [...invokeMap.slice(0, invokeMap.indexOf('\n}')).matchAll(/^ {2}'([^']+)':/gm)].map((match) => match[1]),
);

const handled = new Map();
for (const file of sourceFiles(resolve(root, 'electron'))) {
  for (const match of readFileSync(file, 'utf8').matchAll(/\bhandle\(\s*'([^']+)'/g)) {
    handled.set(match[1], (handled.get(match[1]) ?? 0) + 1);
  }
}

const bridgeFile = resolve(root, 'src/data/ipc.ts');
const bridgeUsers = sourceFiles(resolve(root, 'src'))
  .filter((file) => file !== bridgeFile && /\belectronAPI\b/.test(readFileSync(file, 'utf8')))
  .map((file) => relative(root, file));

const problems = [
  ['Contracted channels without a handler', [...contracted].filter((channel) => !handled.has(channel))],
  ['Handlers for channels missing from the contract', [...handled.keys()].filter((channel) => !contracted.has(channel))],
  ['Channels handled more than once', [...handled].filter(([, count]) => count > 1).map(([channel]) => channel)],
  ['Renderer files using window.electronAPI outside src/data/ipc.ts', bridgeUsers],
].filter(([, values]) => values.length > 0);

for (const [label, values] of problems) console.error(`${label}:\n${values.map((value) => `  - ${value}`).join('\n')}`);
if (problems.length > 0) process.exitCode = 1;
else console.log(`IPC surface is aligned: ${contracted.size} channels, each handled once; the bridge is used only by src/data/ipc.ts.`);
