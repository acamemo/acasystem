import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Connection } from 'home-assistant-js-websocket';
import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap, HaConfig, HaMessage, HaTodoItem, ServiceData } from '@/@types/ha';
import type { CellSize, WidgetDefinition, WidgetRuntime } from '@/@types/launcher';
import { Body, Heading, Sheet, Surface, Title } from '@/components/primitives';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime } from '@/utils/fixtures/runtime';
import { homeWidgets } from '..';
import { answerMessage, applyCommand, initialEntities, initialTodos } from './previewData';

interface PreviewCase {
  id: string;
  size: CellSize;
  settings: CardSettings;
  note: string;
  editMode?: boolean;
  loading?: boolean;
  /** Imperial unit system of HA (runtime.haConfig) instead of the metric one of the fixtures. */
  imperial?: boolean;
}

const sections: Array<{ title: string; cases: PreviewCase[] }> = [
  {
    title: 'Clima',
    cases: [
      {
        id: 'climate_card_1',
        size: { w: 2, h: 2 },
        settings: { climateId: 'climate.soggiorno', climateFavoriteModes: ['heat', 'off'] },
        note: '2×2',
      },
      {
        id: 'climate_card_2',
        size: { w: 2, h: 1 },
        settings: { climateId: 'climate.camera' },
        note: '2×1, spento',
      },
      {
        id: 'climate_card_3',
        size: { w: 2, h: 1 },
        settings: { climateId: 'climate.bagno' },
        note: '2×1, non disponibile',
      },
    ],
  },
  {
    title: 'Meteo',
    cases: [
      {
        id: 'weather_temp_1',
        size: { w: 2, h: 1 },
        settings: { weatherId: 'weather.casa' },
        note: '2×1',
      },
      {
        id: 'weather_temp_2',
        size: { w: 2, h: 2 },
        settings: {
          weatherId: 'weather.casa',
          tempId: 'sensor.temperatura_giardino',
          subtitle: 'Giardino',
        },
        note: '2×2 con sensore',
      },
      {
        id: 'weather_temp_3',
        size: { w: 4, h: 1 },
        settings: { weatherId: 'weather.casa' },
        note: '4×1',
      },
      {
        id: 'weather_temp_4',
        size: { w: 4, h: 2 },
        settings: { weatherId: 'weather.casa' },
        note: '4×2',
      },
    ],
  },
  {
    title: 'Calendario',
    cases: [
      {
        id: 'calendar_card_1',
        size: { w: 2, h: 1 },
        settings: { calendars: ['calendar.famiglia', 'calendar.lavoro'] },
        note: '2×1',
      },
      {
        id: 'calendar_card_2',
        size: { w: 2, h: 2 },
        settings: { calendars: ['calendar.famiglia', 'calendar.lavoro'], name: 'Agenda' },
        note: '2×2',
      },
      {
        id: 'calendar_card_3',
        size: { w: 4, h: 4 },
        settings: { calendars: ['calendar.famiglia', 'calendar.lavoro'], name: 'Settimana' },
        note: '4×4',
      },
    ],
  },
  {
    title: 'Attività',
    cases: [
      {
        id: 'todo_card_1',
        size: { w: 2, h: 1 },
        settings: { todoEntityId: 'todo.spesa' },
        note: '2×1',
      },
      {
        id: 'todo_card_2',
        size: { w: 2, h: 2 },
        settings: { todoEntityId: 'todo.spesa' },
        note: '2×2',
      },
      {
        id: 'todo_card_3',
        size: { w: 2, h: 4 },
        settings: { todoEntityId: 'todo.spesa' },
        note: '2×4 con aggiunta',
      },
    ],
  },
  {
    title: 'Allarme',
    cases: [
      {
        id: 'alarm_card_1',
        size: { w: 2, h: 2 },
        settings: { alarmId: 'alarm_control_panel.casa' },
        note: '2×2 disinserito',
      },
      {
        id: 'alarm_card_2',
        size: { w: 2, h: 1 },
        settings: { alarmId: 'alarm_control_panel.garage' },
        note: '2×1 con PIN (1234)',
      },
      {
        id: 'alarm_card_3',
        size: { w: 2, h: 2 },
        settings: { alarmId: 'alarm_control_panel.cantina' },
        note: '2×2 scattato',
      },
    ],
  },
  {
    title: 'Stati comuni',
    cases: [
      {
        id: 'climate_card_9',
        size: { w: 2, h: 2 },
        settings: { climateId: 'climate.soggiorno' },
        note: 'Modifica: comandi disabilitati',
        editMode: true,
      },
      {
        id: 'weather_temp_9',
        size: { w: 2, h: 2 },
        settings: { weatherId: 'weather.casa' },
        note: 'Caricamento',
        loading: true,
      },
      {
        id: 'alarm_card_9',
        size: { w: 2, h: 1 },
        settings: { alarmId: 'alarm_control_panel.rimossa' },
        note: 'Entità mancante',
      },
      { id: 'todo_card_9', size: { w: 2, h: 1 }, settings: {}, note: 'Da configurare' },
      {
        id: 'climate_card_8',
        size: { w: 2, h: 2 },
        settings: { climateId: 'climate.studio' },
        note: 'Unità di HA: sistema imperiale',
        imperial: true,
      },
    ],
  },
];

const allCases = sections.flatMap((section) => section.cases);
/** Same cell as preview.css: about 7.25 rem on a landscape tablet, a quarter of a phone. */
const CELL = 'min(7.25rem, calc((100vw - 4.25rem) / 4))';
const PIN = '1234';

