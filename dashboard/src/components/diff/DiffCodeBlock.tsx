import { useMemo, type CSSProperties } from 'react';
import { useShikiHighlighter } from '../../contexts/ShikiContext';
import { useAccentColor } from '../../hooks/useAccentColor';
import { rgbStringToHsl } from '../../utils/colorPalette';
import type { DiffHunk } from './types';

interface DiffCodeBlockProps {
  hunks: DiffHunk[];
  language: string;
  viewMode: 'unified' | 'side-by-side';
}

export default function DiffCodeBlock({ hunks, language, viewMode }: DiffCodeBlockProps) {
  const { highlighter } = useShikiHighlighter();
  const { pantoneColor } = useAccentColor();

  const supportedLang = useMemo(() => {
    if (!highlighter) return 'text';
    const lang = language.toLowerCase();
    return highlighter.getLoadedLanguages().includes(lang) ? lang : 'text';
  }, [highlighter, language]);
  const theme = useMemo(() => buildDiffTheme(pantoneColor.rgb), [pantoneColor.rgb]);

  if (viewMode === 'side-by-side') {
    return <SideBySideView hunks={hunks} highlighter={highlighter} lang={supportedLang} theme={theme} />;
  }

  return <UnifiedView hunks={hunks} highlighter={highlighter} lang={supportedLang} theme={theme} />;
}

