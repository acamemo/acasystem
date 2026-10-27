import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { getEffectiveRoomEntityIds } from '@/utils/roomEntities';
import { domainOf, settingString, stringAttr } from '../../shared/entity';
import { callAll } from '../../shared/UtilityCard';
import type { UtilityIconName } from '../../shared/UtilityIcon';
import { RoomSection } from './RoomControls';

const GROUPED_OTHER = new Set([
  'binary_sensor',
  'sensor',
  'number',
  'select',
  'update',
  'input_number',
  'switch',
]);

/** Legacy key of the collapsed sections, kept so existing preferences still apply. */
function collapseKey(areaName: string | null, areaId: string | null): string {
  return `tunet_room_collapsed_${String(areaName ?? areaId ?? 'default')
    .toLowerCase()
    .replace(/\s+/g, '_')}`;
}

function readCollapsed(key: string): Record<string, boolean> {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, boolean] => typeof entry[1] === 'boolean'
      )
    );
  } catch {
    return {};
  }
}

/**
 * State shared by the sections of the room details (sheet and console): the entities of the room
 * by kind, the collapsed sections, the chosen thermostat and the «all lights» command. `null` when
 * no device of the room is in Home Assistant. The sheet and the console only differ in how they
 * lay the sections out.
 */
export function useRoomDetailsState(settings: WidgetDetailsProps['settings']) {
  const runtime = useWidgetRuntime();
  const { entities, callService } = runtime;
  const sectionId = `stanza-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const storageKey = collapseKey(
    settingString(settings, 'areaName'),
    settingString(settings, 'areaId')
  );
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    readCollapsed(storageKey)
  );
  const [selectedClimate, setSelectedClimate] = useState<string | null>(
    settingString(settings, 'climateEntityId')
  );
  const [lightsError, setLightsError] = useState(false);

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(storageKey, JSON.stringify(collapsed));
    } catch {
      // Storage unavailable: the sections reopen next time.
    }
  }, [storageKey, collapsed]);

  const ids = useMemo(() => getEffectiveRoomEntityIds(settings), [settings]);
  const present = ids.filter((id) => entities[id]);
  const of = (domain: string) => present.filter((id) => domainOf(id) === domain);
  const lights = of('light');
  const climates = of('climate');
  const media = of('media_player');
  const vacuums = of('vacuum');
  const tempEntityId = settingString(settings, 'tempEntityId');
  const humidityEntityId = settingString(settings, 'humidityEntityId');
  const temperatures = present.filter((id) => {
    if (id === tempEntityId || id === humidityEntityId) return true;
    if (!['sensor', 'climate', 'weather'].includes(domainOf(id))) return false;
    return ['temperature', 'humidity'].includes(stringAttr(entities[id], 'device_class') ?? '');
  });
  const preferredVacuum = settingString(settings, 'vacuumEntityId');
  const orderedVacuums =
    preferredVacuum && vacuums.includes(preferredVacuum)
      ? [preferredVacuum, ...vacuums.filter((id) => id !== preferredVacuum)]
      : vacuums;
  const activeMedia = media.find((id) => entities[id]?.state === 'playing');
  const orderedMedia = activeMedia
    ? [activeMedia, ...media.filter((id) => id !== activeMedia)]
    : media;
  const top = new Set([...lights, ...climates, ...media, ...vacuums, ...temperatures]);
  const others = present.filter((id) => !top.has(id));
  const groups = new Map<string, string[]>();
  for (const id of others) {
    const domain = domainOf(id);
    const key = GROUPED_OTHER.has(domain) ? 'other' : domain;
    groups.set(key, [...(groups.get(key) ?? []), id]);
  }
  const groupList = [...groups.entries()].sort(([a], [b]) =>
    a === 'other' ? 1 : b === 'other' ? -1 : a.localeCompare(b)
  );

  const activeClimateId =
    selectedClimate && entities[selectedClimate]
      ? selectedClimate
      : (climates.find((id) => id === settingString(settings, 'climateEntityId')) ??
        climates[0] ??
        null);
  const lightsOn = lights.filter((id) => entities[id]?.state === 'on').length;

  const toggle = (key: string) => setCollapsed((current) => ({ ...current, [key]: !current[key] }));
  const section = (
    key: string,
    title: string,
    icon: UtilityIconName,
    children: ReactNode,
    aside?: ReactNode
  ) => (
    <RoomSection
      key={key}
      id={`${sectionId}-${key}`}
      title={title}
      icon={icon}
      collapsed={collapsed[key] === true}
      onToggle={() => toggle(key)}
      aside={aside}
    >
      {children}
    </RoomSection>
  );

  const toggleAllLights = () => {
    const service = lightsOn > 0 ? 'turn_off' : 'turn_on';
    setLightsError(false);
    Promise.allSettled(
      lights.map((id) => callAll(() => callService('light', service, { entity_id: id })))
    ).then((results) => setLightsError(results.some((result) => result.status === 'rejected')));
  };

  if (present.length === 0) return null;

  return {
    settings,
    runtime,
    entities,
    lights,
    climates,
    temperatures,
    orderedVacuums,
    orderedMedia,
    groupList,
    activeClimateId,
    lightsOn,
    lightsError,
    setSelectedClimate,
    section,
    toggleAllLights,
  };
}

export type RoomState = NonNullable<ReturnType<typeof useRoomDetailsState>>;
