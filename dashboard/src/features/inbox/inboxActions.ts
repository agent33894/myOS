import { ArtifactType, type ArtifactPatch, type ArtifactSummary } from '@shared/types';
import { retype } from '../../data/gateway';

/** Turn a capture into a task, optionally dated and in a project. Undo puts it back in the Inbox. */
export const makeTask = (item: ArtifactSummary, fields: ArtifactPatch = {}) =>
  retype(item.filePath, { type: ArtifactType.TODO, ...fields }, `Make “${item.title}” a task`);

export const makeNote = (item: ArtifactSummary, fields: ArtifactPatch = {}) =>
  retype(item.filePath, { type: ArtifactType.MEMO, ...fields }, `Make “${item.title}” a note`);
