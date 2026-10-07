import { useEffect, useMemo, useRef, useState } from 'react';
import { Body, Button, Caption, Field, Heading, Icon, Sheet } from '@/components/primitives';
import type { PagesConfig } from '@/@types/dashboard';
import type { CellSize } from '@/@types/launcher';
import { useAddCard } from '@/hooks/useAddCard';
import { usePages } from '@/hooks/context';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import {
  ADD_WIDGET_TYPES,
  candidateEntityIds,
  definitionForType,
  sizeChoices,
  sizeKey,
  sizeLabel,
  temperatureSensorIds,
  typeVisuals,
  type AddWidgetType,
} from './catalog';
import { cardSettingsKey } from './cardKeys';
import { EntityPicker, PickRow, entityName } from './parts/EntityPicker';
import { ChoiceGroup, Notice } from './parts/Form';
import { usePresence } from './parts/hooks';
import { SizePreview } from './parts/SizePreview';
import { RoomPicker, type RoomSelection } from './RoomPicker';
import { buildRoomCards } from './roomCards';
import type { AddWidgetSheetProps } from './types';
import './sheets.css';

type Step = 'type' | 'details';

const EMPTY_ROOMS: RoomSelection = { areas: [], entitiesById: {} };

/**
 * «Aggiungi un widget»: the type first, then the entities or options it needs. Cards and
 * cardSettings are created by the legacy useAddCard/handleAddSelected (same ids and settings);
 * each new card id is then handed to the launcher with onAdded, which places it on the grid.
 */
