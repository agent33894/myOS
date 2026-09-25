import { Fragment } from 'react';
import { MenuItem, MenuLabel, MenuSeparator } from '../../ui';
import { EXPORT_ACTIONS, type Flush } from './actions';

/**
 * @public Export items for a note's ⋯ menu (B2 mounts it inside `MenuContent`, after a `MenuSeparator`):
 * PDF, HTML, and copy as Markdown or rich text. Pass the editor's `saveNow`
 * as `flush` so unsaved typing is included.
 */
export function ExportMenuItems({ path, flush }: { path: string; flush?: Flush }) {
  return (
    <>
      <MenuLabel>Export</MenuLabel>
      {EXPORT_ACTIONS.map((action, index) => (
        <Fragment key={action.id}>
          {index === 2 ? <MenuSeparator /> : null}
          <MenuItem icon={action.icon} onSelect={() => action.run(path, flush)}>
            {action.label}
          </MenuItem>
        </Fragment>
      ))}
    </>
  );
}
