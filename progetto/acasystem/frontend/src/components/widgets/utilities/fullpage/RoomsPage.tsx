import { useEffect, useMemo, useState } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import {
  Body,
  Button,
  Caption,
  Field,
  Heading,
  MaterialLayers,
  Skeleton,
  Surface,
  materialClass,
} from '@/components/primitives';
import type { HaAreaEntry } from '@/@types/ha';
import type { PageKindProps } from '@/@types/launcher';
import { getAreas, getDeviceRegistry, getEntityRegistry } from '@/api/haClient';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { domainOf, friendlyName } from '../shared/entity';
import { formatCompact, lightsOnText } from '../shared/format';
import { Chip, IconWell, Notice, callAll } from '../shared/UtilityCard';
import { OptionPicker } from '../shared/details';
import { UtilityIcon } from '../shared/UtilityIcon';
import { temperatureReading } from '../shared/units';
import { EntityRow, domainIcon } from '../room/EntityRow';
import { domainLabel } from '../room/RoomDetails';
import {
  EMPTY_STATS,
  ROOM_SORTS,
  areaStats,
  domainPriority,
  entitiesByArea,
  isRoomSort,
  sortAreas,
  type AreaStats,
  type RoomSort,
} from './roomsData';
import '../utilities.css';

type LoadState =
  | { status: 'offline' | 'loading' | 'error' }
  | { status: 'ready'; areas: HaAreaEntry[]; ids: Record<string, string[]> };

function RoomTile({
  area,
  stats,
  onSelect,
}: {
  area: HaAreaEntry;
  stats: AreaStats;
  onSelect: () => void;
}) {
  const { haConfig } = useWidgetRuntime();
  const name = area.name ?? area.area_id;
  const active = stats.lightsOn > 0 || stats.activeCount > 0;
  const temperature = temperatureReading(stats.temperature, stats.temperatureUnit, haConfig);
  return (
    <button
      type="button"
      className={materialClass({ behavior: 'press', shape: 'card' }, 'utility-tile')}
      aria-label={`${name}: ${stats.totalCount} dispositivi${stats.lightsOn > 0 ? `, ${lightsOnText(stats.lightsOn)}` : ''}`}
      onClick={onSelect}
    >
      <MaterialLayers>
        <span className="utility-head">
          <IconWell icon="room" tone={active ? 'active' : null} />
          <span className="utility-head__text">
            <Body as="span" size="md" tone="ink" className="utility-truncate">
              {name}
            </Body>
            <Caption>{stats.totalCount} dispositivi</Caption>
          </span>
        </span>
        <span className="utility-chips" aria-hidden="true">
          {stats.lightsOn > 0 && (
            <Chip icon="light" tone="active">
              {stats.lightsOn}/{stats.lightsTotal}
            </Chip>
          )}
          {temperature.value !== null && (
            <Chip icon="thermostat">{`${formatCompact(temperature.value, 1)} ${temperature.unit}`}</Chip>
          )}
          {stats.humidity !== null && <Chip icon="humidity">{stats.humidity}%</Chip>}
          {stats.activeCount > 0 && (
            <Chip icon="energy">{`${stats.activeCount} ${stats.activeCount === 1 ? 'attivo' : 'attivi'}`}</Chip>
          )}
          {stats.unavailableCount > 0 && (
            <Chip icon="wifi" tone="danger">
              {stats.unavailableCount} offline
            </Chip>
          )}
        </span>
      </MaterialLayers>
    </button>
  );
}

/**
 * Rooms page (legacy RoomExplorerPage): the Home Assistant areas with their statistics, then
 * the devices of one area grouped by domain with the same quick controls. The sort lives in
 * the page settings (`roomSort`) given by the launcher.
 */
