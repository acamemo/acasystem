import { sensorProductBinding, multimediaProductBinding } from '@/utils/devices/productBinding';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CarBindingSection } from './CarBindingSection';
import { WeatherBindingSection } from './WeatherBindingSection';
import { AgendaBindingSection } from './AgendaBindingSection';
import { RoomBindingSection } from './RoomBindingSection';
import { useAgendaScope } from '@/components/widgets/home/calendar/agendaRead';
import { EnergyBindingSection } from './EnergyBindingSection';
import { EnergyPreferencesSection } from './EnergyPreferencesSection';
import { CategoryBindingSection } from './CategoryBindingSection';
import { AdaptiveSettingsSection } from './sections/AdaptiveSettingsSection';
import { isCategoryWidgetReady } from '@/domain/launcher/categoryPages';
import { Body, Button, Caption, Field, Heading, Sheet } from '@/components/primitives';
import { useOptionalLiveProfiles } from '@/hooks/liveProfiles/LiveProfilesContext';
import { configurationLayout, diffConfiguration } from '../../../../contracts/profileResources';
import { exportDraftFile } from '@/hooks/liveProfiles/drafts';
import type { CardSettings, CardSettingsMap } from '@/@types/dashboard';
import type { SaveProductBinding } from './ProductBindingSection';
import { isProductDeviceBinding } from '../../../../contracts/productDevice';
import { getEntityRegistry } from '@/api/haClient';
import { deviceWidgetDestinations } from '@/utils/devices/widgetDestinations';
import { sanitizeLauncherLayout } from '@/validators/launcher';
import { logicalPage } from '@/domain/launcher/commonOrder';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { usePages } from '@/hooks/context';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { normalizeVisibilityConditionConfig } from '@/utils/conditionUtils';
import { cardSettingsKey } from '@/domain/launcher/cardKeys';
import { sanitizeWidgetMemory } from '@/utils/launcher/deviceMemory';
import { applyCarBinding } from '@/utils/launcher/carBinding';
import { applyWeatherBinding } from '@/utils/launcher/weatherBinding';
import { applyUtilityBinding } from '@/utils/launcher/utilityBinding';
import { loadWidgetMemory } from '@/utils/launcher/widgetStateStorage';
import type { PagesConfig } from '@/@types/dashboard';
import { resolveEditTarget, type EditKind, type EditTarget } from '@/domain/launcher/editTarget';
import { ConditionEditor, createDefaultRule } from './parts/ConditionEditor';
import { entityName } from './parts/EntityPicker';
import { ChoiceGroup, FormRow, SheetSection, ToggleRow } from './parts/Form';
import { usePresence } from './parts/hooks';
import { IconPicker } from './parts/IconPicker';
import { SensorSection } from './sections/SensorSection';
import { AdditionalTypeSections } from './sections/AdditionalTypeSections';
import {
  ClimateSection,
  MediaSection,
  RoomSection,
  StatusSection,
  TapActionSection,
} from './sections/TypeSections';
import type { WidgetSettingsSheetProps } from './types';
import './sheets.css';

const KIND_LABELS: Record<EditKind, string> = {
  sensor: 'Sensore',
  light: 'Luce',
  media: 'Multimedia',
  calendar: 'Calendario',
  todo: 'Attività',
  cost: 'Energia e consumi',
  nordpool: 'Prezzo dell’energia',
  androidtv: 'Android TV',
  appletv: 'Apple TV',
  vacuum: 'Aspirapolvere',
  car: 'Auto',
  room: 'Stanza',
  lock: 'Serratura',
  cover: 'Tapparella',
  alarm: 'Allarme',
  spacer: 'Separatore',
  camera: 'Videocamera',
  fan: 'Ventilatore',
  climate: 'Clima',
  weather: 'Meteo',
  person: 'Persona',
  other: 'Widget',
};

/**
 * Settings of one widget: general (name, heading, icon), the sections of its type and
 * conditional visibility. The live provider synchronizes changes under a lease; Fatto waits
 * for the final checkpoint. The preview/legacy contract is retained without that provider.
 */
