import { useEffect, useRef, useState } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import type { HaAreaEntry, ServiceData } from '@/@types/ha';
import { Button, Caption, Icon, Skeleton, Slider } from '@/components/primitives';
import { getAreas, getEntityRegistry } from '@/api/haClient';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { useServiceCatalog } from '../../adaptive/useServiceCatalog';
import { callSafely } from '../../controls/shared/service';
import { useTrackedCommand } from '../../controls/shared/useTrackedCommand';
import { CommandFeedback } from '../../controls/shared/CommandFeedback';
import { CommandResultError } from '@/api/commandApi';
import { OptionPicker, Section } from '../../utilities/shared/details';
import {
  productVacuumView,
  vacuumActionSupported,
  vacuumProductBinding,
  vacuumService,
  vacuumMapUrl,
} from './productVacuumModel';

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const stored = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const save = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Preference remains in this view. */
  }
};

function ExplicitVacuumNumber({
  entityId,
  label,
  disabled,
}: {
  entityId: string;
  label: string;
  disabled: boolean;
}) {
  const runtime = useWidgetRuntime(),
    services = useServiceCatalog(),
    entity = runtime.entities[entityId];
  const raw = entity?.state ?? '',
    value = raw.trim() ? Number(raw) : NaN;
  const min = entity?.attributes.min,
    max = entity?.attributes.max,
    step = entity?.attributes.step;
  const valid =
    typeof min === 'number' &&
    typeof max === 'number' &&
    typeof step === 'number' &&
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    Number.isFinite(step) &&
    max > min &&
    step > 0 &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max;
  const domain = entityId.split('.')[0]!,
    command = useTrackedCommand(Number.isFinite(value) ? value : null);
  const blocked = disabled || !valid || !vacuumService(services, 'set_value', domain);
  const { clear: clearNumber } = command;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    latest = useRef({ blocked, runtime, min, max, step });
  useEffect(() => {
    latest.current = { blocked, runtime, min, max, step };
  });
  useEffect(() => {
    if (blocked && timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
      clearNumber();
    }
  }, [blocked, clearNumber]);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    []
  );
  if (!valid) return <Caption>{label}: valore o limiti non disponibili.</Caption>;
  return (
    <div className="product-vacuum-number">
      <Slider
        label={label}
        value={command.value ?? value}
        min={min}
        max={max}
        step={step}
        disabled={blocked}
        pending={command.pending}
        error={command.failed}
        valueText={String(command.value ?? value)}
        onValueChange={(next) => {
          if (
            blocked ||
            next < min ||
            next > max ||
            !Number.isFinite(next) ||
            Math.abs((next - min) / step - Math.round((next - min) / step)) > 0.001
          )
            return;
          if (timer.current !== null) clearTimeout(timer.current);
          command.request(next);
          timer.current = setTimeout(() => {
            timer.current = null;
            const now = latest.current;
            if (
              now.blocked ||
              now.min !== min ||
              now.max !== max ||
              now.step !== step ||
              !now.runtime.conn ||
              now.runtime.conn.connected === false
            ) {
              command.clear();
              return;
            }
            command.run(next, domain, 'set_value', { entity_id: entityId, value: next });
          }, 200);
        }}
      />
      <CommandFeedback
        message={command.message ? 'Esito non determinato. Verifica lo stato del robot.' : null}
        pendingText={command.pending ? 'Lavaggio richiesto' : null}
      />
    </div>
  );
}