export function AddWidgetSheet({ open, onClose, pageId, onAdded }: AddWidgetSheetProps) {
  const runtime = useWidgetRuntime();
  const pages = usePages();
  const mounted = usePresence(open);
  const [step, setStep] = useState<Step>('type');
  const [size, setSize] = useState<CellSize | undefined>(undefined);
  const [rooms, setRooms] = useState<RoomSelection>(EMPTY_ROOMS);
  const typesRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLHeadingElement>(null);
  const lastTypeRef = useRef<string | null>(null);

  const [wasOpen, setWasOpen] = useState(open);

  // Every opening starts again from the types, with nothing selected.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStep('type');
      setSize(undefined);
      setRooms(EMPTY_ROOMS);
    }
  }

  /** Persists the page list like the legacy flow, then hands the new card ids to the launcher. */
  const persistAndPlace = (next: PagesConfig) => {
    const before = new Set(pages.pagesConfig[pageId] ?? []);
    const added = (next[pageId] ?? []).filter((id) => !before.has(id));
    pages.persistConfig(next);
    added.forEach((id) => onAdded(id, size));
  };

  const addCard = useAddCard({
    showAddCardModal: open,
    activePage: pageId,
    pagesConfig: pages.pagesConfig,
    persistConfig: persistAndPlace,
    cardSettings: pages.cardSettings,
    persistCardSettings: pages.persistCardSettings,
    hiddenCards: pages.hiddenCards,
    persistHiddenCards: pages.persistHiddenCards,
    getCardSettingsKey: (cardId, page = pageId) => cardSettingsKey(page, cardId),
    saveCardSetting: pages.saveCardSetting,
    setShowAddCardModal: (show) => {
      if (!show) onClose();
    },
    setShowEditCardModal: () => undefined,
    setEditCardSettingsKey: () => undefined,
    t: runtime.t,
  });

  const visuals = useMemo(() => typeVisuals(), []);
  const labelOf = (item: AddWidgetType) => visuals.get(item.type)?.label ?? item.label;
  const iconOf = (item: AddWidgetType) => visuals.get(item.type)?.icon ?? item.icon;
  const entry = ADD_WIDGET_TYPES.find((item) => item.type === addCard.addCardType);
  const definition = entry ? definitionForType(entry) : undefined;
  const sizes = sizeChoices(definition);

  useEffect(() => {
    if (step === 'details') detailsRef.current?.focus();
    if (step === 'type' && lastTypeRef.current) {
      typesRef.current
        ?.querySelector<HTMLElement>(`[data-widget-type="${lastTypeRef.current}"]`)
        ?.focus();
    }
  }, [step]);

  const chooseType = (item: AddWidgetType) => {
    lastTypeRef.current = item.type;
    addCard.setAddCardType(item.type);
    addCard.setSearchTerm('');
    setSize(definitionForType(item)?.sizes.default);
    setRooms(EMPTY_ROOMS);
    setStep('details');
  };

  const addRooms = () => {
    const payload = buildRoomCards({
      areas: rooms.areas,
      areaEntitiesById: rooms.entitiesById,
      pagesConfig: pages.pagesConfig,
      pageId,
      cardSettings: pages.cardSettings,
    });
    if (!payload) return;
    payload.customNames.forEach(({ cardId, name }) => pages.saveCustomName(cardId, name));
    pages.persistCardSettings(payload.newSettings);
    persistAndPlace(payload.newConfig);
    onClose();
  };

  const selectedCount = addCard.selectedEntities.length;
  const flow = entry?.flow;
  let canAdd = false;
  let addLabel = 'Aggiungi il widget';
  switch (flow) {
    case 'entities': {
      canAdd = selectedCount > 0;
      if (entry?.unit) {
        addLabel =
          selectedCount > 1
            ? `Aggiungi il widget con ${selectedCount} ${entry.unit[1]}`
            : 'Aggiungi il widget';
      } else if (selectedCount > 1) {
        addLabel = `Aggiungi ${selectedCount} widget`;
      }
      break;
    }
    case 'calendar':
      canAdd = addCard.selectedEntities.some((id) => id.startsWith('calendar.'));
      break;
    case 'weather':
      canAdd = Boolean(addCard.selectedWeatherId);
      break;
    case 'tv':
      canAdd = Boolean(
        entry?.type === 'appletv'
          ? addCard.selectedAppleTVMediaId
          : addCard.selectedAndroidTVMediaId
      );
      break;
    case 'cost':
      canAdd = Boolean(addCard.selectedCostTodayId && addCard.selectedCostMonthId);
      break;
    case 'nordpool':
      canAdd = Boolean(addCard.selectedNordpoolId);
      break;
    case 'room':
      canAdd = rooms.areas.length > 0;
      addLabel =
        rooms.areas.length > 1 ? `Aggiungi ${rooms.areas.length} stanze` : 'Aggiungi la stanza';
      break;
    case 'simple':
    case 'spacer':
      canAdd = true;
      break;
    default:
      canAdd = false;
  }

  const submit = () => {
    if (!canAdd || !entry) return;
    if (entry.flow === 'room') {
      addRooms();
      return;
    }
    if (entry.flow === 'spacer') {
      addCard.onAddSelected({ spacerVariant: addCard.selectedSpacerVariant });
      return;
    }
    addCard.onAddSelected();
  };

  const footer =
    step === 'type' ? (
      <Button variant="secondary" size="md" onClick={onClose}>
        Annulla
      </Button>
    ) : (
      <>
        <Button variant="secondary" size="md" onClick={() => setStep('type')}>
          Indietro
        </Button>
        <Button variant="primary" size="md" disabled={!canAdd} onClick={submit}>
          {addLabel}
        </Button>
      </>
    );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Aggiungi un widget"
      description={
        step === 'type'
          ? 'Scegli che cosa mostrare nella pagina.'
          : 'Scegli le entità e la dimensione del widget.'
      }
      footer={footer}
      className="aca-add-widget"
    >
      {mounted && step === 'type' && (
        <div ref={typesRef} role="group" aria-label="Tipi di widget" className="aca-type-grid">
          {ADD_WIDGET_TYPES.map((item) => (
            <Button
              key={item.type}
              variant="control"
              shape="card"
              size="sm"
              data-widget-type={item.type}
              className="aca-m--fill aca-type-tile"
              contentClassName="aca-type-tile__content"
              onClick={() => chooseType(item)}
            >
              <Icon name={iconOf(item)} size="lg" />
              <Body as="span" size="sm">
                {labelOf(item)}
              </Body>
            </Button>
          ))}
        </div>
      )}

      {mounted && step === 'details' && entry && (
        <div className="aca-add-details">
          <div className="aca-add-details__head">
            <span className="aca-add-details__glyph" aria-hidden="true">
              <Icon name={iconOf(entry)} size="lg" />
            </span>
            <div className="aca-add-details__title">
              <Heading level={3} size="md" ref={detailsRef} tabIndex={-1}>
                {labelOf(entry)}
              </Heading>
              {entry.hint && <Caption as="p">{entry.hint}</Caption>}
            </div>
          </div>

          <SizeSection
            sizes={sizes}
            value={size}
            frame={definition?.sizes.max}
            onChange={setSize}
          />

          {flow !== 'simple' && flow !== 'spacer' && (
            <Field
              label="Cerca"
              icon="search"
              type="search"
              placeholder={flow === 'room' ? 'Cerca una stanza' : 'Cerca per nome o id'}
              value={addCard.searchTerm}
              onChange={(event) => addCard.setSearchTerm(event.target.value)}
            />
          )}

          <DetailsBody
            entry={entry}
            pageId={pageId}
            addCard={addCard}
            rooms={rooms}
            onRooms={setRooms}
          />
        </div>
      )}
    </Sheet>
  );
}

