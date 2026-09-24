import { Suspense, useRef, useState } from 'react';
import type { ReactNodeViewProps } from '@tiptap/react';
import { toast } from 'sonner';
import { Field, Spinner, Textarea } from '../../ui';
import { BlockFrame, BlockProblem, type BlockMode } from './BlockFrame';
import { fence, type BlockModel } from './model';
import { BLOCKS, blockKind, type BlockDefinition } from './registry';
import { useBlockDraft } from './useBlockDraft';

const verbatim: BlockModel<string> = { parse: (raw) => ({ ok: true, value: raw }), serialize: (raw) => raw };

const Loading = () => (
  <div className="grid h-32 place-items-center">
    <Spinner label="Loading block" />
  </div>
);

function Preview({ definition, value }: { definition: BlockDefinition<unknown>; value: unknown }) {
  const { View } = definition;
  return (
    <Suspense fallback={<Loading />}>
      <View value={value} />
    </Suspense>
  );
}

interface BodyProps {
  definition: BlockDefinition<unknown>;
  mode: BlockMode;
  source: string;
  write: (source: string) => void;
  flushRef: { current: () => void };
  onEditSource: () => void;
}

function BlockBody({ definition, mode, source, write, flushRef, onEditSource }: BodyProps) {
  const draft = useBlockDraft(definition.model, source, write);
  const raw = useBlockDraft(verbatim, source, write);
  flushRef.current = () => {
    draft.flush();
    raw.flush();
  };
  const { Editor } = definition;

  if (mode === 'source') {
    return (
      <div className="flex flex-col gap-4">
        <Field label="Source" error={draft.error} hint="Changes save as you type.">
          <Textarea autosize spellCheck={false} className="font-mono text-sm" value={raw.value ?? ''} onChange={(event) => raw.update(event.target.value)} />
        </Field>
        {draft.valid !== null ? <Preview definition={definition} value={draft.valid} /> : null}
      </div>
    );
  }

  if (draft.value === null) return <BlockProblem message={draft.error ?? undefined} onEditSource={onEditSource} />;

  if (mode === 'edit') {
    return (
      <div className="flex flex-col gap-4">
        <Editor key={draft.revision} value={draft.value} onChange={draft.update} />
        {draft.error ? (
          <p role="alert" className="text-sm text-danger">
            {draft.error}
          </p>
        ) : null}
        {draft.valid !== null ? (
          <div className="rounded-lg bg-canvas p-4">
            <Preview definition={definition} value={draft.valid} />
          </div>
        ) : null}
      </div>
    );
  }

  return <Preview definition={definition} value={draft.valid ?? draft.value} />;
}

/** The node view for every fenced rich block; renders inside the app's React tree via TipTap portals. */
export function RichBlockView({ node, editor, getPos, selected, updateAttributes, deleteNode }: ReactNodeViewProps) {
  const language = node.attrs.language as string;
  const source = node.attrs.source as string;
  const kind = blockKind(language, source) ?? 'chart';
  const definition = BLOCKS[kind];
  const [mode, setMode] = useState<BlockMode>(node.attrs.fresh ? 'edit' : 'preview');
  const flushRef = useRef(() => {});
  const nodeRef = useRef(node);
  nodeRef.current = node;

  // Only write while this node is still in the document at its position; a
  // late write must never land in a document the editor has since swapped to.
  const write = (next: string) => {
    const pos = getPos();
    if (typeof pos !== 'number' || editor.state.doc.nodeAt(pos) !== nodeRef.current) return;
    updateAttributes({ source: next });
  };

  const changeMode = (next: BlockMode) => {
    flushRef.current();
    setMode(next);
  };

  const leave = (side: 'before' | 'after') => {
    const pos = getPos();
    if (typeof pos !== 'number') return;
    editor.chain().focus(side === 'before' ? pos : pos + node.nodeSize).run();
  };

  return (
    <BlockFrame
      label={definition.label}
      mode={mode}
      onModeChange={changeMode}
      editable={editor.isEditable}
      selected={selected}
      resetKey={source}
      onDelete={deleteNode}
      onDuplicate={() => {
        const pos = getPos();
        if (typeof pos === 'number') editor.chain().insertContentAt(pos + node.nodeSize, { type: node.type.name, attrs: { language, source } }).run();
      }}
      onCopySource={() => {
        void navigator.clipboard.writeText(fence(language, source)).then(
          () => toast.success('Copied block source'),
          () => toast.error('Couldn’t copy to the clipboard'),
        );
      }}
      onLeave={leave}
      onBlur={() => flushRef.current()}
    >
      <BlockBody definition={definition} mode={mode} source={source} write={write} flushRef={flushRef} onEditSource={() => changeMode('source')} />
    </BlockFrame>
  );
}
