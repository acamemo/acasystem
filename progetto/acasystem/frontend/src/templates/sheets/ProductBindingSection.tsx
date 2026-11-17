import { multimediaAssociationPatch } from '@/utils/devices/multimediaSettings';
import { useEffect, useRef, useState } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap } from '@/@types/ha';
import { Body, Button } from '@/components/primitives';
import { useOptionalLiveProfiles } from '@/hooks/liveProfiles/LiveProfilesContext';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { getDeviceRegistry, getEntityRegistry } from '@/api/haClient';
import { classifyDevices } from '@/utils/devices/classify';
import { resolvePlugDeviceBinding, resolveClimateDeviceBinding, resolveCoverDeviceBinding, resolveFanDeviceBinding, resolveLockDeviceBinding, resolveAlarmDeviceBinding, resolveCameraDeviceBinding, resolveVacuumDeviceBinding, resolveMowerDeviceBinding, resolveTvDeviceBinding, resolveSonosDeviceBinding, resolveMediaDeviceBinding, resolveSensorDeviceBinding, type ProductDeviceBinding } from '@/utils/devices/productBinding';
import { EntitySelect } from './parts/EntityPicker';
import { SheetSection } from './parts/Form';

export type SaveProductBinding = (patch: Partial<Pick<CardSettings, 'bindingEntityId' | 'climateId' | 'coverId' | 'lockId' | 'alarmId' | 'cameraId' | 'mediaPlayerId' | 'mediaIds' | 'entityId' | 'sensorBindingMode' | 'powerId' | 'consumptionId' | 'todayId' | 'monthId' | 'nordpoolId' | 'weatherId' | 'tempId' | 'productDevice' | 'name' | 'calendars' | 'todoEntityId' | 'areaId' | 'areaName' | 'areaIcon' | 'entityIds' | 'roomMembershipSource'>>) => Promise<void>;

