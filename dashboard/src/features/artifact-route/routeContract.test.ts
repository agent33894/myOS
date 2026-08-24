import { describe, expect, it } from 'vitest';
import { ArtifactType } from '../../types/artifacts';
import {
  toArtifactNavigationUrl,
  toLegacyArtifactRedirectUrl,
  toLibraryArtifactUrl,
  toProjectArtifactUrl,
} from './routeContract';

describe('routeContract', () => {
  it('opens artifacts in the Library Living Page', () => {
    expect(toLibraryArtifactUrl('vault/work/memos/a.md')).toBe(
      '/library?artifact=vault%2Fwork%2Fmemos%2Fa.md',
    );
  });

  it('builds a project workbench url with or without an item', () => {
    expect(toProjectArtifactUrl('myos')).toBe('/projects?project=myos');
    expect(toProjectArtifactUrl('myos', 'vault/work/todos/fix-dates.md')).toBe(
      '/projects?project=myos&item=vault%2Fwork%2Ftodos%2Ffix-dates.md',
    );
  });

  it('routes project artifacts to Projects and other artifacts to Library', () => {
    expect(toArtifactNavigationUrl({
      type: ArtifactType.PROJECT,
      id: 'myos',
      filePath: 'vault/work/projects/myos.md',
    })).toBe('/projects?project=myos');
    expect(toArtifactNavigationUrl({
      type: ArtifactType.MEMO,
      id: 'memo-1',
      filePath: 'vault/work/memos/a.md',
    })).toBe('/library?artifact=vault%2Fwork%2Fmemos%2Fa.md');
  });

  it('redirects old artifact and path bookmarks to Library', () => {
    expect(toLegacyArtifactRedirectUrl(new URLSearchParams(
      'artifact=vault/work/memos/a.md&edit=1&returnTo=%2Ftasks',
    ))).toBe('/library?artifact=vault%2Fwork%2Fmemos%2Fa.md');
    expect(toLegacyArtifactRedirectUrl(new URLSearchParams(
      'path=vault/work/memos/shared.md&shared=1',
    ))).toBe('/library?artifact=vault%2Fwork%2Fmemos%2Fshared.md&shared=1');
  });

  it('redirects incomplete legacy create links to the Library index', () => {
    expect(toLegacyArtifactRedirectUrl(new URLSearchParams('new=1&type=memo'))).toBe('/library');
  });
});
