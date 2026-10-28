/**
 * The connection of the simulated Home Assistant (`#/mockup`, REP-20261028-005, K1): the part of
 * the `home-assistant-js-websocket` Connection that the widgets and hooks of the app use
 * (`sendMessagePromise`, `subscribeMessage`, the connection events), answered from the store.
 * A command it does not know is refused like Home Assistant refuses an unknown one, so the
 * callers take their usual fallback.
 */
import type { Connection, HassEntity } from 'home-assistant-js-websocket';
import type { HaMessage } from '@/@types/ha';
import type { MockHaStore } from './haStore';
import { MOCK_SERVICES, browseMedia, calendarEvents, weatherForecast } from './mockData';

type Message = HaMessage & Record<string, unknown>;

const refuse = (message: string, code = 'unknown_command'): Promise<never> =>
  Promise.reject({ code, message });

const idsOf = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((id): id is string => typeof id === 'string');
  return typeof value === 'string' ? [value] : [];
};

/** A day of states for the history sheets: a gentle wave around the value of a number. */
function historyOf(entity: HassEntity, start: number, end: number): Record<string, unknown>[] {
  const numeric = Number(entity.state);
  const isNumber = entity.state.trim() !== '' && Number.isFinite(numeric);
  const points = 24;
  return Array.from({ length: points }, (_, index) => {
    const at = start + ((end - start) * index) / (points - 1);
    const wave = Math.sin((index / points) * Math.PI * 2);
    const attributes: Record<string, unknown> = { ...entity.attributes };
    if (typeof attributes.brightness === 'number') attributes.brightness = 120 + (index % 6) * 20;
    if (typeof attributes.temperature === 'number') attributes.temperature = 19 + wave * 1.5;
    return {
      state: isNumber
        ? String(Math.round((numeric + wave * Math.max(1, numeric * 0.06)) * 10) / 10)
        : entity.state,
      attributes,
      last_changed: new Date(at).toISOString(),
    };
  });
}

function respond(store: MockHaStore, message: Message, now: () => number): Promise<unknown> {
  const entities = store.getEntities();
  switch (message.type) {
    case 'ping':
      return Promise.resolve(null);
    case 'supported_features':
      return Promise.resolve(null);
    case 'get_states':
      return Promise.resolve(Object.values(entities));
    case 'get_config':
      return Promise.resolve({
        version: '2026.9.4',
        location_name: 'Casa dimostrativa',
        time_zone: 'Europe/Rome',
        unit_system: {
          temperature: '°C',
          length: 'km',
          mass: 'kg',
          volume: 'L',
          pressure: 'hPa',
          wind_speed: 'km/h',
          accumulated_precipitation: 'mm',
        },
        components: ['camera', 'sonos', 'onvif', 'todo', 'weather', 'calendar'],
        state: 'RUNNING',
        currency: 'EUR',
        language: 'it',
      });
    case 'auth/current_user':
      return Promise.resolve({
        id: 'mockup-user',
        name: 'Demo',
        is_owner: true,
        is_admin: true,
        credentials: [],
      });
    case 'get_services':
      return Promise.resolve(MOCK_SERVICES);
    case 'config/area_registry/list':
      return Promise.resolve(store.registries().areas);
    case 'config/device_registry/list':
      return Promise.resolve(store.registries().devices);
    case 'config/entity_registry/list':
      return Promise.resolve(store.registries().entities);
    case 'auth/sign_path':
      return Promise.resolve({ path: String(message.path ?? '') });
    case 'camera/capabilities':
      return Promise.resolve({ frontend_stream_types: [] });
    case 'camera/stream':
    case 'camera/webrtc/offer':
    case 'camera/webrtc/get_client_config':
    case 'camera/webrtc/candidate':
      return refuse('La demo mostra solo le immagini fisse delle videocamere.', 'not_supported');
    case 'todo/item/list':
      return Promise.resolve({ items: store.todoItems(String(message.entity_id ?? '')) });
    case 'media_player/browse_media':
      return Promise.resolve(browseMedia());
    case 'recorder/statistics_during_period':
      return Promise.resolve({});
    case 'history/history_during_period': {
      const start = Date.parse(String(message.start_time));
      const end = Date.parse(String(message.end_time));
      const from = Number.isFinite(start) ? start : now() - 86_400_000;
      const to = Number.isFinite(end) ? end : now();
      return Promise.resolve(
        Object.fromEntries(
          idsOf(message.entity_ids)
            .filter((id) => entities[id])
            .map((id) => [id, historyOf(entities[id]!, from, to)])
        )
      );
    }
    case 'config/core/update':
      return Promise.resolve(null);
    case 'call_service':
      return callServiceMessage(store, message, now);
    default:
      return refuse(`Comando non simulato: ${String(message.type)}`);
  }
}

