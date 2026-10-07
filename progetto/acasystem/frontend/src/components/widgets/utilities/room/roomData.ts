/**
 * Room card (`room_card_*`): the summary of an area from the card settings, ported from the
 * legacy RoomCard and RoomModal. Entity lists come from `@/utils/roomEntities`.
 */
import type { HassEntity } from 'home-assistant-js-websocket';
import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap, HaConfig } from '@/@types/ha';
import { getEffectiveRoomEntityIds } from '@/utils/roomEntities';
import { attr, numberAttr, numericState, settingFlag, settingString, stringAttr } from '../shared/entity';
import { haUnit, temperatureReading } from '../shared/units';

export interface RoomFlags {
  showLights: boolean;
  showTemp: boolean;
  showMotion: boolean;
  showLightChip: boolean;
  showMediaChip: boolean;
  showActiveChip: boolean;
  showVacuumChip: boolean;
  showCoverChip: boolean;
  showDoorChip: boolean;
  showOccupiedIndicator: boolean;
}

export function roomFlags(settings: CardSettings): RoomFlags {
  return {
    showLights: settingFlag(settings, 'showLights'),
    showTemp: settingFlag(settings, 'showTemp'),
    showMotion: settingFlag(settings, 'showMotion'),
    showLightChip: settingFlag(settings, 'showLightChip'),
    showMediaChip: settingFlag(settings, 'showMediaChip'),
    showActiveChip: settingFlag(settings, 'showActiveChip'),
    showVacuumChip: settingFlag(settings, 'showVacuumChip'),
    showCoverChip: settingFlag(settings, 'showCoverChip'),
    showDoorChip: settingFlag(settings, 'showDoorChip'),
    showOccupiedIndicator: settingFlag(settings, 'showOccupiedIndicator'),
  };
}

const byDomain = (ids: string[], domain: string) => ids.filter((id) => id.startsWith(`${domain}.`));

const deviceClass = (entity: HassEntity | undefined) => stringAttr(entity, 'device_class');

export interface RoomSummary {
  ids: string[];
  lightIds: string[];
  mainLightId: string | null;
  mainLightOn: boolean;
  temperature: number | null;
  temperatureUnit: string;
  occupied: boolean;
  occupancyLabel: string;
  lightsOn: number;
  mediaPlaying: number;
  activeDevices: number;
  vacuumLabel: string | null;
  vacuumTone: 'active' | 'danger' | 'neutral';
  coverLabel: string | null;
  doorOpen: boolean;
}

const VACUUM_LABEL: Record<string, string> = {
  cleaning: 'Pulizia in corso',
  returning: 'Ritorno alla base',
  returning_home: 'Ritorno alla base',
  error: 'Errore',
  paused: 'Fermo',
  idle: 'Fermo',
  stopped: 'Fermo',
};

const COVER_LABEL: Record<string, string> = {
  open: 'Aperta',
  opening: 'In apertura',
  closing: 'In chiusura',
};

/**
 * Everything the card shows, with the legacy detection rules and setting overrides. The
 * temperature is shown in the unit of Home Assistant (`haConfig`), converted from the sensor.
 */
