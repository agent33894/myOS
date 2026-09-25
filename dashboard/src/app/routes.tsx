import { lazy, type ComponentType } from 'react';
import { TodayScreen } from '../features/today/TodayScreen';
import { NoteRoute } from './NoteRoute';
import { paths } from './navigation';

const TasksScreen = lazy(() => import('../features/tasks/TasksScreen'));
const ViewScreen = lazy(() => import('../features/views/ViewScreen'));
const SettingsScreen = lazy(() => import('../features/settings/SettingsScreen'));

/** The screens the router knows. `/` goes to Today. */
export const APP_ROUTES: ReadonlyArray<{ path: string; component: ComponentType }> = [
  { path: paths.today, component: TodayScreen },
  { path: paths.tasks, component: TasksScreen },
  { path: `${paths.view}/:id`, component: ViewScreen },
  { path: paths.note, component: NoteRoute },
  { path: paths.settings, component: SettingsScreen },
];
