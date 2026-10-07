import { useMemo, useState } from 'react';
import { Body, Button, Caption, Field, Icon, IconText } from '@/components/primitives';
import type { HeaderSettings, StatusPillConfig } from '@/@types/dashboard';
import type { EntityMap } from '@/@types/ha';
import { EntityPicker, entityName } from '@/templates/sheets/parts/EntityPicker';
import { FormRow, InlineConfirm, ToggleRow } from '@/templates/sheets/parts/Form';

export interface StatusBarSectionProps {
  entities: EntityMap;
  title: string;
  onTitle: (title: string) => void;
  headerSettings: HeaderSettings;
  onHeaderSettings: (next: HeaderSettings) => void;
  /** Entities pinned in the bar (legacy pagesConfig.header). */
  pinned: readonly string[];
  onPinned: (next: string[]) => void;
  pills: readonly StatusPillConfig[];
  onPills: (next: StatusPillConfig[]) => void;
}

const PILL_TYPES: Record<string, string> = {
  conditional: 'Sensore',
  media_player: 'Multimedia',
  emby: 'Emby',
  sonos: 'Sonos',
  group_status: 'Gruppo',
  alarm: 'Allarme',
};

function pillName(pill: StatusPillConfig, entities: EntityMap): string {
  const custom = [pill.name, pill.label].find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  );
  if (custom) return custom;
  if (pill.entityId) return entityName(entities, pill.entityId);
  return PILL_TYPES[pill.type] ?? 'Indicatore';
}

/** New sensor indicator with the defaults of the legacy editor (addPill('conditional')). */
function newSensorPill(entityId: string): StatusPillConfig {
  return {
    id: `pill_${Date.now()}`,
    type: 'conditional',
    entityId,
    label: '',
    sublabel: '',
    icon: 'Activity',
    condition: { type: 'state', states: ['on'] },
    conditionEnabled: false,
    unitSource: 'ha',
    customUnit: '',
    decimals: null,
    clickable: false,
    animated: true,
    showLabel: true,
    showSublabel: true,
    visible: true,
    showCover: true,
    showCount: false,
    hideWhenEmpty: true,
  };
}

/**
 * Bar at the top of the launcher: title and clock, the pinned people (ex header) and the status
 * indicators. Indicators are listed, shown or hidden, reordered, removed and added as sensors;
 * their advanced options keep the values saved by the previous editor.
 */
