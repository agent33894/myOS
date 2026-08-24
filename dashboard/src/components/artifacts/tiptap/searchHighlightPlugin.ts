import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const ARTIFACT_SEARCH_HIGHLIGHT_PLUGIN_KEY = new PluginKey(
  'artifact-search-highlight'
);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createArtifactSearchHighlightPlugin(searchQuery: string): Plugin {
  return new Plugin({
    key: ARTIFACT_SEARCH_HIGHLIGHT_PLUGIN_KEY,
    props: {
      decorations(state) {
        const query = searchQuery.trim();
        if (!query) {
          return DecorationSet.empty;
        }

        const pattern = new RegExp(escapeRegExp(query), 'gi');
        const decorations: Decoration[] = [];

        state.doc.descendants((node, pos, parent) => {
          if (!node.isText) return;
          if (parent?.type.name === 'codeBlock') return;

          const text = node.text || '';
          if (!text) return;

          pattern.lastIndex = 0;
          let match: RegExpExecArray | null;
          while ((match = pattern.exec(text)) !== null) {
            const start = pos + match.index;
            const end = start + match[0].length;
            decorations.push(
              Decoration.inline(start, end, {
                nodeName: 'mark',
                class:
                  'rounded-sm ed-bg-warning ed-text-warning   px-0.5 transition-colors',
                'data-artifact-search-match': 'true',
              })
            );
            if (match[0].length === 0) {
              pattern.lastIndex += 1;
            }
          }
        });

        return decorations.length > 0
          ? DecorationSet.create(state.doc, decorations)
          : DecorationSet.empty;
      },
    },
  });
}