/** Only already-mapped HA areas are read. No admin get_segments and no integration-wide relations. */
export function ProductVacuumOptions({
  entityId,
  label,
  settings,
}: {
  entityId: string;
  label: string;
  settings: CardSettings;
}) {
  const runtime = useWidgetRuntime(),
    visible = usePageVisible(),
    services = useServiceCatalog();
  const binding = vacuumProductBinding(settings),
    view = productVacuumView(runtime.entities[entityId]);
  const primary = binding?.primaryEntityId === entityId;
  const [areaResult, setAreaResult] = useState<{
    conn: object;
    entityId: string;
    deviceId: string | null;
    areas: HaAreaEntry[];
    error: boolean;
  } | null>(null);
  const [areas, setAreas] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState('');
  const sending = useRef(false),
    mounted = useRef(false);
  const areaSupported = vacuumActionSupported(view, services, 'clean_area');
  const connected = !!runtime.conn && runtime.conn.connected !== false;
  const blocked =
    !visible || runtime.editMode || !runtime.entitiesLoaded || !connected || !view.available;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!visible || !areaSupported || !connected || !runtime.conn) return;
    let active = true;
    const conn = runtime.conn;
    void Promise.all([getEntityRegistry(conn), getAreas(conn)])
      .then(([entries, areaList]) => {
        const own = entries.find(
          (entry) =>
            entry.entity_id === entityId &&
            entry.device_id === binding?.deviceId &&
            !entry.disabled_by &&
            !entry.hidden_by
        );
        const options =
          record(own?.options) && record(own.options.vacuum) ? own.options.vacuum : null;
        const mapping = record(options?.area_mapping) ? options.area_mapping : {};
        const mapped = Object.keys(mapping).filter(
          (id) => Array.isArray(mapping[id]) && mapping[id].length > 0
        );
        if (active)
          setAreaResult({
            conn,
            entityId,
            deviceId: binding?.deviceId ?? null,
            areas: areaList.filter((area) => mapped.includes(area.area_id)),
            error: false,
          });
      })
      .catch(() => {
        if (active)
          setAreaResult({
            conn,
            entityId,
            deviceId: binding?.deviceId ?? null,
            areas: [],
            error: true,
          });
      });
    return () => {
      active = false;
    };
  }, [visible, areaSupported, connected, runtime.conn, entityId, binding?.deviceId]);
  const currentAreas =
    areaSupported &&
    areaResult?.conn === runtime.conn &&
    areaResult.entityId === entityId &&
    areaResult.deviceId === (binding?.deviceId ?? null)
      ? areaResult
      : null;
  const send = (domain: string, service: string, target: string, data: ServiceData = {}) => {
    const targetEntity = runtime.entities[target];
    if (
      blocked ||
      sending.current ||
      !vacuumService(services, service, domain) ||
      !targetEntity ||
      ['unknown', 'unavailable'].includes(targetEntity.state)
    )
      return;
    sending.current = true;
    setBusy(true);
    setFeedback('Invio del comando…');
    void callSafely(runtime, domain, service, { ...data, entity_id: target })
      .then(() => {
        if (mounted.current) setFeedback('Home Assistant ha accettato il comando.');
      })
      .catch((error: unknown) => {
        if (mounted.current)
          setFeedback(
            error instanceof CommandResultError && error.code === 'RESULT_UNKNOWN'
              ? 'Esito non determinato. Verifica lo stato del robot.'
              : 'Comando non riuscito. Verifica le associazioni e riprova.'
          );
      })
      .finally(() => {
        sending.current = false;
        if (mounted.current) setBusy(false);
      });
  };
  const mappings = record(settings.adaptiveBindings) ? settings.adaptiveBindings : {};
  const selectId = (key: string, fallback: string) =>
    primary && typeof (settings[key] ?? mappings[fallback]) === 'string'
      ? String(settings[key] ?? mappings[fallback])
      : '';
  const explicitSelect = (key: string, fallback: string, title: string) => {
    const id = selectId(key, fallback),
      domain = id.split('.')[0]!;
    const entity = runtime.entities[id],
      raw = entity?.attributes.options;
    if (!id) return null;
    if (['number', 'input_number'].includes(domain))
      return (
        <ExplicitVacuumNumber
          key={id}
          entityId={id}
          label={`${title} di ${label}`}
          disabled={blocked}
        />
      );
    if (!['select', 'input_select'].includes(domain)) return null;
    const options = Array.isArray(raw)
      ? raw.filter((option): option is string => typeof option === 'string')
      : [];
    return (
      <OptionPicker
        key={id}
        label={`${title} di ${label}`}
        value={
          entity && !['unknown', 'unavailable', ''].includes(entity.state) ? entity.state : null
        }
        options={options.map((value) => ({ value, label: value }))}
        disabled={
          blocked ||
          busy ||
          !entity ||
          ['unknown', 'unavailable'].includes(entity.state) ||
          !vacuumService(services, 'select_option', domain)
        }
        onSelect={(option) => {
          if (options.includes(option)) send(domain, 'select_option', id, { option });
        }}
        isolateEscape
      />
    );
  };
  const scripts =
    primary && Array.isArray(settings.roomScripts)
      ? settings.roomScripts.flatMap((item) => {
          if (
            !record(item) ||
            typeof item.entityId !== 'string' ||
            !item.entityId.startsWith('script.')
          )
            return [];
          return [
            {
              id: item.entityId,
              label:
                typeof item.label === 'string' && item.label
                  ? item.label
                  : String(
                      runtime.entities[item.entityId]?.attributes.friendly_name || item.entityId
                    ),
            },
          ];
        })
      : [];
  const explicitMap =
    primary && typeof settings.mapImageEntityId === 'string' ? settings.mapImageEntityId : '';
  const mapIds = [
    ...new Set([
      explicitMap,
      ...(binding?.secondaryEntityIds ?? []).filter(
        (id) => /^(image|camera)\./.test(id) && !binding?.technicalEntityIds?.includes(id)
      ),
    ]),
  ].filter(
    (id) =>
      /^(image|camera)\./.test(id) &&
      !!runtime.entities[id] &&
      !binding?.technicalEntityIds?.includes(id)
  );
  const mapKey = `tunet_vacuum_selected_map_${entityId}`,
    showKey = `tunet_vacuum_show_map_${entityId}`,
    scaleKey = `tunet_vacuum_map_scale_${entityId}`;
  const [selectedMap, setSelectedMap] = useState(() => stored(mapKey)),
    [showMap, setShowMap] = useState(() => stored(showKey) !== 'false');
  const [scale, setScale] = useState(() => Math.max(1, Math.min(4, Number(stored(scaleKey)) || 1))),
    [refresh, setRefresh] = useState(0);
  const activeMap = selectedMap && mapIds.includes(selectedMap) ? selectedMap : mapIds[0];
  const [failedMap, setFailedMap] = useState<string | null>(null);
  const mapEntity = activeMap ? runtime.entities[activeMap] : undefined,
    picture = mapEntity?.attributes.entity_picture;
  const rawUrl = typeof picture === 'string' ? runtime.getEntityImageUrl(picture) : null;
  const mapUrl = rawUrl && !/^\s*(?:javascript|data:text\/html):/i.test(rawUrl) ? rawUrl : null;
  const mapAvailable = mapEntity && !['unknown', 'unavailable', 'off'].includes(mapEntity.state);
  const hasScripts = scripts.length > 0 || !!selectId('roomSelectEntityId', 'area');
  return (
    <>
      {(areaSupported || hasScripts) && (
        <Section title="Stanze">
          {areaSupported && !currentAreas && connected && (
            <Skeleton variant="list" rows={1} label="Caricamento delle stanze…" />
          )}
          {currentAreas?.error && (
            <Caption>Non riesco a leggere le stanze. Riapri la scheda per riprovare.</Caption>
          )}
          {currentAreas && !currentAreas.error && currentAreas.areas.length === 0 && (
            <Caption>Nessuna area già configurata in Home Assistant.</Caption>
          )}
          {currentAreas && currentAreas.areas.length > 0 && (
            <>
              <div
                className="product-vacuum-options__actions"
                role="group"
                aria-label={`Aree da pulire con ${label}`}
              >
                {currentAreas.areas.map((area) => (
                  <Button
                    key={area.area_id}
                    variant="control"
                    size="sm"
                    aria-pressed={areas.includes(area.area_id)}
                    disabled={blocked || busy}
                    onClick={() =>
                      setAreas((value) =>
                        value.includes(area.area_id)
                          ? value.filter((id) => id !== area.area_id)
                          : [...value, area.area_id]
                      )
                    }
                  >
                    {area.name || area.area_id}
                  </Button>
                ))}
              </div>
              <Button
                variant="control"
                size="sm"
                disabled={blocked || busy || areas.length === 0}
                onClick={() => {
                  const selected = areas.filter((id) =>
                    currentAreas.areas.some((area) => area.area_id === id)
                  );
                  if (selected.length && areaSupported)
                    send('vacuum', 'clean_area', entityId, { cleaning_area_id: selected });
                }}
              >
                Pulisci le aree scelte
              </Button>
            </>
          )}
          {explicitSelect('roomSelectEntityId', 'area', 'Stanza')}
          <div className="product-vacuum-options__actions">
            {scripts.map((script) => (
              <Button
                key={script.id}
                variant="control"
                size="sm"
                disabled={
                  blocked ||
                  busy ||
                  !runtime.entities[script.id] ||
                  ['unknown', 'unavailable'].includes(runtime.entities[script.id]!.state) ||
                  !vacuumService(services, 'turn_on', 'script')
                }
                onClick={() => send('script', 'turn_on', script.id)}
              >
                {script.label}
              </Button>
            ))}
          </div>
        </Section>
      )}
      {!!selectId('mopIntensityControlEntityId', 'mop') && (
        <Section title="Lavaggio">
          {explicitSelect('mopIntensityControlEntityId', 'mop', 'Lavaggio')}
        </Section>
      )}
      {mapIds.length > 0 && (
        <Section
          title="Mappa"
          aside={
            <Button
              variant="control"
              size="sm"
              onClick={() => {
                setShowMap(!showMap);
                save(showKey, String(!showMap));
              }}
            >
              {showMap ? 'Nascondi mappa' : 'Mostra mappa'}
            </Button>
          }
        >
          {showMap && (
            <>
              <div className="product-vacuum-options__actions">
                {mapIds.length > 1 && (
                  <OptionPicker
                    label={`Mappa di ${label}`}
                    value={activeMap ?? null}
                    options={mapIds.map((id) => ({
                      value: id,
                      label: String(runtime.entities[id]?.attributes.friendly_name || id),
                    }))}
                    onSelect={(id) => {
                      if (mapIds.includes(id)) {
                        setSelectedMap(id);
                        save(mapKey, id);
                      }
                    }}
                    isolateEscape
                  />
                )}
                <Button
                  variant="control"
                  size="sm"
                  aria-label="Riduci mappa"
                  disabled={scale <= 1}
                  onClick={() => {
                    const value = Math.max(1, scale - 0.25);
                    setScale(value);
                    save(scaleKey, String(value));
                  }}
                >
                  <Icon name="minus" />
                </Button>
                <Button
                  variant="control"
                  size="sm"
                  aria-label="Ingrandisci mappa"
                  disabled={scale >= 4}
                  onClick={() => {
                    const value = Math.min(4, scale + 0.25);
                    setScale(value);
                    save(scaleKey, String(value));
                  }}
                >
                  <Icon name="add" />
                </Button>
                <Button
                  variant="control"
                  size="sm"
                  onClick={() => {
                    setFailedMap(null);
                    setRefresh((value) => value + 1);
                  }}
                >
                  Aggiorna mappa
                </Button>
              </div>
              {visible &&
              connected &&
              mapAvailable &&
              mapUrl &&
              failedMap !== `${activeMap}:${refresh}` ? (
                <div
                  className="product-vacuum-map"
                  tabIndex={0}
                  role="region"
                  aria-label={`Mappa di ${label}, scorrevole quando ingrandita`}
                >
                  <img
                    key={`${activeMap}:${refresh}`}
                    src={vacuumMapUrl(mapUrl, refresh)}
                    alt={`Mappa di ${label}`}
                    referrerPolicy="no-referrer"
                    style={{ width: `${scale * 100}%` }}
                    onError={() => setFailedMap(`${activeMap}:${refresh}`)}
                  />
                </div>
              ) : (
                <Caption>Immagine della mappa non disponibile.</Caption>
              )}
            </>
          )}
        </Section>
      )}
      <Caption role="status" aria-live="polite">
        {feedback}
      </Caption>
    </>
  );
}
