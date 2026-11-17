/**
 * Room card (`room_card_*`): the summary of an area from the card settings, ported from the
 * legacy RoomCard and RoomModal. Entity lists come from `@/utils/roomEntities`.
 */
import type { HassEntity } from 'home-assistant-js-websocket';
import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap, HaConfig } from '@/@types/ha';
import { getEffectiveRoomEntityIds } from '@/utils/roomEntities';
import {
  settingFlag,
  settingString,
  stringAttr,
  isUnavailableState,
} from '../shared/entity';
import { roomDimmable } from './roomCapabilities';

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

export const roomNumber = (value: unknown): number | null =>
  (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value))
    ? Number(value) : null;
export const roomNumberAttr = (entity: HassEntity | undefined, key: string): number | null =>
  roomNumber(entity?.attributes[key]);

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
  unavailableCount: number;
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
 * Existing room indicators and explicit role overrides. Sensor values keep their native unit;
 * only climate readings without their own unit use Home Assistant's configured temperature unit.
 */
export function roomSummary(
  entities: EntityMap,
  settings: CardSettings,
  _haConfig: HaConfig | null
): RoomSummary {
  const ids = getEffectiveRoomEntityIds(settings);
  const lightIds = byDomain(ids, 'light');
  const configuredMain = settingString(settings, 'mainLightEntityId');
  const mainLightId = configuredMain && lightIds.includes(configuredMain) ? configuredMain : (lightIds[0] ?? null);

  const doorId =
    settingString(settings, 'doorEntityId') ??
    ids.find((id) => ['door', 'window', 'garage_door'].includes(deviceClass(entities[id]) ?? '')) ??
    null;
  const climateId =
    settingString(settings, 'climateEntityId') ??
    ids.find((id) => id.startsWith('climate.')) ??
    null;
  const tempId =
    settingString(settings, 'tempEntityId') ??
    ids.find((id) => {
      const entity = entities[id];
      return (
        Boolean(entity) &&
        id.startsWith('sensor.') && deviceClass(entity) === 'temperature'
      );
    }) ??
    null;
  const motionId =
    settingString(settings, 'motionEntityId') ??
    ids.find((id) =>
      ['motion', 'occupancy', 'presence'].includes(deviceClass(entities[id]) ?? '')
    ) ??
    null;

  const climate = climateId ? entities[climateId] : undefined;
  const tempEntity = tempId ? entities[tempId] : undefined;
  const motion = motionId ? entities[motionId] : undefined;
  const sensorTemperature = tempEntity && !isUnavailableState(tempEntity.state) ? roomNumber(tempEntity.state) : null;
  const reading =
    sensorTemperature !== null
      ? { value: sensorTemperature, unit: stringAttr(tempEntity, 'unit_of_measurement') ?? '' }
      : { value: climate && !isUnavailableState(climate.state) ? roomNumberAttr(climate, 'current_temperature') : null,
          unit: stringAttr(climate, 'temperature_unit') ?? stringAttr(climate, 'unit_of_measurement')
            ?? _haConfig?.unit_system?.temperature ?? '' };

  const activeVacuum =
    byDomain(ids, 'vacuum')
      .map((id) => entities[id])
      .find((entity) => entity && !isUnavailableState(entity.state) && entity.state !== 'docked') ?? null;
  const activeCover =
    byDomain(ids, 'cover')
      .map((id) => entities[id])
      .find((entity) => entity && !['closed', 'unavailable', 'unknown'].includes(entity.state)) ??
    null;

  const toggleDomains = new Set(['switch', 'fan', 'cover', 'climate', 'media_player']);
  const activeDevices = ids.filter((id) => {
    const entity = entities[id];
    if (!entity) return false;
    const domain = id.split('.')[0] ?? '';
    if (!toggleDomains.has(domain)) return false;
    if (domain === 'media_player') return entity.state === 'playing';
    if (domain === 'climate')
      return Boolean(entity.state) && !['off', 'unavailable', 'unknown'].includes(entity.state);
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
    mediaPlaying: byDomain(ids, 'media_player').filter((id) => entities[id]?.state === 'playing')
      .length,
    activeDevices,
    vacuumLabel: vacuumState ? (VACUUM_LABEL[vacuumState] ?? vacuumState.replace(/_/g, ' ')) : null,
    vacuumTone:
      vacuumState === 'error' ? 'danger' : vacuumState === 'cleaning' ? 'active' : 'neutral',
    coverLabel: activeCover ? (COVER_LABEL[activeCover.state] ?? activeCover.state) : null,
    doorOpen: doorId ? entities[doorId]?.state === 'on' : false,
    unavailableCount: ids.filter(id => !entities[id] || isUnavailableState(entities[id]?.state)).length,
  };
}

/** Observed brightness in percent; a missing on-state attribute is not a 100% reading. */
export function brightnessPercent(entity: HassEntity | undefined): number | null {
  if (!entity || isUnavailableState(entity.state)) return null;
  const brightness = roomNumberAttr(entity, 'brightness');
  if (brightness !== null && brightness >= 0 && brightness <= 255) return Math.round((brightness / 255) * 100);
  return entity.state === 'off' ? 0 : null;
}

/** Light that supports dimming (legacy RoomExplorerPage rule). */
export function isDimmable(entity: HassEntity | undefined): boolean {
  return roomDimmable(entity);
}
