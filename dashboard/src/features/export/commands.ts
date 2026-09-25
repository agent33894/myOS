import type { CommandSource } from '../../app/commands';
import { EXPORT_ACTIONS } from './actions';

/** Export and copy the open note. */
export const exportCommands: CommandSource = ({ activePath: path }) =>
  path ? EXPORT_ACTIONS.map(({ id, label, icon, keywords, run }) => ({ id, group: 'Note', label, icon, keywords, run: () => run(path) })) : [];