export function WidgetSettingsSheet({
  open,
  onClose,
  widgetId,
  settingsKey,
  pageId,
  placement,
}: WidgetSettingsSheetProps) {
  const runtime = useWidgetRuntime();
  const live = useOptionalLiveProfiles();
  const coordinator = live?.coordinator;
  const { widgetMemoryNotice } = usePages();
  const mounted = usePresence(open);
  const key = settingsKey || cardSettingsKey(pageId, widgetId);
  const target = resolveEditTarget(widgetId, key, runtime.cardSettings, runtime.entities);
  const definition = findWidgetDefinition(widgetId, target.settings);
  const name =
    runtime.customNames[widgetId] || ((sensorProductBinding(target.settings) || ['plug', 'climate', 'cover', 'fan', 'lock', 'alarm', 'camera', 'vacuum', 'mower', 'androidtv', 'appletv', 'media', 'sonos'].includes(String(target.settings.categoryWidgetType))) && String(target.settings.name ?? ''))
    || entityName(runtime.entities, target.nameEntityId) || widgetId;
  const logicalPageId = key.includes('::') ? key.slice(0, key.indexOf('::')) : pageId;
  const session = useRef<{ id: string; owned: boolean } | null>(null);
  const closing = useRef<Promise<unknown>>(Promise.resolve());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [copyName, setCopyName] = useState('');
  const editor = live?.state.editor;
  const ownsEditor = Boolean(editor && editor.id === session.current?.id);
  const blocked = Boolean(live && (!ready || !ownsEditor || editor?.quotaBlocked || editor?.conflict || (editor?.pendingOperation && !editor.busy) || busy));

  useEffect(() => {
    if (!open || !widgetId || !coordinator) return;
    let cancelled = false;
    let acquired: { id: string; owned: boolean } | null = null;
    setReady(false); setError(''); session.current = null;
    void (async () => {
      await closing.current;
      if (cancelled) return;
      try {
        const existing = coordinator.snapshot().editor;
        if (existing?.target.kind === 'structure') {
          await coordinator.begin(existing.target, 'Impostazioni del widget');
          const current = coordinator.snapshot().editor;
          if (!current) throw new Error('Modifica non disponibile. Riprova.');
          acquired = { id: current.id, owned: existing.transient === true }; session.current = acquired;
          if (cancelled) { if (acquired.owned) await coordinator.finish(); return; }
          setReady(true); return;
        }
        const beginning = coordinator.begin({ kind: 'widget', widgetId, pageId: logicalPageId }, 'Impostazioni del widget');
        const provisional = coordinator.snapshot().editor;
        if (!existing && provisional) acquired = { id: provisional.id, owned: true };
        await beginning;
        const current = coordinator.snapshot().editor;
        if (!acquired && current) acquired = { id: current.id, owned: true };
        if (cancelled) {
          if (acquired?.owned && coordinator.snapshot().editor?.id === acquired.id) await coordinator.finish();
          return;
        }
        session.current = acquired;
        setReady(true);
      } catch (failure) { if (!cancelled) setError(failure instanceof Error ? failure.message : 'Modifica non disponibile.'); }
    })();
    return () => {
      cancelled = true;
      const current = acquired;
      if (current?.owned && coordinator.snapshot().editor?.id === current.id)
        closing.current = coordinator.finish().catch(() => undefined);
    };
  }, [open, widgetId, logicalPageId, coordinator, retry]);

  const close = async () => {
    if (busy) return;
    // Alcuni campi convalidano al blur: includerli prima di svuotare la coda.
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest('.aca-widget-settings')) active.blur();
    setBusy(true); setError('');
    try {
      if (coordinator && session.current?.owned && coordinator.snapshot().editor?.id === session.current.id) {
        if (!await coordinator.finish()) return;
      }
      onClose();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Non posso conservare la bozza.'); }
    finally { setBusy(false); }
  };
  const resolveConflict = async (choice: 'mine' | 'current' | 'copy') => {
    if (!coordinator || busy) return;
    setBusy(true); setError('');
    try {
      if (choice === 'mine') { await coordinator.useMine(); await coordinator.save({ keepOpen: true }); }
      else if (choice === 'current') { await coordinator.useCurrent(); onClose(); }
      else { await coordinator.copyConflict(copyName.trim() || `${live?.state.profile?.name ?? 'Profilo'} — copia`); onClose(); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'La bozza è conservata. Riprova.'); }
    finally { setBusy(false); }
  };
  const conflicts = editor?.conflict ? diffConfiguration(editor.base.configuration, editor.working).slice(0, 8) : [];

  return (
    <Sheet
      open={open}
      onClose={live ? () => { void close(); } : onClose}
      title="Impostazioni del widget"
      description={`${definition?.label ?? KIND_LABELS[target.kind]}: ${name}`}
      footer={
        !live ? <Button variant="primary" size="md" onClick={onClose}>Fatto</Button>
          : <Button variant="primary" loading={busy} disabled={busy || (ready && blocked)} onClick={() => void close()}>Fatto</Button>
      }
      className="aca-widget-settings"
    >
      {live && ready && <Caption role="status">{live.state.offline ? 'Offline · bozza sul dispositivo' : live.state.saving ? 'Sincronizzazione…' : 'Salvataggio automatico'}</Caption>}
      {live && !ready && !error && <Body role="status">Verifica del permesso di modifica…</Body>}
      {(error || (ownsEditor && editor?.error)) && <Body role="alert">{error || editor?.error}</Body>}
      {error && !ready && <Button variant="control" onClick={() => setRetry((value) => value + 1)}>Riprova</Button>}
      {ownsEditor && editor?.quotaBlocked && <div>
        <Body role="alert">La quota delle bozze è esaurita. La modifica resta in memoria: libera spazio oppure annullala esplicitamente.</Body>
        <Button variant="control" onClick={() => { const draft = coordinator?.currentDraft(); if (draft) exportDraftFile(draft); }}>Esporta la bozza in memoria</Button>
        {!editor.pendingOperation && <Button variant="control" disabled={busy} onClick={() => {
          setBusy(true);
          void coordinator?.close(true).then(onClose).catch((failure: unknown) =>
            setError(failure instanceof Error ? failure.message : 'La bozza è conservata.')
          ).finally(() => setBusy(false));
        }}>Scarta bozza non sincronizzata</Button>}
      </div>}
      {ownsEditor && editor?.conflict && <section className="aca-settings" aria-label="Confronto delle modifiche">
        <Heading level={3} size="sm">La configurazione è cambiata</Heading>
        <Body size="sm">Confronta la tua bozza con la revisione {editor.conflict.revision} della centrale prima di scegliere.</Body>
        <ul>{conflicts.map((change, index) => <li key={index}>
          <Caption>{conflictLabel(change.path)} — La mia: {conflictValue(change.value)} · Attuale: {conflictValue(readConflict(editor.conflict?.configuration, change.path))}</Caption>
        </li>)}</ul>
        <Button variant="control" disabled={busy} onClick={() => void resolveConflict('mine')}>Usa la mia</Button>
        <Button variant="control" disabled={busy} onClick={() => void resolveConflict('current')}>Usa quella attuale</Button>
        <Field label="Nome della copia" value={copyName} maxLength={128} onChange={(event) => setCopyName(event.target.value)} />
        <Button variant="control" disabled={busy} onClick={() => void resolveConflict('copy')}>Crea copia indipendente</Button>
      </section>}
      {mounted && widgetId && (
        <fieldset disabled={blocked} inert={blocked || undefined} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }} aria-label="Campi del widget">
        <SettingsBody
          // A configuration taken from the memory (ADR-0019) after the link starts the fields again.
          key={`${widgetId}:${String(open)}:${widgetMemoryNotice?.seq ?? 0}`}
          widgetId={widgetId}
          settingsKey={key}
          target={target}
          placement={placement}
        />
        </fieldset>
      )}
    </Sheet>
  );
}

