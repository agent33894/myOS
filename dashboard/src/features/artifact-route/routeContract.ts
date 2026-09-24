// Temporary adapters for screens not yet rebuilt; use src/app/navigation.ts instead.
import { toItemUrl, toNoteUrl, toProjectUrl } from '../../app/navigation';

export const toLibraryArtifactUrl = toNoteUrl;
export const toProjectArtifactUrl = (projectId: string) => toProjectUrl(projectId);
export const toArtifactNavigationUrl = toItemUrl;