function highlightLine(
  highlighter: ReturnType<typeof useShikiHighlighter>['highlighter'],
  content: string,
  lang: string
): string {
  if (!highlighter || !content) return escapeHtml(content);
  try {
    const html = highlighter.codeToHtml(content || ' ', {
      lang,
      theme: 'github-dark',
    });
    // Extract inner content from <pre><code>...</code></pre>
    const match = html.match(/<code[^>]*>([\s\S]*?)<\/code>/);
    if (match) {
      // Strip the wrapping <span class="line"> if present
      const inner = match[1].replace(/^<span class="line">([\s\S]*)<\/span>$/, '$1');
      return inner;
    }
    return escapeHtml(content);
  } catch {
    return escapeHtml(content);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const LINE_PREFIX = {
  add: '+',
  remove: '-',
  context: ' ',
} as const;

interface DiffTheme {
  hunkHeader: CSSProperties;
  rowBackground: Record<'add' | 'remove' | 'context', CSSProperties>;
  lineTone: Record<'add' | 'remove' | 'context', CSSProperties>;
  lineEdge: Record<'add' | 'remove', string>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

function blendHue(fromHue: number, toHue: number, weight: number): number {
  const delta = ((toHue - fromHue + 540) % 360) - 180;
  return normalizeHue(fromHue + delta * weight);
}

function buildDiffTheme(accentRgb: string): DiffTheme {
  const { h, s } = rgbStringToHsl(accentRgb);
  const saturation = clamp(s, 38, 78);
  const addHue = blendHue(145, h, 0.24);
  const removeHue = blendHue(8, h, 0.24);

  return {
    hunkHeader: {
      backgroundColor: `hsla(${h.toFixed(1)}, ${clamp(saturation * 0.62, 28, 60).toFixed(1)}%, 21%, 0.85)`,
      color: `hsla(${h.toFixed(1)}, ${clamp(saturation * 0.9, 40, 80).toFixed(1)}%, 79%, 0.96)`,
    },
    rowBackground: {
      add: {
        backgroundColor: `hsla(${addHue.toFixed(1)}, ${clamp(saturation * 0.88, 44, 78).toFixed(1)}%, 22%, 0.42)`,
      },
      remove: {
        backgroundColor: `hsla(${removeHue.toFixed(1)}, ${clamp(saturation * 0.82, 40, 74).toFixed(1)}%, 22%, 0.36)`,
      },
      context: {},
    },
    lineTone: {
      add: {
        color: `hsl(${addHue.toFixed(1)} ${clamp(saturation * 0.95, 50, 86).toFixed(1)}% 73%)`,
      },
      remove: {
        color: `hsl(${removeHue.toFixed(1)} ${clamp(saturation * 0.88, 48, 82).toFixed(1)}% 74%)`,
      },
      context: {
        color: 'rgba(156, 163, 175, 0.82)',
      },
    },
    lineEdge: {
      add: `hsla(${addHue.toFixed(1)}, ${clamp(saturation, 52, 88).toFixed(1)}%, 67%, 0.6)`,
      remove: `hsla(${removeHue.toFixed(1)}, ${clamp(saturation * 0.92, 48, 84).toFixed(1)}%, 66%, 0.55)`,
    },
  };
}

function getCodeEdgeStyle(theme: DiffTheme, type: 'add' | 'remove' | 'context'): CSSProperties | undefined {
  if (type === 'context') return undefined;
  return { boxShadow: `inset 2px 0 0 ${theme.lineEdge[type]}` };
}

interface ViewProps {
  hunks: DiffHunk[];
  highlighter: ReturnType<typeof useShikiHighlighter>['highlighter'];
  lang: string;
  theme: DiffTheme;
}

function UnifiedView({ hunks, highlighter, lang, theme }: ViewProps) {
  return (
    <div className="text-xs font-mono overflow-x-auto">
      <table className="w-full border-collapse table-fixed">
        <colgroup>
          <col className="w-10" />
          <col className="w-10" />
          <col />
        </colgroup>
        <tbody>
          {hunks.map((hunk, hunkIdx) => (
            <HunkRows key={hunkIdx} hunk={hunk} highlighter={highlighter} lang={lang} theme={theme} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HunkRows({ hunk, highlighter, lang, theme }: { hunk: DiffHunk } & Omit<ViewProps, 'hunks'>) {
  return (
    <>
      <tr>
        <td
          colSpan={3}
          className="px-3 py-1 select-none text-xs"
          style={theme.hunkHeader}
        >
          {hunk.header}
        </td>
      </tr>
      {hunk.lines.map((line, lineIdx) => {
        const highlighted = highlightLine(highlighter, line.content, lang);
        return (
          <tr key={lineIdx} style={theme.rowBackground[line.type]}>
            <td
              className="w-10 px-2 py-0 text-right select-none border-r border-border "
              style={theme.lineTone[line.type]}
            >
              {line.oldLineNumber ?? ''}
            </td>
            <td
              className="w-10 px-2 py-0 text-right select-none border-r border-border "
              style={theme.lineTone[line.type]}
            >
              {line.newLineNumber ?? ''}
            </td>
            <td className="px-3 py-0 whitespace-pre-wrap break-all" style={getCodeEdgeStyle(theme, line.type)}>
              <span className="select-none mr-2" style={theme.lineTone[line.type]}>
                {LINE_PREFIX[line.type]}
              </span>
              <span dangerouslySetInnerHTML={{ __html: highlighted }} />
            </td>
          </tr>
        );
      })}
    </>
  );
}

function SideBySideView({ hunks, highlighter, lang, theme }: ViewProps) {
  // Build paired rows for side-by-side display
  const rows = useMemo(() => {
    const result: { left: DiffHunk['lines'][0] | null; right: DiffHunk['lines'][0] | null; isHeader?: boolean; header?: string }[] = [];

    for (const hunk of hunks) {
      result.push({ left: null, right: null, isHeader: true, header: hunk.header });

      const removes: DiffHunk['lines'] = [];
      const adds: DiffHunk['lines'] = [];

      const flushPairs = () => {
        const max = Math.max(removes.length, adds.length);
        for (let i = 0; i < max; i++) {
          result.push({
            left: i < removes.length ? removes[i] : null,
            right: i < adds.length ? adds[i] : null,
          });
        }
        removes.length = 0;
        adds.length = 0;
      };

      for (const line of hunk.lines) {
        if (line.type === 'context') {
          flushPairs();
          result.push({ left: line, right: line });
        } else if (line.type === 'remove') {
          removes.push(line);
        } else {
          adds.push(line);
        }
      }
      flushPairs();
    }

    return result;
  }, [hunks]);

  return (
    <div className="text-xs font-mono overflow-x-auto">
      <table className="w-full border-collapse table-fixed">
        <colgroup>
          <col className="w-10" />
          <col />
          <col className="w-10" />
          <col />
        </colgroup>
        <tbody>
          {rows.map((row, idx) => {
            if (row.isHeader) {
              return (
                <tr key={idx}>
                  <td
                    colSpan={4}
                    className="px-3 py-1 select-none text-xs"
                    style={theme.hunkHeader}
                  >
                    {row.header}
                  </td>
                </tr>
              );
            }

            const leftType = row.left?.type ?? 'context';
            const rightType = row.right?.type ?? 'context';
            const leftHighlighted = row.left ? highlightLine(highlighter, row.left.content, lang) : '';
            const rightHighlighted = row.right ? highlightLine(highlighter, row.right.content, lang) : '';

            return (
              <tr key={idx}>
                <td
                  className="w-10 px-2 py-0 text-right select-none border-r border-border "
                  style={
                    row.left
                      ? { ...theme.rowBackground[leftType], ...theme.lineTone[leftType] }
                      : undefined
                  }
                >
                  {row.left?.oldLineNumber ?? ''}
                </td>
                <td
                  className="px-3 py-0 align-top whitespace-pre-wrap break-all border-r border-border "
                  style={
                    row.left
                      ? { ...theme.rowBackground[leftType], ...getCodeEdgeStyle(theme, leftType) }
                      : undefined
                  }
                >
                  {row.left && (
                    <>
                      <span className="select-none mr-2" style={theme.lineTone[leftType]}>
                        {LINE_PREFIX[leftType]}
                      </span>
                      <span dangerouslySetInnerHTML={{ __html: leftHighlighted }} />
                    </>
                  )}
                </td>
                <td
                  className="w-10 px-2 py-0 text-right select-none border-r border-border "
                  style={
                    row.right
                      ? { ...theme.rowBackground[rightType], ...theme.lineTone[rightType] }
                      : undefined
                  }
                >
                  {row.right?.newLineNumber ?? ''}
                </td>
                <td
                  className="px-3 py-0 align-top whitespace-pre-wrap break-all"
                  style={
                    row.right
                      ? { ...theme.rowBackground[rightType], ...getCodeEdgeStyle(theme, rightType) }
                      : undefined
                  }
                >
                  {row.right && (
                    <>
                      <span className="select-none mr-2" style={theme.lineTone[rightType]}>
                        {LINE_PREFIX[rightType]}
                      </span>
                      <span dangerouslySetInnerHTML={{ __html: rightHighlighted }} />
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
