import { describe, expect, it } from 'vitest';
import {
  deriveProjectPathFromArtifactFilePath,
  extractCommitHashFromHref,
} from './commitLinkUtils';

describe('commitLinkUtils', () => {
  describe('extractCommitHashFromHref', () => {
    it('parses direct commit hashes', () => {
      expect(extractCommitHashFromHref('abcdef1')).toBe('abcdef1');
      expect(extractCommitHashFromHref('ABCDEF1234')).toBe('ABCDEF1234');
    });

    it('parses commit URLs and relative links', () => {
      expect(extractCommitHashFromHref('/commit/abcdef1234567890')).toBe('abcdef1234567890');
      expect(
        extractCommitHashFromHref('https://github.com/acme/repo/commit/abcdef1234567890?diff=split')
      ).toBe('abcdef1234567890');
      expect(extractCommitHashFromHref('commit/abcdef1234567890')).toBe('abcdef1234567890');
    });

    it('returns null for non-commit links', () => {
      expect(extractCommitHashFromHref('https://example.com')).toBeNull();
      expect(extractCommitHashFromHref('/pull/123')).toBeNull();
      expect(extractCommitHashFromHref('')).toBeNull();
    });
  });

  describe('deriveProjectPathFromArtifactFilePath', () => {
    it('derives POSIX project roots from vault paths', () => {
      expect(
        deriveProjectPathFromArtifactFilePath('/Users/jamie/code/myOS/vault/work/development/log.md')
      ).toBe('/Users/jamie/code/myOS');
    });

    it('derives Windows-style project roots from vault paths', () => {
      expect(
        deriveProjectPathFromArtifactFilePath('C:\\Users\\jamie\\code\\myOS\\vault\\work\\development\\log.md')
      ).toBe('C:\\Users\\jamie\\code\\myOS');
    });

    it('returns null when file path is not in a vault tree', () => {
      expect(deriveProjectPathFromArtifactFilePath('/tmp/log.md')).toBeNull();
      expect(deriveProjectPathFromArtifactFilePath(undefined)).toBeNull();
    });
  });
});
