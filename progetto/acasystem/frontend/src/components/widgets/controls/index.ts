import type { CardSettings } from '@/@types/dashboard';
import type { PageKindDefinition, WidgetDefinition } from '@/@types/launcher';
import type { IconName } from '@/components/primitives';
import { AutomationDetails, AutomationWidget } from './automation/AutomationWidget';
import { CoverDetails } from './cover/CoverDetails';
import { CoverWidget } from './cover/CoverWidget';
import { FanDetails } from './fan/FanDetails';
import { FanWidget } from './fan/FanWidget';
import { LightDetails } from './light/LightDetails';
import { LightsPage } from './light/LightsPage';
import { LightWidget } from './light/LightWidget';
import { LockDetails } from './lock/LockDetails';
import { LockWidget } from './lock/LockWidget';
import { SensorDetails } from './sensor/SensorDetails';
import { SensorWidget } from './sensor/SensorWidget';

/** Generic types that the legacy registry renders with the SensorCard. */
const SENSOR_TYPES: ReadonlySet<unknown> = new Set(['sensor', 'entity', 'toggle']);
const isSensorType = (settings: CardSettings) => SENSOR_TYPES.has(settings.type);

export const lightWidget: WidgetDefinition = {
  type: 'light',
  label: 'Luce',
  icon: 'light' satisfies IconName,
  sizes: { min: { w: 1, h: 1 }, max: { w: 2, h: 2 }, default: { w: 1, h: 1 } },
  matches: (id) => id.startsWith('light_') || id.startsWith('light.'),
  Widget: LightWidget,
  Details: LightDetails,
};

export const lockWidget: WidgetDefinition = {
  type: 'lock',
  label: 'Serratura',
  icon: 'lock' satisfies IconName,
  sizes: { min: { w: 1, h: 1 }, max: { w: 2, h: 2 }, default: { w: 2, h: 1 } },
  matches: (id) => id.startsWith('lock_card_') || id.startsWith('lock.'),
  Widget: LockWidget,
  Details: LockDetails,
};

export const fanWidget: WidgetDefinition = {
  type: 'fan',
  label: 'Ventilatore',
  icon: 'fan' satisfies IconName,
  sizes: { min: { w: 1, h: 1 }, max: { w: 2, h: 2 }, default: { w: 2, h: 1 } },
  matches: (id) => id.startsWith('fan.'),
  Widget: FanWidget,
  Details: FanDetails,
};

export const coverWidget: WidgetDefinition = {
  type: 'cover',
  label: 'Tapparella',
  icon: 'blinds' satisfies IconName,
  sizes: { min: { w: 2, h: 1 }, max: { w: 2, h: 2 }, default: { w: 2, h: 1 } },
  matches: (id) => id.startsWith('cover_card_'),
  Widget: CoverWidget,
  Details: CoverDetails,
};

/** automation.* without a generic type; with sensor/entity/toggle the sensor widget takes it. */
export const automationWidget: WidgetDefinition = {
  type: 'automation',
  label: 'Automazione',
  icon: 'refresh' satisfies IconName,
  sizes: { min: { w: 1, h: 1 }, max: { w: 2, h: 2 }, default: { w: 2, h: 1 } },
  matches: (id, settings) => id.startsWith('automation.') && !isSensorType(settings),
  Widget: AutomationWidget,
  Details: AutomationDetails,
};

/**
 * Sensor / entity: `entity_card_*`, then the generic fallback on settings.type (also for
 * automation.* with that type). Last in the array, like the fallback of the legacy registry.
 */
export const sensorWidget: WidgetDefinition = {
  type: 'sensor',
  label: 'Sensore o entità',
  icon: 'activity' satisfies IconName,
  sizes: { min: { w: 1, h: 1 }, max: { w: 2, h: 2 }, default: { w: 1, h: 1 } },
  matches: (id, settings) => id.startsWith('entity_card_') || isSensorType(settings),
  Widget: SensorWidget,
  Details: SensorDetails,
};

export const controlsWidgets: WidgetDefinition[] = [
  lightWidget,
  lockWidget,
  fanWidget,
  coverWidget,
  automationWidget,
  sensorWidget,
];

export const controlsPages: PageKindDefinition[] = [
  { kind: 'lights', label: 'Luci', Page: LightsPage },
];
