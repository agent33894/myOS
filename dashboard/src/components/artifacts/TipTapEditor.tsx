import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { EditorContent, useEditor, type Editor as TiptapEditor } from '@tiptap/react';
import { createRoot, type Root } from 'react-dom/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Toolbar } from '../tiptap-templates/simple/toolbar';
import { FloatingToolbar } from './FloatingToolbar';
import { cn } from '../../lib/utils';
import { ArtifactType } from '../../types/artifacts';
import { useArtifactsStore } from '../../store/artifacts';
import { toArtifactNavigationUrl } from '../../features/artifact-route/routeContract';
import { findLinkedArtifact } from '../../utils/artifactLinks';
import { type MarkdownChartSpec } from '../../utils/chartBlocks';
import ChartInsertModal from '../editor/ChartInsertModal';
import InsertCommandMenu, { type InsertCommandOption } from '../editor/InsertCommandMenu';
import CommitDiffModal from '../diff/CommitDiffModal';
import CommitDiffPopover from '../diff/CommitDiffPopover';
import {
  deriveProjectPathFromArtifactFilePath,
  extractCommitHashFromHref,
} from '../diff/commitLinkUtils';
import {
  createArtifactRendererExtensions,
  parseFencedCodeBlock,
  resolveRichBlockLanguage,
  type RichBlockLanguage,
} from './tiptap/artifactRendererContract';
import {
  ARTIFACT_SEARCH_HIGHLIGHT_PLUGIN_KEY,
  createArtifactSearchHighlightPlugin,
} from './tiptap/searchHighlightPlugin';
import {
  CALLOUT_TEMPLATE,
  KPI_TEMPLATE,
  MERMAID_TEMPLATE,
  ROADMAP_TEMPLATE,
  calculateSlashMenuPosition,
  filterInsertCommands,
} from './tiptap/insertCommands';
import {
  RICH_PREVIEW_PLUGIN_KEY,
  RICH_PREVIEW_REFRESH_META,
  createRichPreviewPlugin,
} from './tiptap/richPreviewPlugin';
import {
  getRichBlockLabel,
  planExternalMarkdownSync,
  shouldDeleteRichBlockFromShell,
} from './tiptap/richBlockEditing';

interface SlashCommandState {
  query: string;
  from: number;
  to: number;
  top: number;
  left: number;
}

function teardownReadModeCommitPopovers(rootMap: Map<HTMLElement, Root>): void {
  rootMap.forEach((root, container) => {
    root.unmount();
    const hiddenAnchor = container.previousElementSibling;
    if (hiddenAnchor instanceof HTMLAnchorElement) {
      hiddenAnchor.style.display = '';
      hiddenAnchor.removeAttribute('data-commit-link-hidden');
    }
    container.remove();
  });
  rootMap.clear();
}

interface TipTapEditorProps {
  value: string; // Markdown content
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  variant?: 'default' | 'immersive' | 'editorial';
  /**
   * 'contained' centers the editorial column at the reading measure; 'flush'
   * lets the host own the measure (the Living Page pane aligns the body with
   * its own title column).
   */
  measure?: 'contained' | 'flush';
  mode?: 'edit' | 'read';
  /**
   * Focus the editor when it mounts (or swaps to) an empty document. Only the
   * workspace route wants this — in the Living Page browse pane the value is
   * transiently '' while an artifact's body loads, and stealing focus there
   * leaves the incoming document fully selected.
   */
  autoFocusWhenEmpty?: boolean;
  searchQuery?: string;
  showToolbar?: boolean;
  artifactId?: string;
  artifactFilePath?: string;
  artifactType?: ArtifactType;
}