function SizeSection({
  sizes,
  value,
  frame,
  onChange,
}: {
  sizes: CellSize[];
  value: CellSize | undefined;
  frame: CellSize | undefined;
  onChange: (size: CellSize) => void;
}) {
  if (sizes.length === 0 || !value) {
    return (
      <Caption as="p" className="aca-add-details__size">
        Dimensione: quella predefinita del widget, modificabile poi nella pagina.
      </Caption>
    );
  }
  const current = sizes.find((size) => sizeKey(size) === sizeKey(value)) ?? sizes[0];
  return (
    <div className="aca-add-details__size">
      {sizes.length > 1 && (
        <ChoiceGroup<string>
          label="Dimensione"
          hint="Potrai cambiarla anche dopo, nella modalità modifica."
          options={sizes.map((size) => ({ value: sizeKey(size), label: sizeLabel(size) }))}
          value={sizeKey(current)}
          onChange={(key) => {
            const next = sizes.find((size) => sizeKey(size) === key);
            if (next) onChange(next);
          }}
        />
      )}
      <SizePreview size={current} frame={frame ?? current} />
    </div>
  );
}

type AddCardState = ReturnType<typeof useAddCard>;

function DetailsBody({
  entry,
  pageId,
  addCard,
  rooms,
  onRooms,
}: {
  entry: AddWidgetType;
  pageId: string;
  addCard: AddCardState;
  rooms: RoomSelection;
  onRooms: (next: RoomSelection | ((previous: RoomSelection) => RoomSelection)) => void;
}) {
  const { entities, entitiesLoaded, conn } = useWidgetRuntime();
  const { pagesConfig } = usePages();
  const onPage = useMemo(() => new Set(pagesConfig[pageId] ?? []), [pagesConfig, pageId]);
  const query = addCard.searchTerm;
  const loading = !entitiesLoaded;

  const toggleMany = (id: string) =>
    addCard.setSelectedEntities((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]
    );

  switch (entry.flow) {
    case 'entities':
      return (
        <EntityPicker
          label={addCard.getAddCardAvailableLabel()}
          entities={entities}
          ids={candidateEntityIds(entry.type, entities, onPage)}
          selected={addCard.selectedEntities}
          onToggle={toggleMany}
          query={query}
          loading={loading}
          emptyText={
            entry.type === 'mower'
              ? 'Non ci sono altri tagliaerba da aggiungere'
              : addCard.getAddCardNoneLeftLabel()
          }
        />
      );
    case 'calendar':
      return (
        <EntityPicker
          label="Calendari da mostrare"
          entities={entities}
          ids={candidateEntityIds('calendar', entities, onPage)}
          selected={addCard.selectedEntities}
          onToggle={toggleMany}
          query={query}
          loading={loading}
          emptyText="Nessun calendario trovato in Home Assistant."
        />
      );
    case 'weather':
      return (
        <>
          <EntityPicker
            label="Entità meteo, obbligatoria"
            entities={entities}
            ids={candidateEntityIds('weather', entities, onPage)}
            selected={addCard.selectedWeatherId ? [addCard.selectedWeatherId] : []}
            onToggle={(id) =>
              addCard.setSelectedWeatherId((previous) => (previous === id ? null : id))
            }
            query={query}
            loading={loading}
            emptyText="Nessuna entità meteo trovata in Home Assistant."
          />
          <EntityPicker
            label="Sensore di temperatura, facoltativo"
            entities={entities}
            ids={temperatureSensorIds(entities)}
            selected={addCard.selectedTempId ? [addCard.selectedTempId] : []}
            onToggle={(id) =>
              addCard.setSelectedTempId((previous) => (previous === id ? null : id))
            }
            query={query}
            loading={loading}
            emptyText="Nessun sensore di temperatura trovato."
            leading={
              <PickRow
                title="Usa la temperatura del meteo"
                subtitle="Valore dell’entità meteo"
                selected={!addCard.selectedTempId}
                onClick={() => addCard.setSelectedTempId(null)}
              />
            }
          />
        </>
      );
    case 'tv': {
      const apple = entry.type === 'appletv';
      const mediaId = apple ? addCard.selectedAppleTVMediaId : addCard.selectedAndroidTVMediaId;
      const setMediaId = apple
        ? addCard.setSelectedAppleTVMediaId
        : addCard.setSelectedAndroidTVMediaId;
      const remoteId = apple ? addCard.selectedAppleTVRemoteId : addCard.selectedAndroidTVRemoteId;
      const setRemoteId = apple
        ? addCard.setSelectedAppleTVRemoteId
        : addCard.setSelectedAndroidTVRemoteId;
      return (
        <>
          <EntityPicker
            label="Lettore multimediale, obbligatorio"
            entities={entities}
            ids={candidateEntityIds('tv', entities, onPage)}
            selected={mediaId ? [mediaId] : []}
            onToggle={(id) => setMediaId((previous) => (previous === id ? null : id))}
            query={query}
            loading={loading}
            emptyText="Nessun lettore multimediale trovato."
          />
          <EntityPicker
            label="Telecomando, facoltativo"
            entities={entities}
            ids={candidateEntityIds('remote', entities, onPage)}
            selected={remoteId ? [remoteId] : []}
            onToggle={(id) => setRemoteId((previous) => (previous === id ? null : id))}
            query={query}
            loading={loading}
            emptyText="Nessun telecomando trovato."
            leading={
              <PickRow
                title="Nessun telecomando"
                subtitle="Solo controllo multimediale"
                selected={!remoteId}
                onClick={() => setRemoteId(null)}
              />
            }
          />
        </>
      );
    }
    case 'cost': {
      const today = addCard.selectedCostTodayId;
      const month = addCard.selectedCostMonthId;
      const target = addCard.costSelectionTarget === 'month' ? 'month' : 'today';
      return (
        <>
          <ChoiceGroup<'today' | 'month'>
            label="Stai scegliendo il sensore di"
            options={[
              { value: 'today', label: 'Oggi' },
              { value: 'month', label: 'Mese' },
            ]}
            value={target}
            onChange={addCard.setCostSelectionTarget}
          />
          <Caption as="p">
            Oggi: {today ? entityName(entities, today) : 'da scegliere'} · Mese:{' '}
            {month ? entityName(entities, month) : 'da scegliere'}
          </Caption>
          <EntityPicker
            label="Sensori di costo"
            entities={entities}
            ids={candidateEntityIds('cost', entities, onPage)}
            selected={[today, month].filter((id): id is string => Boolean(id))}
            onToggle={(id) => {
              if (target === 'today')
                addCard.setSelectedCostTodayId((previous) => (previous === id ? null : id));
              else addCard.setSelectedCostMonthId((previous) => (previous === id ? null : id));
            }}
            tags={(id) => [...(id === today ? ['Oggi'] : []), ...(id === month ? ['Mese'] : [])]}
            query={query}
            loading={loading}
            emptyText="Nessun sensore di costo trovato."
          />
        </>
      );
    }
    case 'nordpool':
      return (
        <>
          <EntityPicker
            label="Sensore Nordpool, obbligatorio"
            entities={entities}
            ids={candidateEntityIds('nordpool', entities, onPage)}
            selected={addCard.selectedNordpoolId ? [addCard.selectedNordpoolId] : []}
            onToggle={(id) =>
              addCard.setSelectedNordpoolId((previous) => (previous === id ? null : id))
            }
            query={query}
            loading={loading}
            emptyText="Nessun sensore Nordpool trovato."
          />
          <ChoiceGroup<string>
            label="Decimali"
            options={['0', '1', '2', '3'].map((value) => ({ value, label: value }))}
            value={String(addCard.nordpoolDecimals)}
            onChange={(value) => addCard.setNordpoolDecimals(Number(value))}
          />
        </>
      );
    case 'spacer':
      return (
        <ChoiceGroup<'spacer' | 'divider'>
          label="Tipo di separatore"
          options={[
            { value: 'spacer', label: 'Spazio' },
            { value: 'divider', label: 'Linea' },
          ]}
          value={addCard.selectedSpacerVariant === 'spacer' ? 'spacer' : 'divider'}
          onChange={addCard.setSelectedSpacerVariant}
        />
      );
    case 'room':
      return <RoomPicker conn={conn} query={query} selection={rooms} onChange={onRooms} />;
    case 'simple':
      return (
        <Notice>Il widget verrà aggiunto alla pagina; completa poi le sue impostazioni.</Notice>
      );
    default:
      return null;
  }
}
