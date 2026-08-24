import { describe, expect, it } from 'vitest';
import { ArtifactStatus, ArtifactType, Domain } from '../../types/artifacts';
import {
  DEFAULT_PROJECT_DOMAIN,
  PROJECT_DOMAINS,
  buildProjectDraft,
  canSubmitProject,
  isCommandSubmitKey,
} from './projectCreateModel';

describe('project domains', () => {
  it('defaults to Work', () => {
    expect(DEFAULT_PROJECT_DOMAIN).toBe(Domain.WORK);
  });

  it('offers all four domains, Work first', () => {
    expect(PROJECT_DOMAINS).toEqual([
      Domain.WORK,
      Domain.PERSONAL,
      Domain.RESEARCH,
      Domain.CREATIVE,
    ]);
  });
});

describe('buildProjectDraft', () => {
  it('creates a project artifact from name and domain alone', () => {
    const draft = buildProjectDraft('Chronicle Redesign', Domain.RESEARCH);
    expect(draft).toEqual({
      title: 'Chronicle Redesign',
      type: ArtifactType.PROJECT,
      domain: Domain.RESEARCH,
      status: ArtifactStatus.ACTIVE,
    });
  });

  it('never writes due — projects have no deadline', () => {
    const draft = buildProjectDraft('Chronicle Redesign', Domain.WORK);
    expect('due' in draft).toBe(false);
    expect(Object.keys(draft).sort()).toEqual(['domain', 'status', 'title', 'type']);
  });
});

describe('isCommandSubmitKey', () => {
  it('accepts Command-Enter and Control-Enter', () => {
    expect(isCommandSubmitKey({ key: 'Enter', metaKey: true, ctrlKey: false })).toBe(true);
    expect(isCommandSubmitKey({ key: 'Enter', metaKey: false, ctrlKey: true })).toBe(true);
  });

  it('leaves plain Enter to native form submission and ignores other keys', () => {
    expect(isCommandSubmitKey({ key: 'Enter', metaKey: false, ctrlKey: false })).toBe(false);
    expect(isCommandSubmitKey({ key: 'a', metaKey: true, ctrlKey: false })).toBe(false);
    expect(isCommandSubmitKey({ key: 'Escape', metaKey: false, ctrlKey: false })).toBe(false);
  });
});

describe('canSubmitProject', () => {
  it('requires a non-empty project name', () => {
    expect(canSubmitProject('', false)).toBe(false);
    expect(canSubmitProject('   ', false)).toBe(false);
    expect(canSubmitProject('Chronicle Redesign', false)).toBe(true);
  });

  it('blocks resubmission while creation is pending', () => {
    expect(canSubmitProject('Chronicle Redesign', true)).toBe(false);
  });
});
