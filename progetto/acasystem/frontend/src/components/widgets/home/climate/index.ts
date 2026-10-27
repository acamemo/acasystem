import type { WidgetDefinition } from '@/@types/launcher';
import type { IconName } from '@/components/primitives';
import { ClimateConsole } from './ClimateConsole';
import { ClimateDetails } from './ClimateDetails';
import { ClimateWidget } from './ClimateWidget';

/** Legacy prefix `climate_card_`, settings `climateId`, `tapAction`, `climateFavoriteModes`. */
export const climateWidget: WidgetDefinition = {
  type: 'climate',
  label: 'Clima',
  icon: 'thermostat' satisfies IconName,
  sizes: { min: { w: 2, h: 1 }, max: { w: 2, h: 2 }, default: { w: 2, h: 2 } },
  matches: (id) => id.startsWith('climate_card_'),
  Widget: ClimateWidget,
  Details: ClimateDetails,
  Console: ClimateConsole,
};
