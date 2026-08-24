import { useShallow } from 'zustand/react/shallow';
import { useArtifactsStore, type ArtifactsState } from '../artifacts';

// ============ ARTIFACTS STORE SELECTORS ============

// Single-value selectors (no shallow needed - primitive equality works)
export const useArtifacts = () => useArtifactsStore((state) => state.artifacts);

/**
 * CRUD actions only
 */
export const useCrudActions = () =>
  useArtifactsStore(
    useShallow((state: ArtifactsState) => ({
      addArtifact: state.addArtifact,
      updateArtifact: state.updateArtifact,
      removeArtifact: state.removeArtifact,
    }))
  );
