import { NodeViewContent, NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import { Check, Copy } from 'lucide-react';
import { IconButton, Select, SelectItem } from '../../../ui';
import { useCopy } from '../useCopy';
import { CODE_LANGUAGES, languageLabel } from './languages';

/** A code block: Geist Mono on a sunken well, with a language picker and copy button on hover. */
export function CodeBlockView({ node, updateAttributes, editor }: ReactNodeViewProps) {
  const language = (node.attrs.language as string | null) ?? '';
  const known = CODE_LANGUAGES.some((entry) => entry.id === language.toLowerCase());
  const { copied, copy } = useCopy();

  return (
    <NodeViewWrapper className="code-block group/code relative">
      <pre spellCheck={false}>
        <NodeViewContent<'code'> as="code" />
      </pre>
      <div
        contentEditable={false}
        data-block-chrome=""
        className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity duration-fast group-hover/code:opacity-100 focus-within:opacity-100"
      >
        {editor.isEditable ? (
          <Select
            size="sm"
            aria-label="Code language"
            value={language ? language.toLowerCase() : 'plain'}
            onValueChange={(next) => updateAttributes({ language: next === 'plain' ? null : next })}
            className="w-auto border-transparent bg-transparent text-text-tertiary hover:border-transparent hover:bg-text/5"
          >
            {!known && language ? <SelectItem value={language.toLowerCase()}>{languageLabel(language)}</SelectItem> : null}
            {CODE_LANGUAGES.map((entry) => (
              <SelectItem key={entry.id} value={entry.id}>
                {entry.label}
              </SelectItem>
            ))}
          </Select>
        ) : (
          <span className="px-2 text-xs text-text-tertiary">{languageLabel(language)}</span>
        )}
        <IconButton
          icon={copied ? Check : Copy}
          label={copied ? 'Copied' : 'Copy code'}
          size="sm"
          onClick={() => copy(node.textContent)}
        />
      </div>
    </NodeViewWrapper>
  );
}
