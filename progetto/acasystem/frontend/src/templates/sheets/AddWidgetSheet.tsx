import { useEffect, useMemo, useRef, useState } from 'react';
import { Body, Button, Caption, Field, Heading, Icon, Sheet } from '@/components/primitives';
import type { PagesConfig } from '@/@types/dashboard';
import { useAddCard } from '@/hooks/useAddCard';
import { usePages } from '@/hooks/context';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import {
  ADD_WIDGET_TYPES,
  candidateEntityIds,
  temperatureSensorIds,
  typeVisuals,
  type AddWidgetType,
} from './catalog';
import { cardSettingsKey } from './cardKeys';
import { AddDeviceEntry } from '../devices/AddDeviceEntry';
import { AddDeviceFlow } from '../devices/AddDeviceFlow';
import { EntityPicker, PickRow, entityName } from './parts/EntityPicker';
import { ChoiceGroup, Notice } from './parts/Form';
import { usePresence } from './parts/hooks';
import { RoomPicker, type RoomSelection } from './RoomPicker';
import { buildRoomCards } from './roomCards';
import type { AddWidgetSheetProps } from './types';
import './sheets.css';

type Step = 'type' | 'details' | 'device';

const EMPTY_ROOMS: RoomSelection = { areas: [], entitiesById: {} };

/** Types added without any choice (their entities are chosen later in their settings). */
const NO_CHOICE_FLOWS = new Set(['simple', 'spacer']);

/**
 * «Aggiungi un widget»: the type first, then the entities or options it needs. Cards and
 * cardSettings are created by the legacy useAddCard/handleAddSelected (same ids and settings);
 * each new card id is then handed to the launcher with onAdded, which places it on the grid at
 * the default size: the size is changed on the grid by dragging (REP-20261007-027). From a tile
 * of the tray (`initialType`) the sheet starts from the details of that type.
 */
export function AddWidgetSheet({
  open,
  onClose,
  pageId,
  onAdded,
  initialType,
  autoAdd = false,
}: AddWidgetSheetProps) {
  const runtime = useWidgetRuntime();
  const pages = usePages();
  const mounted = usePresence(open);
  const [step, setStep] = useState<Step>('type');
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
      setRooms(EMPTY_ROOMS);
    }
  }

  /** Persists the page list like the legacy flow, then hands the new card ids to the launcher. */
  const persistAndPlace = (next: PagesConfig) => {
    const before = new Set(pages.pagesConfig[pageId] ?? []);
    const added = (next[pageId] ?? []).filter((id) => !before.has(id));
    pages.persistConfig(next);
    added.forEach((id) => {
      onAdded(id);
      // A widget made for a device takes the configuration kept for it (ADR-0019).
      pages.requestWidgetAdoption(pageId, id);
    });
  };

  const addCard = useAddCard({
    showAddCardModal: open,
    activePage: pageId,
    pagesConfig: pages.pagesConfig,
    persistConfig: persistAndPlace,
    cardSettings: pages.cardSettings,
    persistCardSettings: pages.persistCardSettings,
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
    setRooms(EMPTY_ROOMS);
    setStep('details');
  };

  // Opened from a tile of the tray: straight to the details of that type. Declared after
  // useAddCard, so it runs after the hook's own reset of the type on opening.
  const [autoPending, setAutoPending] = useState(false);
  useEffect(() => {
    if (!open || !initialType) return;
    const item = ADD_WIDGET_TYPES.find((candidate) => candidate.type === initialType);
    if (!item) return;
    chooseType(item);
    setAutoPending(autoAdd && NO_CHOICE_FLOWS.has(item.flow));
    // Only on opening: the type is the one of the tile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialType]);

  const addRooms = () => {
    const payload = buildRoomCards({
      areas: rooms.areas,
      areaEntitiesById: rooms.entitiesById,
      pagesConfig: pages.pagesConfig,
      pageId,
      cardSettings: pages.cardSettings,
    });
    if (!payload) return;
    // The name a room is born with is not an edit: a new room can still take back what was kept.
    pages.persistCustomNames({
      ...pages.customNames,
      ...Object.fromEntries(payload.customNames.map(({ cardId, name }) => [cardId, name])),
    });
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

  // «Aggiungi un dispositivo» has its own buttons inside the flow: no footer.
  const footer =
    step === 'device' ? undefined : step === 'type' ? (
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

  // A type that needs no choice, dropped from the tray: added as soon as the type is set,
  // without showing the sheet.
  useEffect(() => {
    if (!autoPending || !open || !entry || entry.type !== initialType) return;
    setAutoPending(false);
    submit();
    // submit reads the state of this render, where the type is the dropped one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPending, open, entry]);

  return (
    <Sheet
      open={open && !autoPending}
      onClose={onClose}
      title="Aggiungi un widget"
      description={
        step === 'type'
          ? 'Scegli che cosa mostrare nella pagina.'
          : step === 'device'
            ? 'Aggiungi il dispositivo a Home Assistant, poi collegalo al widget.'
            : 'Scegli che cosa mostra il widget.'
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

      {mounted && step === 'device' && (
        <AddDeviceFlow
          kind="tv"
          onExit={() => setStep('details')}
          onDone={(id) => {
            // The new TV is the one to link: «Aggiungi il widget» is then ready.
            if (id) addCard.setSelectedAndroidTVMediaId(id);
            setStep('details');
          }}
        />
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

          <Caption as="p" className="aca-add-details__size">
            Dopo l’aggiunta trascina i lati o gli angoli del widget per cambiarne la misura.
          </Caption>

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
            onAddDevice={() => setStep('device')}
          />
        </div>
      )}
    </Sheet>
  );
}

type AddCardState = ReturnType<typeof useAddCard>;

function DetailsBody({
  entry,
  pageId,
  addCard,
  rooms,
  onRooms,
  onAddDevice,
}: {
  entry: AddWidgetType;
  pageId: string;
  addCard: AddCardState;
  rooms: RoomSelection;
  onRooms: (next: RoomSelection | ((previous: RoomSelection) => RoomSelection)) => void;
  /** Opens «Aggiungi un dispositivo»; offered to the Android TV widget only (REQ-18). */
  onAddDevice: () => void;
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
          {entry.type === 'androidtv' && <AddDeviceEntry onClick={onAddDevice} />}
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
