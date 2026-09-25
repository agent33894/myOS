import { useState } from 'react';
import { Footprints, Plus } from 'lucide-react';
import type { ProjectWithStats } from '../../data/projects';
import { Button, Input, Popover, PopoverContent, PopoverTrigger, Property } from '../../ui';
import { attempt, toastWithUndo } from '../tasks/actions';
import { makeTaskFromNext, nextIsTask, setNextStep } from './nextStep';

/**
 * A project's next step: one line, in your words. It shows on the project
 * card and in Today under "Next steps", where one click makes it a task.
 */
export function NextStepProperty({ project }: { project: ProjectWithStats }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(project.next ?? '');
  const isTask = nextIsTask(project);

  const save = () => {
    if (value.trim() !== (project.next ?? '')) attempt(setNextStep(project, value));
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setValue(project.next ?? '');
      }}
    >
      <PopoverTrigger asChild>
        <Property icon={Footprints} label="Next step" placeholder="Next step" className="max-w-md">
          {project.next}
        </Property>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-96 flex-col gap-3">
        <Input
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              save();
            }
          }}
          placeholder="The very next thing to do"
          aria-label="Next step"
        />
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 text-xs text-text-tertiary">
            {isTask ? 'This next step is already a task.' : 'Shown on Today under Next steps.'}
          </p>
          {project.next && !isTask ? (
            <Button
              size="sm"
              variant="ghost"
              leadingIcon={Plus}
              onClick={() => {
                setOpen(false);
                attempt(makeTaskFromNext(project).then(() => toastWithUndo('Made a task')));
              }}
            >
              Make task
            </Button>
          ) : null}
          <Button size="sm" variant="primary" onClick={save}>
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
