import type { PageKindDefinition, WidgetDefinition } from '@/@types/launcher';
import { alarmWidget } from './alarm';
import { calendarWidget } from './calendar';
import { climateWidget } from './climate';
import { todoWidget } from './todo';
import { weatherWidget } from './weather';

/**
 * Comfort and home widgets (wave 2, B3): climate, weather, calendar, to-do, alarm.
 * Matched by the legacy card id prefixes; the person widget does not exist (people live in the
 * status bar).
 */
export const homeWidgets: WidgetDefinition[] = [
  climateWidget,
  weatherWidget,
  calendarWidget,
  todoWidget,
  alarmWidget,
];

/** No full-page kinds in this group. */
export const homePages: PageKindDefinition[] = [];
