import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import { Body, Button, Caption, Heading } from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { getEffectiveRoomEntityIds } from '@/utils/roomEntities';
import {
  domainOf,
  friendlyName,
  isUnavailableState,
  listAttr,
  numberAttr,
  settingFlag,
  settingString,
  stringAttr,
} from '../shared/entity';
import { formatCompact, humanizeState } from '../shared/format';
import { ValueStepper } from '../shared/controls';
import { CollapseButton, DetailsBody, OptionPicker } from '../shared/details';
import { Notice, callAll, commandNotice } from '../shared/UtilityCard';
import { UtilityIcon, type UtilityIconName } from '../shared/UtilityIcon';
import { useCommand } from '../shared/useCommand';
import { haUnit } from '../shared/units';
import { EntityRow, domainIcon, entityStateText } from './EntityRow';

const GROUPED_OTHER = new Set([
  'binary_sensor',
  'sensor',
  'number',
  'select',
  'update',
  'input_number',
  'switch',
]);

export const DOMAIN_LABEL: Record<string, string> = {
  light: 'Luci',
  climate: 'Clima',
  media_player: 'Media',
  cover: 'Tapparelle',
  fan: 'Ventilatori',
  lock: 'Serrature',
  switch: 'Interruttori',
  input_boolean: 'Interruttori virtuali',
  vacuum: 'Aspirapolvere',
  automation: 'Automazioni',
  scene: 'Scene',
  script: 'Script',
  sensor: 'Sensori',
  binary_sensor: 'Sensori binari',
  camera: 'Videocamere',
  person: 'Persone',
  button: 'Pulsanti',
  input_button: 'Pulsanti virtuali',
  other: 'Altre entità',
};

export function domainLabel(domain: string): string {
  return DOMAIN_LABEL[domain] ?? humanizeState(domain);
}

const HVAC_LABEL: Record<string, string> = {
  off: 'Spento',
  heat: 'Caldo',
  cool: 'Freddo',
  heat_cool: 'Caldo e freddo',
  auto: 'Automatico',
  dry: 'Deumidifica',
  fan_only: 'Solo ventola',
};

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