export function StatusBarSection({
  entities,
  title,
  onTitle,
  headerSettings,
  onHeaderSettings,
  pinned,
  onPinned,
  pills,
  onPills,
}: StatusBarSectionProps) {
  const [titleDraft, setTitleDraft] = useState(title);
  const [adding, setAdding] = useState<'person' | 'pill' | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const people = useMemo(
    () => Object.keys(entities).filter((id) => id.startsWith('person.') && !pinned.includes(id)),
    [entities, pinned]
  );
  const allIds = useMemo(() => Object.keys(entities), [entities]);

  const movePill = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= pills.length) return;
    const next = [...pills];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onPills(next);
  };

  return (
    <div className="aca-system__stack">
      <div className="aca-system__group">
        <FormRow label="Titolo" hint="Mostrato nella barra di stato; vuoto non mostra nulla.">
          {({ labelId, hintId }) => (
            <Field
              label="Titolo"
              aria-labelledby={labelId}
              aria-describedby={hintId}
              placeholder="Per esempio Casa"
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={() => {
                if (titleDraft !== title) onTitle(titleDraft);
              }}
            />
          )}
        </FormRow>
        <ToggleRow
          label="Mostra il titolo"
          checked={headerSettings.showTitle !== false}
          onChange={(showTitle) => onHeaderSettings({ ...headerSettings, showTitle })}
        />
        <ToggleRow
          label="Mostra l’ora"
          checked={headerSettings.showClock !== false}
          onChange={(showClock) => onHeaderSettings({ ...headerSettings, showClock })}
        />
      </div>

      <div className="aca-system__group">
        <Body as="span" size="sm" className="aca-form-row__label">
          Persone fissate
        </Body>
        {pinned.length === 0 ? (
          <Caption as="p">Nessuna persona fissata nella barra.</Caption>
        ) : (
          <ul className="aca-system__list" aria-label="Persone fissate">
            {pinned.map((id) => (
              <li key={id} className="aca-system__item">
                <div className="aca-system__item-text">
                  <Body as="span" size="sm">
                    {entityName(entities, id)}
                  </Body>
                  <Caption>{id}</Caption>
                </div>
                <Button
                  variant="control"
                  size="sm"
                  aria-label={`Togli ${entityName(entities, id)} dalla barra`}
                  onClick={() => onPinned(pinned.filter((item) => item !== id))}
                >
                  <IconText icon="close">Togli</IconText>
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button
          variant="control"
          size="sm"
          aria-expanded={adding === 'person'}
          onClick={() => setAdding((current) => (current === 'person' ? null : 'person'))}
        >
          <IconText icon="add">Fissa una persona</IconText>
        </Button>
        {adding === 'person' && (
          <EntityPicker
            label="Persone di Home Assistant"
            entities={entities}
            ids={people}
            selected={[]}
            searchable
            emptyText="Tutte le persone sono già fissate, o Home Assistant non ne ha."
            onToggle={(id) => {
              onPinned([...pinned, id]);
              setAdding(null);
            }}
          />
        )}
      </div>

      <div className="aca-system__group">
        <Body as="span" size="sm" className="aca-form-row__label">
          Indicatori di stato
        </Body>
        {pills.length === 0 ? (
          <Caption as="p">
            Nessun indicatore. Aggiungine uno per vedere un sensore nella barra.
          </Caption>
        ) : (
          <ul className="aca-system__list" aria-label="Indicatori di stato">
            {pills.map((pill, index) => {
              const name = pillName(pill, entities);
              const visible = pill.visible !== false;
              return (
                <li key={pill.id} className="aca-system__item">
                  <div className="aca-system__item-text">
                    <Body as="span" size="sm">
                      {name}
                    </Body>
                    <Caption>
                      {PILL_TYPES[pill.type] ?? pill.type}
                      {visible ? '' : ' · nascosto'}
                    </Caption>
                  </div>
                  {removing === pill.id ? (
                    <InlineConfirm
                      message={`Togliere l’indicatore «${name}»?`}
                      confirmLabel="Togli"
                      onCancel={() => setRemoving(null)}
                      onConfirm={() => {
                        setRemoving(null);
                        onPills(pills.filter((item) => item.id !== pill.id));
                      }}
                    />
                  ) : (
                    <div className="aca-system__actions">
                      <Button
                        variant="control"
                        size="sm"
                        aria-pressed={visible}
                        aria-label={`Mostra ${name}`}
                        onClick={() =>
                          onPills(
                            pills.map((item) =>
                              item.id === pill.id ? { ...item, visible: !visible } : item
                            )
                          )
                        }
                      >
                        {visible ? 'Visibile' : 'Nascosto'}
                      </Button>
                      <Button
                        variant="control"
                        shape="circle"
                        size="sm"
                        aria-label={`Sposta ${name} prima`}
                        disabled={index === 0}
                        onClick={() => movePill(index, -1)}
                      >
                        <Icon name="chevronLeft" size="md" />
                      </Button>
                      <Button
                        variant="control"
                        shape="circle"
                        size="sm"
                        aria-label={`Sposta ${name} dopo`}
                        disabled={index === pills.length - 1}
                        onClick={() => movePill(index, 1)}
                      >
                        <Icon name="chevronRight" size="md" />
                      </Button>
                      <Button
                        variant="control"
                        shape="circle"
                        size="sm"
                        aria-label={`Togli ${name}`}
                        onClick={() => setRemoving(pill.id)}
                      >
                        <Icon name="close" size="md" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <Button
          variant="control"
          size="sm"
          aria-expanded={adding === 'pill'}
          onClick={() => setAdding((current) => (current === 'pill' ? null : 'pill'))}
        >
          <IconText icon="add">Aggiungi un indicatore</IconText>
        </Button>
        {adding === 'pill' && (
          <EntityPicker
            label="Entità da mostrare"
            hint="L’indicatore mostra il suo stato; le condizioni avanzate restano quelle predefinite."
            entities={entities}
            ids={allIds}
            selected={[]}
            searchable
            emptyText="Home Assistant non ha ancora entità disponibili."
            onToggle={(id) => {
              onPills([...pills, newSensorPill(id)]);
              setAdding(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
