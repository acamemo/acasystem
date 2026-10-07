import type { WidgetDefinition } from '@/@types/launcher';
import type { IconName } from '@/components/primitives';
import { TodoDetails } from './TodoDetails';
import { TodoWidget } from './TodoWidget';

/** Legacy prefix `todo_card_`, settings `todoEntityId` and `name`. */
export const todoWidget: WidgetDefinition = {
  type: 'todo',
  label: 'Attività',
  icon: 'task' satisfies IconName,
  sizes: { min: { w: 2, h: 1 }, max: { w: 2, h: 4 }, default: { w: 2, h: 2 } },
  matches: (id) => id.startsWith('todo_card_'),
  Widget: TodoWidget,
  Details: TodoDetails,
};
