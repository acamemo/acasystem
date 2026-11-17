import { useEffect, useRef, useState } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import { Body, Caption } from '@/components/primitives';
import { energySourceCandidateIds } from '@/components/widgets/utilities/energy/energyModel';
import { useOptionalLiveProfiles } from '@/hooks/liveProfiles/LiveProfilesContext';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { EntitySelect } from './parts/EntityPicker';
import { SheetSection } from './parts/Form';
import type { SaveProductBinding } from './ProductBindingSection';

export type EnergyWidgetKind = 'cost' | 'nordpool';
const SOURCES = [
  { key: 'powerId', kind: 'power', label: 'Potenza istantanea' },
  { key: 'consumptionId', kind: 'energy', label: 'Energia misurata' },
  { key: 'todayId', kind: 'cost', label: 'Costo di oggi' },
  { key: 'monthId', kind: 'cost', label: 'Costo del mese' },
  { key: 'nordpoolId', kind: 'price', label: 'Fonte dei prezzi' },
] as const;
type SourceKey = (typeof SOURCES)[number]['key'];

/** Explicit logical sources, shared by category and historical cards. Unlinking affects ACA only. */
export function EnergyBindingSection({
  kind,
  settings,
  saveBinding,
}: {
  kind: EnergyWidgetKind;
  settings: CardSettings;
  saveBinding: SaveProductBinding;
}) {
  const runtime = useWidgetRuntime(),
    live = useOptionalLiveProfiles();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const mounted = useRef(false),
    pending = useRef(false),
    writing = useRef(false);
  const generation = useRef(0),
    operation = useRef<number | null>(null);
  const latest = useRef({ kind, settings, conn: runtime.conn, live, entities: runtime.entities });
  latest.current = { kind, settings, conn: runtime.conn, live, entities: runtime.entities };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      operation.current = null;
      pending.current = false;
    };
  }, []);
  useEffect(() => {
    generation.current += 1;
    setError('');
    if (!writing.current) {
      operation.current = null;
      pending.current = false;
      setBusy(false);
    }
    return () => {
      generation.current += 1;
    };
  }, [kind, settings, runtime.conn]);
  const owner = () => {
    const snapshot = latest.current.live?.coordinator.snapshot();
    return [snapshot?.profile?.id ?? null, snapshot?.editor?.id ?? null] as const;
  };
  const sources = SOURCES.filter((source) =>
    kind === 'nordpool' ? source.key === 'nordpoolId' : source.key !== 'nordpoolId'
  );
  const select = async (key: SourceKey, id: string | null) => {
    if (!mounted.current || pending.current || !runtime.entitiesLoaded) return;
    const source = sources.find((item) => item.key === key);
    if (!source) return;
    const initial = latest.current,
      initialOwner = owner(),
      current = ++generation.current;
    if (id !== null && !energySourceCandidateIds(initial.entities, source.kind).includes(id))
      return;
    const currentScope = () =>
      mounted.current &&
      generation.current === current &&
      latest.current.settings === initial.settings &&
      latest.current.conn === initial.conn &&
      latest.current.kind === initial.kind;
    const sameOwner = () => {
      const now = owner();
      return now[0] === initialOwner[0] && now[1] === initialOwner[1];
    };
    if (!currentScope() || !sameOwner()) return;
    operation.current = current;
    pending.current = true;
    writing.current = true;
    setBusy(true);
    setError('');
    try {
      await saveBinding({ [key]: id });
    } catch {
      if (currentScope() && sameOwner()) setError('Associazione non confermata. Riprova.');
    } finally {
      if (operation.current === current) {
        operation.current = null;
        pending.current = false;
        writing.current = false;
        if (mounted.current) setBusy(false);
      }
    }
  };
  return (
    <SheetSection title={kind === 'nordpool' ? 'Fonte dei prezzi' : 'Fonti energetiche'}>
      {error ? (
        <Body role="alert">{error}</Body>
      ) : busy ? (
        <Body role="status">Associazione in corso.</Body>
      ) : !runtime.entitiesLoaded ? (
        <Body role="status">Attendo le fonti della casa.</Body>
      ) : null}
      <fieldset
        disabled={busy || !runtime.entitiesLoaded}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        {sources.map((source) => {
          const raw = settings[source.key];
          const value = typeof raw === 'string' && raw ? raw : null;
          const candidates = energySourceCandidateIds(runtime.entities, source.kind);
          const configured = raw !== null && raw !== undefined && raw !== '';
          const incompatible = configured && (!value || !candidates.includes(value));
          return (
            <div key={source.key}>
              <EntitySelect
                label={source.label}
                entities={runtime.entities}
                ids={[...new Set([...candidates, ...(value ? [value] : [])])]}
                value={value}
                noneLabel="Non collegato"
                onChange={(id) => {
                  void select(source.key, id);
                }}
              />
              {runtime.entitiesLoaded && incompatible && (
                <Caption>
                  Collegamento precedente non compatibile. Scegli un’altra fonte o scollegalo.
                </Caption>
              )}
            </div>
          );
        })}
      </fieldset>
    </SheetSection>
  );
}
