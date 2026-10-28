/**
 * The device facade of the demo mode (`/api/dispositivi/*`, REP-20261028-005, K1), answered inside
 * the browser: the service is active, a few devices are discovered over some seconds, a Samsung TV
 * is seen on the network, and «Aggiungi» runs a short flow (one confirmation, then the entry) that
 * adds the device to the simulated Home Assistant, so its widget is made by itself.
 * It never touches the network. The shapes are the DTOs of `@/@types/devices`.
 */
import type { HassEntity } from 'home-assistant-js-websocket';
import type {
  CatalogEntryDto,
  DiscoveredDeviceDto,
  EntryDto,
  FlowCreatedDto,
  FlowFormDto,
  StatusDto,
  TvInReteDto,
} from '@/@types/devices';
import type { IgnoredDeviceDto } from '@/@types/discovery';
import type { DeviceFamily } from '@/utils/devices/classify';
import type { MockHaStore } from './haStore';
import { makeEntity, type MockDeviceSpec } from './mockData';

export interface MockRequest {
  method?: string;
  /** Path after `./api`, query string included, e.g. `/dispositivi/scoperti`. */
  path: string;
  /** The JSON text of the body, as `fetch` would send it. */
  body?: string | null;
}

export interface MockResponse {
  status: number;
  body: unknown;
  /** Only the logos answer with an image; the demo has none (404). */
  blob?: Blob;
}

export interface MockDeviceFacade {
  handle: (request: MockRequest) => Promise<MockResponse>;
  /** Starts the discovery clock again (the demo is entered again). */
  reset: () => void;
}

export interface MockDeviceFacadeOptions {
  now?: () => number;
}

interface DemoDevice {
  handler: string;
  family: DeviceFamily;
  name: string;
  manufacturer: string;
  model: string;
}

const DISCOVERED: {
  flowId: string;
  appearsAfterMs: number;
  source: string;
  device: DemoDevice;
  addable: boolean;
  reason?: string;
}[] = [
  {
    flowId: 'flow-demo-lg',
    appearsAfterMs: 1500,
    source: 'ssdp',
    device: {
      handler: 'webostv',
      family: 'tv',
      name: 'TV LG OLED55',
      manufacturer: 'LG',
      model: 'OLED55C3',
    },
    addable: true,
  },
  {
    flowId: 'flow-demo-reolink',
    appearsAfterMs: 3000,
    source: 'dhcp',
    device: {
      handler: 'reolink',
      family: 'camera',
      name: 'Videocamera garage',
      manufacturer: 'Reolink',
      model: 'RLC-520A',
    },
    addable: true,
  },
  {
    flowId: 'flow-demo-hue',
    appearsAfterMs: 5000,
    source: 'zeroconf',
    device: {
      handler: 'hue',
      family: 'light',
      name: 'Lampada scrivania',
      manufacturer: 'Signify',
      model: 'Hue Iris',
    },
    addable: true,
  },
  {
    flowId: 'flow-demo-roborock',
    appearsAfterMs: 6500,
    source: 'dhcp',
    device: {
      handler: 'roborock',
      family: 'vacuum',
      name: 'Aspirapolvere Roborock Q Revo',
      manufacturer: 'Roborock',
      model: 'Q Revo',
    },
    addable: false,
    reason: 'Per collegarlo serve l’accesso con l’account del produttore, che qui non è possibile.',
  },
];

const DEMO_TV: TvInReteDto & { demo: DemoDevice } = {
  id: 'tv-demo-samsung',
  brandKey: 'samsung',
  brand: 'Samsung',
  name: 'Samsung Frame 55"',
  model: 'QE55LS03',
  handler: 'samsungtv',
  conferma: 'consenti',
  collegabile: true,
  demo: {
    handler: 'samsungtv',
    family: 'tv',
    name: 'Samsung Frame 55"',
    manufacturer: 'Samsung',
    model: 'QE55LS03',
  },
};