const readConflict = (value: unknown, path: string[]): unknown => path.reduce<unknown>((current, part) =>
  current && typeof current === 'object' ? (current as Record<string, unknown>)[part] : undefined, value);
const conflictValue = (value: unknown): string => value === undefined ? 'Rimosso' : value === null ? 'Predefinito'
  : typeof value === 'boolean' ? value ? 'Sì' : 'No' : typeof value === 'object' ? 'Valore composto'
    : String(value).startsWith('data:') ? 'Immagine' : String(value).slice(0, 160);
const CONFLICT_LABELS: Record<string, string> = {
  heading: 'Intestazione', appearanceFrame: 'Cornice', appearanceOpacity: 'Trasparenza', name: 'Nome',
  customNames: 'Nome', customIcons: 'Icona', launcherLayout: 'Disposizione',
};
const conflictLabel = (path: string[]): string => CONFLICT_LABELS[path.at(-1) ?? ''] ?? 'Impostazione';

const utilitySource = (type: string, settings: CardSettings) => JSON.stringify(type === 'calendar'
  ? settings.calendars ?? [] : type === 'todo' ? settings.todoEntityId ?? null
    : [settings.areaId, settings.roomMembershipSource, settings.entityIds, settings.areaName, settings.areaIcon]);

function SettingsBody({
  widgetId,
  settingsKey,
  target,
  placement,
}: {
  widgetId: string;
  settingsKey: string;
  target: EditTarget;
  placement?: ReactNode;
}) {
  const runtime = useWidgetRuntime();
  const pages = usePages();
  const live = useOptionalLiveProfiles();
  const { settings, kind } = target;
  const homeWeather = settings.categoryWidgetType === 'cover_weather' || widgetId.startsWith('cover_weather');
  const weatherBinding = kind === 'weather' || settings.categoryWidgetType === 'weather' || homeWeather;
  const utilityType = String(settings.categoryWidgetType || kind);
  const utilityBinding = ['calendar', 'todo', 'room'].includes(utilityType);
  const utilityScope = useAgendaScope(runtime.conn, settingsKey, utilityBinding);
  const confirmedBinding = kind === 'car' || weatherBinding || utilityBinding;
  const source = utilitySource(utilityType, settings);
  const bindingVersion = useRef({ key: settingsKey, type: utilityType, source, epoch: 0,
    pending: null as { expected: string; adopted: boolean } | null });
  const binding = bindingVersion.current;
  if (binding.key !== settingsKey || binding.type !== utilityType || binding.source !== source) {
    const ownPatch = binding.key === settingsKey && binding.type === utilityType
      && binding.pending?.expected === source && !binding.pending.adopted;
    if (ownPatch && binding.pending) binding.pending.adopted = true;
    else binding.epoch += 1;
    binding.key = settingsKey; binding.type = utilityType; binding.source = source;
  }
  const weatherScope = useRef({ conn: runtime.conn, generation: 0 });
  if (weatherScope.current.conn !== runtime.conn)
    weatherScope.current = { conn: runtime.conn, generation: weatherScope.current.generation + 1 };
  const save = (setting: string, value: unknown) =>
    runtime.saveCardSetting(settingsKey, setting, value);
  const saveBinding: SaveProductBinding = async (patch) => {
    const epoch = bindingVersion.current.epoch;
    const operation = { expected: utilitySource(utilityType, { ...settings, ...patch }), adopted: false };
    const assertUtility = () => {
      if (utilityBinding && (!utilityScope.current() || bindingVersion.current.epoch !== epoch))
        throw new Error('Il contesto è cambiato. Riapri il widget.');
    };
    assertUtility();
    if (utilityBinding) bindingVersion.current.pending = operation;
    try {
    const applyBinding = (cards: CardSettingsMap) =>
      ({ ...cards, [settingsKey]: { ...cards[settingsKey], ...patch } });
    const owner = live?.coordinator.snapshot();
    const initialWeatherScope = weatherScope.current;
    const registry = patch.productDevice ? await getEntityRegistry(runtime.conn) : [];
    if (live && (live.coordinator.snapshot().profile?.id !== owner?.profile?.id
      || live.coordinator.snapshot().editor?.id !== owner?.editor?.id))
      throw new Error('Il profilo o la modifica sono cambiati. Riapri il widget.');
    const checkDestination = (layout: ReturnType<typeof sanitizeLauncherLayout>, cards: CardSettingsMap) => {
      if (!patch.productDevice) return;
      if (!layout) throw new Error('La disposizione non è ancora disponibile. Riprova.');
      const destinations = deviceWidgetDestinations(patch.productDevice.deviceId, layout, registry,
        (page, id) => cards[`${logicalPage(layout, page)}::${id}`] ?? cards[`${page}::${id}`] ?? cards[id] ?? {},
        (page, id) => `${page}::${id}`);
      if (destinations.some(item => item.widgetId !== widgetId))
        throw new Error('Questo dispositivo ha già un widget. Aprilo da Trova dispositivi.');
    };
    if (live) {
      await live.mutate((configuration) => {
        assertUtility();
        const next = structuredClone(configuration);
        const layout = configurationLayout(next);
        const cards = (layout.cardSettings ?? {}) as CardSettingsMap;
        checkDestination(sanitizeLauncherLayout(layout.launcherLayout), cards);
        if (confirmedBinding) {
          const map = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value)
            ? value as Record<string, string> : {};
          const apply = utilityBinding ? applyUtilityBinding : weatherBinding ? applyWeatherBinding : applyCarBinding;
          const applied = apply({
            layout: sanitizeLauncherLayout(layout.launcherLayout),
            pagesConfig: (layout.pagesConfig ?? null) as PagesConfig | null,
            cardSettings: cards, customNames: map(layout.customNames), customIcons: map(layout.customIcons),
            memory: sanitizeWidgetMemory(layout.widgetMemory),
          }, settingsKey, patch, Date.now());
          layout.cardSettings = applied.cardSettings; layout.customNames = applied.customNames;
          layout.customIcons = applied.customIcons; layout.widgetMemory = applied.memory;
        } else layout.cardSettings = applyBinding(cards);
        return next;
      }, { kind: 'widget', widgetId, ...(settingsKey.includes('::') ? { pageId: settingsKey.slice(0, settingsKey.indexOf('::')) } : {}) }, kind === 'cost' || kind === 'nordpool' ? 'Associazione della sorgente energetica' : kind === 'car' ? 'Associazione delle fonti dell’auto' : weatherBinding ? 'Associazione delle fonti meteo' : utilityBinding ? 'Associazione delle fonti del widget' : 'Associazione del dispositivo');
      if (confirmedBinding) {
        const current = live.coordinator.snapshot();
        assertUtility();
        if (weatherBinding && weatherScope.current !== initialWeatherScope)
          throw new Error('La connessione è cambiata. Riapri il widget.');
        if (current.profile?.id !== owner?.profile?.id || current.editor?.id !== owner?.editor?.id)
          throw new Error('Il profilo o la modifica sono cambiati. Riapri il widget.');
        if (current.offline || !await live.coordinator.save({ keepOpen: true }))
          throw new Error('Associazione non confermata dalla centrale. La bozza è conservata.');
        assertUtility();
        if (utilityBinding) {
          const after = live.coordinator.snapshot();
          if (after.profile?.id !== owner?.profile?.id || after.editor?.id !== owner?.editor?.id)
            throw new Error('Il profilo o la modifica sono cambiati. Riapri il widget.');
        }
      }
    } else {
      checkDestination(pages.launcherLayout, pages.cardSettings);
      if (confirmedBinding) {
        const apply = (current: Parameters<typeof applyCarBinding>[0]) => {
          assertUtility();
          return (utilityBinding ? applyUtilityBinding : weatherBinding ? applyWeatherBinding : applyCarBinding)(current, settingsKey, patch, Date.now());
        };
        if (pages.commitWidgetAddition && pages.launcherLayout) await pages.commitWidgetAddition(apply, widgetId);
        else {
          const applied = apply({ layout: pages.launcherLayout, pagesConfig: pages.pagesConfig,
            cardSettings: pages.cardSettings, customNames: pages.customNames, customIcons: pages.customIcons,
            memory: loadWidgetMemory() });
          pages.setCardSettings(() => applied.cardSettings);
          pages.persistCustomNames(applied.customNames); pages.persistCustomIcons(applied.customIcons);
          pages.persistWidgetMemory(applied.memory);
        }
      } else pages.setCardSettings(previous => applyBinding(previous));
      assertUtility();
    }
    } finally {
      if (utilityBinding && bindingVersion.current.pending === operation) bindingVersion.current.pending = null;
    }
  };
  const [name, setName] = useState(runtime.customNames[widgetId] ?? '');
  const [heading, setHeading] = useState(
    typeof settings.heading === 'string' ? settings.heading : ''
  );
  const defaultName = ((sensorProductBinding(settings) || ['plug', 'climate', 'cover', 'fan', 'lock', 'alarm', 'camera', 'vacuum', 'mower', 'androidtv', 'appletv', 'media', 'sonos'].includes(String(settings.categoryWidgetType))) && String(settings.name ?? '')) || entityName(runtime.entities, target.nameEntityId);
  const icon = runtime.customIcons[widgetId] ?? null;

  const clearIcon = () => {
    const next = { ...pages.customIcons };
    delete next[widgetId];
    pages.persistCustomIcons(next);
  };

  return (
    <div className="aca-settings">
      {placement}
      {Boolean(settings.categoryWidgetType) && (
        <CategoryBindingSection settings={settings} resourceKey={settingsKey} save={save} saveBinding={saveBinding} />
      )}
      {!settings.categoryWidgetType && (kind === 'calendar' || kind === 'todo') && (
        <AgendaBindingSection kind={kind} settings={settings} resourceKey={settingsKey} saveBinding={saveBinding} />
      )}
      {!settings.categoryWidgetType && kind === 'room' && (
        <RoomBindingSection settings={settings} resourceKey={settingsKey} saveBinding={saveBinding} />
      )}
      {!settings.categoryWidgetType && weatherBinding && (
        <WeatherBindingSection settings={settings} saveBinding={saveBinding} home={homeWeather} />
      )}
      {!settings.categoryWidgetType && kind === 'car' && (
        <CarBindingSection settings={settings} saveBinding={saveBinding} />
      )}
      {!settings.categoryWidgetType && (kind === 'cost' || kind === 'nordpool') && (
        <EnergyBindingSection kind={kind} settings={settings} saveBinding={saveBinding} />
      )}
      {isCategoryWidgetReady(settings) ? (
        <>
          {Boolean(settings.categoryWidgetType) && settings.categoryWidgetType !== 'plug' && !['cost', 'nordpool', 'car', 'weather', 'cover_weather', 'calendar', 'todo', 'room'].includes(String(settings.categoryWidgetType)) && !sensorProductBinding(settings)
            && !(settings.categoryWidgetType === 'climate' && isProductDeviceBinding(settings.productDevice)
              && settings.productDevice.family === 'climate' && settings.climateId === settings.productDevice.primaryEntityId)
            && !(settings.categoryWidgetType === 'cover' && isProductDeviceBinding(settings.productDevice)
              && settings.productDevice.family === 'cover' && settings.coverId === settings.productDevice.primaryEntityId)
            && !(settings.categoryWidgetType === 'fan' && isProductDeviceBinding(settings.productDevice)
              && settings.productDevice.family === 'fan' && settings.bindingEntityId === settings.productDevice.primaryEntityId)
            && !(settings.categoryWidgetType === 'lock' && isProductDeviceBinding(settings.productDevice)
              && settings.productDevice.family === 'lock' && settings.lockId === settings.productDevice.primaryEntityId)
            && !(settings.categoryWidgetType === 'alarm' && isProductDeviceBinding(settings.productDevice)
              && settings.productDevice.family === 'alarm' && settings.alarmId === settings.productDevice.primaryEntityId) && (
            <AdaptiveSettingsSection settings={settings} save={save}
              showControlPreferences={!(multimediaProductBinding(settings) || settings.categoryWidgetType === 'camera' && isProductDeviceBinding(settings.productDevice)
                && settings.productDevice.family === 'camera' && settings.cameraId === settings.productDevice.primaryEntityId
                || (settings.categoryWidgetType === 'vacuum' || settings.categoryWidgetType === 'mower') && isProductDeviceBinding(settings.productDevice)
                && settings.productDevice.family === settings.categoryWidgetType && settings.bindingEntityId === settings.productDevice.primaryEntityId)} />
          )}
          <SheetSection title="Generali">
            {target.canEditName && (
              <FormRow label="Nome" hint="Vuoto usa il nome del dispositivo.">
                {({ labelId, hintId }) => (
                  <Field
                    label="Nome"
                    aria-labelledby={labelId}
                    aria-describedby={hintId}
                    placeholder={defaultName || 'Nome del widget'}
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      pages.saveCustomName(widgetId, event.target.value);
                    }}
                  />
                )}
              </FormRow>
            )}
            <FormRow label="Intestazione" hint="Testo facoltativo mostrato sopra il widget.">
              {({ labelId, hintId }) => (
                <Field
                  label="Intestazione"
                  aria-labelledby={labelId}
                  aria-describedby={hintId}
                  value={heading}
                  onChange={(event) => {
                    setHeading(event.target.value);
                    if (live) save('heading', event.target.value.trim() || null);
                  }}
                  onBlur={() => { if (!live) save('heading', heading.trim() || null); }}
                />
              )}
            </FormRow>
            {target.canEditIcon && (
              <IconPicker
                value={icon}
                onSelect={(iconName) => pages.saveCustomIcon(widgetId, iconName)}
                onClear={clearIcon}
              />
            )}
          </SheetSection>

          <AppearanceSettings settings={settings} save={save} />

          <TypeSettings
            kind={weatherBinding ? 'weather' : kind}
            widgetId={widgetId}
            settings={settings}
            canEditStatus={target.canEditStatus}
            save={save}
          />

          <VisibilitySection widgetId={widgetId} settings={settings} save={save} />
        </>
      ) : null}
    </div>
  );
}

