import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Hash } from 'lucide-react';
import type { ArtifactSummary } from '@shared/types';
import { toTagUrl } from '../../app/navigation';
import { patch } from '../../data/gateway';
import { Input, Pill, Property } from '../../ui';
import { attempt } from '../tasks/actions';

const parseTags = (text: string) =>
  text
    .split(/[\s,]+/)
    .map((tag) => tag.replace(/^#/, '').trim().toLowerCase())
    .filter(Boolean);

/** Tags as pills that open their tag page, with remove buttons, plus an inline field to add more. */
export function TagEditor({ item }: { item: ArtifactSummary }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');

  const save = (tags: string[]) => attempt(patch(item.filePath, { tags }, `Change tags on “${item.title}”`));
  const commit = () => {
    const added = parseTags(text).filter((tag) => !item.tags.includes(tag));
    if (added.length > 0) save([...item.tags, ...added]);
    setText('');
    setAdding(false);
  };

  return (
    <>
      {item.tags.map((tag) => (
        <Pill
          key={tag}
          onRemove={() => save(item.tags.filter((other) => other !== tag))}
          removeLabel={`Remove tag ${tag}`}
          className="h-6"
        >
          <Link
            to={toTagUrl(tag)}
            className="rounded-sm outline-none transition-colors duration-fast hover:text-text focus-visible:ring-2 focus-visible:ring-focus"
          >
            #{tag}
          </Link>
        </Pill>
      ))}
      {adding ? (
        <Input
          autoFocus
          size="sm"
          variant="ghost"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit();
            if (event.key === 'Escape') {
              event.stopPropagation();
              setText('');
              setAdding(false);
            }
          }}
          placeholder="tag"
          aria-label="New tag"
          className="w-28 px-2"
        />
      ) : (
        <Property icon={Hash} label="Add tag" placeholder={item.tags.length ? 'Add' : 'Tags'} onClick={() => setAdding(true)} />
      )}
    </>
  );
}
