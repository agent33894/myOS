import { ArtifactType, type Artifact } from '@shared/types';
import { create } from '../../data/gateway';

/** A new, empty project with this name (one undo step). */
export const createProjectNamed = (name: string): Promise<Artifact> =>
  create({ type: ArtifactType.PROJECT, title: name }, `Create project “${name}”`);