const IMPERIAL: HaConfig = {
  unit_system: {
    temperature: '°F',
    length: 'mi',
    mass: 'lb',
    volume: 'gal',
    pressure: 'inHg',
    wind_speed: 'mph',
    accumulated_precipitation: 'in',
  },
  currency: 'USD',
  time_zone: 'America/New_York',
};

/**
 * The kit frame the launcher (WidgetHost) draws around every widget: static, pressed only by
 * the widget's details opener ([data-widget-open], preview.css), inert in edit mode.
 */
function PreviewFrame({ editMode, children }: { editMode: boolean; children: ReactNode }) {
  return (
    <Surface
      behavior="static"
      className="home-preview__frame aca-m--fill"
      contentClassName="home-preview__frame-content"
      inert={editMode || undefined}
    >
      {children}
    </Surface>
  );
}

function definitionFor(id: string, settings: CardSettings): WidgetDefinition | undefined {
  return homeWidgets.find((definition) => definition.matches(id, settings));
}

/** Development preview of the comfort widgets with a simulated Home Assistant. */
export function HomePreview() {
  const [entities, setEntities] = useState<EntityMap>(initialEntities);
  const todos = useRef<HaTodoItem[]>(initialTodos);
  const [openId, setOpenId] = useState<string | null>(() => {
    const match = /dettagli=([\w.]+)/.exec(window.location.hash);
    return match ? match[1] : null;
  });

  const conn = useMemo(
    () =>
      ({
        sendMessagePromise: async (message: HaMessage) => answerMessage(message, todos.current),
      }) as unknown as Connection,
    []
  );

  const callService = useCallback(async (domain: string, service: string, data?: ServiceData) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    if (domain === 'todo') {
      const item = String(data?.item ?? '');
      if (service === 'add_item') {
        todos.current = [
          ...todos.current,
          { uid: `t${Date.now()}`, summary: item, status: 'needs_action' },
        ];
      } else if (service === 'update_item') {
        todos.current = todos.current.map((todo) =>
          todo.uid === item ? { ...todo, status: String(data?.status) } : todo
        );
      } else if (service === 'remove_item') {
        todos.current = todos.current.filter((todo) => todo.uid !== item);
      }
      return undefined;
    }
    const entityId = String(data?.entity_id ?? '');
    if (domain === 'alarm_control_panel' && 'code' in (data ?? {}) && data?.code !== PIN) {
      throw new Error('Codice errato');
    }
    // HA confirms a little later: the widgets show the request as pending meanwhile.
    setTimeout(() => {
      setEntities((current) => {
        const entity = current[entityId];
        if (!entity) return current;
        return { ...current, [entityId]: applyCommand(entity, service, { ...data }) };
      });
    }, 900);
    return undefined;
  }, []);

  useEffect(() => {
    const onHash = () => {
      const match = /dettagli=([\w.]+)/.exec(window.location.hash);
      setOpenId(match ? match[1] : null);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const runtimeFor = (editMode = false, loading = false, imperial = false): WidgetRuntime =>
    createFixtureRuntime({
      entities,
      entitiesLoaded: !loading,
      conn,
      callService,
      editMode,
      openDetails: setOpenId,
      ...(imperial ? { haConfig: IMPERIAL } : {}),
    });

  const openCase = allCases.find((item) => item.id === openId);
  const openDefinition = openCase ? definitionFor(openCase.id, openCase.settings) : undefined;
  const OpenDetails = openDefinition?.Details;

  return (
    <main className="home-preview">
      <header className="home-preview__header">
        <Title>Widget comfort e casa</Title>
        <Body tone="muted">
          Anteprima solo per lo sviluppo, con dati fittizi: Home Assistant simulato conferma i
          comandi dopo circa un secondo. PIN dell’allarme: 1234.
        </Body>
      </header>
      {sections.map((section) => (
        <section key={section.title} className="home-preview__section" aria-label={section.title}>
          <Heading level={2} size="lg">
            {section.title}
          </Heading>
          <div className="home-preview__grid">
            {section.cases.map((item) => {
              const definition = definitionFor(item.id, item.settings);
              if (!definition) return null;
              const { Widget } = definition;
              return (
                <figure
                  key={item.id}
                  className="home-preview__cell"
                  style={{
                    gridColumn: `span ${item.size.w}`,
                    gridRow: `span ${item.size.h}`,
                    // Launcher-like height: cells plus 0.75 rem gaps (the grid rows leave room for notes).
                    height: `calc(${item.size.h} * ${CELL} + ${item.size.h - 1} * 0.75rem)`,
                  }}
                >
                  <WidgetRuntimeProvider
                    value={runtimeFor(item.editMode, item.loading, item.imperial)}
                  >
                    <PreviewFrame editMode={Boolean(item.editMode)}>
                      <Widget
                        id={item.id}
                        settingsKey={`anteprima::${item.id}`}
                        settings={item.settings}
                        size={item.size}
                        editMode={Boolean(item.editMode)}
                      />
                    </PreviewFrame>
                  </WidgetRuntimeProvider>
                  <figcaption className="home-preview__note">{item.note}</figcaption>
                </figure>
              );
            })}
          </div>
        </section>
      ))}
      {openCase && openDefinition && OpenDetails && (
        <WidgetRuntimeProvider value={runtimeFor(false, false, openCase.imperial)}>
          <Sheet open onClose={() => setOpenId(null)} title={openDefinition.label}>
            <OpenDetails
              id={openCase.id}
              settingsKey={`anteprima::${openCase.id}`}
              settings={openCase.settings}
              onClose={() => setOpenId(null)}
            />
          </Sheet>
        </WidgetRuntimeProvider>
      )}
    </main>
  );
}
