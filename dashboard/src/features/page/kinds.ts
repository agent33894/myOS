import { CheckCircle2, FileText, FolderKanban, Inbox, type LucideIcon } from 'lucide-react';
import { ArtifactType } from '@shared/types';

// Older typed files are Notes; their type shows only as a quiet kind label.
const KINDS: Partial<Record<ArtifactType, string>> = {
  [ArtifactType.DECISION]: 'Decision',
  [ArtifactType.MEETING]: 'Meeting',
  [ArtifactType.RESEARCH]: 'Research',
  [ArtifactType.QUERY]: 'Query',
  [ArtifactType.SNIPPET]: 'Snippet',
  [ArtifactType.PROMPT]: 'Prompt',
  [ArtifactType.DEVELOPMENT]: 'Dev log',
};

export const kindLabel = (type: ArtifactType): string | undefined => KINDS[type];

export function itemIcon(type: ArtifactType): LucideIcon {
  if (type === ArtifactType.TODO) return CheckCircle2;
  if (type === ArtifactType.PROJECT) return FolderKanban;
  if (type === ArtifactType.INBOX) return Inbox;
  return FileText;
}
