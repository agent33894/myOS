import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Hash, LayoutTemplate, Maximize2 } from 'lucide-react';
import { paths, toTagUrl } from '../../app/navigation';
import { useReviewQueue } from '../../data/selectors';
import type { Command } from '../palette/usePaletteCommands';
import { useTags } from '../tags/useTags';
import { FOCUS_SHORTCUT, toggleFocusMode } from './KnowledgeLayer';
import { openTemplatePicker } from './store';

/**
 * Palette commands for notes and knowledge. Every tag is a search-only
 * command labelled `#tag`, so typing `#` and a few letters jumps to its page.
 */
export function useKnowledgeCommands(): Command[] {
  const navigate = useNavigate();
  const due = useReviewQueue().length;
  const tags = useTags();

  return useMemo(() => {
    const actions: Command[] = [
      {
        id: 'review-notes',
        group: 'Actions',
        label: due > 0 ? `Review notes · ${due}` : 'Review notes',
        icon: Brain,
        keywords: 'recall spaced repetition remember study',
        run: () => navigate(paths.review),
      },
      {
        id: 'new-from-template',
        group: 'Actions',
        label: 'New from template…',
        icon: LayoutTemplate,
        keywords: 'template meeting notes lecture weekly plan project brief',
        run: () => openTemplatePicker(),
      },
      {
        id: 'focus-mode',
        group: 'Actions',
        label: 'Focus mode',
        icon: Maximize2,
        shortcut: FOCUS_SHORTCUT,
        keywords: 'distraction free writing typewriter zen',
        run: toggleFocusMode,
      },
    ];
    const tagPages: Command[] = tags.map(({ tag }) => ({
      id: `tag-${tag}`,
      group: 'Go to',
      label: `#${tag}`,
      icon: Hash,
      keywords: 'tag',
      searchOnly: true,
      run: () => navigate(toTagUrl(tag)),
    }));
    return [...actions, ...tagPages];
  }, [navigate, due, tags]);
}
