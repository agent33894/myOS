import { describe, expect, it } from 'vitest';
import { extractCommitHashFromHref } from './commitLinkUtils';

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

});
