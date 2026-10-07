import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import {
  Body,
  Button,
  Caption,
  Field,
  Heading,
  IconText,
  Popover,
  SelectTrigger,
  Skeleton,
  Slider,
  Surface,
  Text,
} from '@/components/primitives';
import type { PageSettings } from '@/@types/dashboard';
import type { PageKindProps } from '@/@types/launcher';
import { getAreas } from '@/api/haClient';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { CommandFeedback } from '../shared/CommandFeedback';
import { ControlIcon, aliasIcon } from '../shared/ControlIcon';
import { isUnavailableState, numberAttr, stringAttr } from '../shared/entity';
import { COMMON_LABELS } from '../shared/labels';
import { callQuietly } from '../shared/service';
import { BrightnessKnob } from './BrightnessKnob';
import { groupMembers } from './lightModel';
import { useLightControl } from './useLightControl';
import '../controls.css';

export type LightsSort = 'status' | 'name-az' | 'name-za' | 'brightness' | 'area' | 'unavailable';

export const LIGHTS_SORT_OPTIONS: ReadonlyArray<{ value: LightsSort; label: string }> = [
  { value: 'status', label: 'Stato' },
  { value: 'name-az', label: 'Nome A→Z' },
  { value: 'name-za', label: 'Nome Z→A' },
  { value: 'brightness', label: 'Luminosità' },
  { value: 'area', label: 'Stanza' },
  { value: 'unavailable', label: 'Non disponibili' },
];

const isSort = (value: unknown): value is LightsSort =>
  LIGHTS_SORT_OPTIONS.some((option) => option.value === value);

const nameOf = (entity: HassEntity) =>
  stringAttr(entity, 'friendly_name') || entity.entity_id.split('.')[1] || entity.entity_id;
const brightnessOf = (entity: HassEntity) => numberAttr(entity, 'brightness') ?? 0;
const isOn = (entity: HassEntity) => entity.state === 'on';
const byName = (a: HassEntity, b: HassEntity) => nameOf(a).localeCompare(nameOf(b), 'it');

/** Sorting of the legacy LightsPage, with the same tie-breakers. */
export function sortLights(
  lights: HassEntity[],
  sort: LightsSort,
  areaOf: (entity: HassEntity) => string | null
): HassEntity[] {
  const list = [...lights];
  const comparators: Record<LightsSort, (a: HassEntity, b: HassEntity) => number> = {
    status: (a, b) =>
      Number(!isOn(a)) - Number(!isOn(b)) || brightnessOf(b) - brightnessOf(a) || byName(a, b),
    'name-az': byName,
    'name-za': (a, b) => byName(b, a),
    brightness: (a, b) =>
      (isOn(b) ? brightnessOf(b) : -1) - (isOn(a) ? brightnessOf(a) : -1) || byName(a, b),
    area: (a, b) =>
      (areaOf(a) ?? '￿').localeCompare(areaOf(b) ?? '￿', 'it') ||
      Number(!isOn(a)) - Number(!isOn(b)) ||
      byName(a, b),
    unavailable: (a, b) =>
      Number(!isUnavailableState(a.state)) - Number(!isUnavailableState(b.state)) || byName(a, b),
  };
  return list.sort(comparators[sort]);
}

function LightTile({ entity, areaName }: { entity: HassEntity; areaName: string | null }) {
  const control = useLightControl(entity.entity_id);
  const name = nameOf(entity);
  const members = groupMembers(entity);
  const icon = aliasIcon(stringAttr(entity, 'icon')) ?? 'light';
  const status = !control.available
    ? COMMON_LABELS.unavailable
    : control.on
      ? control.dimmable
        ? `${control.percent}%`
        : COMMON_LABELS.on
      : COMMON_LABELS.off;
  const details = [status, members.length > 0 ? `${members.length} luci` : null, areaName]
    .filter(Boolean)
    .join(' · ');
  return (
    <li>
      <Surface
        shape="card"
        className={['ctl-lights__tile', !control.available && 'ctl-lights__tile--off']
          .filter(Boolean)
          .join(' ')}
        contentClassName="ctl-lights__tile-content"
        error={control.failed}
      >
        <div className="ctl-row ctl-row--center">
          <BrightnessKnob control={control} name={name} icon={icon} size="md" />
          <div className="ctl-heading ctl-grow">
            <Text className="ctl-name ctl-clamp-1">{name}</Text>
            <Caption className={control.pending ? 'ctl-value--pending' : undefined}>
              {details}
            </Caption>
          </div>
        </div>
        {control.dimmable && (
          <Slider
            size="sm"
            value={control.percent}
            min={0}
            max={100}
            label={`Luminosità di ${name}`}
            valueText={`${control.percent}%`}
            pending={control.pending}
            error={control.failed}
            disabled={!control.available}
            onValueChange={(next) => control.setPercent(next, 'step')}
            data-no-long-press
          />
        )}
        <CommandFeedback message={control.message} />
      </Surface>
    </li>
  );
}

