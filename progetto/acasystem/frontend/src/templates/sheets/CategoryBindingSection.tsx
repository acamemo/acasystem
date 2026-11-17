import { getDeviceRegistry, getEntityRegistry } from '@/api/haClient';
import { classifyDevices } from '@/utils/devices/classify';
import { resolveTvDeviceBinding } from '@/utils/devices/productBinding';
import { multimediaAssociationPatch } from '@/utils/devices/multimediaSettings';
import type { CardSettings } from '@/@types/dashboard';
import { useOptionalLiveProfiles } from '@/hooks/liveProfiles/LiveProfilesContext';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { Body } from '@/components/primitives';
import { useEffect, useRef, useState } from 'react';
import { AgendaBindingSection } from './AgendaBindingSection';
import { RoomBindingSection } from './RoomBindingSection';
import { BINDING_KEYS } from '@/domain/launcher/categoryPages';
import { candidateEntityIds } from '@/domain/launcher/catalog';
import { DeviceFinder } from '@/components/widgets/utilities/discover/DeviceFinder';
import { AddDeviceEntry } from '../devices/AddDeviceEntry';
import { DiscoveredAddFlow } from '../devices/DiscoveredAddFlow';
import { RemoveDevice } from '../devices/RemoveDevice';
import { deviceTexts } from '../devices/deviceTexts';
import { EntitySelect } from './parts/EntityPicker';
import { SheetSection } from './parts/Form';
import { SensorBindingSection } from './SensorBindingSection';
import { EnergyBindingSection } from './EnergyBindingSection';
import { CarBindingSection } from './CarBindingSection';
import { WeatherBindingSection } from './WeatherBindingSection';
import { ProductBindingSection, type SaveProductBinding } from './ProductBindingSection';

/** The Apple TV widget takes only the Apple TV integration. */
const APPLE_TV_HANDLERS: readonly string[] = ['apple_tv'];

