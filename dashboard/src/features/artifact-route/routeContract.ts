import { ArtifactType } from '../../types/artifacts';

/**
 * The canonical open-an-artifact destination: Library with the artifact
 * selected. The Library detail pane is the directly editable Living Page.
 */
export function toLibraryArtifactUrl(artifactPath: string): string {
  const params = new URLSearchParams({ artifact: artifactPath });
  return `/library?${params.toString()}`;
}

/**
 * Convert old `/artifact` bookmarks to the Living Page route. `path` was the
 * original artifact parameter; `shared` remains useful telemetry for links
 * created before this migration. Editor-only parameters are intentionally
 * discarded because Library is always directly editable.
 */
export function toLegacyArtifactRedirectUrl(searchParams: URLSearchParams): string {
  const artifactPath = (searchParams.get('artifact') || searchParams.get('path'))?.trim();
  if (!artifactPath) return '/library';

  const params = new URLSearchParams({ artifact: artifactPath });
  if (searchParams.get('shared') === '1') {
    params.set('shared', '1');
  }
  return `/library?${params.toString()}`;
}

/**
 * An artifact opened inside its project's workbench: `/projects?project=<id>`
 * plus an `item` parameter carrying the artifact's file path.
 */
export function toProjectArtifactUrl(projectId: string, itemPath?: string): string {
  const params = new URLSearchParams({ project: projectId });
  if (itemPath) {
    params.set('item', itemPath);
  }
  return `/projects?${params.toString()}`;
}

export function toArtifactNavigationUrl(
  artifact: { type: string; id: string; filePath: string },
): string {
  if (artifact.type === ArtifactType.PROJECT) {
    return toProjectArtifactUrl(artifact.id);
  }
  return toLibraryArtifactUrl(artifact.filePath);
}
