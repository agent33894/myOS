import { describe, expect, it } from 'vitest';
import { projectSwatchFor } from './accents';

// Project colors derive from a hash of the name; changing it silently recolors
// every existing project, so the mapping is pinned.
describe('projectSwatchFor', () => {
  it('keeps the stable name → swatch mapping and honors a stored swatch', () => {
    expect(projectSwatchFor('Atlas').name).toBe('rose');
    expect(projectSwatchFor('ATLAS').name).toBe('rose');
    expect(projectSwatchFor('Family Home Purchase').name).toBe('umber');
    expect(projectSwatchFor('Atlas', 'teal').name).toBe('teal');
    expect(projectSwatchFor('Atlas', 'not-a-swatch').name).toBe('rose');
  });
});
