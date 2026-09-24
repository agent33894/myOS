import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { Artifact, Domain } from '@shared/types';
import { create } from '../../data/gateway';
import { buildProjectDraft } from './projectCreateModel';

/** Create a project (undoable). Returns it, or null after surfacing the error as a toast. */
export function useCreateProject() {
  const [isPending, setIsPending] = useState(false);

  const createProject = useCallback(async ({ title, domain }: { title: string; domain: Domain }): Promise<Artifact | null> => {
    setIsPending(true);
    try {
      return await create(buildProjectDraft(title, domain), `Create project “${title}”`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create project');
      return null;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { createProject, isPending };
}
