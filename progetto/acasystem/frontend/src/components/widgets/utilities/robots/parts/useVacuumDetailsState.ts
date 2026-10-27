import { useEffect, useId, useMemo, useState } from 'react';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { readKey } from '@/validators/guards';
import { useServiceCatalog } from '../../../adaptive/useServiceCatalog';
import {
  friendlyName,
  isUnavailableState,
  listAttr,
  settingString,
  stringAttr,
} from '../../shared/entity';
import { formatRelative, parseNumber } from '../../shared/format';
import { commandNotice } from '../../shared/UtilityCard';
import { useCommand, type CommandRequest } from '../../shared/useCommand';
import { vacuumSpec } from '../robotSpecs';
import { useVacuumRegistry } from '../useVacuumRegistry';
import {
  mopControl,
  primaryAction,
  relatedSensors,
  telemetry,
  vacuumConsumables,
  vacuumDiagnostics,
  vacuumFeatures,
  vacuumIdentity,
  vacuumMapIds,
  vacuumStatistics,
} from '../vacuumData';

/** Legacy localStorage keys of the map panel, kept so existing preferences still apply. */
const storageKeys = (id: string) => ({
  showMap: `tunet_vacuum_show_map_${id}`,
  selectedMap: `tunet_vacuum_selected_map_${id}`,
  scale: `tunet_vacuum_map_scale_${id}`,
});

function readStorage(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string) {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Storage unavailable: the preference lasts for this session only.
  }
}

const PRIMARY_REQUESTED = {
  start: 'Avvio richiesto…',
  pause: 'Pausa richiesta…',
  stop: 'Arresto richiesto…',
} as const;

/**
 * State shared by the sections of the vacuum details (sheet and console): the entity, the
 * commands, the registry, the map preferences and every value derived from them. `null` when the
 * vacuum is not in Home Assistant. The sheet and the console only differ in how they lay the
 * sections out.
 */