export function roomSummary(entities: EntityMap, settings: CardSettings, haConfig: HaConfig | null): RoomSummary {
  const ids = getEffectiveRoomEntityIds(settings);
  const lightIds = byDomain(ids, 'light');
  const configuredMain = settingString(settings, 'mainLightEntityId');
  const mainLightId = configuredMain && entities[configuredMain] ? configuredMain : (lightIds[0] ?? null);

  const doorId =
    settingString(settings, 'doorEntityId') ??
    ids.find((id) => ['door', 'window', 'garage_door'].includes(deviceClass(entities[id]) ?? '')) ??
    null;
  const climateId = settingString(settings, 'climateEntityId') ?? ids.find((id) => id.startsWith('climate.')) ?? null;
  const tempId =
    settingString(settings, 'tempEntityId') ??
    ids.find((id) => {
      const entity = entities[id];
      return Boolean(entity) && (deviceClass(entity) === 'temperature' || id.includes('temperature') || id.includes('temp'));
    }) ??
    null;
  const motionId =
    settingString(settings, 'motionEntityId') ??
    ids.find((id) => ['motion', 'occupancy', 'presence'].includes(deviceClass(entities[id]) ?? '')) ??
    null;

  const climate = climateId ? entities[climateId] : undefined;
  const tempEntity = tempId ? entities[tempId] : undefined;
  const motion = motionId ? entities[motionId] : undefined;
  // Climate entities already report in the HA unit; a sensor is converted from its own unit.
  const climateUnit = haUnit(
    'temperature',
    haConfig,
    stringAttr(climate, 'temperature_unit') ?? stringAttr(climate, 'unit_of_measurement') ?? '°C'
  );
  const sensorTemperature = numericState(tempEntity);
  const reading =
    sensorTemperature !== null
      ? temperatureReading(sensorTemperature, stringAttr(tempEntity, 'unit_of_measurement'), haConfig)
      : { value: numberAttr(climate, 'current_temperature'), unit: climateUnit };

  const activeVacuum =
    byDomain(ids, 'vacuum')
      .map((id) => entities[id])
      .find((entity) => entity && entity.state !== 'docked') ?? null;
  const activeCover =
    byDomain(ids, 'cover')
      .map((id) => entities[id])
      .find((entity) => entity && !['closed', 'unavailable', 'unknown'].includes(entity.state)) ?? null;

  const toggleDomains = new Set(['switch', 'fan', 'cover', 'climate', 'media_player']);
  const activeDevices = ids.filter((id) => {
    const entity = entities[id];
    if (!entity) return false;
    const domain = id.split('.')[0] ?? '';
    if (!toggleDomains.has(domain)) return false;
    if (domain === 'media_player') return entity.state === 'playing';
    if (domain === 'climate') return Boolean(entity.state) && !['off', 'unavailable', 'unknown'].includes(entity.state);
    if (domain === 'cover') return ['opening', 'open'].includes(entity.state);
    return entity.state === 'on';
  }).length;

  const vacuumState = activeVacuum?.state;
  return {
    ids,
    lightIds,
    mainLightId,
    mainLightOn: mainLightId ? entities[mainLightId]?.state === 'on' : false,
    temperature: reading.value,
    temperatureUnit: reading.unit,
    occupied: motion?.state === 'on',
    occupancyLabel: deviceClass(motion) === 'motion' ? 'Movimento' : 'Occupata',
    lightsOn: lightIds.filter((id) => entities[id]?.state === 'on').length,
    mediaPlaying: byDomain(ids, 'media_player').filter((id) => entities[id]?.state === 'playing').length,
    activeDevices,
    vacuumLabel: vacuumState ? (VACUUM_LABEL[vacuumState] ?? vacuumState.replace(/_/g, ' ')) : null,
    vacuumTone: vacuumState === 'error' ? 'danger' : vacuumState === 'cleaning' ? 'active' : 'neutral',
    coverLabel: activeCover ? (COVER_LABEL[activeCover.state] ?? activeCover.state) : null,
    doorOpen: doorId ? entities[doorId]?.state === 'on' : false,
  };
}

/** Brightness of a light in percent (attribute 0–255; on without attribute = 100). */
export function brightnessPercent(entity: HassEntity | undefined): number {
  const brightness = numberAttr(entity, 'brightness');
  if (brightness !== null) return Math.round((brightness / 255) * 100);
  return entity?.state === 'on' ? 100 : 0;
}

/** Light that supports dimming (legacy RoomExplorerPage rule). */
export function isDimmable(entity: HassEntity | undefined): boolean {
  const modes = attr(entity, 'supported_color_modes');
  if (!Array.isArray(modes)) return false;
  return !modes.includes('onoff') || modes.length > 1;
}
