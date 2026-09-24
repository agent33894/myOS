/** Languages offered in the code block picker. Any other fence language is kept and labelled as written. */
export const CODE_LANGUAGES = [
  { id: 'plain', label: 'Plain text' },
  { id: 'bash', label: 'Bash' },
  { id: 'css', label: 'CSS' },
  { id: 'diff', label: 'Diff' },
  { id: 'go', label: 'Go' },
  { id: 'html', label: 'HTML' },
  { id: 'java', label: 'Java' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'json', label: 'JSON' },
  { id: 'jsx', label: 'JSX' },
  { id: 'kotlin', label: 'Kotlin' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'python', label: 'Python' },
  { id: 'ruby', label: 'Ruby' },
  { id: 'rust', label: 'Rust' },
  { id: 'sql', label: 'SQL' },
  { id: 'swift', label: 'Swift' },
  { id: 'toml', label: 'TOML' },
  { id: 'tsx', label: 'TSX' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'yaml', label: 'YAML' },
] as const;

const ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  yml: 'yaml',
  md: 'markdown',
};

export function languageLabel(language: string | null | undefined): string {
  if (!language) return 'Plain text';
  const id = ALIASES[language.toLowerCase()] ?? language.toLowerCase();
  return CODE_LANGUAGES.find((entry) => entry.id === id)?.label ?? language;
}
