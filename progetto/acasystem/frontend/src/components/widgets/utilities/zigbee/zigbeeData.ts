import type { EntityMap } from '@/@types/ha';
import { isObject, type UnknownRecord } from '@/validators/guards';
import { numericState } from '../shared/entity';

/**
 * The Zigbee network of Home Assistant read from its registries and states (REP-20261029-003).
 * ZHA: devices whose identifiers carry `zha`, the coordinator being the device the others are
 * linked to (`via_device_id`), the radio up when the config entry is `loaded`. Zigbee2MQTT: the
 * bridge device (`zigbee2mqtt_bridge_<ieee>`, model «Bridge»), its devices linked to it, the
 * radio up when its connectivity sensor is on. Groups are not devices in either.
 */

export type ZigbeeIntegration = 'zha' | 'zigbee2mqtt';

export const INTEGRATION_LABEL: Record<ZigbeeIntegration, string> = {
  zha: 'ZHA',
  zigbee2mqtt: 'Zigbee2MQTT',
};

/** A battery at or under this level is low, as on the battery page. */
export const LOW_BATTERY = 20;

export interface ZigbeeDevice {
  id: string;
  name: string;
  /** Every entity of the device is `unavailable` («unknown» only means no reading yet). */
  offline: boolean;
  battery: number | null;
  batteryLow: boolean;
  /** Missing/unknown readings do not prove that the device answers. */
  availabilityUnknown?: true;
}

export interface ZigbeeNetwork {
  integration: ZigbeeIntegration;
  gatewayId: string;
  manufacturer: string | null;
  model: string | null;
  /** Coordinator firmware (ZHA `sw_version`, Zigbee2MQTT `hw_version`). */
  firmware: string | null;
  /** Version of Zigbee2MQTT; null for ZHA. */
  software: string | null;
  /** Null when Home Assistant does not say. */
  online: boolean | null;
  devices: ZigbeeDevice[];
  /** Zigbee2MQTT permit join switch; ZHA opens joining with the `zha.permit` service. */
  permitJoinId: string | null;
  /** Zigbee2MQTT restart button. */
  restartId: string | null;
}