export function RoomsPage({ pageId, settings, onSaveSetting }: PageKindProps) {
  const runtime = useWidgetRuntime();
  const { conn, entities, callService } = runtime;
  const sort: RoomSort = isRoomSort(settings.roomSort) ? settings.roomSort : 'name-az';
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState('all');
  const [load, setLoad] = useState<LoadState>({ status: conn ? 'loading' : 'offline' });
  const [lightsError, setLightsError] = useState(false);

  useEffect(() => {
    if (!conn) {
      setLoad({ status: 'offline' });
      return undefined;
    }
    let cancelled = false;
    setLoad({ status: 'loading' });
    Promise.all([getAreas(conn), getEntityRegistry(conn), getDeviceRegistry(conn)])
      .then(([areas, entityRegistry, deviceRegistry]) => {
        if (!cancelled)
          setLoad({
            status: 'ready',
            areas,
            ids: entitiesByArea(areas, entityRegistry, deviceRegistry),
          });
      })
      .catch(() => {
        if (!cancelled) setLoad({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [conn]);

  const areas = useMemo(() => (load.status === 'ready' ? load.areas : []), [load]);
  const areaIds = useMemo<Record<string, string[]>>(
    () => (load.status === 'ready' ? load.ids : {}),
    [load]
  );
  const stats = useMemo(() => {
    const result: Record<string, AreaStats> = {};
    for (const area of areas)
      result[area.area_id] = areaStats(areaIds[area.area_id] ?? [], entities);
    return result;
  }, [areas, areaIds, entities]);

  const selectedArea = areas.find((area) => area.area_id === selected) ?? null;
  const term = search.trim().toLowerCase();

  const changeSort = (value: string) => {
    if (isRoomSort(value)) onSaveSetting('roomSort', value);
  };
  const open = (areaId: string | null) => {
    setSelected(areaId);
    setSearch('');
    setDomainFilter('all');
    setLightsError(false);
  };

  // ── Detail of one area ────────────────────────────────────────────────────────────
  if (selectedArea) {
    const ids = (areaIds[selectedArea.area_id] ?? []).filter((id) => entities[id]);
    const domains = [...new Set(ids.map(domainOf))].sort(
      (a, b) => domainPriority(a) - domainPriority(b)
    );
    const visible = ids.filter((id) => {
      if (domainFilter !== 'all' && domainOf(id) !== domainFilter) return false;
      if (!term) return true;
      return (
        friendlyName(entities[id], id).toLowerCase().includes(term) ||
        id.toLowerCase().includes(term)
      );
    });
    const groups = domains
      .map((domain) => [domain, visible.filter((id) => domainOf(id) === domain)] as const)
      .filter(([, list]) => list.length > 0);
    const lights = ids.filter((id) => id.startsWith('light.'));
    const lightsOn = lights.filter((id) => entities[id]?.state === 'on').length;
    const toggleLights = () => {
      const service = lightsOn > 0 ? 'turn_off' : 'turn_on';
      setLightsError(false);
      Promise.allSettled(
        lights.map((id) => callAll(() => callService('light', service, { entity_id: id })))
      ).then((results) => setLightsError(results.some((result) => result.status === 'rejected')));
    };

    return (
      <div className="utility-page" data-page={pageId}>
        <header className="utility-page__head">
          <Button
            variant="control"
            shape="circle"
            size="md"
            aria-label="Torna alle stanze"
            onClick={() => open(null)}
          >
            <UtilityIcon name="chevronLeft" size="md" />
          </Button>
          <div className="utility-page__title">
            <Heading level={2} size="md">
              {selectedArea.name ?? selectedArea.area_id}
            </Heading>
            <Body size="sm" tone="muted">
              {visible.length} dispositivi
            </Body>
          </div>
        </header>
        <div className="utility-page__tools">
          <Field
            label="Cerca un dispositivo"
            icon="search"
            type="search"
            placeholder="Cerca un dispositivo"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {domains.length > 1 && (
          <div className="utility-toolbar" role="group" aria-label="Filtra per tipo">
            <Button
              variant="control"
              size="sm"
              aria-pressed={domainFilter === 'all'}
              onClick={() => setDomainFilter('all')}
            >
              Tutti
            </Button>
            {domains.map((domain) => (
              <Button
                key={domain}
                variant="control"
                size="sm"
                aria-pressed={domainFilter === domain}
                onClick={() => setDomainFilter(domainFilter === domain ? 'all' : domain)}
              >
                <UtilityIcon name={domainIcon(domain)} size="sm" />
                {`${domainLabel(domain)} (${ids.filter((id) => domainOf(id) === domain).length})`}
              </Button>
            ))}
          </div>
        )}
        {lights.length > 0 && (
          <Surface className="utility-panel">
            <div className="utility-list__row">
              <UtilityIcon
                name="light"
                size="lg"
                color={lightsOn > 0 ? 'var(--aca-orange-ink-icon)' : 'var(--aca-ink-muted)'}
              />
              <span className="utility-list__main">
                <Body as="span" size="sm" tone="ink">
                  {`${lightsOn} su ${lights.length} ${lights.length === 1 ? 'luce accesa' : 'luci accese'}`}
                </Body>
              </span>
              <span className="utility-list__end">
                <Button variant="control" size="sm" onClick={toggleLights}>
                  {lightsOn > 0 ? 'Spegni tutte' : 'Accendi tutte'}
                </Button>
              </span>
              {lightsError && (
                <span className="utility-list__wide">
                  <Notice tone="danger" icon="warning" live>
                    Alcune luci non hanno risposto. Riprova.
                  </Notice>
                </span>
              )}
            </div>
          </Surface>
        )}
        {groups.length === 0 ? (
          <Body size="sm" tone="muted" role="status">
            {term
              ? 'Nessun dispositivo corrisponde alla ricerca.'
              : 'Nessun dispositivo in questa stanza.'}
          </Body>
        ) : (
          groups.map(([domain, list]) => (
            <section className="utility-group" key={domain} aria-label={domainLabel(domain)}>
              <div className="utility-group__head">
                <UtilityIcon name={domainIcon(domain)} size="md" color="var(--aca-ink-muted)" />
                <Heading level={3} size="sm" tone="ink">
                  {domainLabel(domain)}
                </Heading>
                <span className="utility-group__rule" />
                <Caption>{list.length}</Caption>
              </div>
              <Surface className="utility-panel">
                <ul className="utility-list">
                  {list.map((id) => (
                    <EntityRow key={id} entityId={id} entity={entities[id] as HassEntity} />
                  ))}
                </ul>
              </Surface>
            </section>
          ))
        )}
      </div>
    );
  }

  // ── Overview of the areas ─────────────────────────────────────────────────────────
  const sorted = sortAreas(areas, sort, stats);
  const filtered = term
    ? sorted.filter((area) => (area.name ?? '').toLowerCase().includes(term))
    : sorted;
  const totals = Object.values(stats).reduce(
    (sum, item) => ({ active: sum.active + item.activeCount, lights: sum.lights + item.lightsOn }),
    { active: 0, lights: 0 }
  );

  return (
    <div className="utility-page" data-page={pageId}>
      <header className="utility-page__head">
        <div className="utility-page__title">
          {load.status === 'ready' && (
            <Body size="sm" tone="muted">
              {[
                `${areas.length} ${areas.length === 1 ? 'stanza' : 'stanze'}`,
                totals.lights > 0 ? lightsOnText(totals.lights) : null,
                `${totals.active} ${totals.active === 1 ? 'attivo' : 'attivi'}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Body>
          )}
        </div>
      </header>
      {load.status === 'offline' ? (
        <Notice icon="wifi">
          Le stanze arrivano da Home Assistant: il collegamento non è attivo.
        </Notice>
      ) : load.status === 'error' ? (
        <Notice icon="warning" tone="danger">
          Impossibile leggere le stanze da Home Assistant. Riprova più tardi.
        </Notice>
      ) : load.status === 'loading' ? (
        <Skeleton variant="list" rows={4} label="Caricamento delle stanze…" />
      ) : areas.length === 0 ? (
        <div className="utility-empty">
          <UtilityIcon name="room" size="lg" color="var(--aca-ink-muted)" />
          <Body size="md" tone="ink">
            Nessuna stanza in Home Assistant.
          </Body>
          <Caption>Crea le aree in Home Assistant per vederle qui.</Caption>
        </div>
      ) : (
        <>
          <div className="utility-page__tools">
            <Field
              label="Cerca una stanza"
              icon="search"
              type="search"
              placeholder="Cerca una stanza"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <OptionPicker label="Ordina" value={sort} options={ROOM_SORTS} onSelect={changeSort} />
          </div>
          {filtered.length === 0 ? (
            <Body size="sm" tone="muted" role="status">
              Nessuna stanza corrisponde alla ricerca.
            </Body>
          ) : (
            <div className="utility-page__grid">
              {filtered.map((area) => (
                <RoomTile
                  key={area.area_id}
                  area={area}
                  stats={stats[area.area_id] ?? EMPTY_STATS}
                  onSelect={() => open(area.area_id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
