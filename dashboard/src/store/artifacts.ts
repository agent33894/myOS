/**
 * Artifacts Store
 *
 * USAGE GUIDELINES:
 * -----------------
 * For optimal performance, use selectors to subscribe only to the state you need:
 *
 * RECOMMENDED:
 *   const artifacts = useArtifactsStore(state => state.artifacts);
 * AVOID (causes re-renders when ANY state changes):
 *   const { artifacts, isLoading, ... } = useArtifactsStore();
 *
 * For multiple values, use shallow comparison:
 *   import { shallow } from 'zustand/shallow';
 *   const { artifacts, isLoading } = useArtifactsStore(
 *     state => ({ artifacts: state.artifacts, isLoading: state.isLoading }),
 *     shallow
 *   );
 */

import { create } from 'zustand';
import type { Artifact } from '../types/artifacts';

export interface ArtifactsState {
  artifacts: Artifact[];
  isLoading: boolean;
  error: string | null;
  contentCache: Map<string, string>; // id -> content

  // Actions
  loadArtifacts: () => Promise<void>;
  setArtifacts: (artifacts: Artifact[]) => void;
  addArtifact: (artifact: Artifact) => void;
  updateArtifact: (artifact: Artifact) => void;
  removeArtifact: (filePath: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadContent: (id: string) => Promise<string>;
  getArtifactWithContent: (id: string) => Promise<Artifact | null>;
}

function isSameArtifactSnapshot(previous: Artifact[], next: Artifact[]): boolean {
  if (previous === next) return true;
  if (previous.length !== next.length) return false;

  for (let i = 0; i < previous.length; i++) {
    const prev = previous[i];
    const curr = next[i];
    if (prev === curr) continue;
    if (
      prev.id !== curr.id ||
      prev.filePath !== curr.filePath ||
      prev.updated !== curr.updated ||
      prev.status !== curr.status ||
      prev.project !== curr.project ||
      prev.searchContent !== curr.searchContent
    ) {
      return false;
    }
  }

  return true;
}

export const useArtifactsStore = create<ArtifactsState>((set, get) => ({
  artifacts: [],
  isLoading: false,
  error: null,
  contentCache: new Map(),

  loadArtifacts: async () => {
    const { setArtifacts, setLoading, setError } = get();
    if (!window.electronAPI) {
      setLoading(false);
      setError('Electron API not available');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const artifacts = await window.electronAPI.readAllArtifactMetadata();
      setArtifacts(artifacts);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load artifacts');
    } finally {
      setLoading(false);
    }
  },

  setArtifacts: (artifacts) => {
    const previousArtifacts = get().artifacts;
    if (isSameArtifactSnapshot(previousArtifacts, artifacts)) {
      return;
    }
    set({ artifacts });
  },

  addArtifact: (artifact) => {
    const artifacts = [...get().artifacts, artifact];
    get().setArtifacts(artifacts);
  },

  updateArtifact: (artifact) => {
    const artifacts = get().artifacts.map((a) =>
      a.filePath === artifact.filePath ? artifact : a
    );
    // The body may have changed on disk; drop the cached copy so the next
    // detail view re-reads instead of rendering a stale body.
    const { contentCache } = get();
    if (contentCache.has(artifact.id)) {
      const newCache = new Map(contentCache);
      newCache.delete(artifact.id);
      set({ contentCache: newCache });
    }
    get().setArtifacts(artifacts);
  },

  removeArtifact: (filePath) => {
    const removed = get().artifacts.find((a) => a.filePath === filePath);
    const artifacts = get().artifacts.filter((a) => a.filePath !== filePath);
    if (removed && get().contentCache.has(removed.id)) {
      const newCache = new Map(get().contentCache);
      newCache.delete(removed.id);
      set({ contentCache: newCache });
    }
    get().setArtifacts(artifacts);
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  loadContent: async (id: string) => {
    const { artifacts, contentCache } = get();

    // Check if already cached
    if (contentCache.has(id)) {
      return contentCache.get(id)!;
    }

    // Find the artifact to get its filePath
    const artifact = artifacts.find((a) => a.id === id);
    if (!artifact) {
      throw new Error(`Artifact not found: ${id}`);
    }

    // If content is already loaded in the artifact, cache it
    if (artifact.content) {
      contentCache.set(id, artifact.content);
      return artifact.content;
    }

    // Load content from file
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    try {
      const content = await window.electronAPI.readArtifactContent(artifact.filePath);
      const newCache = new Map(contentCache);
      newCache.set(id, content);
      set({ contentCache: newCache });
      return content;
    } catch (error) {
      console.error(`Error loading content for artifact ${id}:`, error);
      throw error;
    }
  },

  getArtifactWithContent: async (id: string) => {
    const { artifacts } = get();
    const artifact = artifacts.find((a) => a.id === id);

    if (!artifact) {
      return null;
    }

    // If content is already loaded, return as-is
    if (artifact.content) {
      return artifact;
    }

    // Load content and return artifact with content
    try {
      const content = await get().loadContent(id);
      return { ...artifact, content };
    } catch (error) {
      console.error(`Error getting artifact with content ${id}:`, error);
      return artifact; // Return without content on error
    }
  },
}));
