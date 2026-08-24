import { describe, expect, it } from 'vitest';
import matter from 'gray-matter';
import { ArtifactType } from '../../../../shared/types';
import {
  artifactToMarkdown,
  buildArtifactFromData,
} from '../artifact-format';

describe('artifact-format roundtrip behavior', () => {
  it('preserves unknown legacy frontmatter fields through read/write', () => {
    const parsed = buildArtifactFromData(
      {
        id: 'legacy-item',
        title: 'Legacy Item',
        type: ArtifactType.MEMO,
        domain: 'work',
        tags: ['legacy'],
        created: '2026-02-01',
        updated: '2026-02-01',
        status: 'active',
        related: [],
        customLegacyField: 'kept',
        scoreV1: 17,
      },
      'Legacy body',
      'work/memos/legacy-item.md',
      {
        mtime: '2026-02-01',
        ctime: '2026-02-01',
      }
    );

    const markdown = artifactToMarkdown(parsed);
    const { data } = matter(markdown);

    expect(data.customLegacyField).toBe('kept');
    expect(data.scoreV1).toBe(17);
  });

  it('preserves a body-leading thematic break and nested metadata', () => {
    const artifact = buildArtifactFromData(
      {
        id: 'body-metadata',
        title: 'Body Metadata',
        type: ArtifactType.MEMO,
        domain: 'work',
        tags: ['markdown'],
        created: '2026-02-01',
        updated: '2026-02-01',
        status: 'active',
        related: [],
      },
      '---\nlayout: cover\n---\n# Title',
      'work/memos/body-metadata.md',
      {
        mtime: '2026-02-01',
        ctime: '2026-02-01',
      }
    );

    const markdown = artifactToMarkdown(artifact);
    const parsed = matter(markdown);

    expect(parsed.data.layout).toBeUndefined();
    expect(parsed.content.trim()).toBe('---\nlayout: cover\n---\n# Title');
  });
});
