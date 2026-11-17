import { useMemo, useState } from 'react';
import {
  Body,
  Button,
  Caption,
  Field,
  MaterialLayers,
  Skeleton,
  materialClass,
} from '@/components/primitives';
import type { HaAreaEntry } from '@/@types/ha';
import type { PageKindProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { formatCompact, lightsOnText } from '../shared/format';
import { Chip, IconWell, Notice } from '../shared/UtilityCard';
import { OptionPicker } from '../shared/details';
import { UtilityIcon } from '../shared/UtilityIcon';
import { RoomScope } from '../room/RoomScope';
import { RoomExplorer } from '../room/RoomExplorer';
import { useRoomRegistry } from '../room/useRoomMembership';
import {
  EMPTY_STATS,
  ROOM_SORTS,
  areaStats,
  entitiesByArea,
  isRoomSort,
  sortAreas,
  type AreaStats,
  type RoomSort,
} from './roomsData';
import '../utilities.css';

function RoomTile({
  area,
  stats,
  onSelect,
}: {
  area: HaAreaEntry;
  stats: AreaStats;
  onSelect: () => void;
}) {
  const name = area.name ?? area.area_id;
  const active = stats.lightsOn > 0 || stats.activeCount > 0;
  const temperature = { value: stats.temperature, unit: stats.temperatureUnit ?? '' };
  return (
    <button
      type="button"
      className={materialClass({ behavior: 'press', shape: 'card' }, 'utility-tile')}
      aria-label={`${name}: ${stats.totalCount} entità${stats.lightsOn > 0 ? `, ${lightsOnText(stats.lightsOn)}` : ''}`}
      onClick={onSelect}
    >
      <MaterialLayers>
        <span className="utility-head">
          <IconWell icon="room" tone={active ? 'active' : null} />
          <span className="utility-head__text">
            <Body as="span" size="md" tone="ink" className="utility-truncate">
              {name}
            </Body>
            <Caption>{stats.totalCount} entità</Caption>
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
          {stats.humidity !== null && <Chip icon="humidity">{stats.humidity}{stats.humidityUnit ? ` ${stats.humidityUnit}` : ''}</Chip>}
          {stats.activeCount > 0 && (
            <Chip icon="energy">{`${stats.activeCount} ${stats.activeCount === 1 ? 'attivo' : 'attivi'}`}</Chip>
          )}
          {stats.unavailableCount > 0 && (
            <Chip icon="wifi" tone="danger">
              {stats.unavailableCount} non disponibili
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
  const { entities } = runtime;
  const load = useRoomRegistry();
  const sort: RoomSort = isRoomSort(settings.roomSort) ? settings.roomSort : 'name-az';
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const areas = useMemo(() => load.registry?.areas ?? [], [load.registry]);
  const areaIds = useMemo(() => load.registry ? entitiesByArea(load.registry.areas, load.registry.entities, load.registry.devices) : {}, [load.registry]);
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
  };

  if (selectedArea) return <RoomScope settings={{ areaId: selectedArea.area_id, areaName: selectedArea.name, roomMembershipSource: 'area' }}>
    {resolved => <RoomExplorer pageId={pageId} name={selectedArea.name ?? selectedArea.area_id} settings={resolved} onBack={() => open(null)} />}
  </RoomScope>;

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
          Non c’è collegamento con la casa: le stanze non si possono leggere.
        </Notice>
      ) : load.status === 'error' ? (
        <Notice icon="warning" tone="danger">
          Impossibile leggere le stanze.
          <Button variant="control" onClick={load.retry}>Riprova</Button>
        </Notice>
      ) : load.status === 'loading' ? (
        <Skeleton variant="list" rows={4} label="Caricamento delle stanze…" />
      ) : areas.length === 0 ? (
        <div className="utility-empty">
          <UtilityIcon name="room" size="lg" color="var(--aca-ink-muted)" />
          <Body size="md" tone="ink">
            Nessuna stanza trovata.
          </Body>
          <Caption>Le stanze compaiono qui quando la casa ha delle aree.</Caption>
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