export function CategoryBindingSection({
  settings,
  save,
  saveBinding,
  resourceKey,
}: {
  settings: CardSettings;
  save: (key: string, value: unknown) => void;
  saveBinding?: SaveProductBinding;
  resourceKey?: string;
}) {
  const { conn, entities, entitiesLoaded } = useWidgetRuntime();
  const [adding, setAdding] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linking, setLinking] = useState(false), [manualLinking, setManualLinking] = useState(false);
  const live = useOptionalLiveProfiles();
  const request = useRef(0), busyRef = useRef(false), manualBusyRef = useRef(false), writing = useRef(false), operation = useRef<number | null>(null);
  const latest = useRef({ conn, settings, entities, live });
  latest.current = { conn, settings, entities, live };
  useEffect(() => {
    request.current += 1; setLinkError('');
    if (!writing.current) { operation.current = null; busyRef.current = false; setLinking(false); }
    return () => { request.current += 1; };
  }, [conn, settings]);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; operation.current = null; busyRef.current = false; }; }, []);
  const owner = () => {
    const snapshot = latest.current.live?.coordinator.snapshot();
    return [snapshot?.profile?.id ?? null, snapshot?.editor?.id ?? null] as const;
  };
  const onManualBusy = (busy: boolean) => { manualBusyRef.current = busy; setManualLinking(busy); };
  const openAdding = () => { if (!busyRef.current && !manualBusyRef.current) setAdding(true); };
  const link = (id: string | null) => {
    const currentType = String(settings.categoryWidgetType), currentKey = BINDING_KEYS[currentType];
    const tv = currentType === 'androidtv' || currentType === 'appletv';
    const multiple = currentKey === 'mediaIds' || currentKey === 'calendars';
    if (!mounted.current || !currentKey || busyRef.current || manualBusyRef.current) return;
    if (!tv || !saveBinding) { save(currentKey, multiple ? (id ? [id] : []) : id); return; }
    const current = ++request.current, initial = latest.current, initialOwner = owner();
    const currentScope = () => mounted.current && request.current === current && latest.current.conn === initial.conn
      && latest.current.settings === initial.settings;
    const assertOwner = () => { const now = owner(); if (now[0] !== initialOwner[0] || now[1] !== initialOwner[1])
      throw new Error('Il profilo o la modifica sono cambiati. Riapri il widget.'); };
    operation.current = current; busyRef.current = true; setLinking(true); setLinkError('');
    void (async () => {
      let patch: Parameters<SaveProductBinding>[0] = { mediaPlayerId: null, bindingEntityId: null, productDevice: undefined };
      if (id) {
        const [devices, registry] = await Promise.all([getDeviceRegistry(initial.conn), getEntityRegistry(initial.conn)]);
        if (!currentScope()) return;
        assertOwner();
        const deviceId = registry.find(entry => entry.entity_id === id)?.device_id;
        const device = classifyDevices({ devices, entityRegistry: registry, entities: latest.current.entities })
          .find(item => item.deviceId === deviceId && item.family === 'tv' && item.widgetType === currentType);
        const binding = device ? resolveTvDeviceBinding(device.deviceId, devices, registry, latest.current.entities) : null;
        if (!binding) throw new Error('Il dispositivo non è ancora pronto. Sceglilo dall’elenco aggiornato.');
        patch = { ...multimediaAssociationPatch(binding, initial.settings), productDevice: binding, name: device!.name };
      }
      if (!currentScope()) return;
      assertOwner();
      writing.current = true;
      await saveBinding(patch);
    })().catch(() => { if (request.current === current) setLinkError('Non posso completare l’associazione. Riprova dall’elenco dei dispositivi.'); })
      .finally(() => { if (operation.current === current) { operation.current = null; writing.current = false; busyRef.current = false; if (mounted.current) setLinking(false); } });
  };
  const type = String(settings.categoryWidgetType);
  const key = BINDING_KEYS[type];
  if (saveBinding && (type === 'calendar' || type === 'todo'))
    return <AgendaBindingSection kind={type} settings={settings} resourceKey={resourceKey} saveBinding={saveBinding} />;
  if (saveBinding && type === 'room')
    return <RoomBindingSection settings={settings} resourceKey={resourceKey} saveBinding={saveBinding} />;
  if (saveBinding && (type === 'weather' || type === 'cover_weather'))
    return <WeatherBindingSection settings={settings} saveBinding={saveBinding} home={type === 'cover_weather'} />;
  if (!key) return null;
  if ((type === 'cost' || type === 'nordpool') && saveBinding) return <EnergyBindingSection kind={type} settings={settings} saveBinding={saveBinding} />;
  if (type === 'sensor' && saveBinding) return <SensorBindingSection settings={settings} saveBinding={saveBinding} />;
  if ((type === 'plug' || type === 'climate' || type === 'cover' || type === 'fan' || type === 'lock' || type === 'alarm' || type === 'camera' || type === 'vacuum' || type === 'mower') && saveBinding)
    return <ProductBindingSection key={type} family={type} settings={settings} saveBinding={saveBinding} />;
  if (saveBinding && (type === 'media' || type === 'sonos')) return <ProductBindingSection family={type} settings={settings} saveBinding={saveBinding} />;
  if (saveBinding && (type === 'androidtv' || type === 'appletv') && !adding) {
    const selectedId = typeof settings.mediaPlayerId === 'string' ? settings.mediaPlayerId : null;
    return <>
      <ProductBindingSection family="tv" tvKind={type} settings={settings} saveBinding={saveBinding}
        disabled={linking} onBusyChange={onManualBusy} />
      {linkError && <Body role="alert">{linkError}</Body>}
      {linking && <Body role="status">Associazione in corso.</Body>}
      <fieldset disabled={linking || manualLinking} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <AddDeviceEntry onClick={openAdding} />
        {selectedId && <RemoveDevice entityId={selectedId} onRemoved={() => {
          if (latest.current.settings === settings && latest.current.settings.mediaPlayerId === selectedId) link(null);
        }} />}
      </fieldset>
    </>;
  }
  if (type === 'car' && saveBinding) return <CarBindingSection settings={settings} saveBinding={saveBinding} />;
  const ids =
    type === 'todo'
      ? Object.keys(entities).filter((id) => id.startsWith('todo.'))
      : type === 'car'
        ? Object.keys(entities).filter((id) =>
            ['sensor.', 'input_number.'].some((prefix) => id.startsWith(prefix))
          )
        : candidateEntityIds(
            type === 'androidtv' || type === 'appletv' ? 'tv' : type,
            entities,
            new Set()
          );
  const multiple = key === 'mediaIds' || key === 'calendars';
  const value =
    multiple && Array.isArray(settings[key])
      ? String(settings[key][0] ?? '')
      : typeof settings[key] === 'string'
        ? (settings[key] as string)
        : null;
  // A new TV can be added from here (REQ-18, D-D2).
  const canAddDevice = type === 'androidtv' || type === 'appletv';
  if (canAddDevice && adding) {
    return (
      <SheetSection title="Dispositivo">
        <DeviceFinder
          family="tv"
          {...(type === 'appletv' ? { handlers: APPLE_TV_HANDLERS } : {})}
          label="Aggiungi un dispositivo"
          Flow={DiscoveredAddFlow}
          onUse={(device) => {
            link(device.primaryEntityId);
            setAdding(false);
          }}
          onFlowDone={(entry) => {
            if (entry.mediaPlayerEntityId) link(entry.mediaPlayerEntityId);
            setAdding(false);
          }}
          onExit={() => setAdding(false)}
        />
      </SheetSection>
    );
  }
  return (
    <SheetSection title="Dispositivo">
      {!entitiesLoaded && (
        <Body size="sm" tone="muted">
          Attendo i dispositivi della casa.
        </Body>
      )}
      {canAddDevice && entitiesLoaded && ids.length === 0 ? (
        <Body size="sm" tone="muted">
          {deviceTexts.noTv}
        </Body>
      ) : (
        <EntitySelect
          label={type === 'car' ? 'Sensore batteria dell’auto' : 'Dispositivo da collegare'}
          entities={entities}
          ids={ids}
          value={value}
          onChange={link}
          noneLabel="Non collegato"
        />
      )}
      {canAddDevice && <AddDeviceEntry onClick={openAdding} />}
      {value && <RemoveDevice entityId={value} onRemoved={() => link(null)} />}
    </SheetSection>
  );
}

