import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react';
import { computeScrollTopForHeading, resolveOutlineScrollBehavior } from './outlineScroll';
import { buildOutlineTree, slugifyHeading, type OutlineHeading, type OutlineNode } from './outlineTree';

export interface OutlineState {
  headings: OutlineHeading[];
  tree: OutlineNode[];
  activeHeadingId: string | null;
  collapsedNodes: Record<string, boolean>;
  hasHeadings: boolean;
  toggleNode: (id: string) => void;
  selectHeading: (heading: OutlineHeading) => void;
}

interface UseOutlineHeadingsParams {
  content: string;
  title: string;
  enabled: boolean;
  contentRootRef: RefObject<HTMLElement | null>;
  getScrollContainer: () => HTMLElement | null;
  scrollOffset?: number;
}

/**
 * Extracts the document outline from the rendered heading elements, keeps a
 * scroll-spy active heading, and manages per-node collapse. Shared by the
 * artifact workspace canvas and the Living Page pane — the two differ only in
 * which scroll container they hand over.
 */
export function useOutlineHeadings({
  content,
  title,
  enabled,
  contentRootRef,
  getScrollContainer,
  scrollOffset = 96,
}: UseOutlineHeadingsParams): OutlineState {
  const [headings, setHeadings] = useState<OutlineHeading[]>([]);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [domVersion, setDomVersion] = useState(0);
  const hasHeadings = enabled && headings.length > 0;

  // The editor initializes asynchronously (TipTap immediatelyRender: false),
  // so heading elements can appear after the content-keyed extraction already
  // ran. Follow the actual DOM: childList/characterData only — extraction
  // assigns element ids (attribute mutations), which must not loop back here.
  useEffect(() => {
    if (!enabled) return;
    const root = contentRootRef.current;
    if (!root) return;
    const observer = new MutationObserver(() => {
      setDomVersion((version) => version + 1);
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [enabled, contentRootRef]);

  useEffect(() => {
    if (!enabled) {
      setHeadings([]);
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const root = contentRootRef.current;
      if (!root) {
        setHeadings([]);
        return;
      }

      const headingElements = Array.from(root.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6'))
        .filter((element) => (element.textContent ?? '').trim().length > 0);

      if (headingElements.length === 0) {
        setHeadings([]);
        return;
      }

      const slugCounts = new Map<string, number>();
      const idCounts = new Map<string, number>();
      const ancestorStack: Array<{ id: string; level: number }> = [];

      const extracted = headingElements.map((element, index) => {
        const level = Number.parseInt(element.tagName.replace('H', ''), 10);
        const text = (element.textContent ?? '').trim();

        while (
          ancestorStack.length > 0 &&
          ancestorStack[ancestorStack.length - 1] &&
          ancestorStack[ancestorStack.length - 1].level >= level
        ) {
          ancestorStack.pop();
        }

        const parent = ancestorStack.length > 0 ? ancestorStack[ancestorStack.length - 1] : null;
        const baseSlug = slugifyHeading(text) || `section-${index + 1}`;
        const slugOccurrence = (slugCounts.get(baseSlug) ?? 0) + 1;
        slugCounts.set(baseSlug, slugOccurrence);

        const fallbackId = `editor-outline-${baseSlug}${slugOccurrence > 1 ? `-${slugOccurrence}` : ''}`;
        const preferredId = element.id?.trim() || fallbackId;
        const idOccurrence = (idCounts.get(preferredId) ?? 0) + 1;
        idCounts.set(preferredId, idOccurrence);
        const id = idOccurrence > 1 ? `${preferredId}-${idOccurrence}` : preferredId;
        element.id = id;

        const heading: OutlineHeading = {
          id,
          text,
          level,
          index,
          parentId: parent?.id ?? null,
        };

        ancestorStack.push({ id, level });
        return heading;
      });

      const normalizedTitle = title.trim().toLowerCase();
      const filtered = extracted.filter((heading, index) => !(
        index === 0 &&
        normalizedTitle.length > 0 &&
        heading.text.toLowerCase() === normalizedTitle
      ));

      setHeadings(filtered);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [content, enabled, title, contentRootRef, domVersion]);

  useEffect(() => {
    const allowedIds = new Set(headings.map((heading) => heading.id));
    setCollapsedNodes((previous) => {
      const next: Record<string, boolean> = {};
      let changed = false;

      Object.entries(previous).forEach(([id, collapsed]) => {
        if (allowedIds.has(id)) {
          next[id] = collapsed;
        } else {
          changed = true;
        }
      });

      return changed ? next : previous;
    });
  }, [headings]);

  useEffect(() => {
    if (hasHeadings) return;
    setActiveHeadingId(null);
  }, [hasHeadings]);

  const headingsById = useMemo(
    () => new Map(headings.map((heading) => [heading.id, heading])),
    [headings]
  );

  const tree = useMemo(() => buildOutlineTree(headings), [headings]);

  const getHeadingElementByIndex = useCallback((heading: OutlineHeading): HTMLElement | null => {
    const root = contentRootRef.current;
    if (!root) return null;

    const headingElements = Array.from(root.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6'))
      .filter((element) => (element.textContent ?? '').trim().length > 0);

    const target = headingElements[heading.index];
    if (!target) return null;

    target.style.scrollMarginTop = `${scrollOffset}px`;
    return target;
  }, [contentRootRef, scrollOffset]);

  const selectHeading = useCallback((heading: OutlineHeading) => {
    const element = getHeadingElementByIndex(heading);
    if (!element) return;

    setActiveHeadingId(heading.id);
    const scrollContainer = getScrollContainer();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior = resolveOutlineScrollBehavior(reducedMotion);

    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: computeScrollTopForHeading(scrollContainer, element, scrollOffset),
        behavior,
      });
      return;
    }

    element.scrollIntoView({
      behavior,
      block: 'start',
      inline: 'nearest',
    });
  }, [getScrollContainer, getHeadingElementByIndex, scrollOffset]);

  useEffect(() => {
    if (!hasHeadings) return;
    const scrollContainer = getScrollContainer();
    let rafId = 0;

    const evaluateActiveHeading = () => {
      let topmostVisible: OutlineHeading | null = null;
      let minimumVisibleTop = Number.POSITIVE_INFINITY;
      let lastAboveThreshold: OutlineHeading | null = null;
      const containerRect = scrollContainer?.getBoundingClientRect();

      headings.forEach((heading) => {
        const element = getHeadingElementByIndex(heading);
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const top = containerRect ? rect.top - containerRect.top : rect.top;
        const bottom = containerRect ? rect.bottom - containerRect.top : rect.bottom;

        if (top <= scrollOffset) {
          lastAboveThreshold = heading;
        }

        const visibleNearTop = top >= scrollOffset && bottom > scrollOffset;
        if (!visibleNearTop) return;

        if (top < minimumVisibleTop) {
          minimumVisibleTop = top;
          topmostVisible = heading;
        }
      });

      const nextActive = (topmostVisible ?? lastAboveThreshold ?? headings[0] ?? null)?.id ?? null;
      setActiveHeadingId((current) => (current === nextActive ? current : nextActive));
    };

    const queueEvaluation = () => {
      window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(evaluateActiveHeading);
    };

    queueEvaluation();
    const scrollTarget: EventTarget = scrollContainer ?? window;
    scrollTarget.addEventListener('scroll', queueEvaluation, { passive: true });
    window.addEventListener('resize', queueEvaluation);

    return () => {
      window.cancelAnimationFrame(rafId);
      scrollTarget.removeEventListener('scroll', queueEvaluation);
      window.removeEventListener('resize', queueEvaluation);
    };
  }, [getScrollContainer, getHeadingElementByIndex, hasHeadings, headings, scrollOffset]);

  useEffect(() => {
    if (!activeHeadingId) return;

    setCollapsedNodes((previous) => {
      let changed = false;
      const next = { ...previous };
      let parentId = headingsById.get(activeHeadingId)?.parentId ?? null;

      while (parentId) {
        if (next[parentId]) {
          next[parentId] = false;
          changed = true;
        }
        parentId = headingsById.get(parentId)?.parentId ?? null;
      }

      return changed ? next : previous;
    });
  }, [activeHeadingId, headingsById]);

  const toggleNode = useCallback((id: string) => {
    setCollapsedNodes((previous) => ({
      ...previous,
      [id]: !(previous[id] ?? false),
    }));
  }, []);

  return {
    headings,
    tree,
    activeHeadingId,
    collapsedNodes,
    hasHeadings,
    toggleNode,
    selectHeading,
  };
}
