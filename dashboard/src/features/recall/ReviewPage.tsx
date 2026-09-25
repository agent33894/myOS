import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowUpRight, Brain, Eye, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { formatLocalDate, parseLocalDate } from '@shared/date';
import { schedule, type RecallAnswer } from '@shared/recall';
import type { ArtifactSummary } from '@shared/types';
import { paths, toItemUrl } from '../../app/navigation';
import { read } from '../../data/gateway';
import { answerReview } from '../../data/planning';
import { useDataStatus, useReviewQueue } from '../../data/selectors';
import { useDataStore } from '../../data/store';
import { Editor } from '../../editor';
import { Button, EmptyState, Icon, Kbd, LoadingState, PageHeader, PageLayout, Textarea, cn } from '../../ui';
import { kindLabel } from '../../lib/itemKinds';
import { useProjectRefs } from '../tasks/projectRefs';

const ANSWERS: Array<{ answer: RecallAnswer; label: string; key: string }> = [
  { answer: 'again', label: 'Again', key: '1' },
  { answer: 'hard', label: 'Hard', key: '2' },
  { answer: 'good', label: 'Good', key: '3' },
  { answer: 'easy', label: 'Easy', key: '4' },
];

const days = (count: number) => (count === 1 ? 'Tomorrow' : `${count} days`);
const typing = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName));

function NoteBody({ note }: { note: ArtifactSummary }) {
  const [body, setBody] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    read(note.filePath)
      .then((file) => live && setBody(file.content))
      .catch(() => live && setBody(''));
    return () => {
      live = false;
    };
  }, [note.filePath]);
  if (body === null) return <LoadingState rows={4} />;
  if (!body.trim()) return <p className="text-base text-text-tertiary">This note has no text yet.</p>;
  return <Editor readOnly value={body} onChange={() => undefined} artifact={{ id: note.id, filePath: note.filePath, type: note.type }} findSlot={null} />;
}

interface Reviewed {
  note: ArtifactSummary;
  next: string;
}

