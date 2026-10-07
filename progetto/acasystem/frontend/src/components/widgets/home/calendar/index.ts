import type { WidgetDefinition } from '@/@types/launcher';
import type { IconName } from '@/components/primitives';
import { CalendarDetails } from './CalendarDetails';
import { CalendarWidget } from './CalendarWidget';

/** Legacy prefix `calendar_card_`, settings `calendars` and `name`; the sheet keeps its selection. */
export const calendarWidget: WidgetDefinition = {
  type: 'calendar',
  label: 'Calendario',
  icon: 'calendar' satisfies IconName,
  sizes: { min: { w: 2, h: 1 }, max: { w: 4, h: 4 }, default: { w: 2, h: 2 } },
  matches: (id) => id.startsWith('calendar_card_'),
  Widget: CalendarWidget,
  Details: CalendarDetails,
};
