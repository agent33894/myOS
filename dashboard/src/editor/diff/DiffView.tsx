import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn, Icon } from '../../ui';
import { loadLanguage, tokenize } from '../blocks/code/shiki';
import type { DiffFile, DiffHunk, DiffLine } from './parseDiff';

export type DiffLayout = 'unified' | 'split';

const ROW: Record<DiffLine['type'], string> = {
  add: 'bg-success-soft',
  remove: 'bg-danger-soft',
  context: '',
};
const SIGN: Record<DiffLine['type'], string> = { add: '+', remove: '−', context: ' ' };

function useGrammar(language: string): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let current = true;
    void loadLanguage(language).then((ok) => current && setReady(ok));
    return () => {
      current = false;
    };
  }, [language]);
  return ready;
}

function Code({ text, language, highlight }: { text: string; language: string; highlight: boolean }) {
  const tokens = highlight ? tokenize(text, language)?.[0] : null;
  if (!tokens) return <>{text}</>;
  return (
    <>
      {tokens.map((token, index) => (
        <span key={index} style={{ color: token.color }}>
          {token.content}
        </span>
      ))}
    </>
  );
}

function Cells({ line, number, language, highlight }: { line: DiffLine | null; number?: number; language: string; highlight: boolean }) {
  if (!line) return <td colSpan={2} className="bg-sunken" />;
  return (
    <>
      <td className={cn('w-12 select-none px-2 text-right align-top text-text-tertiary', ROW[line.type])}>{number ?? ''}</td>
      <td className={cn('whitespace-pre-wrap break-all px-2 align-top', ROW[line.type])}>
        <span className="mr-2 select-none text-text-tertiary">{SIGN[line.type]}</span>
        <Code text={line.content} language={language} highlight={highlight} />
      </td>
    </>
  );
}

function pairLines(hunk: DiffHunk): Array<[DiffLine | null, DiffLine | null]> {
  const rows: Array<[DiffLine | null, DiffLine | null]> = [];
  let removed: DiffLine[] = [];
  let added: DiffLine[] = [];
  const flush = () => {
    for (let index = 0; index < Math.max(removed.length, added.length); index += 1) rows.push([removed[index] ?? null, added[index] ?? null]);
    removed = [];
    added = [];
  };
  for (const line of hunk.lines) {
    if (line.type === 'remove') removed.push(line);
    else if (line.type === 'add') added.push(line);
    else {
      flush();
      rows.push([line, line]);
    }
  }
  flush();
  return rows;
}

function Hunks({ file, layout }: { file: DiffFile; layout: DiffLayout }) {
  const highlight = useGrammar(file.language);
  const columns = layout === 'split' ? 4 : 3;
  return (
    <table className="w-full table-fixed border-collapse font-mono text-xs leading-5">
      <tbody>
        {file.hunks.map((hunk, hunkIndex) => (
          <Fragment key={hunkIndex}>
            <tr>
              <td colSpan={columns} className="bg-accent-soft px-3 py-1 text-accent-text">
                {hunk.header}
              </td>
            </tr>
            {layout === 'split'
              ? pairLines(hunk).map(([left, right], index) => (
                  <tr key={index}>
                    <Cells line={left} number={left?.oldLineNumber} language={file.language} highlight={highlight} />
                    <Cells line={right} number={right?.newLineNumber} language={file.language} highlight={highlight} />
                  </tr>
                ))
              : hunk.lines.map((line, index) => (
                  <tr key={index}>
                    <td className={cn('w-12 select-none px-2 text-right align-top text-text-tertiary', ROW[line.type])}>{line.oldLineNumber ?? ''}</td>
                    <Cells line={line} number={line.newLineNumber} language={file.language} highlight={highlight} />
                  </tr>
                ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}

export function DiffStat({ additions, deletions, children }: { additions: number; deletions: number; children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs tabular-nums">
      {children}
      {additions > 0 ? <span className="text-success">+{additions}</span> : null}
      {deletions > 0 ? <span className="text-danger">−{deletions}</span> : null}
    </span>
  );
}

export function DiffFileSection({ file, layout, defaultOpen }: { file: DiffFile; layout: DiffLayout; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [directory, name] = useMemo(() => {
    const at = file.newPath.lastIndexOf('/');
    return at === -1 ? ['', file.newPath] : [file.newPath.slice(0, at + 1), file.newPath.slice(at + 1)];
  }, [file.newPath]);

  return (
    <section className="overflow-hidden rounded-md bg-raised shadow-raised">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          setOpen(!open);
        }}
        className="flex h-9 cursor-default items-center gap-2 px-3 text-sm outline-none hover:bg-text/5 focus-visible:ring-2 focus-visible:ring-focus"
      >
        <Icon icon={open ? ChevronDown : ChevronRight} size="sm" className="text-text-tertiary" />
        <span className="min-w-0 flex-1 truncate font-mono text-xs">
          <span className="text-text-tertiary">{directory}</span>
          <span className="font-medium text-text">{name}</span>
        </span>
        <DiffStat additions={file.additions} deletions={file.deletions} />
      </div>
      {open ? (
        file.hunks.length ? (
          <div className="overflow-x-auto border-t border-border">
            <Hunks file={file} layout={layout} />
          </div>
        ) : (
          <div className="border-t border-border px-4 py-3 text-sm text-text-tertiary">Binary file, or nothing to show</div>
        )
      ) : null}
    </section>
  );
}
