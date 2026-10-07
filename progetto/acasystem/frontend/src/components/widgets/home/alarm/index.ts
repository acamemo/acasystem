import type { WidgetDefinition } from '@/@types/launcher';
import type { IconName } from '@/components/primitives';
import { AlarmDetails } from './AlarmDetails';
import { AlarmWidget } from './AlarmWidget';

/** Legacy prefix `alarm_card_`, setting `alarmId`; the PIN is typed in the detail sheet only. */
export const alarmWidget: WidgetDefinition = {
  type: 'alarm',
  label: 'Allarme',
  icon: 'shield' satisfies IconName,
  sizes: { min: { w: 2, h: 1 }, max: { w: 2, h: 2 }, default: { w: 2, h: 2 } },
  matches: (id) => id.startsWith('alarm_card_'),
  Widget: AlarmWidget,
  Details: AlarmDetails,
};