/** Manual association uses the same exact-device resolver as Trova, without issuing commands. */
export function ProductBindingSection({ settings, saveBinding, family = 'plug', tvKind, disabled = false, onBusyChange }: { settings: CardSettings; saveBinding: SaveProductBinding; family?: 'plug' | 'climate' | 'cover' | 'fan' | 'lock' | 'alarm' | 'camera' | 'vacuum' | 'mower' | 'tv' | 'sonos' | 'media' | 'sensor'; tvKind?: 'androidtv' | 'appletv'; disabled?: boolean; onBusyChange?: (busy: boolean) => void }) {
  const associationKey = family === 'sensor' ? 'entityId' : family === 'tv' ? 'mediaPlayerId' : family === 'media' || family === 'sonos' ? 'mediaIds' : family === 'camera' ? 'cameraId' : family === 'alarm' ? 'alarmId' : family === 'lock' ? 'lockId' : family === 'cover' ? 'coverId' : family === 'climate' ? 'climateId' : 'bindingEntityId';
  const resolve = family === 'sensor' ? resolveSensorDeviceBinding : family === 'tv' ? resolveTvDeviceBinding : family === 'sonos' ? resolveSonosDeviceBinding : family === 'media' ? resolveMediaDeviceBinding : family === 'vacuum' ? resolveVacuumDeviceBinding : family === 'mower' ? resolveMowerDeviceBinding : family === 'camera' ? resolveCameraDeviceBinding : family === 'alarm' ? resolveAlarmDeviceBinding : family === 'lock' ? resolveLockDeviceBinding : family === 'fan' ? resolveFanDeviceBinding : family === 'cover' ? resolveCoverDeviceBinding : family === 'climate' ? resolveClimateDeviceBinding : resolvePlugDeviceBinding;
  const runtime = useWidgetRuntime();
  const live = useOptionalLiveProfiles();
  const [choices, setChoices] = useState<{ bindings: Map<string, ProductDeviceBinding>; entities: EntityMap } | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const request = useRef(0), busyRef = useRef(false), writing = useRef(false), operation = useRef<number | null>(null);
  const latest = useRef({ conn: runtime.conn, settings, family, tvKind, disabled, live, onBusyChange });
  latest.current = { conn: runtime.conn, settings, family, tvKind, disabled, live, onBusyChange };
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; operation.current = null; busyRef.current = false; latest.current.onBusyChange?.(false); }; }, []);
  const owner = () => {
    const snapshot = latest.current.live?.coordinator.snapshot();
    return [snapshot?.profile?.id ?? null, snapshot?.editor?.id ?? null] as const;
  };
  const entitiesRef = useRef(runtime.entities);
  entitiesRef.current = runtime.entities;
  useEffect(() => {
    request.current += 1;
    if (!writing.current) { operation.current = null; busyRef.current = false; setBusy(false); latest.current.onBusyChange?.(false); }
    return () => { request.current += 1; };
  }, [runtime.conn, settings, family, tvKind]);
  useEffect(() => {
    if (!runtime.entitiesLoaded) return;
    let active = true;
    setError('');
    void Promise.all([getDeviceRegistry(runtime.conn), getEntityRegistry(runtime.conn)]).then(([devices, registry]) => {
      if (!active) return;
      const bindings = new Map<string, ProductDeviceBinding>();
      const entities: EntityMap = {};
      for (const device of classifyDevices({ devices, entityRegistry: registry, entities: entitiesRef.current })) {
        if (device.family !== family || tvKind && device.widgetType !== tvKind) continue;
        const binding = resolve(device.deviceId, devices, registry, entitiesRef.current);
        if (!binding) continue;
        const entity = entitiesRef.current[binding.primaryEntityId]!;
        bindings.set(binding.primaryEntityId, binding);
        entities[binding.primaryEntityId] = { ...entity, attributes: { ...entity.attributes, friendly_name: device.name } };
      }
      setChoices({ bindings, entities });
    }).catch(() => { if (active) setError('Non posso leggere i dispositivi. Riprova.'); });
    return () => { active = false; };
  }, [runtime.conn, runtime.entitiesLoaded, retry, family, resolve, tvKind]);
  const link = async (id: string | null) => {
    if (!mounted.current || disabled || busyRef.current) return;
    const binding = id ? choices?.bindings.get(id) : null;
    if (id && !binding) return;
    const current = ++request.current, initial = latest.current, initialOwner = owner();
    const currentScope = () => mounted.current && request.current === current && latest.current.conn === initial.conn
      && latest.current.settings === initial.settings && latest.current.family === initial.family
      && latest.current.tvKind === initial.tvKind && !latest.current.disabled;
    const assertOwner = () => { const now = owner(); if (now[0] !== initialOwner[0] || now[1] !== initialOwner[1])
      throw new Error('Il profilo o la modifica sono cambiati. Riapri il widget.'); };
    operation.current = current; busyRef.current = true; setBusy(true); onBusyChange?.(true); setError('');
    try {
      let fresh = binding;
      let name: string | undefined;
      if (binding) {
        const [devices, registry] = await Promise.all([getDeviceRegistry(runtime.conn), getEntityRegistry(runtime.conn)]);
        if (!currentScope()) return;
        assertOwner();
        const device = classifyDevices({ devices, entityRegistry: registry, entities: entitiesRef.current })
          .find(item => item.deviceId === binding.deviceId && item.family === family && (!tvKind || item.widgetType === tvKind));
        fresh = device ? resolve(binding.deviceId, devices, registry, entitiesRef.current) : null;
        if (!fresh) throw new Error('Il dispositivo non è più disponibile. Aggiorna l’elenco.');
        name = device!.name;
      }
      if (!currentScope()) return;
      assertOwner();
      writing.current = true;
      await saveBinding({ [associationKey]: fresh?.primaryEntityId ?? null, ...(associationKey !== 'bindingEntityId' ? { bindingEntityId: null } : {}), ...(fresh ? multimediaAssociationPatch(fresh, initial.settings) : associationKey === 'mediaIds' ? { mediaIds: [] } : {}), ...(family === 'sensor' ? { sensorBindingMode: 'device' } : {}), productDevice: fresh ?? undefined, name });
    } catch (failure) {
      if (request.current === current) setError(failure instanceof Error ? failure.message : 'Associazione non riuscita. Riprova.');
    } finally { if (operation.current === current) { operation.current = null; writing.current = false; busyRef.current = false; if (mounted.current) setBusy(false); latest.current.onBusyChange?.(false); } }
  };
  return <SheetSection title="Dispositivo">
    {error && <Body role="alert">{error}</Body>}
    {error && <Button variant="control" onClick={() => setRetry(value => value + 1)}>Riprova</Button>}
    {!choices && !error && <Body role="status">Attendo i dispositivi della casa.</Body>}
    {choices && <fieldset disabled={busy || disabled} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <EntitySelect label="Dispositivo da collegare" entities={choices.entities} ids={[...choices.bindings.keys()]}
        value={Array.isArray(settings[associationKey]) ? String((settings[associationKey] as string[])[0] ?? '') : typeof settings[associationKey] === 'string' ? String(settings[associationKey]) : null}
        onChange={id => { void link(id); }} noneLabel="Non collegato" />
      {choices.bindings.size === 0 && <Body size="sm">{family === 'sensor' ? 'Nessun dispositivo con sensori disponibile.' : family === 'tv' ? 'Nessuna TV disponibile.' : family === 'sonos' ? 'Nessun dispositivo Sonos disponibile.' : family === 'media' ? 'Nessun lettore disponibile.' : family === 'vacuum' ? 'Nessun aspirapolvere disponibile.' : family === 'mower' ? 'Nessun tagliaerba disponibile.' : family === 'camera' ? 'Nessuna videocamera disponibile.' : family === 'alarm' ? 'Nessun allarme disponibile.' : family === 'lock' ? 'Nessuna serratura disponibile.' : family === 'fan' ? 'Nessun ventilatore disponibile.' : family === 'cover' ? 'Nessuna tapparella o tenda disponibile.' : family === 'climate' ? 'Nessun dispositivo Clima disponibile.' : 'Nessuna presa o interruttore disponibile.'} Usa Trova dispositivi per collegarne uno.</Body>}
    </fieldset>}
  </SheetSection>;
}