export default function TipTapEditor({
  value,
  onChange,
  placeholder = 'Start writing...',
  className,
  minHeight = '300px',
  variant = 'default',
  measure = 'contained',
  mode = 'edit',
  autoFocusWhenEmpty = false,
  searchQuery = '',
  showToolbar,
  artifactId,
  artifactFilePath,
  artifactType,
}: TipTapEditorProps) {
  const navigate = useNavigate();
  const artifacts = useArtifactsStore((state) => state.artifacts);
  const isReadMode = mode === 'read';
  // Default showToolbar based on variant if not explicitly set
  const shouldShowToolbar = !isReadMode && (showToolbar ?? (variant === 'default'));
  const isImmersive = variant === 'immersive';
  const isEditorial = variant === 'editorial';
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [slashCommandState, setSlashCommandState] = useState<SlashCommandState | null>(null);
  const [slashPaletteQuery, setSlashPaletteQuery] = useState('');
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
  const [isAttachingAsset, setIsAttachingAsset] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const [commitDiffRequest, setCommitDiffRequest] = useState<{
    commitHash: string;
    commitMessage: string;
    projectPath: string;
  } | null>(null);
  const draftAttachmentKeyRef = useRef(`draft-${Date.now().toString(36)}`);
  const slashSessionActiveRef = useRef(false);
  const isDevelopmentArtifact = artifactType === ArtifactType.DEVELOPMENT;
  const derivedCommitDiffProjectPath = useMemo(
    () => deriveProjectPathFromArtifactFilePath(artifactFilePath),
    [artifactFilePath]
  );
  const [fallbackCommitDiffProjectPath, setFallbackCommitDiffProjectPath] = useState<string | null>(null);
  const commitDiffProjectPath = derivedCommitDiffProjectPath ?? fallbackCommitDiffProjectPath;
  const commitDiffContextRef = useRef<{
    isDevelopmentArtifact: boolean;
    projectPath: string | null;
  }>({
    isDevelopmentArtifact,
    projectPath: commitDiffProjectPath,
  });
  const readModeCommitPopoverRootsRef = useRef<Map<HTMLElement, Root>>(new Map());
  // Track the last markdown value we set to the editor to avoid unnecessary syncs
  const lastValueRef = useRef<string | null>(null);
  const artifactsRef = useRef(artifacts);
  const artifactFilePathRef = useRef(artifactFilePath);

  useEffect(() => {
    artifactsRef.current = artifacts;
  }, [artifacts]);

  useEffect(() => {
    artifactFilePathRef.current = artifactFilePath;
  }, [artifactFilePath]);

  useEffect(() => {
    commitDiffContextRef.current = {
      isDevelopmentArtifact,
      projectPath: commitDiffProjectPath,
    };
  }, [commitDiffProjectPath, isDevelopmentArtifact]);

  useEffect(() => {
    if (!isDevelopmentArtifact) {
      setFallbackCommitDiffProjectPath(null);
      return;
    }

    if (derivedCommitDiffProjectPath) {
      setFallbackCommitDiffProjectPath(null);
      return;
    }

    if (!window.electronAPI?.getVaultPath) {
      setFallbackCommitDiffProjectPath(null);
      return;
    }

    let isActive = true;
    window.electronAPI.getVaultPath()
      .then((vaultPath) => {
        if (!isActive) return;
        setFallbackCommitDiffProjectPath(vaultPath.replace(/[/\\]vault[/\\]?$/, ''));
      })
      .catch(() => {
        if (!isActive) return;
        setFallbackCommitDiffProjectPath(null);
      });

    return () => {
      isActive = false;
    };
  }, [derivedCommitDiffProjectPath, isDevelopmentArtifact]);

  const syncSlashCommand = (editorInstance: TiptapEditor) => {
    if (isReadMode) {
      setSlashCommandState(null);
      slashSessionActiveRef.current = false;
      return;
    }

    const { state, view } = editorInstance;
    if (!state.selection.empty) {
      setSlashCommandState(null);
      slashSessionActiveRef.current = false;
      return;
    }

    const { $from } = state.selection;
    const textBeforeCursor = $from.parent.textBetween(0, $from.parentOffset, '\n', '\0');
    const slashMatch = textBeforeCursor.match(/^\/([a-z0-9-]*)$/i);

    if (!slashMatch) {
      setSlashCommandState(null);
      slashSessionActiveRef.current = false;
      return;
    }

    // Guard against opening a slash menu from pre-existing content when entering edit mode.
    // A slash session starts only when the user types "/" in the current session.
    if (!slashSessionActiveRef.current && !slashCommandState) {
      return;
    }

    const query = slashMatch[1] ?? '';
    const from = state.selection.from - (query.length + 1);
    const to = state.selection.from;
    const coords = view.coordsAtPos(state.selection.from);
    const { top, left } = calculateSlashMenuPosition({
      optionCount: filterInsertCommands(query).length,
      cursor: coords,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    });

    setSlashCommandState((previous) => {
      if (
        previous &&
        previous.query === query &&
        previous.from === from &&
        previous.to === to &&
        previous.top === top &&
        previous.left === left
      ) {
        return previous;
      }
      return { query, from, to, top, left };
    });
  };

  useEffect(() => {
    if (!isReadMode) return;
    setSlashCommandState(null);
    setSelectedSlashIndex(0);
    setSlashPaletteQuery('');
    slashSessionActiveRef.current = false;
  }, [isReadMode]);

  const removeSlashTrigger = (editorInstance: TiptapEditor) => {
    if (!slashCommandState) return;
    editorInstance
      .chain()
      .focus()
      .deleteRange({ from: slashCommandState.from, to: slashCommandState.to })
      .run();
  };

  const filteredInsertCommands = useMemo(
    () => filterInsertCommands(slashPaletteQuery),
    [slashPaletteQuery]
  );

  useEffect(() => {
    if (!slashCommandState) {
      setSlashPaletteQuery('');
      return;
    }
    setSlashPaletteQuery(slashCommandState.query);
  }, [slashCommandState?.query, slashCommandState?.from]);

  useEffect(() => {
    setSelectedSlashIndex(0);
  }, [slashPaletteQuery]);

  useEffect(() => {
    if (filteredInsertCommands.length === 0) {
      setSelectedSlashIndex(0);
      return;
    }
    if (selectedSlashIndex >= filteredInsertCommands.length) {
      setSelectedSlashIndex(0);
    }
  }, [filteredInsertCommands.length, selectedSlashIndex]);

  // Create editor with Markdown support
  const editor = useEditor({
    extensions: createArtifactRendererExtensions({ placeholder }),
    content: value || '',
    contentType: 'markdown',
    onUpdate: ({ editor }) => {
      if (isReadMode) return;
      const markdown = editor.getMarkdown();
      // Update the ref to prevent the sync effect from overwriting our changes
      lastValueRef.current = markdown;
      onChange(markdown);
      syncSlashCommand(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      if (isReadMode) return;
      syncSlashCommand(editor);
    },
    editorProps: {
      attributes: {
        class: cn(
          isEditorial
            ? 'prose-editorial focus:outline-none min-h-full pb-24 text-foreground caret-[rgb(var(--accent-color))]'
            : isImmersive
              ? 'prose-immersive focus:outline-none min-h-full pb-24'
              : cn(
                  'prose max-w-none focus:outline-none',
                  'px-4 py-3 min-h-[300px] pb-24',
                  'text-foreground '
                )
        ),
      },
      handleKeyDown: (_view, event) => {
        if (isReadMode) return false;
        if (slashCommandState) {
          if (!editor) return false;
          const options = filteredInsertCommands;

          if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (options.length > 0) {
              setSelectedSlashIndex((current) => (current + 1) % options.length);
            }
            return true;
          }

          if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (options.length > 0) {
              setSelectedSlashIndex((current) => (current - 1 + options.length) % options.length);
            }
            return true;
          }

          if (event.key === 'Enter' || event.key === 'Tab') {
            if (options.length > 0) {
              event.preventDefault();
              const selected = options[selectedSlashIndex] || options[0];
              if (selected) {
                runInsertCommand(selected, editor);
              }
              return true;
            }
            return false;
          }

          if (event.key === 'Escape') {
            event.preventDefault();
            removeSlashTrigger(editor);
            setSlashCommandState(null);
            setSelectedSlashIndex(0);
            slashSessionActiveRef.current = false;
            return true;
          }
        }

        if (editor && handleCursorBackspaceDelete(event, editor)) {
          return true;
        }

        if (
          event.key === '/' &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey
        ) {
          slashSessionActiveRef.current = true;
        }
        return false;
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement | null;
        if (!target) return false;

        const anchor = target.closest('a[href]');
        if (!(anchor instanceof HTMLAnchorElement)) return false;

        const href = anchor.getAttribute('href') || anchor.href || '';
        const linkedArtifact = findLinkedArtifact(
          href,
          artifactFilePathRef.current,
          artifactsRef.current,
        );
        if (linkedArtifact) {
          event.preventDefault();
          event.stopPropagation();
          navigate(toArtifactNavigationUrl(linkedArtifact));
          return true;
        }

        if (isReadMode) return false;
        const context = commitDiffContextRef.current;
        if (!context.isDevelopmentArtifact || !context.projectPath) return false;

        const commitHash = extractCommitHashFromHref(href);
        if (!commitHash) return false;

        event.preventDefault();
        event.stopPropagation();

        setCommitDiffRequest({
          commitHash,
          commitMessage: (anchor.textContent || '').trim(),
          projectPath: context.projectPath,
        });
        return true;
      },
    },
    immediatelyRender: false,
  });

  // Initialize editor content and update when value prop changes externally
  useEffect(() => {
    if (editor && value !== undefined) {
      // Only sync if the value prop changed from an external source
      // (not from our own onChange callback)
      const currentMarkdown = editor.getMarkdown();

      // Skip sync if the markdown content is essentially the same
      // This prevents the feedback loop and backslash escaping issues
      const syncPlan = planExternalMarkdownSync(lastValueRef.current, currentMarkdown, value);
      if (syncPlan.shouldSync) {
        // emitUpdate defaults to TRUE in TipTap v3: without turning it off,
        // every programmatic document swap fires onChange with re-normalized
        // markdown, which the Living Page would treat as a user edit — and
        // merely selecting an artifact would autosave (and rewrite) its file.
        editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
        // setContent replaces the whole document; if the editor happens to be
        // focused, ProseMirror maps the old selection across the inserted
        // content and the entire body renders selected. Land as a collapsed
        // caret at the start instead.
        editor.commands.setTextSelection(syncPlan.selectionPosition ?? 0);
        lastValueRef.current = value;
      }
    }
  }, [value, editor]);

  useEffect(() => {
    if (isReadMode) return;
    if (!editor || !slashCommandState) return;

    const handleViewportChange = () => {
      syncSlashCommand(editor);
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [editor, isReadMode, slashCommandState, syncSlashCommand]);

  useEffect(() => {
    if (!autoFocusWhenEmpty) return;
    if (isReadMode) return;
    if (!editor) return;
    if (value.trim().length > 0) {
      return;
    }

    const editorElement = editor.view.dom;
    if (editorElement.contains(document.activeElement)) {
      return;
    }

    const timer = window.setTimeout(() => {
      editor.chain().focus('start').run();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [editor, artifactFilePath, artifactId, isReadMode, value, autoFocusWhenEmpty]);

  const applyRichBlockTextAtPosition = useCallback((position: number, nextRaw: string) => {
    if (!editor) return;
    const node = editor.state.doc.nodeAt(position);
    if (!node || node.type.name !== 'codeBlock') return;

    const from = position + 1;
    const to = position + node.nodeSize - 1;
    editor.view.dispatch(
      editor.state.tr
        .insertText(nextRaw, from, to)
        .setMeta(RICH_PREVIEW_REFRESH_META, Date.now())
    );
  }, [editor]);

  const applyChartSpecAtPosition = useCallback((position: number, spec: MarkdownChartSpec) => {
    applyRichBlockTextAtPosition(position, JSON.stringify(spec, null, 2));
    setLiveAnnouncement('Chart block updated.');
  }, [applyRichBlockTextAtPosition]);

  const removeRichBlockAtPosition = useCallback((position: number, language: RichBlockLanguage) => {
    if (!editor) return;
    const node = editor.state.doc.nodeAt(position);
    if (!node || node.type.name !== 'codeBlock') return;

    editor.view.dispatch(
      editor.state.tr
        .delete(position, position + node.nodeSize)
        .setMeta(RICH_PREVIEW_REFRESH_META, Date.now())
    );

    const removedMessage = `${getRichBlockLabel(language)} block removed.`;
    setLiveAnnouncement(removedMessage);
  }, [editor]);

  const handleRichBlockShellKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>, position: number, language: RichBlockLanguage) => {
      if (!shouldDeleteRichBlockFromShell(event)) return;

      event.preventDefault();
      event.stopPropagation();
      removeRichBlockAtPosition(position, language);
    },
    [removeRichBlockAtPosition]
  );

  const handleCursorBackspaceDelete = useCallback(
    (event: KeyboardEvent, editorInstance: TiptapEditor): boolean => {
      if (event.defaultPrevented) return false;
      if (event.key !== 'Backspace') return false;
      if (event.metaKey || event.ctrlKey || event.altKey) return false;

      const { selection, doc } = editorInstance.state;
      if (!selection.empty) return false;

      const { $from } = selection;
      // Intercept only when cursor is at start of a top-level block.
      if ($from.depth !== 1 || $from.parentOffset !== 0) return false;

      const currentIndex = $from.index(0);
      if (currentIndex <= 0) return false;

      const previousNode = doc.child(currentIndex - 1);
      if (previousNode.type.name !== 'codeBlock') return false;

      const language = resolveRichBlockLanguage(previousNode.attrs?.language, previousNode.textContent || '');
      if (!language) return false;

      let previousPos = 0;
      for (let index = 0; index < currentIndex - 1; index += 1) {
        previousPos += doc.child(index).nodeSize;
      }

      event.preventDefault();
      removeRichBlockAtPosition(previousPos, language);
      return true;
    },
    [removeRichBlockAtPosition]
  );

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!isReadMode);
  }, [editor, isReadMode]);

  useEffect(() => {
    if (!editor) return;

    const plugin = createRichPreviewPlugin({
      mode: isReadMode ? 'read' : 'edit',
      onApplyChart: applyChartSpecAtPosition,
      onApplyRaw: (position, language, nextRaw) => {
        applyRichBlockTextAtPosition(position, nextRaw);
        setLiveAnnouncement(`${getRichBlockLabel(language)} block updated.`);
      },
      onRemove: removeRichBlockAtPosition,
      onShellKeyDown: handleRichBlockShellKeyDown,
    });
    editor.registerPlugin(plugin);

    return () => {
      editor.unregisterPlugin(RICH_PREVIEW_PLUGIN_KEY);
    };
  }, [
    applyChartSpecAtPosition,
    applyRichBlockTextAtPosition,
    editor,
    handleRichBlockShellKeyDown,
    isReadMode,
    removeRichBlockAtPosition,
  ]);

  useEffect(() => {
    if (!editor) return;
    if (!isReadMode) {
      try {
        editor.unregisterPlugin(ARTIFACT_SEARCH_HIGHLIGHT_PLUGIN_KEY);
      } catch {
        // no-op
      }
      return;
    }

    const plugin = createArtifactSearchHighlightPlugin(searchQuery);
    editor.registerPlugin(plugin);
    return () => {
      try {
        editor.unregisterPlugin(ARTIFACT_SEARCH_HIGHLIGHT_PLUGIN_KEY);
      } catch {
        // no-op
      }
    };
  }, [editor, isReadMode, searchQuery]);

  useEffect(() => {
    const rootMap = readModeCommitPopoverRootsRef.current;
    teardownReadModeCommitPopovers(rootMap);

    if (!editor) {
      return;
    }

    const editorDom = editor.view.dom as HTMLElement;

    const anchorNodes = Array.from(editorDom.querySelectorAll<HTMLAnchorElement>('a[href]'));
    anchorNodes.forEach((anchorNode) => {
      const href = anchorNode.getAttribute('href') || '';

      if (href.startsWith('http')) {
        anchorNode.setAttribute('target', '_blank');
        anchorNode.setAttribute('rel', 'noopener noreferrer');
      } else {
        anchorNode.removeAttribute('target');
        anchorNode.removeAttribute('rel');
      }

      if (!isReadMode) return;

      if (!isDevelopmentArtifact || !commitDiffProjectPath) {
        return;
      }

      const commitHash = extractCommitHashFromHref(href);
      if (!commitHash) {
        return;
      }

      anchorNode.style.display = 'none';
      anchorNode.setAttribute('data-commit-link-hidden', 'true');

      const container = document.createElement('span');
      container.className = 'inline-flex items-baseline';
      anchorNode.insertAdjacentElement('afterend', container);

      const root = createRoot(container);
      rootMap.set(container, root);
      root.render(
        <CommitDiffPopover
          commitHash={commitHash}
          commitMessage={(anchorNode.textContent || '').trim()}
          projectPath={commitDiffProjectPath}
        />
      );
    });

    return () => {
      teardownReadModeCommitPopovers(rootMap);
    };
  }, [commitDiffProjectPath, editor, isDevelopmentArtifact, isReadMode, value]);

  if (!editor) {
    return null;
  }

  const insertBlockContent = (contentToInsert: string, editorInstance: TiptapEditor = editor) => {
    const fencedBlock = parseFencedCodeBlock(contentToInsert);
    if (fencedBlock) {
      editorInstance
        .chain()
        .focus()
        .insertContent([
          {
            type: 'codeBlock',
            attrs: { language: fencedBlock.language },
            ...(fencedBlock.body
              ? { content: [{ type: 'text', text: fencedBlock.body }] }
              : {}),
          },
          { type: 'paragraph' },
        ])
        .run();
      return;
    }

    editorInstance
      .chain()
      .focus()
      .insertContent(`${contentToInsert}\n\n`)
      .run();
  };

  const openInsertChartModal = () => {
    setIsChartModalOpen(true);
  };

  const handleInsertChartFence = (fence: string) => {
    insertBlockContent(fence);
    setLiveAnnouncement('Chart block inserted.');
  };

  const handleInsertTemplate = (template: string, editorInstance: TiptapEditor = editor) => {
    insertBlockContent(template, editorInstance);
  };

  const handleAttachAsset = async (editorInstance: TiptapEditor = editor) => {
    if (isAttachingAsset) return;

    setIsAttachingAsset(true);
    try {
      const result = await window.electronAPI.attachLocalAsset({
        artifactId: artifactId || draftAttachmentKeyRef.current,
        artifactFilePath,
      });
      if (result.canceled || !result.asset) {
        setLiveAnnouncement('Asset attachment canceled.');
        return;
      }

      insertBlockContent(result.asset.insertMarkdown, editorInstance);
      setLiveAnnouncement(`Attached ${result.asset.originalName}.`);
    } catch (error) {
      console.error('Failed to attach local asset', error);
      setLiveAnnouncement('Failed to attach asset.');
      toast.error(
        `Failed to attach asset: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsAttachingAsset(false);
    }
  };

  const runInsertCommand = (option: InsertCommandOption, editorInstance: TiptapEditor = editor) => {
    removeSlashTrigger(editorInstance);
    setSlashCommandState(null);
    setSelectedSlashIndex(0);
    slashSessionActiveRef.current = false;
    switch (option.id) {
      case 'attach-asset': {
        setLiveAnnouncement('Opening file picker for asset attachment.');
        void handleAttachAsset(editorInstance);
        break;
      }
      case 'insert-chart': {
        openInsertChartModal();
        setLiveAnnouncement('Chart insert dialog opened.');
        break;
      }
      case 'insert-mermaid': {
        handleInsertTemplate(MERMAID_TEMPLATE, editorInstance);
        setLiveAnnouncement('Mermaid template inserted.');
        break;
      }
      case 'insert-callout': {
        handleInsertTemplate(CALLOUT_TEMPLATE, editorInstance);
        setLiveAnnouncement('Callout template inserted.');
        break;
      }
      case 'insert-kpi': {
        handleInsertTemplate(KPI_TEMPLATE, editorInstance);
        setLiveAnnouncement('KPI template inserted.');
        break;
      }
      case 'insert-roadmap': {
        handleInsertTemplate(ROADMAP_TEMPLATE, editorInstance);
        setLiveAnnouncement('Roadmap template inserted.');
        break;
      }
      default:
        break;
    }
  };

  const handleInsertMenuQueryKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!slashCommandState || !editor) return;
    const options = filteredInsertCommands;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (options.length > 0) {
        setSelectedSlashIndex((current) => (current + 1) % options.length);
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (options.length > 0) {
        setSelectedSlashIndex((current) => (current - 1 + options.length) % options.length);
      }
      return;
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      if (options.length > 0) {
        event.preventDefault();
        const selected = options[selectedSlashIndex] || options[0];
        if (selected) {
          runInsertCommand(selected, editor);
        }
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      removeSlashTrigger(editor);
      setSlashCommandState(null);
      setSelectedSlashIndex(0);
      slashSessionActiveRef.current = false;
    }
  };

  const handleEditorSurfaceMouseDown = (event: ReactMouseEvent<HTMLElement>) => {
    if (isReadMode) return;
    if (!editor) return;
    if (event.button !== 0) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    const editorDom = editor.view.dom as HTMLElement;
    const lastElement = editorDom.lastElementChild as HTMLElement | null;
    const lastBottom = lastElement ? lastElement.getBoundingClientRect().bottom : null;
    const clickedInsideEditor = editorDom.contains(target);
    const clickedBelowContent = !lastElement || event.clientY >= (lastBottom ?? 0) - 1;
    const isInteractiveTarget = Boolean(
      target.closest(
        'button, input, textarea, select, a, [role="button"], [role="menuitem"], [data-insert-command-menu="true"]'
      )
    );

    if (isInteractiveTarget) {
      return;
    }

    if (!clickedInsideEditor) {
      event.preventDefault();
      editor.chain().focus('end').run();
      return;
    }

    // Any click below the last rendered editor child should continue at document end,
    // regardless of which descendant receives the event target.
    if (!clickedBelowContent) {
      return;
    }

    event.preventDefault();
    editor.chain().focus('end').run();
  };

  const editorModals = isReadMode
    ? null
    : (
      <>
        <InsertCommandMenu
          isOpen={Boolean(slashCommandState)}
          top={slashCommandState?.top || 0}
          left={slashCommandState?.left || 0}
          query={slashPaletteQuery}
          options={filteredInsertCommands}
          selectedIndex={selectedSlashIndex}
          onSelect={(option) => runInsertCommand(option)}
          onHighlight={(index) => setSelectedSlashIndex(index)}
          onQueryChange={(query) => setSlashPaletteQuery(query)}
          onQueryKeyDown={handleInsertMenuQueryKeyDown}
        />
        <ChartInsertModal
          isOpen={isChartModalOpen}
          onClose={() => {
            setIsChartModalOpen(false);
          }}
          onInsertChartFence={handleInsertChartFence}
          modalTitle="Insert Chart Block"
          modalSubtitle="Paste JSON/CSV/TSV data, map keys, and insert a valid chart fence."
          confirmLabel="Insert Chart"
        />
        <CommitDiffModal
          isOpen={Boolean(commitDiffRequest)}
          onClose={() => setCommitDiffRequest(null)}
          commitHash={commitDiffRequest?.commitHash || ''}
          commitMessage={commitDiffRequest?.commitMessage || ''}
          projectPath={commitDiffRequest?.projectPath || ''}
        />
      </>
    );

  // Editorial variant: refined typography for Editorial Dark theme
  if (isEditorial) {
    return (
      <div className={cn('h-full min-h-full flex flex-col', className)}>
        <p className="sr-only" role="status" aria-live="polite">
          {liveAnnouncement}
        </p>
        {!isReadMode && <FloatingToolbar editor={editor} />}
        <div
          className={cn(
            'flex-1 min-h-full min-h-[300px]',
            isReadMode ? 'cursor-default' : 'cursor-text'
          )}
          style={{ minHeight }}
          onMouseDownCapture={handleEditorSurfaceMouseDown}
        >
          <div
            className={
              measure === 'flush'
                ? 'w-full'
                : 'mx-auto w-full max-w-[112ch] px-4 sm:px-6 lg:px-8'
            }
          >
            <EditorContent editor={editor} className="tiptap h-full min-h-full" />
          </div>
        </div>
        {editorModals}
      </div>
    );
  }

  // Immersive variant: no container styling, full height, with floating toolbar
  if (isImmersive) {
    return (
      <div className={cn('h-full min-h-full flex flex-col', className)}>
        <p className="sr-only" role="status" aria-live="polite">
          {liveAnnouncement}
        </p>
        {!isReadMode && <FloatingToolbar editor={editor} />}
        <div
          className={cn(
            'flex-1 min-h-full min-h-[300px]',
            isReadMode ? 'cursor-default' : 'cursor-text'
          )}
          style={{ minHeight }}
          onMouseDownCapture={handleEditorSurfaceMouseDown}
        >
          <EditorContent editor={editor} className="tiptap h-full min-h-full" />
        </div>
        {editorModals}
      </div>
    );
  }

  // Default variant: chronicle-lifted-surface container with toolbar
  return (
    <div className={cn('chronicle-lifted-surface border border-border  rounded-lg overflow-hidden', className)}>
      <p className="sr-only" role="status" aria-live="polite">
        {liveAnnouncement}
      </p>
      {shouldShowToolbar && <Toolbar editor={editor} />}
      <div
        style={{ minHeight }}
        className={cn(
          'overflow-y-auto max-h-[600px]',
          isReadMode ? 'cursor-default' : 'cursor-text'
        )}
        onMouseDownCapture={handleEditorSurfaceMouseDown}
      >
        <EditorContent editor={editor} className="tiptap" />
      </div>
      {editorModals}
    </div>
  );
}
