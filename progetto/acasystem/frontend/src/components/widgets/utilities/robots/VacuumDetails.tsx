import { useEffect, useId, useMemo, useState } from 'react';
import {
  Body,
  Button,
  Caption,
  MaterialLayers,
  Skeleton,
  Toggle,
  materialClass,
} from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { friendlyName, isUnavailableState, listAttr, settingString, stringAttr } from '../shared/entity';
import { formatCompact, formatDuration, formatRelative, parseNumber } from '../shared/format';
import { DetailsBody, OptionPicker, Section, StatList, type StatItem } from '../shared/details';
import { Chip, Meter, Notice, commandNotice } from '../shared/UtilityCard';
import { UtilityIcon } from '../shared/UtilityIcon';
import { stateIn, useCommand, type CommandRequest } from '../shared/useCommand';
import { CommandButton } from '../shared/controls';
import { isErrorState, vacuumSpec } from './robotSpecs';
import { useVacuumRegistry } from './useVacuumRegistry';
import { readKey } from '@/validators/guards';
import {
  VACUUM_CONFIRM,
  fanSpeeds,
  mopControl,
  primaryAction,
  relatedSensors,
  roomSelectId,
  telemetry,
  vacuumConsumables,
  vacuumDiagnostics,
  vacuumFeatures,
  vacuumIdentity,
  vacuumMapIds,
  vacuumStatistics,
  type Reading,
} from './vacuumData';

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

function writeStorage(key: string, value: string) {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Storage unavailable: the preference lasts for this session only.
  }
}

const readingText = (reading: Reading | null) =>
  reading ? `${formatCompact(parseNumber(reading.value), 1, reading.value)}${reading.unit ? ` ${reading.unit}` : ''}` : '--';

const PRIMARY_LABEL = { start: 'Avvia', pause: 'Pausa', stop: 'Arresta' } as const;
const PRIMARY_REQUESTED = { start: 'Avvio richiesto…', pause: 'Pausa richiesta…', stop: 'Arresto richiesto…' } as const;

