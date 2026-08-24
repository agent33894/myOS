import { describe, expect, test } from 'vitest';
import { ArtifactType, Domain, TodoPriority } from '../../types/artifacts';
import {
  buildStructuredCaptureContent,
  buildSuggestedTitleFromContent,
  detectQuickCaptureIntent,
  resolveCaptureFiling,
  stripTypePrefix,
} from './quickCaptureUtils';

const UNTOUCHED = { type: null, domain: null, priority: null };

describe('quickCaptureUtils', () => {
  test('detects explicit type prefix and strips it', () => {
    const result = stripTypePrefix('todo: follow up with Sarah');
    expect(result.explicitType).toBe(ArtifactType.TODO);
    expect(result.content).toBe('follow up with Sarah');
  });

  test('detects todo priority intent', () => {
    const result = detectQuickCaptureIntent(
      'Remind me to ship release tomorrow, high priority'
    );

    expect(result.detectedType).toBe(ArtifactType.TODO);
    expect(result.detectedPriority).toBe(TodoPriority.HIGH);
  });

  test('wraps query content in SQL fence when needed', () => {
    const content = buildStructuredCaptureContent(
      'SELECT * FROM users',
      'Users query',
      ArtifactType.QUERY
    );

    expect(content).toContain('```sql');
    expect(content).toContain('SELECT * FROM users');
  });

  test('creates a clean suggested title from natural language', () => {
    const title = buildSuggestedTitleFromContent(
      'I need to review the API design before Friday.'
    );

    expect(title).toBe('Review the API design before Friday');
  });
});

describe('resolveCaptureFiling', () => {
  test('defaults to Unfiled with no domain or priority', () => {
    const filing = resolveCaptureFiling(null, UNTOUCHED);

    expect(filing.type).toBe(ArtifactType.INBOX);
    expect(filing.domain).toBeUndefined();
    expect(filing.priority).toBeUndefined();
    expect(filing.suggestedType).toBeNull();
  });

  test('heuristic detection only suggests — capture stays Unfiled', () => {
    const detected = detectQuickCaptureIntent('Remind me to ship the release tomorrow');
    const filing = resolveCaptureFiling(detected, UNTOUCHED);

    expect(filing.type).toBe(ArtifactType.INBOX);
    expect(filing.suggestedType).toBe(ArtifactType.TODO);
  });

  test('an explicit prefix applies directly', () => {
    const detected = detectQuickCaptureIntent('todo: follow up with Sarah');
    const filing = resolveCaptureFiling(detected, UNTOUCHED);

    expect(filing.type).toBe(ArtifactType.TODO);
    expect(filing.domain).toBe(Domain.WORK);
    expect(filing.priority).toBe(TodoPriority.MEDIUM);
    expect(filing.suggestedType).toBeNull();
  });

  test('a manual choice wins over detection', () => {
    const detected = detectQuickCaptureIntent('todo: follow up with Sarah');
    const filing = resolveCaptureFiling(detected, {
      type: ArtifactType.MEMO,
      domain: Domain.PERSONAL,
      priority: null,
    });

    expect(filing.type).toBe(ArtifactType.MEMO);
    expect(filing.domain).toBe(Domain.PERSONAL);
    expect(filing.priority).toBeUndefined();
  });

  test('explicitly choosing Unfiled suppresses the suggestion', () => {
    const detected = detectQuickCaptureIntent('Remind me to ship the release tomorrow');
    const filing = resolveCaptureFiling(detected, { ...UNTOUCHED, type: ArtifactType.INBOX });

    expect(filing.type).toBe(ArtifactType.INBOX);
    expect(filing.suggestedType).toBeNull();
  });

  test('domains outside the type spec fall back to the spec default', () => {
    // Meetings allow only the work domain.
    const filing = resolveCaptureFiling(null, {
      type: ArtifactType.MEETING,
      domain: Domain.PERSONAL,
      priority: null,
    });

    expect(filing.domain).toBe(Domain.WORK);
  });

  test('detected priority seeds the todo default', () => {
    const detected = detectQuickCaptureIntent('todo: ship the fix, urgent');
    const filing = resolveCaptureFiling(detected, UNTOUCHED);

    expect(filing.priority).toBe(TodoPriority.HIGH);
  });
});
