export interface OutlineHeading {
  id: string;
  text: string;
  level: number;
  index: number;
  parentId: string | null;
}

export interface OutlineNode {
  heading: OutlineHeading;
  children: OutlineNode[];
}

export function slugifyHeading(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildOutlineTree(headings: OutlineHeading[]): OutlineNode[] {
  const nodeById = new Map<string, OutlineNode>();
  headings.forEach((heading) => {
    nodeById.set(heading.id, { heading, children: [] });
  });

  const roots: OutlineNode[] = [];
  headings.forEach((heading) => {
    const node = nodeById.get(heading.id);
    if (!node) return;

    if (!heading.parentId) {
      roots.push(node);
      return;
    }

    const parent = nodeById.get(heading.parentId);
    if (parent) {
      parent.children.push(node);
      return;
    }

    roots.push(node);
  });

  return roots;
}