/** Background transparency of the widget, in percent (REP-20261007-036). */
const OPACITIES = [
  { value: '0', label: 'Opaco' },
  { value: '25', label: 'Leggera' },
  { value: '50', label: 'Media' },
  { value: '75', label: 'Alta' },
] as const;

/**
 * «Aspetto» (REP-20261007-036), as the widget settings of One UI: the frame of the kit on or
 * off, and how much of the page shows through the background. Stored in the card settings
 * (`appearanceFrame`, `appearanceOpacity`); absent means the frame and an opaque background.
 */
function AppearanceSettings({
  settings,
  save,
}: {
  settings: CardSettings;
  save: (key: string, value: unknown) => void;
}) {
  const framed = settings.appearanceFrame !== false;
  const opacity = String(
    typeof settings.appearanceOpacity === 'number' ? settings.appearanceOpacity : 0
  );
  return (
    <SheetSection title="Aspetto">
      <ToggleRow
        label="Cornice"
        hint="Spenta, il widget non ha il riquadro in rilievo: solo il contenuto."
        checked={framed}
        onChange={(checked) => save('appearanceFrame', checked ? null : false)}
      />
      {framed && (
        <ChoiceGroup<string>
          label="Trasparenza dello sfondo"
          hint="Quanto della pagina (o dello sfondo scelto in Sistema) si vede attraverso il widget."
          options={OPACITIES}
          value={OPACITIES.some((option) => option.value === opacity) ? opacity : '0'}
          onChange={(value) => save('appearanceOpacity', value === '0' ? null : Number(value))}
        />
      )}
    </SheetSection>
  );
}

