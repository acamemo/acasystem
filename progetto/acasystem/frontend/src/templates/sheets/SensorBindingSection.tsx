import { useEffect, useRef, useState } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import { Body, Segmented } from '@/components/primitives';
import { useOptionalLiveProfiles } from '@/hooks/liveProfiles/LiveProfilesContext';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { candidateEntityIds } from '@/domain/launcher/catalog';
import { sensorProductBinding } from '@/utils/devices/productBinding';
import { EntitySelect } from './parts/EntityPicker';
import { SheetSection } from './parts/Form';
import { ProductBindingSection, type SaveProductBinding } from './ProductBindingSection';

type SensorBindingMode = 'device' | 'helper';
/** Existing one-entity cards remain helpers until a person explicitly chooses a device. */
export function initialSensorBindingMode(settings: CardSettings): SensorBindingMode {
  if (sensorProductBinding(settings)) return 'device';
  return settings.sensorBindingMode === 'helper' ||
    (typeof settings.entityId === 'string' && !!settings.entityId)
    ? 'helper'
    : 'device';
}

/** Both modes keep the historical sensor type/entityId. Merely browsing a tab never writes. */
export function SensorBindingSection({
  settings,
  saveBinding,
}: {
  settings: CardSettings;
  saveBinding: SaveProductBinding;
}) {
  const runtime = useWidgetRuntime(),
    live = useOptionalLiveProfiles();
  const [mode, setMode] = useState<SensorBindingMode>(() => initialSensorBindingMode(settings));
  const [helperBusy, setHelperBusy] = useState(false),
    [deviceBusy, setDeviceBusy] = useState(false),
    [error, setError] = useState('');
  const busy = useRef(false),
    devicePending = useRef(false),
    writing = useRef(false),
    mounted = useRef(false);
  const generation = useRef(0),
    operation = useRef<number | null>(null);
  const latest = useRef({ settings, conn: runtime.conn, live, entities: runtime.entities });
  latest.current = { settings, conn: runtime.conn, live, entities: runtime.entities };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      operation.current = null;
      busy.current = false;
    };
  }, []);
  useEffect(() => {
    generation.current += 1;
    setError('');
    if (!writing.current) {
      operation.current = null;
      busy.current = false;
      setHelperBusy(false);
    }
    return () => {
      generation.current += 1;
    };
  }, [settings, runtime.conn]);
  const owner = () => {
    const snapshot = latest.current.live?.coordinator.snapshot();
    return [snapshot?.profile?.id ?? null, snapshot?.editor?.id ?? null] as const;
  };
  const value =
    typeof settings.entityId === 'string' && settings.entityId ? settings.entityId : null;
  const ids = [
    ...new Set([
      ...candidateEntityIds('sensor', runtime.entities, new Set()),
      ...(value ? [value] : []),
    ]),
  ];
  const selectHelper = async (id: string | null) => {
    if (!mounted.current || busy.current || devicePending.current || mode !== 'helper') return;
    const initial = latest.current,
      initialOwner = owner(),
      current = ++generation.current;
    const candidates = candidateEntityIds('sensor', initial.entities, new Set());
    if (id !== null && !candidates.includes(id) && id !== initial.settings.entityId) return;
    const currentScope = () =>
      mounted.current &&
      generation.current === current &&
      latest.current.settings === initial.settings &&
      latest.current.conn === initial.conn;
    const now = owner();
    if (!currentScope() || now[0] !== initialOwner[0] || now[1] !== initialOwner[1]) return;
    operation.current = current;
    busy.current = true;
    writing.current = true;
    setHelperBusy(true);
    setError('');
    try {
      await saveBinding({
        entityId: id,
        productDevice: undefined,
        bindingEntityId: null,
        sensorBindingMode: 'helper',
      });
    } catch {
      const now = owner();
      if (currentScope() && now[0] === initialOwner[0] && now[1] === initialOwner[1])
        setError('Associazione non riuscita. Riprova.');
    } finally {
      if (operation.current === current) {
        operation.current = null;
        busy.current = false;
        writing.current = false;
        if (mounted.current) setHelperBusy(false);
      }
    }
  };
  return (
    <div className="aca-settings">
      <Segmented<SensorBindingMode>
        label="Tipo di associazione"
        options={[
          { value: 'device', label: 'Dispositivo' },
          { value: 'helper', label: 'Helper e comandi' },
        ]}
        value={mode}
        disabled={helperBusy || deviceBusy}
        onChange={(next) => {
          if (!busy.current && !devicePending.current) {
            setError('');
            setMode(next);
          }
        }}
      />
      {mode === 'device' ? (
        <ProductBindingSection
          family="sensor"
          settings={settings}
          saveBinding={saveBinding}
          disabled={helperBusy}
          onBusyChange={(pending) => {
            devicePending.current = pending;
            setDeviceBusy(pending);
          }}
        />
      ) : (
        <SheetSection title="Helper e comandi">
          {error && <Body role="alert">{error}</Body>}
          {helperBusy && <Body role="status">Associazione in corso.</Body>}
          <fieldset
            disabled={helperBusy || deviceBusy}
            style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
          >
            <EntitySelect
              label="Helper o comando"
              entities={runtime.entities}
              ids={ids}
              value={value}
              noneLabel="Non collegato"
              onChange={(id) => {
                void selectHelper(id);
              }}
            />
          </fieldset>
        </SheetSection>
      )}
    </div>
  );
}
