import { useId, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Collapsible section component — boxless Chronicle section: serif title over
// a standard rule, quiet chevron. The icon prop is accepted for call-site
// compatibility but no longer rendered (no accent tiles).
interface CollapsibleSectionProps {
  title: string;
  icon?: React.ElementType;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({ title, description, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className="chronicle-settings-section">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="chronicle-settings-section-header"
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <div className="min-w-0 flex-1">
          <h3 className="chronicle-settings-section-title">{title}</h3>
          <p className="chronicle-settings-section-desc">{description}</p>
        </div>
        {isOpen ? (
          <ChevronUp className="chronicle-settings-section-chevron h-4 w-4" />
        ) : (
          <ChevronDown className="chronicle-settings-section-chevron h-4 w-4" />
        )}
      </button>

      {isOpen && (
        <div id={contentId} role="region" aria-label={title} className="chronicle-settings-section-body">
          {children}
        </div>
      )}
    </section>
  );
}

// Reusable setting row component
interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-6 py-3 border-b border-[var(--rule-faint)] last:border-b-0">
      <div className="flex-1 pr-4">
        <div className="text-sm text-foreground">{label}</div>
        {description && (
          <div className="text-xs mt-1 text-muted-foreground">{description}</div>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
