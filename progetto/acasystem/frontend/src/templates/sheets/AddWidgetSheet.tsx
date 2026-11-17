import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Body, Button, Caption, Field, Heading, Icon, BottomDrawer } from '@/components/primitives';
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
} from '@/utils/launcher/categoryModels';
import { cardSettingsKey } from '@/domain/launcher/cardKeys';
import { DeviceFinder } from '@/components/widgets/utilities/discover/DeviceFinder';
import { AddDeviceEntry } from '../devices/AddDeviceEntry';
import { DiscoveredAddFlow } from '../devices/DiscoveredAddFlow';
import { EntityPicker, PickRow, entityName } from './parts/EntityPicker';
import { ChoiceGroup, Notice } from './parts/Form';
import { usePresence } from './parts/hooks';
import { RoomPicker, type RoomSelection } from './RoomPicker';
import { buildRoomCards } from '@/domain/launcher/roomCards';
import type { AddWidgetSelection, AddWidgetSheetProps } from './types';
import { WidgetCatalogPreview } from './WidgetCatalogPreview';
import { WidgetCatalogPager } from './WidgetCatalogPager';
import './sheets.css';

type Step = 'type' | 'details' | 'device';

const EMPTY_ROOMS: RoomSelection = { areas: [], entitiesById: {} };