const CATALOG: CatalogEntryDto[] = [
  ['hue', 'Philips Hue', 'Signify'],
  ['reolink', 'Reolink', 'Reolink'],
  ['sonos', 'Sonos', 'Sonos'],
  ['webostv', 'LG webOS TV', 'LG'],
  ['samsungtv', 'Samsung Smart TV', 'Samsung'],
  ['shelly', 'Shelly', 'Shelly'],
  ['tplink', 'TP-Link Kasa', 'TP-Link'],
  ['cast', 'Google Cast', 'Google'],
].map(([domain, name, brand]) => ({
  domain: domain!,
  name: name!,
  brand: brand!,
  integrationType: 'device',
  iotClass: 'local_polling',
  startDomain: domain!,
  startable: true,
  requiresInstaller: false,
}));

const STATUS: StatusDto = {
  user: { isAdmin: true },
  service: { state: 'active', active: true, message: null },
  homeAssistant: { reachable: true, onboarded: true, version: '2026.9.4', verified: true },
  features: { catalog: true, flows: true, power: true },
};

const slug = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

/** The entities a demo device brings to the house, by the family of the device. */
function entitiesOf(device: DemoDevice, name: string, base: string): HassEntity[] {
  switch (device.family) {
    case 'light':
      return [
        makeEntity(`light.${base}`, 'on', {
          friendly_name: name,
          supported_features: 32,
          supported_color_modes: ['hs', 'color_temp'],
          color_mode: 'color_temp',
          brightness: 180,
          color_temp_kelvin: 3000,
          min_color_temp_kelvin: 2200,
          max_color_temp_kelvin: 6500,
        }),
      ];
    case 'camera':
      return [
        makeEntity(`camera.${base}`, 'idle', {
          friendly_name: name,
          supported_features: 3,
          motion_detection_enabled: true,
          frontend_stream_types: [],
          entity_picture: `/api/camera_proxy/camera.${base}`,
          access_token: 'mockup',
        }),
      ];
    case 'tv': {
      const player = makeEntity(`media_player.${base}`, 'off', {
        friendly_name: name,
        device_class: 'tv',
        supported_features: 1048575,
        volume_level: 0.3,
        is_volume_muted: false,
        source_list: ['HDMI 1', 'HDMI 2', 'Netflix', 'YouTube'],
      });
      return device.handler === 'samsungtv'
        ? [player, makeEntity(`remote.${base}`, 'on', { friendly_name: `${name} telecomando` })]
        : [player];
    }
    default:
      return [makeEntity(`switch.${base}`, 'off', { friendly_name: name, device_class: 'outlet' })];
  }
}

/** Domain of the entity that stands for a demo device. */
const primaryDomain = (device: DemoDevice): string =>
  device.family === 'tv'
    ? 'media_player'
    : device.family === 'light' || device.family === 'camera'
      ? device.family
      : 'switch';

interface FlowState {
  flowId: string;
  device: DemoDevice;
  /** The discovery or the TV this flow took over, removed from the lists when it ends. */
  origin: { kind: 'discovered' | 'tv' | 'catalog'; id: string };
}

