import { useState } from 'react';
import { ChevronDown, ChevronRight, FileCode } from 'lucide-react';
import DiffCodeBlock from './DiffCodeBlock';
import type { DiffFile } from './types';

interface DiffFileSectionProps {
  file: DiffFile;
  viewMode: 'unified' | 'side-by-side';
  defaultExpanded?: boolean;
}

const DIFF_STAT_ADD_CLASS = 'text-[hsl(var(--ed-success))] font-mono';
const DIFF_STAT_REMOVE_CLASS = 'text-[hsl(var(--ed-error))] font-mono';

export default function DiffFileSection({ file, viewMode, defaultExpanded = true }: DiffFileSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const fileName = file.newPath.split('/').pop() || file.newPath;
  const dirPath = file.newPath.includes('/')
    ? file.newPath.slice(0, file.newPath.lastIndexOf('/'))
    : '';

  return (
    <div className="border border-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-secondary  hover:bg-secondary  transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
        <FileCode className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-xs font-mono text-muted-foreground truncate">
          {dirPath && <span>{dirPath}/</span>}
          <span className="text-foreground font-semibold">{fileName}</span>
        </span>
        <span className="ml-auto flex items-center gap-2 text-xs flex-shrink-0">
          {file.additions > 0 && (
            <span className={DIFF_STAT_ADD_CLASS}>+{file.additions}</span>
          )}
          {file.deletions > 0 && (
            <span className={DIFF_STAT_REMOVE_CLASS}>-{file.deletions}</span>
          )}
        </span>
      </button>

      {expanded && file.hunks.length > 0 && (
        <div className="bg-foreground  overflow-hidden">
          <DiffCodeBlock hunks={file.hunks} language={file.language} viewMode={viewMode} />
        </div>
      )}

      {expanded && file.hunks.length === 0 && (
        <div className="px-4 py-3 text-xs text-muted-foreground italic">
          Binary file or no changes to display
        </div>
      )}
    </div>
  );
}
