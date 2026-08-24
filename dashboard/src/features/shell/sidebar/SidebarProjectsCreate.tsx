import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';
import type { Domain } from '../../../types/artifacts';
import { toProjectArtifactUrl } from '../../artifact-route/routeContract';
import { useCreateProject } from '../../projects/useCreateProject';
import {
  DEFAULT_PROJECT_DOMAIN,
  PROJECT_DOMAINS,
  canSubmitProject,
  isCommandSubmitKey,
} from '../../projects/projectCreateModel';

/**
 * Hover-revealed `+` on the Projects section header opening the quick-command
 * creation panel: a project name, a quiet domain control, one create action.
 * The domain picker expands inline — nesting a portal surface inside this
 * popover hits the portal pitfall documented in ProjectTaskContextMenu.
 * Escape and focus-return-to-trigger are owned by the Popover primitive.
 */
export function SidebarProjectsCreate() {
  const navigate = useNavigate();
  const { createProject, isPending } = useCreateProject();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState<Domain>(DEFAULT_PROJECT_DOMAIN);
  const [pickerOpen, setPickerOpen] = useState(false);
  const domainButtonRef = useRef<HTMLButtonElement | null>(null);
  const refocusDomainButton = useRef(false);

  // Choosing a domain unmounts the picker; hand focus back to the quiet
  // control so keyboard flow continues from where it started.
  useEffect(() => {
    if (!pickerOpen && refocusDomainButton.current) {
      refocusDomainButton.current = false;
      domainButtonRef.current?.focus();
    }
  }, [pickerOpen]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setTitle('');
      setDomain(DEFAULT_PROJECT_DOMAIN);
      setPickerOpen(false);
    }
  };

  const submit = async () => {
    if (!canSubmitProject(title, isPending)) return;
    const created = await createProject({ title: title.trim(), domain });
    // On failure the panel stays open with the entered values for retry.
    if (!created) return;
    handleOpenChange(false);
    navigate(toProjectArtifactUrl(created.id));
  };

  const chooseDomain = (choice: Domain) => {
    setDomain(choice);
    refocusDomainButton.current = true;
    setPickerOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button type="button" className="chronicle-section-add" aria-label="New project">
          <Plus className="h-3 w-3" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto">
        <form
          className="chronicle-project-create"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          onKeyDown={(event) => {
            if (isCommandSubmitKey(event)) {
              event.preventDefault();
              void submit();
            }
          }}
        >
          <Input
            autoFocus
            value={title}
            placeholder="Project name"
            aria-label="Project name"
            className="h-7 px-2 text-xs"
            onChange={(event) => setTitle(event.target.value)}
          />
          {pickerOpen ? (
            <div className="chronicle-project-create-domains" role="group" aria-label="Domain">
              {PROJECT_DOMAINS.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  autoFocus={choice === domain}
                  aria-pressed={domain === choice}
                  onClick={() => chooseDomain(choice)}
                  className={cn(
                    'chronicle-project-create-domain-option',
                    domain === choice && 'is-selected',
                  )}
                >
                  {choice}
                </button>
              ))}
            </div>
          ) : (
            <button
              ref={domainButtonRef}
              type="button"
              aria-expanded={false}
              aria-label={`Domain: ${domain}. Change domain`}
              className="chronicle-project-create-domain"
              onClick={() => setPickerOpen(true)}
            >
              <span className="chronicle-project-create-domain-key">Domain</span>
              <span className="chronicle-project-create-domain-value">{domain}</span>
            </button>
          )}
          <Button type="submit" size="sm" disabled={!canSubmitProject(title, isPending)}>
            Create project
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
