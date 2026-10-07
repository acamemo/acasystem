import { useMemo, useState, type ReactNode } from 'react';
import { Body, Button, Caption, Field, Icon, Skeleton } from '@/components/primitives';
import type { EntityMap } from '@/@types/ha';
import { useDomId } from './hooks';
import '../sheets.css';

/** Friendly name of an entity, or its id when HA has none. */
export function entityName(entities: EntityMap, id: string | null | undefined): string {
  if (!id) return '';
  const name: unknown = entities[id]?.attributes?.friendly_name;
  return typeof name === 'string' && name.trim() ? name : id;
}

/** Ids sorted by friendly name, as the legacy pickers did. */
export function sortByName(entities: EntityMap, ids: readonly string[]): string[] {
  return [...ids].sort((left, right) =>
    entityName(entities, left).localeCompare(entityName(entities, right))
  );
}

/** Case-insensitive match on the id or the friendly name. */
export function matchesQuery(entities: EntityMap, id: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    id.toLowerCase().includes(needle) || entityName(entities, id).toLowerCase().includes(needle)
  );
}

/** One pressable choice of a list: name, secondary line, optional tags and a check mark. */
export function PickRow({
  title,
  subtitle,
  selected,
  onClick,
  tags = [],
  disabled = false,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onClick: () => void;
  tags?: readonly string[];
  disabled?: boolean;
}) {
  return (
    <Button
      variant="control"
      size="sm"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className="aca-pick-row"
      contentClassName="aca-pick-row__content"
    >
      <span className="aca-pick-row__text">
        <Body as="span" size="sm" className="aca-pick-row__title">
          {title}
        </Body>
        {subtitle && <Caption className="aca-pick-row__subtitle">{subtitle}</Caption>}
      </span>
      {tags.length > 0 && (
        <span className="aca-pick-row__tags">
          {tags.map((tag) => (
            <Caption key={tag} tone="info" className="aca-pick-row__tag">
              {tag}
            </Caption>
          ))}
        </span>
      )}
      <Icon name={selected ? 'done' : 'add'} size="md" />
    </Button>
  );
}

const PAGE_SIZE = 60;

export interface EntityPickerProps {
  /** Visible name of the list, also its accessible name. */
  label: string;
  hint?: string;
  entities: EntityMap;
  /** Candidate entity ids (any order). */
  ids: readonly string[];
  selected: readonly string[];
  onToggle: (id: string) => void;
  /** Shows a search field above the list. */
  searchable?: boolean;
  /** Search text owned by the caller (the field is then hidden). */
  query?: string;
  emptyText: string;
  loading?: boolean;
  tags?: (id: string) => readonly string[];
  /** Rows placed before the entities, e.g. a «Nessuna» choice. */
  leading?: ReactNode;
}

/**
 * Searchable list of Home Assistant entities with toggle rows (aria-pressed). Long lists show
 * the first matches and grow on request, so a tablet never renders hundreds of rows at once.
 */
export function EntityPicker({
  label,
  hint,
  entities,
  ids,
  selected,
  onToggle,
  searchable = false,
  query,
  emptyText,
  loading = false,
  tags,
  leading,
}: EntityPickerProps) {
  const labelId = useDomId('elenco');
  const [ownQuery, setOwnQuery] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const search = query ?? ownQuery;
  const sorted = useMemo(() => sortByName(entities, ids), [entities, ids]);
  const matching = useMemo(
    () => sorted.filter((id) => matchesQuery(entities, id, search)),
    [sorted, entities, search]
  );
  const visible = matching.slice(0, limit);
  const hidden = matching.length - visible.length;
  const selectedSet = new Set(selected);

  let body: ReactNode;
  if (loading) {
    body = <Skeleton rows={3} label="Caricamento delle entità…" />;
  } else if (ids.length === 0 && !leading) {
    body = (
      <Caption as="p" className="aca-pick__empty">
        {emptyText}
      </Caption>
    );
  } else {
    body = (
      <>
        <ul className="aca-pick__list">
          {leading && <li>{leading}</li>}
          {visible.map((id) => (
            <li key={id}>
              <PickRow
                title={entityName(entities, id)}
                subtitle={id}
                selected={selectedSet.has(id)}
                tags={tags?.(id)}
                onClick={() => onToggle(id)}
              />
            </li>
          ))}
        </ul>
        {ids.length === 0 && (
          <Caption as="p" className="aca-pick__empty">
            {emptyText}
          </Caption>
        )}
        {ids.length > 0 && matching.length === 0 && (
          <Caption as="p" className="aca-pick__empty">
            Nessun risultato per «{search.trim()}».
          </Caption>
        )}
        {hidden > 0 && (
          <Button
            variant="control"
            size="sm"
            className="aca-pick__more"
            onClick={() => setLimit((current) => current + PAGE_SIZE)}
          >
            Mostra altre {Math.min(hidden, PAGE_SIZE)} di {hidden}
          </Button>
        )}
      </>
    );
  }

  return (
    <div className="aca-pick" role="group" aria-labelledby={labelId} aria-busy={loading}>
      <div className="aca-pick__head">
        <Body as="span" size="sm" id={labelId} className="aca-form-row__label">
          {label}
        </Body>
        {selected.length > 1 && <Caption>{selected.length} selezionate</Caption>}
      </div>
      {hint && <Caption as="p">{hint}</Caption>}
      {searchable && query === undefined && ids.length > 0 && (
        <Field
          label={`Cerca in: ${label}`}
          icon="search"
          type="search"
          placeholder="Cerca per nome o id"
          value={ownQuery}
          onChange={(event) => {
            setOwnQuery(event.target.value);
            setLimit(PAGE_SIZE);
          }}
        />
      )}
      {body}
    </div>
  );
}

/**
 * One entity chosen for a setting: the current choice in a row, and the searchable list
 * opened in place to change it («Nessuna» clears it when allowed).
 */
export function EntitySelect({
  label,
  hint,
  value,
  entities,
  ids,
  onChange,
  allowNone = true,
  noneLabel = 'Nessuna',
  emptyText = 'Nessuna entità adatta in Home Assistant.',
}: {
  label: string;
  hint?: string;
  value: string | null | undefined;
  entities: EntityMap;
  ids: readonly string[];
  onChange: (id: string | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const labelId = useDomId('selezione');
  const panelId = `${labelId}-elenco`;
  const current = value ? entityName(entities, value) : noneLabel;
  const choose = (id: string | null) => {
    onChange(id);
    setOpen(false);
  };
  return (
    <div className="aca-form-row">
      <Body as="span" size="sm" id={labelId} className="aca-form-row__label">
        {label}
      </Body>
      {hint && <Caption as="p">{hint}</Caption>}
      <Button
        variant="control"
        size="sm"
        className="aca-pick-row"
        contentClassName="aca-pick-row__content"
        aria-label={`${label}: ${current}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className="aca-pick-row__text">
          <Body as="span" size="sm" className="aca-pick-row__title">
            {current}
          </Body>
          {value && value !== current && (
            <Caption className="aca-pick-row__subtitle">{value}</Caption>
          )}
        </span>
        <Caption>{open ? 'Chiudi' : 'Cambia'}</Caption>
        <Icon name="chevronDown" size="md" />
      </Button>
      {open && (
        <div id={panelId}>
          <EntityPicker
            label={`Scegli: ${label}`}
            entities={entities}
            ids={ids}
            selected={value ? [value] : []}
            onToggle={(id) => choose(id === value ? null : id)}
            searchable
            emptyText={emptyText}
            leading={
              allowNone ? (
                <PickRow title={noneLabel} selected={!value} onClick={() => choose(null)} />
              ) : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
