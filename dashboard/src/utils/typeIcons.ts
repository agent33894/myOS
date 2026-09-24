import {
  CheckCircle2,
  Database,
  FileCode,
  Flag,
  Users,
  FileText,
  BookOpen,
  Briefcase,
  Zap,
  GitBranch,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { ArtifactType } from '@shared/types';

const TYPE_ICONS: Record<ArtifactType, LucideIcon> = {
  [ArtifactType.TODO]: CheckCircle2,
  [ArtifactType.QUERY]: Database,
  [ArtifactType.SNIPPET]: FileCode,
  [ArtifactType.DECISION]: Flag,
  [ArtifactType.MEETING]: Users,
  [ArtifactType.MEMO]: FileText,
  [ArtifactType.RESEARCH]: BookOpen,
  [ArtifactType.PROJECT]: Briefcase,
  [ArtifactType.PROMPT]: Zap,
  [ArtifactType.DEVELOPMENT]: GitBranch,
  [ArtifactType.INBOX]: Sparkles,
};

const TYPE_LABELS: Record<ArtifactType, string> = {
  [ArtifactType.TODO]: 'Todo',
  [ArtifactType.QUERY]: 'Query',
  [ArtifactType.SNIPPET]: 'Snippet',
  [ArtifactType.DECISION]: 'Decision',
  [ArtifactType.MEETING]: 'Meeting',
  [ArtifactType.MEMO]: 'Memo',
  [ArtifactType.RESEARCH]: 'Research',
  [ArtifactType.PROJECT]: 'Project',
  [ArtifactType.PROMPT]: 'Prompt',
  [ArtifactType.DEVELOPMENT]: 'Development',
  [ArtifactType.INBOX]: 'Inbox',
};

export function getTypeIcon(type: ArtifactType): LucideIcon {
  return TYPE_ICONS[type] || FileText;
}

export function getTypeLabel(type: ArtifactType): string {
  return TYPE_LABELS[type] || type;
}
