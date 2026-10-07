import { useEffect, useMemo, useState } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import { Body, Caption, Field, Heading, Numeric, Segmented, Skeleton, Surface } from '@/components/primitives';
import type { PageKindProps } from '@/@types/launcher';
import { getAreas } from '@/api/haClient';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { Meter } from '../shared/UtilityCard';
import { OptionPicker } from '../shared/details';
import { UtilityIcon } from '../shared/UtilityIcon';
import {
  BATTERY_FILTERS,
  BATTERY_SORTS,
  arrangeBatteries,
  batteryArea,
  batteryEntities,
  batteryLevel,
  batteryName,
  batteryStatus,
  isBatteryFilter,
  isBatterySort,
  isCharging,
  type BatteryFilter,
  type BatterySort,
} from './batteryData';
import '../utilities.css';

function BatteryRow({ entity, area }: { entity: HassEntity; area: string | null }) {
  const status = batteryStatus(entity);
  const level = batteryLevel(entity);
  const charging = isCharging(entity);
  const name = batteryName(entity);
  const statusText =
    status === 'unavailable' ? 'Non disponibile' : charging ? 'In carica' : status === 'low' ? 'Scarica' : 'Carica';
  return (
    <li className="utility-list__row">
      <UtilityIcon
        name={status === 'low' ? 'batteryLow' : charging ? 'batteryCharging' : status === 'unavailable' ? 'wifi' : 'battery'}
        size="lg"
        color={status === 'low' ? 'var(--aca-danger-ink-icon)' : charging ? 'var(--aca-orange-ink-icon)' : 'var(--aca-ink-muted)'}
      />
      <span className="utility-list__main">
        <Body as="span" size="sm" tone="ink" className="utility-truncate" title={entity.entity_id}>
          {name}
        </Body>
        <Caption tone={status === 'low' ? 'danger' : 'muted'}>
          {statusText}
          {area ? ` · ${area}` : ''}
        </Caption>
        {level !== null && status !== 'unavailable' && (
          <Meter value={level} label={`Batteria di ${name}`} low={status === 'low'} valueText={`${level}%`} />
        )}
      </span>
      <span className="utility-list__end">
        <Numeric className="utility-value utility-value--sm">{level === null || status === 'unavailable' ? '--' : `${level}%`}</Numeric>
      </span>
    </li>
  );
}

/**
 * Battery page (legacy BatteryPage): every `device_class: battery` entity with search,
 * status filters and sorting. Sort and filter live in the page settings (`batterySort`,
 * `batteryFilter`) given by the launcher: the page reads and saves them there.
 */
export function BatteryPage({ pageId, settings, onSaveSetting }: PageKindProps) {
  const runtime = useWidgetRuntime();
  const { conn, entities, entitiesLoaded } = runtime;
  const [search, setSearch] = useState('');
  const sort: BatterySort = isBatterySort(settings.batterySort) ? settings.batterySort : 'level';
  const filter: BatteryFilter = isBatteryFilter(settings.batteryFilter) ? settings.batteryFilter : 'all';
  const [areas, setAreas] = useState<Map<string, string>>(() => new Map());

  useEffect(() => {
    if (!conn) return undefined;
    let cancelled = false;
    getAreas(conn)
      .then((list) => {
        if (!cancelled) setAreas(new Map(list.map((area) => [area.area_id, area.name ?? area.area_id])));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [conn]);

  const all = useMemo(() => batteryEntities(entities), [entities]);
  const areaOf = (entity: HassEntity) => batteryArea(entity, areas);
  const counts = {
    all: all.length,
    low: all.filter((entity) => batteryStatus(entity) === 'low').length,
    unavailable: all.filter((entity) => batteryStatus(entity) === 'unavailable').length,
    ok: 0,
  };
  counts.ok = counts.all - counts.low - counts.unavailable;
  const list = arrangeBatteries(all, { filter, search, sort, areaOf });

  const groups = new Map<string, HassEntity[]>();
  if (sort === 'area') {
    for (const entity of list) {
      const area = areaOf(entity) ?? 'Senza stanza';
      groups.set(area, [...(groups.get(area) ?? []), entity]);
    }
  }

  const changeSort = (value: string) => {
    if (isBatterySort(value)) onSaveSetting('batterySort', value);
  };
  const changeFilter = (value: BatteryFilter) => onSaveSetting('batteryFilter', value);

  const summary = [
    counts.low > 0 ? `${counts.low} ${counts.low === 1 ? 'scarica' : 'scariche'}` : null,
    `${counts.all} in totale`,
    counts.unavailable > 0 ? `${counts.unavailable} non ${counts.unavailable === 1 ? 'disponibile' : 'disponibili'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const panel = (entitiesList: HassEntity[]) => (
    <Surface className="utility-panel">
      <ul className="utility-list">
        {entitiesList.map((entity) => (
          <BatteryRow key={entity.entity_id} entity={entity} area={areaOf(entity)} />
        ))}
      </ul>
    </Surface>
  );

  return (
    <div className="utility-page" data-page={pageId}>
      <header className="utility-page__head">
        <div className="utility-page__title">
          {entitiesLoaded && <Body size="sm" tone={counts.low > 0 ? 'danger' : 'muted'}>{summary}</Body>}
        </div>
      </header>

      {!entitiesLoaded ? (
        <Skeleton variant="list" rows={4} label="Caricamento delle batterie…" />
      ) : all.length === 0 ? (
        <div className="utility-empty">
          <UtilityIcon name="battery" size="lg" color="var(--aca-ink-muted)" />
          <Body size="md" tone="ink">
            Nessun sensore di batteria trovato.
          </Body>
          <Caption>Le entità con classe di dispositivo «batteria» compaiono qui da sole.</Caption>
        </div>
      ) : (
        <>
          <div className="utility-page__tools">
            <Field
              label="Cerca una batteria"
              icon="search"
              type="search"
              placeholder="Cerca per nome o stanza"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <OptionPicker
              label="Ordina"
              value={sort}
              options={BATTERY_SORTS}
              onSelect={changeSort}
            />
          </div>
          <Segmented<BatteryFilter>
            label="Filtra per stato"
            size="sm"
            value={filter}
            onChange={changeFilter}
            options={BATTERY_FILTERS.filter((option) => option.value === 'all' || counts[option.value] > 0 || option.value === filter).map(
              (option) => ({ value: option.value, label: `${option.label} (${counts[option.value]})` })
            )}
          />
          {list.length === 0 ? (
            <Body size="sm" tone="muted" role="status">
              {search.trim() ? 'Nessuna batteria corrisponde alla ricerca.' : 'Nessuna batteria in questo filtro.'}
            </Body>
          ) : sort === 'area' ? (
            [...groups.entries()].map(([area, items]) => {
              const low = items.filter((entity) => batteryStatus(entity) === 'low').length;
              return (
                <section className="utility-group" key={area} aria-label={area}>
                  <div className="utility-group__head">
                    <Heading level={2} size="sm" tone="ink">
                      {area}
                    </Heading>
                    <span className="utility-group__rule" />
                    <Caption tone={low > 0 ? 'danger' : 'muted'}>
                      {low > 0 ? `${low} ${low === 1 ? 'scarica' : 'scariche'} su ${items.length}` : items.length}
                    </Caption>
                  </div>
                  {panel(items)}
                </section>
              );
            })
          ) : (
            panel(list)
          )}
        </>
      )}
    </div>
  );
}
