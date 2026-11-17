import { useEffect, useRef, useState } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap } from '@/@types/ha';
import { Body, Caption } from '@/components/primitives';
import {
  temperatureSourceEligible,
  weatherSourceEligible,
} from '@/components/widgets/home/weather/weatherModel';
import { coverWeatherEntity } from '@/components/widgets/home/cover/CoverWeather';
import { useOptionalLiveProfiles } from '@/hooks/liveProfiles/LiveProfilesContext';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { EntitySelect, entityName } from './parts/EntityPicker';
import { SheetSection } from './parts/Form';

export type SaveWeatherBinding = (
  patch: Partial<Pick<CardSettings, 'weatherId' | 'tempId'>>
) => Promise<void>;

/** Sources are chosen explicitly; a missing old reference remains available for recovery. */
export function weatherBindingCandidates(
  entities: EntityMap,
  key: 'weatherId' | 'tempId'
): string[] {
  return Object.keys(entities).filter((id) =>
    key === 'weatherId'
      ? weatherSourceEligible(entities[id])
      : temperatureSourceEligible(entities[id])
  );
}

export function WeatherBindingSection({
  settings,
  saveBinding,
  home = false,
}: {
  settings: CardSettings;
  saveBinding: SaveWeatherBinding;
  home?: boolean;
}) {
  const runtime = useWidgetRuntime(),
    live = useOptionalLiveProfiles();
  const automatic = home ? coverWeatherEntity(runtime.entities) : undefined;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const mounted = useRef(false),
    pending = useRef(false),
    generation = useRef(0);
  const operation = useRef<number | null>(null);
  const latest = useRef({ conn: runtime.conn, home, live });
  latest.current = { conn: runtime.conn, home, live };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current += 1;
    };
  }, []);
  useEffect(() => {
    generation.current += 1;
    setError('');
    if (!pending.current) setBusy(false);
    return () => {
      generation.current += 1;
    };
  }, [runtime.conn, home]);
  const owner = () => {
    const snapshot = latest.current.live?.coordinator.snapshot();
    return [snapshot?.profile?.id ?? null, snapshot?.editor?.id ?? null] as const;
  };
  const choose = async (key: 'weatherId' | 'tempId', id: string | null) => {
    if (!mounted.current || pending.current || !runtime.entitiesLoaded) return;
    if (id !== null && !weatherBindingCandidates(runtime.entities, key).includes(id)) return;
    const start = latest.current,
      initialOwner = owner(),
      current = ++generation.current;
    const sameScope = () => {
      const now = owner();
      return (
        mounted.current &&
        generation.current === current &&
        latest.current.conn === start.conn &&
        latest.current.home === start.home &&
        now[0] === initialOwner[0] &&
        now[1] === initialOwner[1]
      );
    };
    pending.current = true;
    operation.current = current;
    setBusy(true);
    setError('');
    try {
      await saveBinding({ [key]: id });
    } catch {
      if (sameScope()) setError('Associazione non confermata. La bozza è conservata. Riprova.');
    } finally {
      if (operation.current === current) {
        operation.current = null;
        pending.current = false;
        if (mounted.current) setBusy(false);
      }
    }
  };
  return (
    <SheetSection title="Fonti meteo">
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
        {(['weatherId', 'tempId'] as const).map((key) => {
          const raw = settings[key],
            value = typeof raw === 'string' && raw ? raw : null;
          const candidates = weatherBindingCandidates(runtime.entities, key);
          const incompatible =
            raw !== undefined &&
            raw !== null &&
            raw !== '' &&
            (!value || !candidates.includes(value));
          return (
            <div key={key}>
              <EntitySelect
                label={key === 'weatherId' ? 'Fonte meteo' : 'Temperatura locale'}
                entities={runtime.entities}
                ids={[...new Set([...candidates, ...(value ? [value] : [])])]}
                value={value}
                noneLabel={
                  key === 'weatherId'
                    ? home
                      ? 'Automatica della casa'
                      : 'Non collegata'
                    : 'Dalla fonte meteo'
                }
                onChange={(id) => {
                  void choose(key, id);
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
        {home && !settings.weatherId && runtime.entitiesLoaded && (
          <Caption as="p">
            {automatic
              ? `Fonte automatica: ${entityName(runtime.entities, automatic.entity_id)}`
              : 'Nessuna fonte della casa disponibile.'}
          </Caption>
        )}
      </fieldset>
    </SheetSection>
  );
}