/** Vacuum details (legacy VacuumModal): commands, cleaning options, rooms, map, statistics, maintenance. */
export function VacuumDetails({ id, settings }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime();
  const { entities } = runtime;
  const entity = entities[id];
  const command = useCommand(entity);
  const registry = useVacuumRegistry(runtime.conn, id);
  const keys = storageKeys(id);
  const [showMap, setShowMap] = useState(() => readStorage(keys.showMap) !== 'false');
  const [selectedMap, setSelectedMap] = useState<string | null>(() => readStorage(keys.selectedMap));
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
  const sensors = useMemo(() => relatedSensors(entities, identity, registry.relations), [entities, identity, registry.relations]);
  const roomSelect = roomSelectId(entities, identity, registry.relations, settings);
  const roomOptions = listAttr(roomSelect ? entities[roomSelect] : undefined, 'options');
  const scriptList: unknown[] = Array.isArray(settings.roomScripts) ? settings.roomScripts : [];
  const roomScripts = scriptList.flatMap((item: unknown) => {
    const entityId = readKey(item, 'entityId');
    const label = readKey(item, 'label');
    return typeof entityId === 'string' && entityId
      ? [{ entityId, label: typeof label === 'string' && label ? label : friendlyName(entities[entityId], entityId) }]
      : [];
  });
  const mapIds = vacuumMapIds(entities, identity, settings);
  const activeMap = selectedMap && entities[selectedMap] ? selectedMap : (mapIds[0] ?? null);
  const picture = activeMap ? stringAttr(entities[activeMap], 'entity_picture') : null;
  const mapUrl = picture ? runtime.getEntityImageUrl(picture) : null;

  if (!entity) {
    return (
      <DetailsBody>
        <Notice icon="warning">Il dispositivo {id} non è stato trovato in Home Assistant.</Notice>
      </DetailsBody>
    );
  }

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
  const send = (request: CommandRequest) => command.run({ ...request, data: request.data ?? { entity_id: id } });

  const fanSpeed = stringAttr(entity, 'fan_speed');
  const mop = mopControl(entities, entity, registry.relations, settings);
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
  const lastClean = stats.lastClean ? formatRelative(stats.lastClean) ?? stats.lastClean : '--';
  const areaUnit = stats.totalArea?.unit ?? 'm²';

  const history: StatItem[] = [
    { key: 'cleaningTime', label: 'Durata della pulizia', value: stats.cleaningTime ? formatDuration(parseNumber(stats.cleaningTime.value), stats.cleaningTime.unit) : '--' },
    { key: 'cleanedArea', label: 'Area pulita', value: readingText(stats.cleanedArea) },
    { key: 'totalCount', label: 'Pulizie totali', value: stats.totalCount ?? '--' },
    { key: 'totalTime', label: 'Tempo totale', value: readingText(stats.totalTime) },
    { key: 'totalArea', label: 'Area totale', value: readingText(stats.totalArea) },
    { key: 'last', label: 'Ultima pulizia', value: lastClean },
    ...(stats.avgTime !== null ? [{ key: 'avgTime', label: 'Durata media', value: formatCompact(stats.avgTime, 0), unit: 'min' }] : []),
    ...(stats.avgArea !== null ? [{ key: 'avgArea', label: 'Area media', value: formatCompact(stats.avgArea, 1), unit: areaUnit }] : []),
  ];

  const hasRooms = registry.areas.length > 0 || roomOptions.length > 0 || roomScripts.length > 0;
  const roomDomain = roomSelect?.startsWith('input_select.') ? 'input_select' : 'select';

  return (
    <DetailsBody>
      <Section title="Stato" icon="vacuum">
        <div className="utility-split">
          <div className="utility-stack">
            <Body size="md" tone={isErrorState(entity.state) ? 'danger' : 'ink'} aria-live="polite">
              {statusText}
            </Body>
            <div className="utility-chips">
              {stats.room && (
                <Chip icon="location" label={`Stanza: ${stats.room}`}>
                  {stats.room}
                </Chip>
              )}
              {isErrorState(entity.state) && (
                <Chip icon="warning" tone="danger">
                  Richiede attenzione
                </Chip>
              )}
            </div>
          </div>
          {stats.battery !== null && (
            <div className="utility-stack">
              <Caption>Batteria {formatCompact(stats.battery, 0)}%</Caption>
              <Meter value={stats.battery} label="Batteria dell’aspirapolvere" low={stats.battery < 20} />
            </div>
          )}
        </div>
        <div className="utility-actions">
          <Button
            variant={primary === 'start' ? 'primary' : 'control'}
            size="md"
            loading={pending === primary}
            disabled={unavailable}
            onClick={() =>
              send({
                key: primary,
                domain: 'vacuum',
                service: primary,
                confirm: stateIn(...VACUUM_CONFIRM[primary]),
              })
            }
          >
            <UtilityIcon name={primary === 'start' ? 'play' : primary === 'pause' ? 'pause' : 'stop'} size="md" />
            {PRIMARY_LABEL[primary]}
          </Button>
          {features.canReturnToBase && (
            <Button
              variant="control"
              size="md"
              loading={pending === 'dock'}
              disabled={unavailable}
              onClick={() =>
                send({ key: 'dock', domain: 'vacuum', service: 'return_to_base', confirm: stateIn(...VACUUM_CONFIRM.dock) })
              }
            >
              <UtilityIcon name="home" size="md" />
              Torna alla base
            </Button>
          )}
          {features.canLocate && (
            <Button
              variant="control"
              size="md"
              loading={pending === 'locate'}
              disabled={unavailable}
              onClick={() => send({ key: 'locate', domain: 'vacuum', service: 'locate' })}
            >
              <UtilityIcon name="search" size="md" />
              Trova
            </Button>
          )}
        </div>
        {unavailable && <Notice icon="wifi">Il dispositivo non è raggiungibile: i comandi sono sospesi.</Notice>}
        {notice && (
          <Notice tone={notice.tone} icon="warning" live>
            {notice.text}
          </Notice>
        )}
      </Section>

      {(features.canSetFanSpeed || mop.available) && (
        <Section title="Pulizia" icon="fan">
          <div className="utility-toolbar">
            {features.canSetFanSpeed && (
              <OptionPicker
                label="Aspirazione"
                value={fanSpeed}
                options={fanSpeeds(entity).map((speed) => ({ value: speed, label: speed }))}
                pending={pending === 'fan'}
                disabled={unavailable}
                onSelect={(value) =>
                  send({
                    key: 'fan',
                    domain: 'vacuum',
                    service: 'set_fan_speed',
                    data: { entity_id: id, fan_speed: value },
                    confirm: (current) => stringAttr(current, 'fan_speed') === value,
                  })
                }
              />
            )}
            {mop.available && (
              <OptionPicker
                label="Lavaggio"
                value={mop.current}
                options={mop.options.map((option) => ({ value: option, label: option }))}
                pending={pending === 'mop'}
                disabled={unavailable}
                onSelect={(value) => {
                  const controlId = mop.entityId;
                  if (controlId) {
                    const domain = controlId.split('.')[0] ?? 'select';
                    send({
                      key: 'mop',
                      domain,
                      service: 'select_option',
                      data: { entity_id: controlId, option: value },
                    });
                    return;
                  }
                  send({
                    key: 'mop',
                    domain: 'vacuum',
                    service: 'set_mop_intensity',
                    data: { entity_id: id, mop_intensity: value },
                  });
                }}
              />
            )}
          </div>
        </Section>
      )}

      {(hasRooms || registry.loading) && (
        <Section title="Stanze" icon="room">
          {registry.loading && registry.areas.length === 0 ? (
            <Skeleton variant="list" rows={1} label="Caricamento delle stanze…" />
          ) : null}
          {registry.areas.length > 0 && (
            <div className="utility-stack">
              <Caption>Scegli le aree da pulire</Caption>
              <div className="utility-toolbar" role="group" aria-label="Aree da pulire">
                {registry.areas.map((area) => {
                  const chosen = selectedAreas.includes(area.area_id);
                  return (
                    <Button
                      key={area.area_id}
                      variant="control"
                      size="sm"
                      aria-pressed={chosen}
                      onClick={() =>
                        setSelectedAreas((current) =>
                          chosen ? current.filter((item) => item !== area.area_id) : [...current, area.area_id]
                        )
                      }
                    >
                      {area.name ?? area.area_id}
                    </Button>
                  );
                })}
              </div>
              <div className="utility-toolbar">
                <Button
                  variant="primary"
                  size="md"
                  disabled={selectedAreas.length === 0 || unavailable}
                  loading={pending === 'areas'}
                  onClick={() => {
                    send({
                      key: 'areas',
                      domain: 'vacuum',
                      service: 'clean_area',
                      data: { target: { entity_id: id }, cleaning_area_id: selectedAreas },
                    });
                    setSelectedAreas([]);
                  }}
                >
                  {selectedAreas.length > 0
                    ? `Pulisci ${selectedAreas.length} ${selectedAreas.length === 1 ? 'area' : 'aree'}`
                    : 'Pulisci le aree scelte'}
                </Button>
              </div>
            </div>
          )}
          {roomSelect && roomOptions.length > 0 && (
            <div className="utility-toolbar">
              <OptionPicker
                label="Stanza"
                value={selectedRoom ?? (roomOptions.includes(entities[roomSelect]?.state ?? '') ? entities[roomSelect]?.state ?? null : roomOptions[0] ?? null)}
                options={roomOptions.map((option) => ({ value: option, label: option }))}
                onSelect={setSelectedRoom}
              />
              <Button
                variant="control"
                size="md"
                loading={pending === 'room'}
                disabled={unavailable}
                onClick={() => {
                  const fallback = roomOptions.includes(entities[roomSelect]?.state ?? '') ? entities[roomSelect]?.state : roomOptions[0];
                  const option = selectedRoom ?? fallback;
                  if (!option) return;
                  send({
                    key: 'room',
                    domain: roomDomain,
                    service: 'select_option',
                    data: { entity_id: roomSelect, option },
                  });
                }}
              >
                Pulisci la stanza
              </Button>
            </div>
          )}
          {roomScripts.length > 0 && (
            <div className="utility-toolbar">
              {roomScripts.map((script) => (
                <CommandButton
                  key={script.entityId}
                  entity={entities[script.entityId]}
                  domain="script"
                  service="turn_on"
                  data={{ entity_id: script.entityId }}
                  icon="play"
                >
                  {script.label}
                </CommandButton>
              ))}
            </div>
          )}
          {!registry.loading && !hasRooms && <Caption>Nessuna stanza configurata per questo dispositivo.</Caption>}
        </Section>
      )}

      {mapIds.length > 0 && (
        <Section
          title="Mappa"
          icon="map"
          aside={
            <span className="utility-inline">
              <Caption>{showMap ? 'Visibile' : 'Nascosta'}</Caption>
              <Toggle
                checked={showMap}
                compact
                onLabel="Visibile"
                offLabel="Nascosta"
                aria-label="Mostra la mappa"
                onClick={() => {
                  const next = !showMap;
                  setShowMap(next);
                  writeStorage(keys.showMap, String(next));
                }}
              />
            </span>
          }
        >
          {showMap && (
            <>
              <div className="utility-toolbar">
                {mapIds.length > 1 && (
                  <OptionPicker
                    label="Mappa"
                    value={activeMap}
                    options={mapIds.map((mapId) => ({ value: mapId, label: friendlyName(entities[mapId], mapId) }))}
                    onSelect={(value) => {
                      setSelectedMap(value);
                      writeStorage(keys.selectedMap, value);
                    }}
                  />
                )}
                <Button variant="control" shape="circle" size="md" aria-label="Riduci la mappa" disabled={mapScale <= 1} onClick={() => setMapScale((value) => Math.max(1, value - 0.25))}>
                  <UtilityIcon name="minus" size="md" />
                </Button>
                <Button variant="control" shape="circle" size="md" aria-label="Ingrandisci la mappa" disabled={mapScale >= 4} onClick={() => setMapScale((value) => Math.min(4, value + 0.25))}>
                  <UtilityIcon name="add" size="md" />
                </Button>
                <Button variant="control" shape="circle" size="md" aria-label="Aggiorna la mappa" onClick={() => setRefreshKey((value) => value + 1)}>
                  <UtilityIcon name="refresh" size="md" />
                </Button>
              </div>
              {mapUrl ? (
                <div className={materialClass({ behavior: 'well', shape: 'card', size: 'inherit' }, 'utility-map')}>
                  <MaterialLayers element="div">
                    <div
                      className="utility-map__viewport"
                      tabIndex={0}
                      role="region"
                      aria-label="Mappa dell’aspirapolvere, scorrevole quando ingrandita"
                    >
                      <img
                        src={`${mapUrl}${mapUrl.includes('?') ? '&' : '?'}t=${refreshKey}`}
                        alt={`Mappa di ${friendlyName(entity, 'aspirapolvere')}`}
                        style={{ width: `${mapScale * 100}%` }}
                      />
                    </div>
                  </MaterialLayers>
                </div>
              ) : (
                <Notice icon="map">La mappa scelta non ha un’immagine disponibile.</Notice>
              )}
            </>
          )}
        </Section>
      )}

      <Section title="Statistiche" icon="chart">
        {history.some((item) => item.value !== '--') ? (
          <StatList items={history.filter((item) => item.value !== '--')} />
        ) : (
          <Caption>Il dispositivo non fornisce statistiche di pulizia.</Caption>
        )}
      </Section>

      {consumables.length > 0 && (
        <Section title="Manutenzione" icon="timer">
          <ul className="utility-list">
            {consumables.map((item) => (
              <li className="utility-list__row" key={item.key}>
                <span className="utility-list__main">
                  <Body as="span" size="sm" tone="ink">
                    {item.label}
                  </Body>
                  {item.percent !== null && (
                    <Meter value={item.percent} label={`Durata residua: ${item.label}`} low={item.percent < 20} valueText={`${item.percent}%`} />
                  )}
                </span>
                <span className="utility-list__end">
                  {item.percent !== null && <Caption>{item.percent}%</Caption>}
                  {item.buttonId && (
                    <Button
                      variant="control"
                      size="sm"
                      loading={pending === `reset-${item.key}`}
                      onClick={() => {
                        if (resetConfirm !== item.key) {
                          setResetConfirm(item.key);
                          return;
                        }
                        setResetConfirm(null);
                        send({ key: `reset-${item.key}`, domain: 'button', service: 'press', data: { entity_id: item.buttonId } });
                      }}
                    >
                      {resetConfirm === item.key ? 'Conferma azzeramento' : 'Azzera'}
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {diagnostics.length > 0 && (
        <Section title="Diagnostica" icon="sensor">
          <ul className="utility-list">
            {diagnostics.map((item) => (
              <li className="utility-list__row" key={item.key}>
                <span className="utility-list__main">
                  <Body as="span" size="sm" tone="ink">
                    {item.label}
                  </Body>
                </span>
                <span className="utility-list__end">
                  {item.warn ? (
                    <Chip icon="warning" tone="danger">
                      {item.text}
                    </Chip>
                  ) : (
                    <Caption>{item.text}</Caption>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {advanced.length > 0 && (
        <Section title="Altri sensori" icon="sensor">
          <Button variant="control" size="sm" aria-expanded={telemetryOpen} aria-controls={telemetryId} onClick={() => setTelemetryOpen((value) => !value)}>
            {telemetryOpen ? 'Nascondi' : `Mostra ${advanced.length} sensori`}
          </Button>
          {telemetryOpen && (
            <ul className="utility-list" id={telemetryId}>
              {advanced.map((item) => (
                <li className="utility-list__row" key={item.id}>
                  <span className="utility-list__main">
                    <Body as="span" size="sm" tone="ink" className="utility-truncate">
                      {item.label}
                    </Body>
                  </span>
                  <span className="utility-list__end">
                    <Caption>
                      {formatCompact(parseNumber(item.value), 1, item.value)}
                      {item.unit ? ` ${item.unit}` : ''}
                    </Caption>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </DetailsBody>
  );
}
