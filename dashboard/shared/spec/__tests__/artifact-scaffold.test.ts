import { describe, expect, it } from 'vitest';
import { ArtifactType } from '../../types';
import { buildScaffoldForType, getArtifactSpec } from '../artifact-rules';
import { buildScaffoldFromSpec } from '../artifact-scaffold';

describe('buildScaffoldForType', () => {
  it('builds scaffold sections from per-type spec rules', () => {
    const scaffold = buildScaffoldForType(ArtifactType.TODO, {
      title: 'Ship migration',
    });

    expect(scaffold).toContain('# Ship migration');
    expect(scaffold).toContain('## Task');
    expect(scaffold).toContain('## Context');
    expect(scaffold).toContain('## Acceptance Criteria');
  });

  it('scaffolds new projects with the durable brief: Intent, Outcomes, Rationale in order', () => {
    const scaffold = buildScaffoldForType(ArtifactType.PROJECT, {
      title: 'Chronicle Redesign',
    });

    const intent = scaffold.indexOf('## Intent');
    const outcomes = scaffold.indexOf('## Outcomes');
    const rationale = scaffold.indexOf('## Rationale');
    expect(intent).toBeGreaterThan(-1);
    expect(outcomes).toBeGreaterThan(intent);
    expect(rationale).toBeGreaterThan(outcomes);
    expect(scaffold).toContain('[What are you trying to change or make true?]');
    expect(scaffold).toContain('- [Observable result]');
    expect(scaffold).toContain('[Why is this worth doing now?]');

    // The former task-like scaffold is gone, and decisions stay separate
    // linked decision artifacts — never a heading inside the brief.
    expect(scaffold).not.toContain('## Overview');
    expect(scaffold).not.toContain('## Goals');
    expect(scaffold).not.toContain('## Notes');
    expect(scaffold).not.toContain('## Decision');
  });

  it('returns fallback content when a type has no scaffold sections', () => {
    const scaffold = buildScaffoldForType(ArtifactType.INBOX, {
      fallbackContent: '',
    });

    expect(scaffold).toBe('');
  });
});

describe('buildScaffoldFromSpec', () => {
  it('supports title-less scaffold generation when requested', () => {
    const memoSpec = getArtifactSpec(ArtifactType.MEMO);
    const scaffold = buildScaffoldFromSpec(memoSpec, {
      title: 'Ignored title',
      includeTitleHeading: false,
      fallbackContent: '',
    });

    expect(scaffold.startsWith('# ')).toBe(false);
    expect(scaffold).toContain('## Main Content');
  });

  it('includes data visualization guidance for research scaffolds', () => {
    const scaffold = buildScaffoldForType(ArtifactType.RESEARCH, {
      title: 'Research with charts',
    });

    expect(scaffold).toContain('## Data Visualization');
    expect(scaffold).toContain('```chart');
  });
});