function TypeSettings({
  kind,
  widgetId,
  settings,
  canEditStatus,
  save,
}: {
  kind: EditKind;
  widgetId: string;
  settings: CardSettings;
  canEditStatus: boolean;
  save: (key: string, value: unknown) => void;
}) {
  const { entities, conn } = useWidgetRuntime();
  const { pagesConfig, pageSettings } = usePages();
  return (
    <>
      {kind === 'sensor' && !sensorProductBinding(settings) && (
        <SensorSection widgetId={widgetId} settings={settings} entities={entities} save={save} showEntityPicker={settings.categoryWidgetType !== 'sensor'} />
      )}
      {kind === 'climate' && <ClimateSection settings={settings} entities={entities} save={save} />}
      {kind === 'appletv' && (
        <SheetSection title="Apple TV">
          <TapActionSection settings={settings} save={save} />
        </SheetSection>
      )}
      {kind === 'media' && <MediaSection settings={settings} save={save} />}
      {kind === 'room' && (
        <RoomSection
          settings={settings}
          entities={entities}
          conn={conn}
          pageIds={pagesConfig.pages ?? []}
          pageSettings={pageSettings}
          save={save}
        />
      )}
      {canEditStatus && kind !== 'sensor' && kind !== 'cost' && kind !== 'nordpool' && kind !== 'car' && <StatusSection settings={settings} save={save} />}
      {kind === 'cost' || kind === 'nordpool'
        ? <EnergyPreferencesSection kind={kind} settings={settings} save={save} />
        : <AdditionalTypeSections kind={kind} settings={settings} entities={entities} save={save} />}
    </>
  );
}

function VisibilitySection({
  widgetId,
  settings,
  save,
}: {
  widgetId: string;
  settings: CardSettings;
  save: (key: string, value: unknown) => void;
}) {
  const { entities } = useWidgetRuntime();
  const normalized = normalizeVisibilityConditionConfig(settings.visibilityCondition);
  const enabled = normalized.enabled && normalized.rules.length > 0;
  return (
    <SheetSection
      title="Visibilità condizionale"
      description="Mostra il widget soltanto quando le regole sono vere."
    >
      <ToggleRow
        label="Usa le regole di visibilità"
        checked={enabled}
        onChange={(next) =>
          save('visibilityCondition', {
            ...normalized,
            enabled: next,
            rules: normalized.rules.length > 0 ? normalized.rules : [createDefaultRule()],
          })
        }
      />
      {enabled && (
        <ConditionEditor
          widgetId={widgetId}
          settings={settings}
          condition={settings.visibilityCondition}
          entities={entities}
          onChange={(next) => save('visibilityCondition', next)}
        />
      )}
    </SheetSection>
  );
}
