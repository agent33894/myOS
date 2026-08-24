import { useCallback, useRef } from 'react';
import { useFileWatcherEvents } from './useFileWatcherEvents';
import { useArtifactsStore } from '../store/artifacts';
import type { Artifact } from '../types/artifacts';

type FileEventType = 'created' | 'updated' | 'deleted';

interface FileEventPayload {
  filePath: string;
}

const FLUSH_DELAY_MS = 250;

function toMetadata(artifact: Artifact): Artifact {
  // readArtifact returns the full body but never sets the transient
  // searchContent field, so derive it here before dropping content —
  // otherwise watcher-updated artifacts vanish from full-text search
  // until the next full loadArtifacts.
  return { ...artifact, content: '', searchContent: artifact.searchContent ?? artifact.content };
}

/** Applies the batched Electron watcher stream directly to the artifact store. */
export function useFileWatcher() {
  const pendingByPathRef = useRef<Map<string, FileEventType>>(new Map());
  const flushTimerRef = useRef<number | null>(null);

  const flushPendingEvents = useCallback(async () => {
    flushTimerRef.current = null;
    const events = Array.from(pendingByPathRef.current.entries());
    pendingByPathRef.current.clear();
    if (events.length === 0) return;

    const store = useArtifactsStore.getState();
    if (!window.electronAPI) {
      await store.loadArtifacts();
      return;
    }

    let needsReload = false;
    for (const [filePath, event] of events) {
      if (event === 'deleted') {
        store.removeArtifact(filePath);
        continue;
      }

      try {
        const artifact = await window.electronAPI.readArtifact(filePath);
        if (!artifact) {
          store.removeArtifact(filePath);
          needsReload = event === 'created';
          continue;
        }

        const metadata = toMetadata(artifact as Artifact);
        if (store.artifacts.some((item) => item.filePath === filePath)) {
          store.updateArtifact(metadata);
        } else {
          store.addArtifact(metadata);
        }
      } catch {
        needsReload = true;
      }
    }

    if (needsReload) await useArtifactsStore.getState().loadArtifacts();
  }, []);

  const handleFileChange = useCallback(
    (event: FileEventType, data: FileEventPayload) => {
      if (!data?.filePath) return;
      pendingByPathRef.current.set(data.filePath, event);
      if (flushTimerRef.current !== null) window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = window.setTimeout(() => {
        void flushPendingEvents();
      }, FLUSH_DELAY_MS);
    },
    [flushPendingEvents],
  );

  useFileWatcherEvents(handleFileChange);
}