export function createMockDeviceFacade(
  store: MockHaStore,
  options: MockDeviceFacadeOptions = {}
): MockDeviceFacade {
  const now = options.now ?? Date.now;
  let startedAt: number | null = null;
  const ignored = new Set<string>();
  const taken = new Set<string>();
  let tvTaken = false;
  const flows = new Map<string, FlowState>();
  const entries = new Map<string, EntryDto>();
  let counter = 0;

  const reply = (body: unknown, status = 200): Promise<MockResponse> =>
    Promise.resolve({ status, body });
  const fail = (status: number, code: string, error: string): Promise<MockResponse> =>
    reply({ error, code }, status);

  const discoveredNow = (): DiscoveredDeviceDto[] => {
    startedAt ??= now();
    const elapsed = now() - startedAt;
    return DISCOVERED.filter(
      (item) =>
        item.appearsAfterMs <= elapsed && !ignored.has(item.flowId) && !taken.has(item.flowId)
    ).map((item) => ({
      flowId: item.flowId,
      handler: item.device.handler,
      source: item.source,
      name: item.device.name,
      model: item.device.model,
      family: item.device.family,
      addable: item.addable,
      ...(item.reason ? { reason: item.reason } : {}),
    }));
  };

  const confirmStep = (state: FlowState): FlowFormDto => ({
    type: 'form',
    flowId: state.flowId,
    handler: state.device.handler,
    stepId: 'confirm',
    title: `Collega ${state.device.name}`,
    description: 'Conferma per collegare il dispositivo a Acasystem.',
    waitSeconds: null,
    fields: [],
    errors: [],
  });

  const openFlow = (device: DemoDevice, origin: FlowState['origin'], flowId?: string) => {
    counter += 1;
    const state: FlowState = { flowId: flowId ?? `flow-demo-${counter}`, device, origin };
    flows.set(state.flowId, state);
    return state;
  };

  /** The flow ends: the device joins the simulated house and the entry describes it. */
  const finish = (state: FlowState): FlowCreatedDto => {
    counter += 1;
    const { device } = state;
    let base = slug(device.name);
    while (store.getEntities()[`${primaryDomain(device)}.${base}`]) {
      base = `${base}_${counter}`;
    }
    const entities = entitiesOf(device, device.name, base);
    const spec: MockDeviceSpec = {
      id: `dev_added_${counter}`,
      name: device.name,
      manufacturer: device.manufacturer,
      model: device.model,
      platform: device.handler,
      entityIds: entities.map((entity) => entity.entity_id),
    };
    store.addDevice({ spec, entities });
    const entryId = `entry_added_${counter}`;
    const player = entities.find((entity) => entity.entity_id.startsWith('media_player.'));
    const entry: EntryDto = {
      entryId,
      domain: device.handler,
      title: device.name,
      state: 'loaded',
      loaded: true,
      device: {
        id: spec.id,
        name: device.name,
        manufacturer: device.manufacturer,
        model: device.model,
        areaId: null,
        areaName: null,
      },
      entities: spec.entityIds,
      mediaPlayerEntityId: player?.entity_id ?? null,
      power: device.family === 'tv' ? { configured: true } : null,
      message: null,
    };
    entries.set(entryId, entry);
    flows.delete(state.flowId);
    if (state.origin.kind === 'discovered') taken.add(state.origin.id);
    if (state.origin.kind === 'tv') tvTaken = true;
    return {
      type: 'create_entry',
      handler: device.handler,
      entryId,
      domain: device.handler,
      title: device.name,
      entry,
      pending: false,
    };
  };

  const readBody = (request: MockRequest): Record<string, unknown> => {
    try {
      const parsed: unknown = request.body ? JSON.parse(request.body) : {};
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  };

  const handle = (request: MockRequest): Promise<MockResponse> => {
    const method = (request.method ?? 'GET').toUpperCase();
    const [pathOnly, query = ''] = request.path.split('?');
    const parts = pathOnly!.split('/').filter(Boolean);
    if (parts[0] !== 'dispositivi') {
      return fail(404, 'NOT_AVAILABLE', 'Non disponibile nella modalità dimostrativa.');
    }
    const [, area, first, second, third] = parts;
    const get = method === 'GET';
    const post = method === 'POST';

    if (area === 'stato' && get) return reply(STATUS);

    if (area === 'catalogo' && get) {
      const params = new URLSearchParams(query);
      const q = (params.get('q') ?? '').trim().toLowerCase();
      const limit = Number(params.get('limit')) || 50;
      const items = CATALOG.filter(
        (item) =>
          !q || item.name.toLowerCase().includes(q) || (item.brand ?? '').toLowerCase().includes(q)
      ).slice(0, limit);
      return reply({ items, total: items.length, degraded: false, message: null });
    }

    if (area === 'loghi') return fail(404, 'NOT_FOUND', 'Nessun logo.');

    if (area === 'servizio' && first === 'ripara' && post) {
      return reply({ active: true, message: 'Il servizio dei dispositivi è attivo.' });
    }

    if (area === 'scoperti') {
      if (first === undefined && get) return reply({ devices: discoveredNow() });
      if (first === 'ignorati') {
        if (second === undefined && get) {
          const devices: IgnoredDeviceDto[] = DISCOVERED.filter((item) =>
            ignored.has(item.flowId)
          ).map((item) => ({
            entryId: `ignored_${item.flowId}`,
            handler: item.device.handler,
            name: item.device.name,
            family: item.device.family,
          }));
          return reply({ devices });
        }
        if (second && third === 'ripristina' && post) {
          ignored.delete(second.replace(/^ignored_/, ''));
          return reply({});
        }
      }
      const found = DISCOVERED.find((item) => item.flowId === first);
      if (found && second === 'ignora' && post) {
        ignored.add(found.flowId);
        return reply({});
      }
      if (found && second === 'aggiungi' && post) {
        if (!found.addable)
          return fail(409, 'NOT_ADDABLE', found.reason ?? 'Non si può aggiungere.');
        const existing = flows.get(found.flowId);
        const state =
          existing ??
          openFlow(found.device, { kind: 'discovered', id: found.flowId }, found.flowId);
        return reply(confirmStep(state));
      }
    }

    if (area === 'tv-in-rete') {
      if (first === undefined && get) {
        const { demo: _demo, ...dto } = DEMO_TV;
        return reply({ tvs: tvTaken ? [] : [dto] });
      }
      if (first === DEMO_TV.id && second === 'collega' && post) {
        return reply(confirmStep(openFlow(DEMO_TV.demo, { kind: 'tv', id: DEMO_TV.id })));
      }
    }

    if (area === 'flussi') {
      if (first === undefined && get) return reply({ flows: [] });
      if (first === undefined && post) {
        const handler = String(readBody(request).handler ?? 'demo');
        const entry = CATALOG.find((item) => item.domain === handler);
        const device: DemoDevice = {
          handler,
          family:
            handler === 'hue'
              ? 'light'
              : handler === 'reolink'
                ? 'camera'
                : handler === 'webostv' || handler === 'samsungtv'
                  ? 'tv'
                  : 'plug',
          name: entry?.name ?? 'Dispositivo dimostrativo',
          manufacturer: entry?.brand ?? 'Dimostrazione',
          model: 'Modello dimostrativo',
        };
        return reply(confirmStep(openFlow(device, { kind: 'catalog', id: handler })));
      }
      const state = first ? flows.get(first) : undefined;
      if (first && !state) return fail(404, 'FLOW_NOT_FOUND', 'Questa procedura non esiste più.');
      if (state && get) return reply(confirmStep(state));
      if (state && post) return reply(finish(state));
      if (state && method === 'DELETE') {
        flows.delete(state.flowId);
        return reply({});
      }
    }

    if (area === 'voci' && first) {
      const entry = entries.get(first);
      if (!entry) return fail(404, 'NOT_FOUND', 'Dispositivo non trovato.');
      if (get) return reply(entry);
      if (method === 'DELETE') {
        if (entry.device) store.removeDevice(entry.device.id);
        entries.delete(first);
        return reply({});
      }
    }

    if (area === 'stanze') {
      if (get)
        return reply({
          areas: store.registries().areas.map((a) => ({ id: a.area_id, name: a.name })),
        });
      if (post) {
        const name = String(readBody(request).name ?? '').trim();
        if (!name) return fail(400, 'INVALID_INPUT', 'Scrivi il nome della stanza.');
        const area = store.addArea(name);
        return reply({ id: area.area_id, name: area.name });
      }
    }

    if (area === 'dispositivi' && first && method === 'PATCH') {
      const body = readBody(request);
      store.renameDevice(first, {
        ...(body.name !== undefined ? { name: body.name as string | null } : {}),
        ...(body.areaId !== undefined ? { areaId: body.areaId as string | null } : {}),
      });
      const spec = store.registries().devices.find((device) => device.id === first);
      const areaEntry = store.registries().areas.find((a) => a.area_id === spec?.area_id);
      return reply({
        id: first,
        name: String(spec?.name ?? ''),
        manufacturer: (spec?.manufacturer as string | null) ?? null,
        model: (spec?.model as string | null) ?? null,
        areaId: (spec?.area_id as string | null) ?? null,
        areaName: areaEntry?.name ?? null,
      });
    }

    if (area === 'accensione' && first) {
      return reply({ entryId: first, configured: true, active: true, message: null });
    }

    return fail(404, 'NOT_FOUND', 'Non disponibile nella modalità dimostrativa.');
  };

  return {
    handle,
    reset() {
      startedAt = null;
      ignored.clear();
      taken.clear();
      tvTaken = false;
      flows.clear();
    },
  };
}