/** The Apple TV widget takes only the Apple TV integration. */
const APPLE_TV_HANDLERS: readonly string[] = ['apple_tv'];

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
  onPlaceType,
  initialType,
  autoAdd = false,
  initialSelection,
  onOpenChange,
  interactionRef,
  onRequestOpen,
  onProgress,
}: AddWidgetSheetProps) {
  const runtime = useWidgetRuntime();
  const pages = usePages();
  const mounted = usePresence(open || Boolean(interactionRef));
  const [catalogReady, setCatalogReady] = useState(false);
  const [step, setStep] = useState<Step>('type');
  const [rooms, setRooms] = useState<RoomSelection>(EMPTY_ROOMS);
  const detailsRef = useRef<HTMLHeadingElement>(null);
  const lastTypeRef = useRef<string | null>(null);
  // The person already went through «Aggiungi un dispositivo» for this type: the details stay.
  const [finderHandled, setFinderHandled] = useState(false);
  const openRef = useRef(open); openRef.current = open;
  const progressSink = useRef(onProgress); progressSink.current = onProgress;
  const closedAtRest = useRef(!open);
  const resetCatalog = useCallback(() => {
    setStep('type'); setRooms(EMPTY_ROOMS); setFinderHandled(false);
  }, []);
  const reportProgress = useCallback((progress: number | null, immediate: boolean) => {
    closedAtRest.current = progress === null && interactionRef?.current?.progress === 0;
    if (closedAtRest.current && !openRef.current) resetCatalog();
    progressSink.current?.(progress, immediate);
  }, [interactionRef, resetCatalog]);
  useLayoutEffect(() => {
    if (open) closedAtRest.current = false;
    else if (interactionRef && closedAtRest.current) resetCatalog();
  }, [open, interactionRef, resetCatalog]);

  const [wasOpen, setWasOpen] = useState(open);
  // Opened with a device and `autoAdd`: the sheet stays hidden until the widget is added.
  // 'waiting': the selection is not in place yet; 'ready': it is, and the widget can be added.
  type AutoSelect = false | 'waiting' | 'ready';
  const wantsAutoSelect = (): AutoSelect =>
    open && autoAdd && Boolean(initialSelection) ? 'waiting' : false;
  const [autoSelect, setAutoSelect] = useState<AutoSelect>(wantsAutoSelect);

  // Every opening starts again from the types, with nothing selected.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStep('type');
      setRooms(EMPTY_ROOMS);
    }
    setAutoSelect(wantsAutoSelect());
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
  }, [step]);

  const chooseType = (item: AddWidgetType) => {
    lastTypeRef.current = item.type;
    addCard.setAddCardType(item.type);
    addCard.setSearchTerm('');
    setRooms(EMPTY_ROOMS);
    setFinderHandled(false);
    setStep('details');
  };

  // The accessible name of a tile is its label alone; the hint is its description.
  const renderTile = (item: AddWidgetType, previewHeight: number, previewReady: boolean, onPreviewReady?: (ready: boolean) => void) => {
    const labelId = `aca-tile-${item.type}`;
    const hintId = `${labelId}-hint`;
    return (
      <article key={item.type} className="aca-catalog-type">
        {previewReady ? <WidgetCatalogPreview item={item} height={previewHeight} eager={Boolean(interactionRef)} onReady={onPreviewReady} />
          : <div className="aca-widget-catalog-preview" style={{ height: previewHeight }} aria-hidden="true" inert />}
        <Button
          data-widget-type={item.type}
          className="aca-catalog-type__select"
          aria-labelledby={labelId}
          aria-describedby={item.tileHint ? hintId : undefined}
          onClick={() => onPlaceType ? onPlaceType(item.type) : chooseType(item)}
        >
          <span className="aca-catalog-type__caption">
            <span className="aca-catalog-type__label"><Icon name={iconOf(item)} size="md" />
              <Body as="span" size="sm" id={labelId}>{labelOf(item)}</Body>
            </span>
            {item.tileHint && <Caption as="span" id={hintId}>{item.tileHint}</Caption>}
          </span>
        </Button>
      </article>
    );
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

  // Opened with a device chosen («Rileva dispositivi»): the details of its type, then the
  // selection once the type is the current one (the hook clears the selections when it changes).
  const [selectionPending, setSelectionPending] = useState<AddWidgetSelection | null>(null);
  useEffect(() => {
    if (!open || !initialSelection) return;
    const item = ADD_WIDGET_TYPES.find((candidate) => candidate.type === initialSelection.type);
    if (!item) {
      // No such type: nothing to add by itself, the person chooses.
      setAutoSelect(false);
      return;
    }
    chooseType(item);
    setSelectionPending(initialSelection);
    // Only on opening: the selection is the one the sheet was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSelection]);
  useEffect(() => {
    if (!selectionPending || !open || addCard.addCardType !== selectionPending.type) return;
    const { type, entityIds, remoteId } = selectionPending;
    const first = entityIds[0] ?? null;
    if (type === 'androidtv') {
      addCard.setSelectedAndroidTVMediaId(first);
      addCard.setSelectedAndroidTVRemoteId(remoteId ?? null);
    } else if (type === 'appletv') {
      addCard.setSelectedAppleTVMediaId(first);
      addCard.setSelectedAppleTVRemoteId(remoteId ?? null);
    } else if (type === 'weather') {
      addCard.setSelectedWeatherId(first);
    } else if (type === 'nordpool') {
      addCard.setSelectedNordpoolId(first);
    } else {
      addCard.setSelectedEntities(entityIds);
    }
    setSelectionPending(null);
    setAutoSelect((state) => (state ? 'ready' : state));
    // The setters of the hook are stable; only the type and the pending selection matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionPending, open, addCard.addCardType]);

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

  // A television widget with no television to pick opens «Aggiungi un dispositivo» at once
  // (P-1): the empty list would only send the person there.
  const noTelevision =
    step === 'details' &&
    flow === 'tv' &&
    !finderHandled &&
    !initialSelection &&
    runtime.entitiesLoaded &&
    candidateEntityIds('tv', runtime.entities, new Set(pages.pagesConfig[pageId] ?? [])).length === 0;
  const showFinder = step === 'device' || noTelevision;

  /** The television the widget will show, in the Android TV or the Apple TV fields. */
  const selectTelevision = (mediaId: string, remoteId?: string | null) => {
    if (entry?.type === 'appletv') {
      addCard.setSelectedAppleTVMediaId(mediaId);
      if (remoteId !== undefined) addCard.setSelectedAppleTVRemoteId(remoteId);
    } else {
      addCard.setSelectedAndroidTVMediaId(mediaId);
      if (remoteId !== undefined) addCard.setSelectedAndroidTVRemoteId(remoteId);
    }
  };
  const leaveFinder = () => {
    setFinderHandled(true);
    setStep('details');
  };
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
    showFinder || step === 'type' ? undefined : (
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

  // The same for a device chosen in «Dispositivi trovati»: once its selection is in place the
  // widget is added; if that is not enough to add, the sheet shows itself to finish by hand.
  useEffect(() => {
    if (autoSelect !== 'ready' || !open || !initialSelection) return;
    if (!entry || entry.type !== initialSelection.type) return;
    setAutoSelect(false);
    if (canAdd) submit();
    // submit reads the state of this render, where the selection is in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSelect, open, selectionPending, entry, canAdd]);

  return (
    <BottomDrawer
      open={open && !autoPending && !autoSelect}
      onClose={onClose}
      title="Aggiungi un widget"
      headerHidden={step === 'type'}
      gestureMode="reveal"
      onOpenChange={onOpenChange}
      interactionRef={interactionRef}
      interactionReady={open || catalogReady}
      onRequestOpen={onRequestOpen}
      onProgress={interactionRef ? reportProgress : onProgress}
      footer={footer}
    >
      {mounted && step === 'type' && (
        <WidgetCatalogPager items={ADD_WIDGET_TYPES} renderTile={renderTile} initialAnchorType={lastTypeRef.current}
          onReadyChange={interactionRef ? setCatalogReady : undefined} />
      )}

      {mounted && showFinder && (
        <DeviceFinder
          family="tv"
          {...(entry?.type === 'appletv' ? { handlers: APPLE_TV_HANDLERS } : {})}
          label="Aggiungi un dispositivo"
          Flow={DiscoveredAddFlow}
          onUse={(device) => {
            // A television Home Assistant already has: it is the one to link.
            selectTelevision(device.primaryEntityId, device.remoteId ?? null);
            leaveFinder();
          }}
          onFlowDone={(newEntry) => {
            // The new TV is the one to link: «Aggiungi il widget» is then ready.
            if (newEntry.mediaPlayerEntityId) selectTelevision(newEntry.mediaPlayerEntityId);
            leaveFinder();
          }}
          // Opened by itself on an empty list, there is no list to go back to: back to the types.
          onExit={() => (noTelevision ? setStep('type') : leaveFinder())}
        />
      )}

      {mounted && step === 'details' && !showFinder && entry && (
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
              placeholder={flow === 'room' ? 'Cerca una stanza' : 'Cerca per nome'}
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
    </BottomDrawer>
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
  /** Opens «Aggiungi un dispositivo»; offered to the television widgets (REQ-18). */
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
          emptyText="Nessun calendario trovato."
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
            emptyText="Nessuna fonte meteo trovata."
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
          <AddDeviceEntry onClick={onAddDevice} />
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
