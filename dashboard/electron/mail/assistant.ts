import { spawn } from 'child_process';
import { homedir, tmpdir } from 'os';
import { delimiter, join } from 'path';

const OUTPUT_LIMIT = 2_000_000;

// Apps started from a launcher get a short PATH; add the places CLI tools
// (Claude Code, Codex, Ollama, version managers) usually live.
function searchPath(): string {
  const home = homedir();
  const extra = [
    join(home, '.local', 'bin'),
    join(home, '.local', 'share', 'mise', 'shims'),
    join(home, '.asdf', 'shims'),
    join(home, '.volta', 'bin'),
    join(home, '.bun', 'bin'),
    join(home, '.npm-global', 'bin'),
    join(home, '.claude', 'local'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
  ];
  return [...new Set([...(process.env.PATH ?? '').split(delimiter), ...extra].filter(Boolean))].join(delimiter);
}

/**
 * Run the user's assistant command with `prompt` on stdin and return stdout.
 * It runs in a temporary directory, so project files and instructions in the
 * user's folders are not in its way; myOS never passes it credentials.
 */
export function runAssistant(command: string, prompt: string, timeoutSeconds: number): Promise<string> {
  if (!command.trim()) return Promise.reject(new Error('No assistant command is set.'));
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      shell: process.platform === 'win32' ? true : '/bin/sh',
      cwd: tmpdir(),
      env: { ...process.env, PATH: searchPath(), NO_COLOR: '1', MYOS_MAIL_TRIAGE: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`The assistant took longer than ${timeoutSeconds} seconds.`));
    }, timeoutSeconds * 1000);
    child.stdout.on('data', (chunk: Buffer) => {
      if (stdout.length < OUTPUT_LIMIT) stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      if (stderr.length < 4000) stderr += chunk.toString('utf8');
    });
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(new Error(`Could not start the assistant: ${error.message}`));
    });
    child.once('close', (code) => {
      clearTimeout(timer);
      if (code === 0 && stdout.trim()) resolve(stdout);
      else if (code === 127) reject(new Error('The assistant command was not found. Use its full path.'));
      else reject(new Error(stderr.trim().split('\n').slice(-3).join(' ') || `The assistant exited with code ${code}.`));
    });
    child.stdin.on('error', () => undefined);
    child.stdin.end(prompt);
  });
}