function Card({ note, onAnswer }: { note: ArtifactSummary; onAnswer: (answer: RecallAnswer) => void }) {
  const navigate = useNavigate();
  const project = useProjectRefs().find(note.project);
  const [revealed, setRevealed] = useState(false);
  const [recall, setRecall] = useState('');
  const today = formatLocalDate();
  const meta = [kindLabel(note.type), project?.title].filter(Boolean).join(' · ');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        if (!revealed && event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          setRevealed(true);
        }
        return;
      }
      if (typing(event.target) || document.querySelector('[role="dialog"]')) return;
      if (!revealed && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault();
        setRevealed(true);
      } else if (revealed) {
        const choice = ANSWERS.find((entry) => entry.key === event.key);
        if (choice) {
          event.preventDefault();
          onAnswer(choice.answer);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [revealed, onAnswer]);

  return (
    <article aria-label={note.title} className="flex animate-slide-up flex-col rounded-xl bg-raised p-8 shadow-raised">
      {meta ? <p className="text-sm text-text-tertiary">{meta}</p> : null}
      <h2 className="mt-1 text-2xl font-semibold text-text">{note.title || 'Untitled'}</h2>

      {revealed ? (
        <>
          {recall.trim() ? (
            <div className="mt-6 rounded-lg bg-sunken px-4 py-3">
              <p className="text-xs font-medium text-text-secondary">What you remembered</p>
              <p className="mt-1 whitespace-pre-wrap text-base text-text">{recall.trim()}</p>
            </div>
          ) : null}
          <div className="mt-6 border-t border-border pt-6">
            <NoteBody note={note} />
          </div>
          <div className="mt-8 flex flex-col gap-3">
            <p className="text-sm text-text-secondary">How well did you remember it?</p>
            <div role="group" aria-label="How well did you remember it?" className="grid grid-cols-4 gap-2">
              {ANSWERS.map(({ answer, label, key }) => {
                const next = schedule(answer, note.reviewInterval, today).reviewInterval;
                return (
                  <Button
                    key={answer}
                    variant={answer === 'good' ? 'primary' : 'secondary'}
                    onClick={() => onAnswer(answer)}
                    aria-keyshortcuts={key}
                    className="h-auto flex-col gap-0.5 py-3"
                  >
                    <span className="flex items-center gap-2">
                      {label}
                      <Kbd shortcut={key} className={cn('bg-transparent', answer === 'good' && 'text-accent-on')} />
                    </span>
                    <span className={cn('text-xs font-normal', answer === 'good' ? 'text-accent-on' : 'text-text-tertiary')}>{days(next)}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="mt-6 text-md text-text-secondary">What do you remember?</p>
          <Textarea
            autoFocus
            value={recall}
            onChange={(event) => setRecall(event.target.value)}
            rows={4}
            placeholder="Put it in your own words first, if you like. This stays here and isn’t saved."
            aria-label="What you remember, in your own words"
            className="mt-3 bg-canvas"
          />
          <div className="mt-6 flex items-center gap-3">
            <Button variant="primary" leadingIcon={Eye} onClick={() => setRevealed(true)}>
              Show note
            </Button>
            <Kbd shortcut="mod+enter" />
            <Button variant="ghost" size="sm" className="ml-auto" leadingIcon={ArrowUpRight} onClick={() => navigate(toItemUrl(note))}>
              Open note
            </Button>
          </div>
        </>
      )}
    </article>
  );
}

function Finished({ reviewed }: { reviewed: Reviewed[] }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <EmptyState
        icon={Sparkles}
        title="All caught up."
        description={`You recalled ${reviewed.length === 1 ? 'one note' : `${reviewed.length} notes`}. Each comes back when it’s time.`}
        action={<Button onClick={() => navigate(paths.notes)}>Back to notes</Button>}
        className="py-4"
      />
      <ul aria-label="Reviewed" className="flex w-full max-w-md flex-col gap-0.5 rounded-lg bg-raised p-2 shadow-raised">
        {reviewed.map(({ note, next }) => (
          <li key={note.filePath} className="flex h-9 items-center gap-3 rounded-md px-3 text-base">
            <Icon icon={Brain} className="text-text-tertiary" />
            <span className="min-w-0 flex-1 truncate text-text">{note.title}</span>
            <span className="shrink-0 text-sm text-text-tertiary">Next {format(parseLocalDate(next), 'MMM d')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The review queue: up to ten notes a day, title first. Recall, reveal, and
 * answer; the next review stretches or shrinks with the answer. Skipping
 * costs nothing and nothing piles up.
 */
export default function ReviewPage() {
  const status = useDataStatus();
  const queue = useReviewQueue();
  const byPath = useDataStore((state) => state.byPath);
  // The session is fixed when it starts, so answering never reshuffles the cards.
  const [session, setSession] = useState<string[] | null>(null);
  const [reviewed, setReviewed] = useState<Reviewed[]>([]);

  useEffect(() => {
    if (session === null && status === 'ready') setSession(queue.map((note) => note.filePath));
  }, [status, session, queue]);

  const remaining = useMemo(
    () => (session ?? []).filter((path) => byPath[path] && !reviewed.some((entry) => entry.note.filePath === path)),
    [session, byPath, reviewed],
  );
  const current = remaining[0] ? byPath[remaining[0]] : undefined;
  const total = reviewed.length + remaining.length;

  const answer = useMemo(
    () => (value: RecallAnswer) => {
      if (!current) return;
      const next = schedule(value, current.reviewInterval, formatLocalDate()).review;
      setReviewed((done) => [...done, { note: current, next }]);
      answerReview(current, value).catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'Could not save that answer'),
      );
    },
    [current],
  );

  return (
    <PageLayout className="gap-8">
      <PageHeader
        className="px-2"
        title="Review"
        subtitle={session && total > 0 && current ? `${reviewed.length + 1} of ${total}` : 'Recall a few notes in your own words.'}
      />
      {current ? (
        <div
          role="progressbar"
          aria-label="Review progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={reviewed.length}
          className="-mt-4 mx-2 flex h-1 gap-1"
        >
          {Array.from({ length: total }, (_, index) => (
            <span
              key={index}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-slow',
                index < reviewed.length ? 'bg-accent' : index === reviewed.length ? 'bg-accent-soft' : 'bg-text/5',
              )}
            />
          ))}
        </div>
      ) : null}

      {session === null ? (
        <LoadingState rows={4} />
      ) : current ? (
        <Card key={current.filePath} note={current} onAnswer={answer} />
      ) : reviewed.length > 0 ? (
        <Finished reviewed={reviewed} />
      ) : (
        <EmptyState
          icon={Brain}
          title="Nothing to review today."
          description="Choose Review this note on any note. It comes back here after a day, then at widening intervals."
        />
      )}
    </PageLayout>
  );
}
