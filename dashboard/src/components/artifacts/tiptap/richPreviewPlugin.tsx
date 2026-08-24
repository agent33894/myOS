import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import InlineChartBlockEditor from '../../editor/InlineChartBlockEditor';
import InlineCalloutBlockEditor from '../../editor/InlineCalloutBlockEditor';
import InlineKpiBlockEditor from '../../editor/InlineKpiBlockEditor';
import InlineMermaidBlockEditor from '../../editor/InlineMermaidBlockEditor';
import InlineRoadmapBlockEditor from '../../editor/InlineRoadmapBlockEditor';
import MarkdownCalloutBlock from '../../markdown/MarkdownCalloutBlock';
import MarkdownChartBlock from '../../markdown/MarkdownChartBlock';
import MarkdownKpiBlock from '../../markdown/MarkdownKpiBlock';
import MarkdownMermaidBlock from '../../markdown/MarkdownMermaidBlock';
import MarkdownRoadmapBlock from '../../markdown/MarkdownRoadmapBlock';
import CodeBlockWithCopy from '../../markdown/CodeBlockWithCopy';
import type { MarkdownChartSpec } from '../../../utils/chartBlocks';
import {
  resolveRichBlockLanguage,
  type RichBlockLanguage,
} from './artifactRendererContract';

export const RICH_PREVIEW_PLUGIN_KEY = new PluginKey('editor-rich-inline-preview');
export const RICH_PREVIEW_REFRESH_META = 'editor-rich-inline-preview-refresh';

interface RichPreviewWidgetContainer extends HTMLDivElement {
  __richPreviewRoot?: Root;
}

interface RichPreviewPluginOptions {
  mode: 'edit' | 'read';
  onApplyChart: (position: number, spec: MarkdownChartSpec) => void;
  onApplyRaw: (position: number, language: RichBlockLanguage, nextRaw: string) => void;
  onRemove: (position: number, language: RichBlockLanguage) => void;
  onShellKeyDown: (
    event: ReactKeyboardEvent<HTMLElement>,
    position: number,
    language: RichBlockLanguage,
  ) => void;
}

function unmountRichPreviewRoot(container: RichPreviewWidgetContainer): void {
  const root = container.__richPreviewRoot;
  if (!root) return;
  container.__richPreviewRoot = undefined;
  setTimeout(() => root.unmount(), 0);
}

function hashText(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function createWidgetContainer(className: string, content: ReactNode): RichPreviewWidgetContainer {
  const container = document.createElement('div') as RichPreviewWidgetContainer;
  container.className = className;
  const root = createRoot(container);
  container.__richPreviewRoot = root;
  root.render(content);
  return container;
}

function createEditorShell(
  label: string,
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void,
  editor: ReactNode,
): ReactNode {
  return (
    <div
      className="focus:outline-none"
      tabIndex={0}
      aria-label={`${label} block editor`}
      onKeyDown={onKeyDown}
    >
      {editor}
    </div>
  );
}

function renderRichBlockEditor(
  language: RichBlockLanguage,
  codeText: string,
  position: number,
  options: RichPreviewPluginOptions,
): ReactNode {
  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    options.onShellKeyDown(event, position, language);
  };
  const onRemove = () => options.onRemove(position, language);

  switch (language) {
    case 'chart':
      return createEditorShell('Chart', onKeyDown, (
        <InlineChartBlockEditor
          raw={codeText}
          onApplySpec={(spec) => options.onApplyChart(position, spec)}
          onRemove={onRemove}
        />
      ));
    case 'callout':
      return createEditorShell('Callout', onKeyDown, (
        <InlineCalloutBlockEditor
          raw={codeText}
          onApplyRaw={(nextRaw) => options.onApplyRaw(position, language, nextRaw)}
          onRemove={onRemove}
        />
      ));
    case 'kpi':
      return createEditorShell('KPI', onKeyDown, (
        <InlineKpiBlockEditor
          raw={codeText}
          onApplyRaw={(nextRaw) => options.onApplyRaw(position, language, nextRaw)}
          onRemove={onRemove}
        />
      ));
    case 'mermaid':
      return createEditorShell('Mermaid', onKeyDown, (
        <InlineMermaidBlockEditor
          raw={codeText}
          onApplyRaw={(nextRaw) => options.onApplyRaw(position, language, nextRaw)}
          onRemove={onRemove}
        />
      ));
    case 'roadmap':
      return createEditorShell('Roadmap', onKeyDown, (
        <InlineRoadmapBlockEditor
          raw={codeText}
          onApplyRaw={(nextRaw) => options.onApplyRaw(position, language, nextRaw)}
          onRemove={onRemove}
        />
      ));
  }
}

function renderRichBlockPreview(language: RichBlockLanguage, codeText: string): ReactNode {
  switch (language) {
    case 'chart':
      return <MarkdownChartBlock raw={codeText} />;
    case 'callout':
      return <MarkdownCalloutBlock raw={codeText} />;
    case 'kpi':
      return <MarkdownKpiBlock raw={codeText} />;
    case 'mermaid':
      return <MarkdownMermaidBlock raw={codeText} />;
    case 'roadmap':
      return <MarkdownRoadmapBlock raw={codeText} />;
  }
}

function destroyWidget(dom: Node): void {
  unmountRichPreviewRoot(dom as RichPreviewWidgetContainer);
}

export function createRichPreviewPlugin(options: RichPreviewPluginOptions): Plugin {
  return new Plugin({
    key: RICH_PREVIEW_PLUGIN_KEY,
    props: {
      decorations(state) {
        const decorations: Decoration[] = [];
        state.doc.descendants((node, position) => {
          if (node.type.name !== 'codeBlock') return;

          const codeText = node.textContent || '';
          const language = resolveRichBlockLanguage(node.attrs?.language, codeText);
          const explicitLanguage = typeof node.attrs?.language === 'string'
            ? node.attrs.language
            : undefined;

          decorations.push(Decoration.node(
            position,
            position + node.nodeSize,
            { style: 'display: none;' },
          ));

          if (options.mode === 'read' && !language) {
            decorations.push(Decoration.widget(
              position + node.nodeSize,
              () => createWidgetContainer('my-3', (
                <CodeBlockWithCopy className={explicitLanguage ? `language-${explicitLanguage}` : undefined}>
                  {codeText}
                </CodeBlockWithCopy>
              )),
              {
                side: 1,
                key: `rich-code-readonly-${position}-${hashText(codeText)}`,
                stopEvent: () => false,
                destroy: destroyWidget,
              },
            ));
            return;
          }

          if (!language) {
            decorations.pop();
            return;
          }

          const content = options.mode === 'edit'
            ? renderRichBlockEditor(language, codeText, position, options)
            : renderRichBlockPreview(language, codeText);
          decorations.push(Decoration.widget(
            position + node.nodeSize,
            () => createWidgetContainer(options.mode === 'edit' ? 'my-1' : 'my-3', content),
            {
              side: 1,
              key: `rich-preview-${language}-${options.mode}-${position}-${hashText(codeText)}`,
              stopEvent: () => options.mode === 'edit',
              destroy: destroyWidget,
            },
          ));
        });

        return decorations.length > 0
          ? DecorationSet.create(state.doc, decorations)
          : DecorationSet.empty;
      },
    },
  });
}
