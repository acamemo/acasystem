import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { Connection, HassEntity } from 'home-assistant-js-websocket';
import {
  Body,
  Caption,
  Heading,
  Segmented,
  Sheet,
  Surface,
  Title,
  Toggle,
} from '@/components/primitives';
import type { CardSettingsMap, PageSettingsMap } from '@/@types/dashboard';
import type { EntityMap, HaConfig, ServiceData } from '@/@types/ha';
import type { CellSize, WidgetDefinition, WidgetRuntime } from '@/@types/launcher';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime } from '@/utils/fixtures/runtime';
import { utilityPages, utilityWidgets } from '../index';
import { previewAnswer, previewEntities, previewSettings, simulatedState } from './fixtures';
import './preview.css';

interface Sample {
  id: string;
  size: CellSize;
  note?: string;
}

const samples: Array<{ type: string; items: Sample[] }> = [
  {
    type: 'cost',
    items: [
      { id: 'cost_card_1', size: { w: 2, h: 1 } },
      { id: 'cost_card_1', size: { w: 2, h: 2 } },
      { id: 'cost_card_2', size: { w: 2, h: 1 }, note: 'Non configurato' },
    ],
  },
  {
    type: 'nordpool',
    items: [
      { id: 'nordpool_card_1', size: { w: 2, h: 1 } },
      { id: 'nordpool_card_1', size: { w: 2, h: 2 } },
      { id: 'nordpool_card_1', size: { w: 4, h: 2 } },
    ],
  },
  {
    type: 'car',
    items: [
      { id: 'car_card_1', size: { w: 2, h: 1 } },
      { id: 'car_card_1', size: { w: 2, h: 2 } },
    ],
  },
  {
    type: 'vacuum',
    items: [
      { id: 'vacuum.roborock', size: { w: 2, h: 1 } },
      { id: 'vacuum.roborock', size: { w: 2, h: 2 } },
      { id: 'vacuum.assente', size: { w: 2, h: 1 }, note: 'Entità mancante' },
    ],
  },
  {
    type: 'mower',
    items: [
      { id: 'lawn_mower.giardino', size: { w: 2, h: 1 } },
      { id: 'lawn_mower.giardino', size: { w: 2, h: 2 } },
    ],
  },
  {
    type: 'room',
    items: [
      { id: 'room_card_1', size: { w: 2, h: 1 } },
      { id: 'room_card_1', size: { w: 2, h: 2 } },
    ],
  },
  {
    type: 'spacer',
    items: [
      { id: 'spacer_card_1', size: { w: 8, h: 1 } },
      { id: 'spacer_card_2', size: { w: 2, h: 1 }, note: 'Spazio (contorno in modifica)' },
    ],
  },
];

const definitionOf = (type: string): WidgetDefinition | undefined =>
  utilityWidgets.find((item) => item.type === type);

type UnitsPreview = 'metric' | 'imperial' | 'none';

/** Home Assistant configuration of the preview: the fixture one (metric, EUR), imperial, or not loaded. */
function previewHaConfig(units: UnitsPreview): HaConfig | null {
  const metric = createFixtureRuntime().haConfig;
  if (units === 'none' || !metric) return null;
  if (units === 'metric') return metric;
  return {
    ...metric,
    unit_system: { ...metric.unit_system, temperature: '°F', length: 'mi', wind_speed: 'mph' },
    currency: 'USD',
  };
}

/** Same frame as the launcher's WidgetHost: static kit card, or a plain box when frameless. */
function PreviewFrame({
  frameless,
  editMode,
  children,
}: {
  frameless: boolean;
  editMode: boolean;
  children: ReactNode;
}) {
  if (frameless) {
    return (
      <div className="preview-bare" inert={editMode || undefined}>
        {children}
      </div>
    );
  }
  return (
    <Surface
      behavior="static"
      className="aca-m--fill preview-frame"
      contentClassName="preview-frame__content"
      inert={editMode || undefined}
    >
      {children}
    </Surface>
  );
}

