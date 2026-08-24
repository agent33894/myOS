import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { createArtifact } from '@/gateways/artifactsGateway';
import { useArtifactsStore } from '../../store/artifacts';
import type { Artifact, Domain } from '../../types/artifacts';
import { buildProjectDraft } from './projectCreateModel';

interface CreateProjectInput {
  title: string;
  domain: Domain;
}

/**
 * Files a new project artifact and adds it to the store. The draft comes from
 * `buildProjectDraft`: name and domain only, no due date, no content so the
 * spec scaffold (## Intent / Outcomes / Rationale) builds the brief.
 * Returns the created artifact, or null after surfacing the error as a toast.
 */
export function useCreateProject() {
  const [isPending, setIsPending] = useState(false);

  const createProject = useCallback(
    async ({ title, domain }: CreateProjectInput): Promise<Artifact | null> => {
      setIsPending(true);
      try {
        const created = await createArtifact(buildProjectDraft(title, domain));
        useArtifactsStore.getState().addArtifact(created);
        return created;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not create project');
        return null;
      } finally {
        setIsPending(false);
      }
    },
    [],
  );

  return { createProject, isPending };
}
