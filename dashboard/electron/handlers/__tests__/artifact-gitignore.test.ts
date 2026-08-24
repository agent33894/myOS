import { describe, expect, it } from 'vitest';
import {
  parseArtifactRulesFromGitignore,
  upsertArtifactManagedBlock,
} from '../artifact-gitignore';

describe('artifact-gitignore managed block', () => {
  it('parses legacy artifact rules when managed block is missing', () => {
    const content = [
      '# Existing ignore',
      'dist/',
      'vault/personal/**/*',
      '!vault/personal/.gitkeep',
      'vault/.config/project-registry.json',
      'vault/inbox/**/*',
      '',
    ].join('\n');

    const result = parseArtifactRulesFromGitignore(content, 'vault');
    expect(result.hasManagedBlock).toBe(false);
    expect(result.rules).toEqual([
      { mode: 'exclude', pattern: 'vault/personal/**/*' },
      { mode: 'include', pattern: 'vault/personal/.gitkeep' },
      { mode: 'exclude', pattern: 'vault/inbox/**/*' },
    ]);
  });

  it('creates a managed block and removes legacy artifact rules', () => {
    const content = [
      'dist/',
      'vault/personal/**/*',
      '!vault/personal/.gitkeep',
      '',
    ].join('\n');
    const updated = upsertArtifactManagedBlock(
      content,
      [{ mode: 'exclude', pattern: 'vault/research/**/*' }],
      'vault'
    );

    expect(updated).toContain('dist/');
    expect(updated).toContain('# >>> myOS Artifact Git Activity (managed) >>>');
    expect(updated).toContain('vault/research/**/*');
    expect(updated).not.toContain('vault/personal/**/*');
    expect(updated).not.toContain('!vault/personal/.gitkeep');
  });

  it('replaces an existing managed block in-place', () => {
    const content = [
      'dist/',
      '# >>> myOS Artifact Git Activity (managed) >>>',
      'vault/work/**/*',
      '# <<< myOS Artifact Git Activity (managed) <<<',
      'node_modules/',
      '',
    ].join('\n');
    const updated = upsertArtifactManagedBlock(
      content,
      [{ mode: 'include', pattern: 'vault/work/keep-me.md' }],
      'vault'
    );

    expect(updated).toContain('dist/');
    expect(updated).toContain('node_modules/');
    expect(updated).toContain('!vault/work/keep-me.md');
    expect(updated).not.toContain('vault/work/**/*');
  });
});
