import { useEffect, useId, useRef, useState } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import { Body, Button, Caption, Disclosure, DisclosureGroup, Field } from '@/components/primitives';
import {
  CAR_SOURCE_FIELDS,
  candidateCarSourceIds,
  carImageSource,
  carSourceMetadata,
  configuredCarSources,
  type CarSourceField,
} from '@/domain/car/carSources';
import { useOptionalLiveProfiles } from '@/hooks/liveProfiles/LiveProfilesContext';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { EntitySelect, entityName } from './parts/EntityPicker';
import { FormRow, SheetSection } from './parts/Form';

export type SaveCarBinding = (
  patch: Partial<Pick<CardSettings, CarSourceField | 'chargeControlIds' | 'imageUrl'>>
) => Promise<void>;

/** Explicit car sources shared by category and historical widgets. No inferred vehicle grouping. */
export function CarBindingSection({
  settings,
  saveBinding,
}: {
  settings: CardSettings;
  saveBinding: SaveCarBinding;
}) {
  const disclosureId = useId();
  const runtime = useWidgetRuntime(),
    live = useOptionalLiveProfiles();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [image, setImage] = useState(
    typeof settings.imageUrl === 'string' ? settings.imageUrl : ''
  );
  const mounted = useRef(false),
    pending = useRef(false),
    writing = useRef(false);
  const generation = useRef(0),
    operation = useRef<number | null>(null);
  const latest = useRef({ settings, conn: runtime.conn, live });
  latest.current = { settings, conn: runtime.conn, live };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current = false;
      operation.current = null;
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
  }, [settings, runtime.conn]);
  useEffect(() => {
    setImage(typeof settings.imageUrl === 'string' ? settings.imageUrl : '');
  }, [settings.imageUrl, runtime.conn]);
  const owner = () => {
    const snapshot = latest.current.live?.coordinator.snapshot();
    return [snapshot?.profile?.id ?? null, snapshot?.editor?.id ?? null] as const;
  };
  const commit = async (patch: Parameters<SaveCarBinding>[0]) => {
    if (!mounted.current || pending.current || !runtime.entitiesLoaded) return;
    const initial = latest.current,
      initialOwner = owner(),
      current = ++generation.current;
    const currentScope = () =>
      mounted.current &&
      generation.current === current &&
      latest.current.settings === initial.settings &&
      latest.current.conn === initial.conn;
    const sameOwner = () => {
      const now = owner();
      return now[0] === initialOwner[0] && now[1] === initialOwner[1];
    };
    if (!currentScope() || !sameOwner()) return;
    pending.current = true;
    writing.current = true;
    operation.current = current;
    setBusy(true);
    setError('');
    try {
      await saveBinding(patch);
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
  const select = (key: CarSourceField, id: string | null) => {
    if (id !== null && !candidateCarSourceIds(runtime.entities, key).includes(id)) return;
    void commit(
      key === 'chargingStateId' || key === 'chargingId'
        ? { chargingStateId: id, chargingId: id }
        : { [key]: id }
    );
  };
  const fields = CAR_SOURCE_FIELDS;
  const sections = [...new Set(fields.map((field) => field.section))];
  const effective = configuredCarSources(settings);
  const rawControls = Array.isArray(settings.chargeControlIds) ? settings.chargeControlIds : [];
  const controls = [
    ...new Set(rawControls.filter((id): id is string => typeof id === 'string' && Boolean(id))),
  ];
  const malformedControls =
    settings.chargeControlIds !== undefined &&
    settings.chargeControlIds !== null &&
    (!Array.isArray(settings.chargeControlIds) ||
      rawControls.some((id) => typeof id !== 'string' || !id));
  const saveImage = () => {
    const next = image.trim();
    if (next && !carImageSource(next)) {
      setError(
        'Indirizzo immagine non compatibile. Usa un percorso locale o un indirizzo HTTP o HTTPS.'
      );
      return;
    }
    void commit({ imageUrl: next || null });
  };
  const sourceFields = (section: (typeof sections)[number]) => (
    <>
      {fields
        .filter((field) => field.section === section)
        .map((field) => {
          const raw =
            field.key === 'chargingStateId' ? effective.ids.chargingStateId : settings[field.key];
          const value = typeof raw === 'string' && raw ? raw : null;
          const candidates = candidateCarSourceIds(runtime.entities, field.key);
          const incompatible =
            raw !== null &&
            raw !== undefined &&
            raw !== '' &&
            (!value ||
              !runtime.entities[value] ||
              !carSourceMetadata(runtime.entities[value], field.key).compatible);
          return (
            <div key={field.key}>
              <EntitySelect
                label={field.label}
                entities={runtime.entities}
                ids={[...new Set([...candidates, ...(value ? [value] : [])])]}
                value={value}
                noneLabel="Non collegato"
                onChange={(id) => select(field.key, id)}
              />
              {runtime.entitiesLoaded && incompatible && (
                <Caption>
                  Collegamento precedente non compatibile. Scegli un’altra fonte o scollegalo.
                </Caption>
              )}
            </div>
          );
        })}
    </>
  );
  return (
    <>
      <SheetSection title="Associazioni dell’auto">
        <Caption as="p">
          Alcuni collegamenti si applicano anche agli altri widget di questa auto.
        </Caption>
        {error ? (
          <Body role="alert">{error}</Body>
        ) : busy ? (
          <Body role="status">Associazione in corso.</Body>
        ) : !runtime.entitiesLoaded ? (
          <Body role="status">Attendo le fonti della casa.</Body>
        ) : null}
      </SheetSection>
      <fieldset
        disabled={busy || !runtime.entitiesLoaded}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        <SheetSection title={sections[0]!}>{sourceFields(sections[0]!)}</SheetSection>
        <DisclosureGroup>
          {sections.slice(1).map((section) => (
            <Disclosure
              key={section}
              id={`${disclosureId}-${section}`}
              title={section}
              count={
                fields.filter(
                  (field) => field.section === section && Boolean(effective.ids[field.key])
                ).length
              }
            >
              {sourceFields(section)}
            </Disclosure>
          ))}
          <Disclosure
            id={`${disclosureId}-commands`}
            title="Comandi di ricarica aggiuntivi"
            count={controls.length}
          >
            <EntitySelect
              label="Aggiungi comando di ricarica"
              entities={runtime.entities}
              ids={candidateCarSourceIds(runtime.entities, 'chargeControlId').filter(
                (id) => !controls.includes(id)
              )}
              value={null}
              noneLabel="Scegli un comando"
              onChange={(id) => {
                if (id && candidateCarSourceIds(runtime.entities, 'chargeControlId').includes(id))
                  void commit({ chargeControlIds: [...rawControls, id] });
              }}
            />
            {controls.map((id) => (
              <div className="aca-adaptive-binding" key={id}>
                <Caption>{entityName(runtime.entities, id)}</Caption>
                <Button
                  variant="control"
                  size="sm"
                  aria-label={`Scollega ${entityName(runtime.entities, id)}`}
                  onClick={() =>
                    void commit({ chargeControlIds: rawControls.filter((value) => value !== id) })
                  }
                >
                  Scollega
                </Button>
                {(!runtime.entities[id] ||
                  !carSourceMetadata(runtime.entities[id], 'chargeControlId').compatible) && (
                  <Caption>Collegamento precedente non compatibile.</Caption>
                )}
              </div>
            ))}
            {malformedControls && (
              <>
                <Caption>
                  L’elenco precedente non è compatibile. Puoi scollegarlo e scegliere nuovi comandi.
                </Caption>
                <Button
                  variant="control"
                  size="sm"
                  onClick={() => void commit({ chargeControlIds: [] })}
                >
                  Scollega elenco
                </Button>
              </>
            )}
          </Disclosure>
          <Disclosure
            id={`${disclosureId}-image`}
            title="Immagine dell’auto"
            count={settings.imageUrl ? 1 : 0}
          >
            <FormRow
              label="Indirizzo immagine"
              hint="Percorso locale o indirizzo dell’immagine. La scelta non apre un’anteprima."
            >
              {({ labelId, hintId }) => (
                <Field
                  label="Indirizzo immagine"
                  aria-labelledby={labelId}
                  aria-describedby={hintId}
                  placeholder="/local/auto.png"
                  value={image}
                  onChange={(event) => setImage(event.target.value)}
                />
              )}
            </FormRow>
            <Button variant="control" onClick={saveImage}>
              Salva immagine
            </Button>
            {settings.imageUrl !== undefined &&
              settings.imageUrl !== null &&
              settings.imageUrl !== '' && (
                <Button variant="control" onClick={() => void commit({ imageUrl: null })}>
                  Scollega immagine
                </Button>
              )}
          </Disclosure>
        </DisclosureGroup>
      </fieldset>
    </>
  );
}
