import { describe, expect, it } from 'vitest';
import { resolveVaultAssetUrl } from './assetPaths';

describe('resolveVaultAssetUrl', () => {
  it('rewrites relative vault asset paths to myos protocol', () => {
    expect(resolveVaultAssetUrl('assets/artifacts/demo/chart.png')).toBe(
      'myos://assets/artifacts/demo/chart.png'
    );
    expect(resolveVaultAssetUrl('./assets/artifacts/demo/chart two.png')).toBe(
      'myos://assets/artifacts/demo/chart%20two.png'
    );
    expect(resolveVaultAssetUrl('/assets/artifacts/demo/doc.pdf')).toBe(
      'myos://assets/artifacts/demo/doc.pdf'
    );
  });

  it('leaves non-asset references unchanged', () => {
    expect(resolveVaultAssetUrl('https://example.com/file.png')).toBe(
      'https://example.com/file.png'
    );
    expect(resolveVaultAssetUrl('mailto:hello@example.com')).toBe(
      'mailto:hello@example.com'
    );
    expect(resolveVaultAssetUrl('#local-section')).toBe('#local-section');
    expect(resolveVaultAssetUrl('notes/project-overview.md')).toBe(
      'notes/project-overview.md'
    );
  });
});