function applyCall(
  entities: EntityMap,
  domain: string,
  service: string,
  data: ServiceData | undefined
): EntityMap {
  const id =
    typeof data?.entity_id === 'string'
      ? data.entity_id
      : typeof data?.target?.entity_id === 'string'
        ? data.target.entity_id
        : null;
  if (!id || !entities[id]) return entities;
  const entity: HassEntity = entities[id];
  const next: HassEntity = { ...entity, attributes: { ...entity.attributes } };
  const simulated = simulatedState(domain, service, entity);
  if (simulated?.state) next.state = simulated.state;
  if (service === 'set_temperature' && typeof data?.temperature === 'number')
    next.attributes.temperature = data.temperature;
  if (service === 'set_fan_speed' && typeof data?.fan_speed === 'string')
    next.attributes.fan_speed = data.fan_speed;
  if (service === 'set_value' && data?.value !== undefined) next.state = String(data.value);
  if (service === 'select_option' && typeof data?.option === 'string') next.state = data.option;
  if (domain === 'light' && service === 'turn_on' && typeof data?.brightness_pct === 'number') {
    next.attributes.brightness = Math.round((data.brightness_pct / 100) * 255);
  }
  return { ...entities, [id]: next };
}

/** Development gallery of the utility widgets: sizes, states, details and pages. */
export default function PreviewPage() {
  const [entities, setEntities] = useState<EntityMap>(previewEntities);
  const [settings, setSettings] = useState<CardSettingsMap>(previewSettings);
  const [editMode, setEditMode] = useState(false);
  const [failCalls, setFailCalls] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cell, setCell] = useState<'tablet' | 'phone'>('tablet');
  const [open, setOpen] = useState<{ id: string; settingsKey: string } | null>(null);
  const [view, setView] = useState<'widgets' | 'battery' | 'rooms'>('widgets');
  const [units, setUnits] = useState<UnitsPreview>('metric');
  const [pageSettings, setPageSettings] = useState<PageSettingsMap>({});
  const entitiesRef = useRef(entities);
  useEffect(() => {
    entitiesRef.current = entities;
  }, [entities]);

  const callService = useCallback(
    (domain: string, service: string, data?: ServiceData) =>
      new Promise<unknown>((resolve, reject) => {
        setTimeout(() => {
          if (failCalls) {
            reject(new Error('Simulated failure'));
            return;
          }
          resolve(undefined);
          // Home Assistant reports the new state a little later.
          setTimeout(
            () => setEntities((current) => applyCall(current, domain, service, data)),
            1400
          );
        }, 350);
      }),
    [failCalls]
  );

  const conn = useMemo(
    () =>
      ({
        sendMessagePromise: async (message: Record<string, unknown>) => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return previewAnswer(message, entitiesRef.current);
        },
      }) as unknown as Connection,
    []
  );

  const runtime: WidgetRuntime = createFixtureRuntime({
    entities,
    entitiesLoaded: !loading,
    conn,
    callService,
    cardSettings: settings,
    customNames: { car_card_1: 'Auto elettrica' },
    editMode,
    haConfig: previewHaConfig(units),
    openDetails: (id) => setOpen({ id, settingsKey: `home::${id}` }),
    saveCardSetting: (key, field, value) =>
      setSettings((current) => ({
        ...current,
        [key]: { ...(current[key] ?? {}), [field]: value },
      })),
  });

  const openDefinition = open
    ? utilityWidgets.find((item) => item.matches(open.id, {}))
    : undefined;
  const Details = openDefinition?.Details;
  const Battery = utilityPages.find((page) => page.kind === 'battery')?.Page;
  const Rooms = utilityPages.find((page) => page.kind === 'rooms')?.Page;
  // Page settings of the special pages, as the launcher's PageKindHost provides them.
  const pageProps = (pageId: string) => ({
    pageId,
    settings: pageSettings[pageId] ?? {},
    onSaveSetting: (key: string, value: unknown) =>
      setPageSettings((current) => ({
        ...current,
        [pageId]: { ...(current[pageId] ?? {}), [key]: value },
      })),
  });

  return (
    <WidgetRuntimeProvider value={runtime}>
      <main
        className="preview-page"
        style={{ '--preview-cell': cell === 'tablet' ? '8.5rem' : '5.5rem' } as CSSProperties}
      >
        <header className="preview-header">
          <Title level={1}>Widget utilità</Title>
          <Body size="sm" tone="muted">
            Anteprima di sviluppo con dati fittizi: costi, prezzi, auto, robot, stanze, separatore e
            le pagine batteria e stanze.
          </Body>
          <div className="preview-tools">
            <Segmented<'widgets' | 'battery' | 'rooms'>
              label="Vista"
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: 'widgets', label: 'Widget' },
                { value: 'battery', label: 'Pagina batterie' },
                { value: 'rooms', label: 'Pagina stanze' },
              ]}
            />
            <Segmented<'tablet' | 'phone'>
              label="Cella"
              size="sm"
              value={cell}
              onChange={setCell}
              options={[
                { value: 'tablet', label: 'Tablet' },
                { value: 'phone', label: 'Telefono' },
              ]}
            />
            <Segmented<UnitsPreview>
              label="Configurazione di Home Assistant"
              size="sm"
              value={units}
              onChange={setUnits}
              options={[
                { value: 'metric', label: 'Metrica, EUR' },
                { value: 'imperial', label: 'Imperiale, USD' },
                { value: 'none', label: 'Non caricata' },
              ]}
            />
            <label className="preview-switch">
              <Caption>Modifica</Caption>
              <Toggle
                compact
                checked={editMode}
                aria-label="Modalità modifica"
                onClick={() => setEditMode((value) => !value)}
              />
            </label>
            <label className="preview-switch">
              <Caption>Comandi in errore</Caption>
              <Toggle
                compact
                checked={failCalls}
                aria-label="Simula comandi in errore"
                onClick={() => setFailCalls((value) => !value)}
              />
            </label>
            <label className="preview-switch">
              <Caption>Caricamento</Caption>
              <Toggle
                compact
                checked={loading}
                aria-label="Simula il caricamento"
                onClick={() => setLoading((value) => !value)}
              />
            </label>
          </div>
        </header>

        {view === 'widgets' &&
          samples.map((group) => {
            const definition = definitionOf(group.type);
            if (!definition) return null;
            const { Widget } = definition;
            return (
              <section key={group.type} className="preview-group" aria-label={definition.label}>
                <Heading level={2} size="md" tone="ink">
                  {definition.label}
                </Heading>
                <Caption>
                  Taglie da {definition.sizes.min.w}×{definition.sizes.min.h} a{' '}
                  {definition.sizes.max.w}×{definition.sizes.max.h}
                </Caption>
                <div className="preview-grid">
                  {group.items.map((item, index) => {
                    const settingsKey = `home::${item.id}`;
                    return (
                      <figure
                        key={`${item.id}-${index}`}
                        className="preview-cell"
                        style={{
                          gridColumn: `span ${Math.min(item.size.w, cell === 'phone' ? 4 : 8)}`,
                          gridRow: `span ${item.size.h}`,
                        }}
                      >
                        {/* Same frame as the launcher's WidgetHost: the widget renders content only. */}
                        <PreviewFrame frameless={definition.frameless === true} editMode={editMode}>
                          <Widget
                            id={item.id}
                            settingsKey={settingsKey}
                            settings={settings[settingsKey] ?? {}}
                            size={item.size}
                            editMode={editMode}
                          />
                        </PreviewFrame>
                        <Caption as="figcaption">
                          {item.size.w}×{item.size.h}
                          {item.note ? ` · ${item.note}` : ''}
                        </Caption>
                      </figure>
                    );
                  })}
                </div>
              </section>
            );
          })}

        {view === 'battery' && Battery && (
          <div className="preview-fullpage">
            <Battery {...pageProps('batterie')} />
          </div>
        )}
        {view === 'rooms' && Rooms && (
          <div className="preview-fullpage">
            <Rooms {...pageProps('stanze')} />
          </div>
        )}

        <Sheet
          open={Boolean(open && Details)}
          onClose={() => setOpen(null)}
          title={openDefinition?.label ?? 'Dettagli'}
        >
          {open && Details && (
            <Details
              id={open.id}
              settingsKey={open.settingsKey}
              settings={settings[open.settingsKey] ?? {}}
              onClose={() => setOpen(null)}
            />
          )}
        </Sheet>
      </main>
    </WidgetRuntimeProvider>
  );
}
