import type { WidgetDefinition } from '@/@types/launcher';
import type { IconName } from '@/components/primitives';
import { ClockWidget, DateWidget, HomeWeatherWidget } from './CoverWidgets';

/*
 * Cards of the cover as widgets (REP-20261007-030). Ids by prefix: the cover starts with
 * `cover_clock`, `cover_calendar` and `cover_weather`; the ones added later get a timestamp
 * (`cover_clock_<ms>`). They draw their own card, so the launcher frame is left out.
 */

export const coverClockWidget: WidgetDefinition = {
  type: 'cover_clock',
  label: 'Orologio',
  icon: 'clock' satisfies IconName,
  frameless: true,
  sizes: { min: { w: 1, h: 1 }, max: { w: 3, h: 3 }, default: { w: 2, h: 2 } },
  matches: (id) => id.startsWith('cover_clock'),
  Widget: ClockWidget,
};

export const coverCalendarWidget: WidgetDefinition = {
  type: 'cover_calendar',
  label: 'Data',
  icon: 'text' satisfies IconName,
  frameless: true,
  sizes: { min: { w: 1, h: 1 }, max: { w: 3, h: 3 }, default: { w: 2, h: 2 } },
  matches: (id) => id.startsWith('cover_calendar'),
  Widget: DateWidget,
};

export const coverWeatherWidget: WidgetDefinition = {
  type: 'cover_weather',
  label: 'Meteo di casa',
  icon: 'sun' satisfies IconName,
  frameless: true,
  sizes: { min: { w: 1, h: 1 }, max: { w: 4, h: 3 }, default: { w: 2, h: 2 } },
  matches: (id) => id.startsWith('cover_weather'),
  Widget: HomeWeatherWidget,
};

/** The cover group, matched before the others (their ids never collide). */
export const coverWidgets: WidgetDefinition[] = [
  coverClockWidget,
  coverCalendarWidget,
  coverWeatherWidget,
];
