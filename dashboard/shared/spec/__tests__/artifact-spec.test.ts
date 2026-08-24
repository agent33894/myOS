import { describe, expect, it } from 'vitest';
import { ArtifactType } from '../../types';
import { ARTIFACT_SPECS } from '../artifact-rules';

describe('ARTIFACT_SPECS', () => {
  it('defines a spec for every artifact type', () => {
    const specTypes = Object.keys(ARTIFACT_SPECS).sort();
    const enumTypes = Object.values(ArtifactType).sort();

    expect(specTypes).toEqual(enumTypes);
  });

  it('contains required core fields for every artifact type', () => {
    const requiredFields = [
      'id',
      'title',
      'type',
      'tags',
      'status',
      'related',
      'created',
      'updated',
      'content',
      'filePath',
    ];

    for (const spec of Object.values(ARTIFACT_SPECS)) {
      const requiredSet = new Set(
        spec.fieldRules.filter((rule) => rule.required).map((rule) => rule.name)
      );

      for (const field of requiredFields) {
        expect(requiredSet.has(field as typeof spec.fieldRules[number]['name'])).toBe(true);
      }
    }
  });

  it('only allows domain to be optional for inbox artifacts', () => {
    for (const [type, spec] of Object.entries(ARTIFACT_SPECS)) {
      const expectsDomain = type !== ArtifactType.INBOX;
      expect(spec.domainRequired).toBe(expectsDomain);
    }
  });
});
