import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ListChecks, RefreshCw, Settings2 } from 'lucide-react';
import { toMailUrl, toSettingsUrl } from '../../app/navigation';
import { checkMail } from '../../data/mail';
import type { Command } from '../palette/usePaletteCommands';

export function useMailCommands(): Command[] {
  const navigate = useNavigate();
  return useMemo(
    () => [
      {
        id: 'mail-check',
        group: 'Actions' as const,
        label: 'Check mail now',
        icon: RefreshCw,
        keywords: 'email sync inbox refresh',
        run: () =>
          void checkMail()
            .then((status) => toast(status.lastSummary ?? 'Checked'))
            .catch((error: Error) => toast.error(error.message)),
      },
      { id: 'mail-go', group: 'Actions' as const, label: 'Go through mail', icon: ListChecks, keywords: 'email triage process', run: () => navigate(toMailUrl({ go: true })) },
      { id: 'mail-settings', group: 'Actions' as const, label: 'Mail settings', icon: Settings2, keywords: 'email accounts rules assistant', run: () => navigate(toSettingsUrl('mail')) },
    ],
    [navigate],
  );
}