/** «All on» / «All off» behind an inline confirmation, as in the legacy page. */
function ConfirmAction({
  label,
  question,
  onConfirm,
}: {
  label: string;
  question: string;
  onConfirm: () => void;
}) {
  return (
    <Popover
      label={question}
      placement="bottom-end"
      contentClassName="ctl-confirm"
      trigger={(props) => (
        <Button variant="control" size="md" {...props}>
          {label}
        </Button>
      )}
    >
      {(close) => (
        <>
          <Body size="sm">{question}</Body>
          <div className="ctl-confirm__actions">
            <Button variant="secondary" size="sm" onClick={close}>
              Annulla
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                close();
                onConfirm();
              }}
            >
              Conferma
            </Button>
          </div>
        </>
      )}
    </Popover>
  );
}

/** Keys of the legacy page settings (`pageSettings[pageId]`) used by the lights page. */
export type LightsPageSettingKey = 'lightsSort' | 'lightsShowGroups' | 'lightsHideUnavailable';

export interface LightsPageViewProps {
  settings: PageSettings;
  onSaveSetting: (key: LightsPageSettingKey, value: unknown) => void;
}

/** Lights page of the launcher (page kind `lights`), from the legacy LightsPage. */
export function LightsPageView({ settings, onSaveSetting }: LightsPageViewProps) {
  const runtime = useWidgetRuntime();
  const { conn, entities, entitiesLoaded } = runtime;
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<LightsSort>(() =>
    isSort(settings.lightsSort) ? settings.lightsSort : 'status'
  );
  const [showGroups, setShowGroups] = useState(settings.lightsShowGroups !== false);
  const [hideUnavailable, setHideUnavailable] = useState(settings.lightsHideUnavailable === true);
  const [areas, setAreas] = useState<Map<string, string>>(() => new Map());

  // Page settings may arrive after the first render (the launcher loads them in an effect).
  const savedSort = settings.lightsSort;
  const savedGroups = settings.lightsShowGroups;
  const savedHide = settings.lightsHideUnavailable;
  useEffect(() => {
    if (isSort(savedSort)) setSort(savedSort);
  }, [savedSort]);
  useEffect(() => {
    if (typeof savedGroups === 'boolean') setShowGroups(savedGroups);
  }, [savedGroups]);
  useEffect(() => {
    if (typeof savedHide === 'boolean') setHideUnavailable(savedHide);
  }, [savedHide]);

  useEffect(() => {
    if (!conn) return undefined;
    let cancelled = false;
    getAreas(conn)
      .then((list) => {
        if (!cancelled) setAreas(new Map(list.map((area) => [area.area_id, area.name || area.area_id])));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [conn]);

  const areaOf = useCallback(
    (entity: HassEntity): string | null => {
      const areaId = stringAttr(entity, 'area_id');
      if (areaId && areas.has(areaId)) return areas.get(areaId) ?? null;
      return stringAttr(entity, 'area_name') || null;
    },
    [areas]
  );

  const allLights = useMemo(
    () => Object.values(entities).filter((entity) => entity.entity_id.startsWith('light.')),
    [entities]
  );
  const groups = useMemo(() => allLights.filter((e) => groupMembers(e).length > 0), [allLights]);
  const base = useMemo(
    () => (showGroups ? allLights : allLights.filter((e) => groupMembers(e).length === 0)),
    [allLights, showGroups]
  );
  const unavailableCount = base.filter((e) => isUnavailableState(e.state)).length;
  const filtered = useMemo(() => {
    const visible = hideUnavailable ? base.filter((e) => !isUnavailableState(e.state)) : base;
    const term = search.trim().toLowerCase();
    if (!term) return visible;
    return visible.filter(
      (e) =>
        nameOf(e).toLowerCase().includes(term) ||
        (areaOf(e) ?? '').toLowerCase().includes(term) ||
        e.entity_id.toLowerCase().includes(term)
    );
  }, [areaOf, base, hideUnavailable, search]);
  const sorted = useMemo(() => sortLights(filtered, sort, areaOf), [areaOf, filtered, sort]);
  const onCount = filtered.filter(isOn).length;

  const chooseSort = (value: LightsSort) => {
    setSort(value);
    onSaveSetting('lightsSort', value);
  };
  const toggleGroups = () => {
    const next = !showGroups;
    setShowGroups(next);
    onSaveSetting('lightsShowGroups', next);
  };
  const toggleUnavailable = () => {
    const next = !hideUnavailable;
    setHideUnavailable(next);
    onSaveSetting('lightsHideUnavailable', next);
  };
  const allOff = () =>
    filtered
      .filter(isOn)
      .forEach((e) => callQuietly(runtime, 'light', 'turn_off', { entity_id: e.entity_id }));
  const allOn = () =>
    filtered
      .filter((e) => !isOn(e) && !isUnavailableState(e.state))
      .forEach((e) => callQuietly(runtime, 'light', 'turn_on', { entity_id: e.entity_id }));

  const renderGrid = (lights: HassEntity[]) => (
    <ul className="ctl-lights__grid">
      {lights.map((entity) => (
        <LightTile key={entity.entity_id} entity={entity} areaName={areaOf(entity)} />
      ))}
    </ul>
  );

  let content;
  if (!entitiesLoaded) {
    content = <Skeleton rows={4} label="Caricamento delle luci…" />;
  } else if (sorted.length === 0) {
    content = (
      <div className="ctl-lights__empty">
        <ControlIcon name="light" size="lg" />
        <Body>{search ? 'Nessuna luce corrisponde alla ricerca.' : 'Nessuna luce trovata.'}</Body>
        {!search && (
          <Caption as="p">Le luci di Home Assistant compaiono qui automaticamente.</Caption>
        )}
      </div>
    );
  } else if (sort === 'area') {
    const byArea = new Map<string, HassEntity[]>();
    sorted.forEach((entity) => {
      const area = areaOf(entity) ?? 'Altre';
      byArea.set(area, [...(byArea.get(area) ?? []), entity]);
    });
    content = [...byArea.entries()].map(([area, lights]) => (
      <section key={area} className="ctl-lights__area" aria-label={area}>
        <div className="ctl-lights__area-head">
          <Heading level={3} size="sm">
            {area}
          </Heading>
          <Caption>
            {lights.filter(isOn).length} di {lights.length} accese
          </Caption>
        </div>
        {renderGrid(lights)}
      </section>
    ));
  } else {
    content = renderGrid(sorted);
  }

  const sortLabel = LIGHTS_SORT_OPTIONS.find((option) => option.value === sort)?.label ?? '';

  return (
    <div className="ctl-lights">
      <header className="ctl-lights__header">
        <div>
          <Caption as="p">
            {onCount} accese · {filtered.length} in totale
          </Caption>
        </div>
        {filtered.length > 0 && (
          <div className="ctl-lights__actions">
            <ConfirmAction label="Accendi tutte" question="Accendere tutte le luci?" onConfirm={allOn} />
            <ConfirmAction label="Spegni tutte" question="Spegnere tutte le luci?" onConfirm={allOff} />
          </div>
        )}
      </header>

      {allLights.length > 0 && (
        <div className="ctl-lights__toolbar">
          <Field
            label="Cerca luci"
            icon="search"
            placeholder="Cerca per nome o stanza"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            containerClassName="ctl-lights__search"
          />
          <Popover
            label="Ordinamento"
            contentClassName="ctl-menu"
            trigger={(props) => (
              <SelectTrigger label={`Ordina: ${sortLabel}`} aria-haspopup="dialog" {...props} />
            )}
          >
            {(close) =>
              LIGHTS_SORT_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant="control"
                  size="sm"
                  className="ctl-menu__item"
                  aria-pressed={option.value === sort}
                  onClick={() => {
                    chooseSort(option.value);
                    close();
                  }}
                >
                  {option.label}
                </Button>
              ))
            }
          </Popover>
          {groups.length > 0 && (
            <Button variant="control" size="md" aria-pressed={showGroups} onClick={toggleGroups}>
              {`Gruppi (${groups.length})`}
            </Button>
          )}
          {unavailableCount > 0 && (
            <Button
              variant="control"
              size="md"
              aria-pressed={hideUnavailable}
              onClick={toggleUnavailable}
            >
              <IconText icon="warning" iconSize="sm">
                {`${hideUnavailable ? 'Non disponibili nascoste' : 'Nascondi non disponibili'} (${unavailableCount})`}
              </IconText>
            </Button>
          )}
        </div>
      )}

      <div className="ctl-lights__content">{content}</div>
    </div>
  );
}

/**
 * Page component of the `lights` page kind. The launcher (PageKindHost) passes the saved
 * settings of this page and the function that saves them (legacy `pageSettings[pageId]`).
 */
export function LightsPage({ settings, onSaveSetting }: PageKindProps) {
  return <LightsPageView settings={settings} onSaveSetting={onSaveSetting} />;
}
