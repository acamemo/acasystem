/**
 * Development-only preview of the control widgets (preview-controls.html, port 5176):
 * every widget in its sizes and states, with a simulated Home Assistant. Not in the build.
 * Each widget sits in a copy of the launcher frame (WidgetHost): the widget draws only content.
 */
import { StrictMode, useCallback, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import type { HassEntity } from 'home-assistant-js-websocket';
import '@/styles/index.css';
import '@/themes/acasystem/index.css';
import { Body, Caption, Heading, Sheet, Surface, Title } from '@/components/primitives';
import type { PageSettings } from '@/@types/dashboard';
import type { Connection, EntityMap, ServiceData } from '@/@types/ha';
import type { WidgetRuntime } from '@/@types/launcher';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities } from '@/utils/fixtures/runtime';
import { controlsWidgets } from '../index';
import { LightsPage } from '../light/LightsPage';
import { previewEntities, previewHistory, previewSections, type PreviewCard } from './previewData';
import './preview.css';

const SIM_DELAY_MS = 700;

const definitionOf = (card: PreviewCard) =>
  controlsWidgets.find((definition) => definition.matches(card.id, card.settings ?? {}));

/** Applies a service call to the fictitious entities, as Home Assistant would. */
function applyService(entity: HassEntity, service: string, data: ServiceData): HassEntity {
  const attributes = { ...entity.attributes };
  let state = entity.state;
  const number = (key: string) => (typeof data[key] === 'number' ? Number(data[key]) : null);
  switch (service) {
    case 'toggle':
      state = state === 'on' ? 'off' : 'on';
      break;
    case 'turn_on': {
      const brightness = number('brightness');
      state = brightness === 0 ? 'off' : 'on';
      if (brightness !== null && brightness > 0) attributes.brightness = brightness;
      if (number('color_temp_kelvin') !== null) attributes.color_temp_kelvin = number('color_temp_kelvin');
      if (Array.isArray(data.hs_color)) attributes.hs_color = data.hs_color;
      break;
    }
    case 'turn_off':
      state = 'off';
      break;
    case 'set_percentage':
      attributes.percentage = number('percentage');
      break;
    case 'oscillate':
      attributes.oscillating = data.oscillating === true;
      break;
    case 'set_direction':
      attributes.direction = data.direction;
      break;
    case 'set_preset_mode':
      attributes.preset_mode = data.preset_mode;
      break;
    case 'open_cover':
      state = 'open';
      attributes.current_position = 100;
      break;
    case 'close_cover':
      state = 'closed';
      attributes.current_position = 0;
      break;
    case 'stop_cover':
      state = 'open';
      break;
    case 'set_cover_position':
      attributes.current_position = number('position');
      state = number('position') === 0 ? 'closed' : 'open';
      break;
    case 'set_cover_tilt_position':
      attributes.current_tilt_position = number('tilt_position');
      break;
    case 'lock':
      state = 'locked';
      break;
    case 'unlock':
      state = 'unlocked';
      break;
    case 'open':
      state = 'open';
      break;
    case 'increment':
    case 'decrement': {
      const step = Number(attributes.step ?? 1);
      state = String(Number(state) + (service === 'increment' ? step : -step));
      break;
    }
    case 'select_option':
      state = String(data.option);
      break;
    default:
      break;
  }
  return { ...entity, state, attributes, last_changed: new Date().toISOString() };
}