export interface ZigbeeRegistries {
  devices: readonly unknown[];
  entities: readonly unknown[];
  /** State of the ZHA config entry (`loaded`, `setup_retry`…), null when unknown. */
  zhaEntryState: string | null;
  isAdmin?: boolean | null;
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const identifiersOf = (device: UnknownRecord): [string, string][] =>
  Array.isArray(device.identifiers)
    ? device.identifiers.filter(
        (pair): pair is [string, string] =>
          Array.isArray(pair) && typeof pair[0] === 'string' && typeof pair[1] === 'string'
      )
    : [];

const isGroup = (device: UnknownRecord) =>
  device.model === 'Group' || device.entry_type === 'service';

const deviceName = (device: UnknownRecord): string =>
  text(device.name_by_user) ?? text(device.name) ?? 'Dispositivo Zigbee';

/** Entity ids of each device, without the disabled ones. */
function entityIdsByDevice(entries: readonly unknown[]): Map<string, string[]> {
  const byDevice = new Map<string, string[]>();
  for (const entry of entries) {
    if (!isObject(entry) || entry.disabled_by) continue;
    const deviceId = text(entry.device_id);
    const entityId = text(entry.entity_id);
    if (!deviceId || !entityId) continue;
    const list = byDevice.get(deviceId) ?? [];
    list.push(entityId);
    byDevice.set(deviceId, list);
  }
  return byDevice;
}

function readDevice(
  device: UnknownRecord,
  entityIds: readonly string[],
  entities: EntityMap
): ZigbeeDevice {
  const present = entityIds.map((id) => entities[id]).filter((entity) => entity !== undefined);
  let battery: number | null = null;
  let batteryFlag = false;
  for (const entity of present) {
    if (entity.attributes.device_class !== 'battery') continue;
    if (entity.entity_id.startsWith('sensor.')) {
      const value = numericState(entity);
      const unit = entity.attributes.unit_of_measurement;
      if (value !== null && value >= 0 && value <= 100 && (unit === undefined || unit === '%'))
        battery = value;
    }
    if (entity.entity_id.startsWith('binary_sensor.') && entity.state === 'on') batteryFlag = true;
  }
  const offline = entityIds.length > 0 && present.length === entityIds.length &&
    present.every((entity) => entity.state === 'unavailable');
  const unknown = !offline && (present.length < entityIds.length || present.length === 0 ||
    present.every((entity) => !entity.state.trim() || entity.state === 'unknown' || entity.state === 'unavailable'));
  return {
    id: String(device.id),
    name: deviceName(device),
    offline,
    battery: offline ? null : battery,
    batteryLow: !offline && (batteryFlag || (battery !== null && battery <= LOW_BATTERY)),
    ...(unknown ? { availabilityUnknown: true as const } : {}),
  };
}

const byName = (a: ZigbeeDevice, b: ZigbeeDevice) => a.name.localeCompare(b.name, 'it');

function zhaNetwork(
  all: UnknownRecord[],
  registries: ZigbeeRegistries,
  entityIds: Map<string, string[]>,
  entities: EntityMap
): ZigbeeNetwork | null {
  const zha = all.filter((device) => identifiersOf(device).some(([domain]) => domain === 'zha'));
  if (zha.length === 0) return null;
  const parents = new Set(zha.map((device) => text(device.via_device_id)).filter(Boolean));
  const coordinator =
    zha.find((device) => parents.has(String(device.id))) ??
    zha.find((device) => device.name === 'Zigbee Coordinator') ??
    null;
  const state = registries.zhaEntryState;
  return {
    integration: 'zha',
    gatewayId: coordinator ? String(coordinator.id) : 'zha',
    manufacturer: coordinator ? text(coordinator.manufacturer) : null,
    model: coordinator ? text(coordinator.model) : null,
    firmware: coordinator ? text(coordinator.sw_version) : null,
    software: null,
    online: state === null ? null : state === 'loaded',
    devices: zha
      .filter((device) => device !== coordinator && !isGroup(device))
      .map((device) => readDevice(device, entityIds.get(String(device.id)) ?? [], entities))
      .sort(byName),
    permitJoinId: null,
    restartId: null,
  };
}

function z2mNetworks(
  all: UnknownRecord[],
  registry: readonly unknown[],
  entityIds: Map<string, string[]>,
  entities: EntityMap
): ZigbeeNetwork[] {
  const bridges = all.filter(
    (device) =>
      identifiersOf(device).some(([, id]) => id.startsWith('zigbee2mqtt_bridge_')) ||
      (device.manufacturer === 'Zigbee2MQTT' && device.model === 'Bridge')
  );
  return bridges.map((bridge) => {
    const own = entityIds.get(String(bridge.id)) ?? [];
    const isBridgeControl = (id: string, suffix: string) => {
      const entry = registry.find((item) => isObject(item) && item.entity_id === id);
      const uniqueId = isObject(entry) ? text(entry.unique_id) : null;
      const identifiers = identifiersOf(bridge).filter(([domain]) => domain === 'mqtt');
      return uniqueId ? identifiers.some(([, identifier]) => identifier.startsWith('zigbee2mqtt_') &&
        uniqueId.startsWith(`${identifier.slice('zigbee2mqtt_'.length)}_${suffix}_`))
        : id.endsWith(`_${suffix}`);
    };
    const connectivity = own.find(
      (id) =>
        id.startsWith('binary_sensor.') && entities[id]?.attributes.device_class === 'connectivity'
    );
    const connection = connectivity ? entities[connectivity] : undefined;
    return {
      integration: 'zigbee2mqtt' as const,
      gatewayId: String(bridge.id),
      manufacturer: text(bridge.manufacturer),
      model: text(bridge.model),
      firmware: text(bridge.hw_version),
      software: text(bridge.sw_version),
      online: connection?.state === 'on' ? true : connection?.state === 'off' ? false : null,
      devices: all
        .filter((device) => device.via_device_id === bridge.id && !isGroup(device))
        .map((device) => readDevice(device, entityIds.get(String(device.id)) ?? [], entities))
        .sort(byName),
      permitJoinId:
        own.find((id) => id.startsWith('switch.') && isBridgeControl(id, 'permit_join')) ??
        null,
      restartId:
        own.find(
          (id) =>
            id.startsWith('button.') &&
            (entities[id]?.attributes.device_class === 'restart' || isBridgeControl(id, 'restart'))
        ) ?? null,
    };
  });
}

/** The Zigbee networks of Home Assistant: ZHA first, then each Zigbee2MQTT bridge. */
export function readZigbeeNetworks(
  registries: ZigbeeRegistries,
  entities: EntityMap
): ZigbeeNetwork[] {
  const all = registries.devices.filter(isObject).filter((device) => !device.disabled_by && text(device.id) !== null);
  const entityIds = entityIdsByDevice(registries.entities);
  const zha = zhaNetwork(all, registries, entityIds, entities);
  return [...(zha ? [zha] : []), ...z2mNetworks(all, registries.entities, entityIds, entities)];
}

/** «1 dispositivo», «18 dispositivi». */
export function devicesText(count: number): string {
  return count === 1 ? '1 dispositivo' : `${count} dispositivi`;
}

export function offlineText(count: number): string {
  return count === 1 ? '1 non risponde' : `${count} non rispondono`;
}

export function lowBatteryText(count: number): string {
  return count === 1 ? '1 batteria scarica' : `${count} batterie scariche`;
}

/** Minutes and seconds left, «3:07». */
export function countdownText(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
