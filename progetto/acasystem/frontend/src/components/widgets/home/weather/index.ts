import type { WidgetDefinition } from '@/@types/launcher';
import type { IconName } from '@/components/primitives';
import { WeatherDetails } from './WeatherDetails';
import { WeatherWidget } from './WeatherWidget';

/** Legacy prefix `weather_temp_`, settings `weatherId`, `tempId`, `subtitle`, `graphHistoryHours`. */
export const weatherWidget: WidgetDefinition = {
  type: 'weather',
  label: 'Meteo',
  icon: 'weather' satisfies IconName,
  sizes: { min: { w: 2, h: 1 }, max: { w: 4, h: 2 }, default: { w: 2, h: 2 } },
  matches: (id) => id.startsWith('weather_temp_'),
  Widget: WeatherWidget,
  Details: WeatherDetails,
};