function PreviewPage() {
  const [entities, setEntities] = useState<EntityMap>(() => fixtureEntities(previewEntities));
  const [openId, setOpenId] = useState<{ card: PreviewCard } | null>(null);
  const [lightsSettings, setLightsSettings] = useState<PageSettings>({});
  const entitiesRef = useRef(entities);
  entitiesRef.current = entities;

  const callService = useCallback(
    (domain: string, service: string, data: ServiceData = {}) =>
      new Promise<unknown>((resolve, reject) => {
        const entityId = typeof data.entity_id === 'string' ? data.entity_id : '';
        if (entityId === 'fan.guasto') {
          setTimeout(() => reject(new Error('Dispositivo non raggiungibile')), SIM_DELAY_MS / 2);
          return;
        }
        resolve(undefined);
        if (service === 'stop_cover' || domain === 'script' || domain === 'scene') return;
        setTimeout(() => {
          setEntities((current) => {
            const entity = current[entityId];
            return entity ? { ...current, [entityId]: applyService(entity, service, data) } : current;
          });
        }, SIM_DELAY_MS);
      }),
    []
  );

  const conn = useMemo(
    () =>
      ({
        sendMessagePromise: async (message: { type: string; entity_ids?: string[]; statistic_ids?: string[] }) => {
          if (message.type === 'history/history_during_period') {
            const id = message.entity_ids?.[0] ?? '';
            return previewHistory(id, entitiesRef.current[id]?.state);
          }
          return {};
        },
      }) as unknown as Connection,
    []
  );

  const runtime: WidgetRuntime = useMemo(
    () =>
      createFixtureRuntime({
        entities,
        conn,
        callService,
        openDetails: (id) => {
          const card = previewSections.flatMap((section) => section.cards).find((c) => c.id === id);
          if (card) setOpenId({ card });
        },
      }),
    [callService, conn, entities]
  );

  const openCard = openId?.card;
  const openDefinition = openCard ? definitionOf(openCard) : undefined;
  const Details = openDefinition?.Details;

  return (
    <WidgetRuntimeProvider value={runtime}>
      <main className="ctl-preview">
        <header className="ctl-preview__header">
          <Title tone="engraved">Widget dei controlli</Title>
          <Body tone="muted" className="ctl-preview__lead">
            Anteprima solo per lo sviluppo, con un Home Assistant simulato: i comandi vengono
            confermati dopo {SIM_DELAY_MS} ms; il ventilatore dello studio rifiuta i comandi.
          </Body>
        </header>
        {previewSections.map((section, sectionIndex) => (
          <section key={section.title} className="ctl-preview__section" data-section={sectionIndex}>
            <Heading level={2} size="lg">
              {section.title}
            </Heading>
            <div className="ctl-preview__grid">
              {section.cards.map((card, index) => {
                const definition = definitionOf(card);
                if (!definition) return null;
                const { Widget } = definition;
                const style = {
                  gridColumn: `span ${card.size.w}`,
                  gridRow: `span ${card.size.h}`,
                } as CSSProperties;
                const editMode = card.note === 'edit';
                const widget = (
                  <Widget
                    id={card.id}
                    settingsKey={card.id}
                    settings={card.settings ?? {}}
                    size={card.size}
                    editMode={editMode}
                  />
                );
                const content =
                  card.note === 'loading' ? (
                    <WidgetRuntimeProvider value={{ ...runtime, entitiesLoaded: false }}>
                      {widget}
                    </WidgetRuntimeProvider>
                  ) : (
                    widget
                  );
                // Same frame as WidgetHost: static, inert in edit mode.
                const framed = definition.frameless ? (
                  content
                ) : (
                  <Surface
                    behavior="static"
                    className="ctl-preview__widget aca-m--fill"
                    contentClassName="ctl-preview__widget-content"
                    inert={editMode || undefined}
                  >
                    {content}
                  </Surface>
                );
                return (
                  <figure key={`${card.id}-${index}`} className="ctl-preview__cell" style={style}>
                    {framed}
                    <figcaption className="ctl-preview__caption">
                      <Caption>
                        {definition.label} · {card.size.w}×{card.size.h}
                        {card.note === 'loading'
                          ? ' · caricamento'
                          : card.note === 'edit'
                            ? ' · modifica'
                            : card.note
                              ? ` · ${card.note}`
                              : ''}
                      </Caption>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </section>
        ))}
        <section className="ctl-preview__section ctl-preview__page" data-section="lights">
          <Heading level={2} size="lg">
            Pagina delle luci
          </Heading>
          <div className="ctl-preview__frame">
            <LightsPage
              pageId="luci"
              settings={lightsSettings}
              onSaveSetting={(key, value) =>
                setLightsSettings((current) => ({ ...current, [key]: value }))
              }
            />
          </div>
        </section>
      </main>
      {openCard && Details && (
        <Sheet
          open
          onClose={() => setOpenId(null)}
          title={
            entities[String(openCard.settings?.entityId ?? openCard.settings?.coverId ?? openCard.settings?.lockId ?? openCard.id)]
              ?.attributes.friendly_name ?? openDefinition.label
          }
        >
          <Details
            id={openCard.id}
            settingsKey={openCard.id}
            settings={openCard.settings ?? {}}
            onClose={() => setOpenId(null)}
          />
        </Sheet>
      )}
    </WidgetRuntimeProvider>
  );
}

const root = document.getElementById('anteprima');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <PreviewPage />
    </StrictMode>
  );
}