async function callServiceMessage(
  store: MockHaStore,
  message: Message,
  now: () => number
): Promise<unknown> {
  const domain = String(message.domain ?? '');
  const service = String(message.service ?? '');
  const data = (message.service_data as Record<string, unknown> | undefined) ?? {};
  const target = message.target as { entity_id?: unknown } | undefined;
  const ids = idsOf(target?.entity_id ?? data.entity_id);
  const entityId = ids[0] ?? '';
  if (domain === 'weather' && service === 'get_forecasts') {
    const type = String(data.type ?? 'daily');
    return { response: { [entityId]: { forecast: weatherForecast(type, now()) } } };
  }
  if (domain === 'calendar' && service === 'get_events') {
    return {
      response: Object.fromEntries(ids.map((id) => [id, { events: calendarEvents(now()) }])),
    };
  }
  if (domain === 'todo' && service === 'get_items') {
    return { response: { [entityId]: { items: store.todoItems(entityId) } } };
  }
  if (domain === 'sonos' && service === 'get_queue') {
    return { response: [{ media_title: 'Notte a Milano' }, { media_title: 'Caffè sul balcone' }] };
  }
  // A service or an entity the demo does not know resolves with no effect.
  return store.callService(domain, service, {
    ...data,
    entity_id: ids.length === 1 ? ids[0] : ids,
  });
}

export interface MockConnectionOptions {
  now?: () => number;
}

/** The fake `Connection`; `unknown` first because only the used part of the interface exists. */
export function createMockConnection(
  store: MockHaStore,
  options: MockConnectionOptions = {}
): Connection {
  const now = options.now ?? Date.now;
  const connection = {
    connected: true,
    haVersion: '2026.9.4',
    sendMessagePromise: (message: HaMessage) => respond(store, message as Message, now),
    /**
     * Subscriptions: `subscribe_entities` pushes the compressed changes of the store like Home
     * Assistant does; any other subscription is accepted and stays silent.
     */
    subscribeMessage: (callback: (event: unknown) => void, message: HaMessage) => {
      if (message.type !== 'subscribe_entities') {
        if (String(message.type).startsWith('camera/')) {
          return refuse(
            'La demo mostra solo le immagini fisse delle videocamere.',
            'not_supported'
          );
        }
        return Promise.resolve(() => Promise.resolve());
      }
      let previous = store.getEntities();
      const compress = (list: Record<string, HassEntity>) =>
        Object.fromEntries(
          Object.entries(list).map(([id, entity]) => [
            id,
            { s: entity.state, a: entity.attributes, lc: Date.now() / 1000, c: 'mockup' },
          ])
        );
      callback({ a: compress(previous) });
      const unsubscribe = store.subscribe(() => {
        const current = store.getEntities();
        const changed = Object.fromEntries(
          Object.entries(current).filter(([id, entity]) => previous[id] !== entity)
        );
        const removed = Object.keys(previous).filter((id) => !current[id]);
        previous = current;
        if (Object.keys(changed).length === 0 && removed.length === 0) return;
        callback({
          ...(Object.keys(changed).length > 0 ? { c: compress(changed) } : {}),
          ...(removed.length > 0 ? { r: removed } : {}),
        });
      });
      return Promise.resolve(() => {
        unsubscribe();
        return Promise.resolve();
      });
    },
    subscribeEvents: () => Promise.resolve(() => Promise.resolve()),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    ping: () => Promise.resolve(),
    reconnect: () => undefined,
    suspend: () => Promise.resolve(),
    close: () => undefined,
  };
  return connection as unknown as Connection;
}
