import type { ArtifactSummary } from '@shared/types';

/**
 * Shared drag-and-drop contract for filing artifacts onto sidebar projects.
 * Task, note, and Inbox rows spread `draggableItem(item)`; the sidebar project
 * rows gate on dragHasArtifact and read the payload on drop.
 */
const ARTIFACT_DND_MIME = 'application/x-myos-artifact';

interface ArtifactDragPayload {
  id: string;
  filePath: string;
  title: string;
}

export function draggableItem(artifact: ArtifactSummary) {
  return {
    draggable: true,
    onDragStart: (event: React.DragEvent) => {
      const payload: ArtifactDragPayload = { id: artifact.id, filePath: artifact.filePath, title: artifact.title };
      event.dataTransfer.setData(ARTIFACT_DND_MIME, JSON.stringify(payload));
      event.dataTransfer.effectAllowed = 'move';
    },
  };
}

export function dragHasArtifact(event: React.DragEvent): boolean {
  return event.dataTransfer.types.includes(ARTIFACT_DND_MIME);
}

export function readArtifactDragData(event: React.DragEvent): ArtifactDragPayload | null {
  const raw = event.dataTransfer.getData(ARTIFACT_DND_MIME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ArtifactDragPayload>;
    if (typeof parsed.id !== 'string' || typeof parsed.filePath !== 'string') return null;
    return { id: parsed.id, filePath: parsed.filePath, title: parsed.title ?? '' };
  } catch {
    return null;
  }
}