export function useVacuumDetailsState(id: string, settings: WidgetDetailsProps['settings']) {
  const runtime = useWidgetRuntime();
  const services = useServiceCatalog();
  const { entities } = runtime;
  const entity = entities[id];
  const [configurationError, setConfigurationError] = useState<string | null>(null);
  const bindings = settings.adaptiveBindings ?? {};
  const configuredIds = new Set([id]);
  const collectIds = (value: unknown) => {
    if (typeof value === 'string' && entities[value]) configuredIds.add(value);
    else if (Array.isArray(value)) value.forEach(collectIds);
    else if (value && typeof value === 'object') Object.values(value).forEach(collectIds);
  };
  collectIds(settings);
  const command = useCommand(entity);
  const registry = useVacuumRegistry(runtime.conn, id);
  const keys = storageKeys(id);
  const [showMap, setShowMap] = useState(() => readStorage(keys.showMap) !== 'false');
  const [selectedMap, setSelectedMap] = useState<string | null>(() =>
    readStorage(keys.selectedMap)
  );
  const [mapScale, setMapScale] = useState(() => {
    const saved = parseNumber(readStorage(keys.scale));
    return saved !== null ? Math.min(4, Math.max(1, saved)) : 1;
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [resetConfirm, setResetConfirm] = useState<string | null>(null);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const telemetryId = `telemetria-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  useEffect(() => {
    if (!resetConfirm) return undefined;
    const timer = setTimeout(() => setResetConfirm(null), 3000);
    return () => clearTimeout(timer);
  }, [resetConfirm]);

  useEffect(() => {
    writeStorage(keys.scale, String(mapScale));
  }, [keys.scale, mapScale]);

  const identity = useMemo(() => vacuumIdentity(id, entity), [id, entity]);
  const sensors = useMemo(
    () => relatedSensors(entities, identity, registry.relations),
    [entities, identity, registry.relations]
  );
  const roomSelect =
    settingString(settings, 'roomSelectEntityId') ??
    (typeof bindings.area === 'string' ? bindings.area : null);
  const roomOptions = listAttr(roomSelect ? entities[roomSelect] : undefined, 'options');
  const scriptList: unknown[] = Array.isArray(settings.roomScripts) ? settings.roomScripts : [];
  const roomScripts = scriptList.flatMap((item: unknown) => {
    const entityId = readKey(item, 'entityId');
    const label = readKey(item, 'label');
    return typeof entityId === 'string' && entityId
      ? [
          {
            entityId,
            label:
              typeof label === 'string' && label
                ? label
                : friendlyName(entities[entityId], entityId),
          },
        ]
      : [];
  });
  const mapIds = vacuumMapIds(entities, identity, settings);
  const activeMap = selectedMap && entities[selectedMap] ? selectedMap : (mapIds[0] ?? null);
  const picture = activeMap ? stringAttr(entities[activeMap], 'entity_picture') : null;
  const mapUrl = picture ? runtime.getEntityImageUrl(picture) : null;

  if (!entity) return null;

  const unavailable = isUnavailableState(entity.state);
  const features = vacuumFeatures(entity);
  const stats = vacuumStatistics(entities, id, settings, sensors);
  const primary = primaryAction(entity);
  const pending = command.pendingKey;
  const statusText =
    pending === 'start' || pending === 'pause' || pending === 'stop'
      ? PRIMARY_REQUESTED[pending]
      : pending === 'dock'
        ? vacuumSpec.dock.requested
        : pending === 'locate'
          ? 'Ricerca richiesta…'
          : vacuumSpec.stateLabel(entity.state, stats.battery);
  const notice = commandNotice(command.errorKey, command.unconfirmedKey);
  const send = (request: CommandRequest) => {
    const target = request.data?.entity_id ?? readKey(request.data?.target, 'entity_id') ?? id;
    const ids = Array.isArray(target) ? target : [target];
    if (
      !runtime.conn ||
      !services?.[request.domain]?.[request.service] ||
      ids.some((target) => typeof target !== 'string' || !configuredIds.has(target))
    ) {
      setConfigurationError(
        'Associa il dispositivo e verifica il servizio nelle impostazioni del widget.'
      );
      return;
    }
    setConfigurationError(null);
    command.run({ ...request, data: request.data ?? { entity_id: id } });
  };

  const fanSpeed = stringAttr(entity, 'fan_speed');
  const mop = mopControl(entities, entity, registry.relations, {
    ...settings,
    mopIntensityControlEntityId: settings.mopIntensityControlEntityId ?? bindings.mop,
  });
  const mopAvailable =
    mop.available &&
    (mop.entityId
      ? configuredIds.has(mop.entityId) &&
        Boolean(services?.[mop.entityId.split('.')[0]!]?.select_option)
      : Boolean(services?.vacuum?.set_mop_intensity));
  const consumables = vacuumConsumables(entities, identity, registry.relations);
  const diagnostics = vacuumDiagnostics(entities, identity, registry.relations);
  const shown = new Set<string>([id, ...diagnostics.map((item) => item.id)]);
  consumables.forEach((item) => item.sensorId && shown.add(item.sensorId));
  for (const key of [
    'cleaningTimeSensorId',
    'cleanedAreaSensorId',
    'totalCleanTimeSensorId',
    'totalCleanAreaSensorId',
    'totalCleanCountSensorId',
    'lastCleanStartSensorId',
    'lastCleanEndSensorId',
    'batterySensorId',
  ]) {
    const mapped = settingString(settings, key);
    if (mapped) shown.add(mapped);
  }
  const advanced = telemetry(entities, registry.relations, shown);
  const lastClean = stats.lastClean ? (formatRelative(stats.lastClean) ?? stats.lastClean) : '--';

  const hasRooms = registry.areas.length > 0 || roomOptions.length > 0 || roomScripts.length > 0;
  const roomDomain = roomSelect?.startsWith('input_select.') ? 'input_select' : 'select';

  return {
    id,
    runtime,
    services,
    entities,
    entity,
    registry,
    keys,
    showMap,
    setShowMap,
    setSelectedMap,
    mapScale,
    setMapScale,
    refreshKey,
    setRefreshKey,
    selectedRoom,
    setSelectedRoom,
    selectedAreas,
    setSelectedAreas,
    resetConfirm,
    setResetConfirm,
    telemetryOpen,
    setTelemetryOpen,
    telemetryId,
    roomSelect,
    roomOptions,
    roomScripts,
    mapIds,
    activeMap,
    mapUrl,
    configuredIds,
    configurationError,
    unavailable,
    features,
    stats,
    primary,
    pending,
    statusText,
    notice,
    send,
    fanSpeed,
    mop,
    mopAvailable,
    consumables,
    diagnostics,
    advanced,
    lastClean,
    hasRooms,
    roomDomain,
  };
}

export type VacuumState = NonNullable<ReturnType<typeof useVacuumDetailsState>>;