function RoomSection({
  id,
  title,
  icon,
  collapsed,
  onToggle,
  aside,
  children,
}: {
  id: string;
  title: string;
  icon: UtilityIconName;
  collapsed: boolean;
  onToggle: () => void;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const bodyId = `${id}-contenuto`;
  return (
    <section className="utility-section" aria-labelledby={`${id}-titolo`}>
      <div className="utility-section__head">
        <Heading level={3} size="sm" tone="ink" id={`${id}-titolo`}>
          <CollapseButton expanded={!collapsed} onToggle={onToggle} controls={bodyId}>
            <UtilityIcon name={icon} size="md" color="var(--aca-ink-muted)" />
            <span>{title}</span>
          </CollapseButton>
        </Heading>
        {!collapsed && aside && <div className="utility-toolbar">{aside}</div>}
      </div>
      <div id={bodyId} hidden={collapsed} className="utility-stack">
        {children}
      </div>
    </section>
  );
}

function ClimateControl({ climateId, entity }: { climateId: string; entity: HassEntity }) {
  const { haConfig } = useWidgetRuntime();
  const command = useCommand(entity);
  const target = numberAttr(entity, 'temperature');
  // Climate entities report in the unit of Home Assistant: label only, no conversion.
  const unit = haUnit(
    'temperature',
    haConfig,
    stringAttr(entity, 'temperature_unit') ?? stringAttr(entity, 'unit_of_measurement') ?? '°C'
  );
  const current = numberAttr(entity, 'current_temperature');
  const modes = listAttr(entity, 'hvac_modes');
  const action = stringAttr(entity, 'hvac_action') ?? entity.state ?? 'idle';
  const unavailable = isUnavailableState(entity.state);
  const notice = commandNotice(command.errorKey, command.unconfirmedKey);
  return (
    <div className="utility-stack">
      <div className="utility-split">
        <div className="utility-stack">
          <Body as="span" size="sm" tone="ink">
            {friendlyName(entity, climateId)}
          </Body>
          <Caption>{HVAC_LABEL[action] ?? humanizeState(action)}</Caption>
        </div>
        <Caption>
          Attuale {current === null ? '--' : `${formatCompact(current, 1)} ${unit}`}
        </Caption>
      </div>
      {target !== null && (
        <ValueStepper
          label="Temperatura desiderata"
          confirmed={target}
          min={numberAttr(entity, 'min_temp') ?? 16}
          max={numberAttr(entity, 'max_temp') ?? 30}
          step={0.5}
          disabled={unavailable || !((numberAttr(entity, 'supported_features') ?? 0) & 1)}
          format={(value) => `${formatCompact(value, 1)} ${unit}`}
          toCall={(value) => ({
            domain: 'climate',
            service: 'set_temperature',
            data: { entity_id: climateId, temperature: value },
          })}
        />
      )}
      {target !== null && (
        <Caption>
          Desiderata {formatCompact(target, 1)} {unit}
        </Caption>
      )}
      {modes.length > 0 && (
        <div className="utility-toolbar" role="group" aria-label="Modalità del clima">
          {modes.map((mode) => (
            <Button
              key={mode}
              variant="control"
              size="sm"
              aria-pressed={entity.state === mode}
              loading={command.pendingKey === mode}
              disabled={unavailable}
              onClick={() =>
                command.run({
                  key: mode,
                  domain: 'climate',
                  service: 'set_hvac_mode',
                  data: { entity_id: climateId, hvac_mode: mode },
                  confirm: (current) => current?.state === mode,
                })
              }
            >
              {HVAC_LABEL[mode] ?? humanizeState(mode)}
            </Button>
          ))}
        </div>
      )}
      {target === null && modes.length === 0 && <Caption>Solo lettura della temperatura.</Caption>}
      {notice && (
        <Notice tone={notice.tone} icon="warning" live>
          {notice.text}
        </Notice>
      )}
    </div>
  );
}

/** Room details (legacy RoomModal): climate, temperatures, lights, vacuums, media and the other devices. */
export function RoomDetails({ settings }: WidgetDetailsProps) {
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

  if (present.length === 0) {
    return (
      <DetailsBody>
        <Notice icon="room">
          Nessun dispositivo di questa stanza è disponibile in Home Assistant.
        </Notice>
      </DetailsBody>
    );
  }

  return (
    <DetailsBody>
      {settingFlag(settings, 'showPopupClimate') &&
        climates.length > 0 &&
        section(
          'climate',
          'Clima',
          'thermostat',
          activeClimateId && entities[activeClimateId] ? (
            <ClimateControl
              climateId={activeClimateId}
              entity={entities[activeClimateId] as HassEntity}
            />
          ) : (
            <Caption>Nessun termostato disponibile.</Caption>
          ),
          climates.length > 1 ? (
            <OptionPicker
              label="Termostato"
              value={activeClimateId}
              options={climates.map((id) => ({ value: id, label: friendlyName(entities[id], id) }))}
              onSelect={setSelectedClimate}
            />
          ) : null
        )}

      {settingFlag(settings, 'showPopupTempOverview') &&
        temperatures.length > 0 &&
        section(
          'tempOverview',
          'Temperature',
          'thermostat',
          <ul className="utility-list">
            {temperatures.map((id) => {
              const entity = entities[id] as HassEntity;
              return (
                <li className="utility-list__row" key={id}>
                  <span className="utility-list__main">
                    <Body as="span" size="sm" tone="ink" className="utility-truncate" title={id}>
                      {friendlyName(entity, id)}
                    </Body>
                  </span>
                  <span className="utility-list__end">
                    <Caption>{entityStateText(id, entity, runtime.haConfig)}</Caption>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

      {settingFlag(settings, 'showPopupLights') &&
        lights.length > 0 &&
        section(
          'lights',
          `Luci (${lightsOn} su ${lights.length} ${lightsOn === 1 ? 'accesa' : 'accese'})`,
          'light',
          <>
            <ul className="utility-list">
              {lights.map((id) => (
                <EntityRow
                  key={id}
                  entityId={id}
                  entity={entities[id] as HassEntity}
                  brightness="always"
                />
              ))}
            </ul>
            {lightsError && (
              <Notice tone="danger" icon="warning" live>
                Alcune luci non hanno risposto. Riprova.
              </Notice>
            )}
          </>,
          <Button variant="control" size="sm" onClick={toggleAllLights}>
            {lightsOn > 0 ? 'Spegni tutte' : 'Accendi tutte'}
          </Button>
        )}

      {settingFlag(settings, 'showPopupVacuum') &&
        orderedVacuums.length > 0 &&
        section(
          'vacuum',
          'Aspirapolvere',
          'vacuum',
          <ul className="utility-list">
            {orderedVacuums.map((id) => (
              <EntityRow key={id} entityId={id} entity={entities[id] as HassEntity} />
            ))}
          </ul>
        )}

      {settingFlag(settings, 'showPopupMedia') &&
        orderedMedia.length > 0 &&
        section(
          'media',
          'Media',
          'speaker',
          <ul className="utility-list">
            {orderedMedia.map((id) => (
              <EntityRow key={id} entityId={id} entity={entities[id] as HassEntity} playPause />
            ))}
          </ul>
        )}

      {groupList.map(([domain, list]) =>
        section(
          domain,
          domainLabel(domain),
          domainIcon(domain),
          <ul className="utility-list">
            {list.map((id) => (
              <EntityRow key={id} entityId={id} entity={entities[id] as HassEntity} />
            ))}
          </ul>
        )
      )}
    </DetailsBody>
  );
}
