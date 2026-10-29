/**
 * The device facade of the demo mode (`/api/dispositivi/*`, REP-20261028-005), answered inside
 * the browser: the service is active; over a few seconds Home Assistant «finds» televisions
 * (an LG that asks to be accepted, a Samsung that shows a code) and other devices (a Hue bridge,
 * a Reolink doorbell, one that cannot be connected from here, one already ignored); and every
 * «Aggiungi» or «Collega» runs the steps the real server sends for that integration - the code
 * shown on the TV, the request to accept on the TV and a wait, the button of the bridge, a form
 * with fields - before it adds the device and its entities to the simulated Home Assistant, so
 * the app makes its widget by itself. It never touches the network. The shapes are the DTOs of
 * `@/@types/devices`.
 */
import type { HassEntity } from 'home-assistant-js-websocket';
import type {
  CatalogEntryDto,
  DiscoveredDeviceDto,
  EntryDto,
  FlowCreatedDto,
  FlowErrorDto,
  FlowFieldDto,
  FlowFormDto,
  FlowResponseDto,
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
  /** How long the steps that wait on a device take, in ms (tests pass 0). */
  delays?: Partial<FlowDelays>;
}

export interface FlowDelays {
  /** The TV is asked to accept: the answer stays open this long. */
  consentMs: number;
  /** The wait after the acceptance, shown as a progress step. */
  progressMs: number;
  /** The bridge looks for its button, the camera checks the password. */
  checkMs: number;
}

const DEFAULT_DELAYS: FlowDelays = { consentMs: 3000, progressMs: 3500, checkMs: 1500 };

/** What a flow adds to the house. */
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
  /** Ignored from the start: it is listed in «Nascosti». */
  hidden?: boolean;
}[] = [
  {
    flowId: 'flow-demo-hue',
    appearsAfterMs: 3000,
    source: 'zeroconf',
    device: {
      handler: 'hue',
      family: 'light',
      name: 'Lampada scrivania',
      manufacturer: 'Signify Netherlands B.V.',
      model: 'Hue Iris (7602031U7)',
    },
    addable: true,
  },
  {
    flowId: 'flow-demo-reolink-campanello',
    appearsAfterMs: 5000,
    source: 'dhcp',
    device: {
      handler: 'reolink',
      family: 'camera',
      name: 'Campanello Reolink',
      manufacturer: 'Reolink',
      model: 'Video Doorbell WiFi',
    },
    addable: true,
  },
  {
    flowId: 'flow-demo-home-connect',
    appearsAfterMs: 6500,
    source: 'zeroconf',
    device: {
      handler: 'home_connect',
      family: 'plug',
      name: 'Forno Bosch HBG7',
      manufacturer: 'Bosch',
      model: 'HBG7741B1',
    },
    addable: false,
    reason: 'Per collegarlo serve l’accesso con l’account Home Connect, che qui non è possibile.',
  },
  {
    flowId: 'flow-demo-chromecast',
    appearsAfterMs: 2000,
    source: 'zeroconf',
    device: {
      handler: 'cast',
      family: 'tv',
      name: 'Chromecast studio',
      manufacturer: 'Google Inc.',
      model: 'Chromecast',
    },
    addable: true,
    hidden: true,
  },
];

/**
 * Televisions seen on the network: the one that asks to be accepted, the one that shows a code.
 * The screen reads this list when it opens and then every 30 seconds (`useTvsOnNetwork`), so
 * they are there from the first read, like the SSDP cache of Home Assistant.
 */
const DEMO_TVS: (TvInReteDto & { appearsAfterMs: number; demo: DemoDevice })[] = [
  {
    id: 'tv-demo-lg',
    appearsAfterMs: 0,
    brandKey: 'lg',
    brand: 'LG',
    name: 'LG webOS TV NANO81T6A',
    model: 'NANO81T6A',
    handler: 'webostv',
    conferma: 'consenti',
    collegabile: true,
    demo: {
      handler: 'webostv',
      family: 'tv',
      name: 'LG webOS TV NANO81T6A',
      manufacturer: 'LG Electronics',
      model: 'NANO81T6A',
    },
  },
  {
    id: 'tv-demo-samsung',
    appearsAfterMs: 0,
    brandKey: 'samsung',
    brand: 'Samsung',
    name: 'Samsung Frame 55"',
    model: 'QE55LS03',
    handler: 'samsungtv',
    conferma: 'pin',
    collegabile: true,
    demo: {
      handler: 'samsungtv',
      family: 'tv',
      name: 'Samsung Frame 55"',
      manufacturer: 'Samsung Electronics',
      model: 'QE55LS03',
    },
  },
];

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
        makeEntity(`binary_sensor.${base}_movimento`, 'off', {
          friendly_name: `${name} movimento`,
          device_class: 'motion',
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
      // The Samsung integration brings a remote; the webOS one does not.
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

/** The steps a flow goes through; the integration decides where it starts. */
type StepKind = 'pin' | 'consent' | 'progress' | 'link' | 'login' | 'host' | 'confirm';

/** Where the flow of an integration starts when Home Assistant did not already know the address. */
const FIRST_STEP: Record<string, StepKind> = {
  samsungtv: 'pin',
  webostv: 'consent',
  hue: 'link',
  reolink: 'login',
};

interface FlowState {
  flowId: string;
  device: DemoDevice;
  /** The discovery or the TV this flow took over, removed from the lists when it ends. */
  origin: { kind: 'discovered' | 'tv' | 'catalog'; id: string };
  step: StepKind;
  /** When the progress step began (ms of the facade's clock). */
  progressSince: number | null;
}

export function createMockDeviceFacade(
  store: MockHaStore,
  options: MockDeviceFacadeOptions = {}
): MockDeviceFacade {
  const now = options.now ?? Date.now;
  const delays: FlowDelays = { ...DEFAULT_DELAYS, ...options.delays };
  let startedAt: number | null = null;
  const hiddenAtStart = DISCOVERED.filter((item) => item.hidden).map((item) => item.flowId);
  const ignored = new Set<string>(hiddenAtStart);
  const taken = new Set<string>();
  const tvsTaken = new Set<string>();
  const flows = new Map<string, FlowState>();
  const entries = new Map<string, EntryDto>();
  let counter = 0;

  const reply = (body: unknown, status = 200): Promise<MockResponse> =>
    Promise.resolve({ status, body });
  const fail = (status: number, code: string, error: string): Promise<MockResponse> =>
    reply({ error, code }, status);
  const pause = (ms: number): Promise<void> =>
    ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

  /** Milliseconds since the first look at the network: the clock of the discoveries. */
  const elapsed = (): number => {
    startedAt ??= now();
    return now() - startedAt;
  };

  const discoveredNow = (): DiscoveredDeviceDto[] => {
    const time = elapsed();
    return DISCOVERED.filter(
      (item) => item.appearsAfterMs <= time && !ignored.has(item.flowId) && !taken.has(item.flowId)
    )
      .sort((a, b) => a.appearsAfterMs - b.appearsAfterMs)
      .map((item) => ({
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

  const tvsNow = (): TvInReteDto[] => {
    const time = elapsed();
    return DEMO_TVS.filter((tv) => tv.appearsAfterMs <= time && !tvsTaken.has(tv.id)).map(
      ({ appearsAfterMs: _after, demo: _demo, ...dto }) => dto
    );
  };

  const field = (
    name: string,
    kind: FlowFieldDto['kind'],
    label: string,
    extra: Partial<FlowFieldDto> = {}
  ): FlowFieldDto => ({ name, kind, required: true, label, ...extra });

  /** The step the flow is at, in the shape the real server sends it. */
  const stepOf = (state: FlowState, errors: FlowErrorDto[] = []): FlowResponseDto => {
    const { flowId, device } = state;
    const base = { flowId, handler: device.handler };
    const form = (
      stepId: string,
      title: string,
      description: string | null,
      fields: FlowFieldDto[],
      waitSeconds: number | null = null
    ): FlowFormDto => ({
      type: 'form',
      ...base,
      stepId,
      title,
      description,
      waitSeconds,
      fields,
      errors,
    });
    switch (state.step) {
      case 'pin':
        return form(
          'encrypted_pairing',
          `Collega ${device.name}`,
          'Sulla TV compare un codice di 4 cifre: scrivilo qui. In demo va bene qualsiasi codice, tranne 0000.',
          [field('pin', 'text', 'Codice sulla TV')]
        );
      case 'consent':
        return form(
          'pair',
          `Collega ${device.name}`,
          'Sulla TV compare una richiesta: accettala con il telecomando.',
          [],
          10
        );
      case 'progress':
        return {
          type: 'progress',
          ...base,
          stepId: 'connecting',
          title: `Collega ${device.name}`,
          description: 'Sto collegando la TV e leggo le sue impostazioni…',
          progressAction: null,
        };
      case 'link':
        return form(
          'link',
          'Collega il bridge Hue',
          'Premi il pulsante rotondo sul bridge Hue, poi tocca Conferma.',
          []
        );
      case 'login':
        return form(
          'user',
          `Collega ${device.name}`,
          'Scrivi la password che hai scelto per la videocamera.',
          [
            field('username', 'text', 'Utente', { default: 'admin' }),
            field('password', 'password', 'Password', { hint: 'La stessa dell’app Reolink.' }),
          ]
        );
      case 'host':
        return form(
          'user',
          `Collega ${device.name}`,
          'Scrivi l’indirizzo del dispositivo sulla rete di casa.',
          [
            field('host', 'text', 'Indirizzo del dispositivo', {
              hint: 'Per esempio 192.168.1.40',
            }),
          ]
        );
      default:
        return form(
          'confirm',
          `Collega ${device.name}`,
          'Conferma per collegare il dispositivo a Acasystem.',
          []
        );
    }
  };

  const openFlow = (
    device: DemoDevice,
    origin: FlowState['origin'],
    step: StepKind,
    flowId?: string
  ) => {
    counter += 1;
    const state: FlowState = {
      flowId: flowId ?? `flow-demo-${counter}`,
      device,
      origin,
      step,
      progressSince: null,
    };
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
      serial: `demo-${counter}`,
    };
    // A Hue bridge brings its lights; the bridge itself is a device without entities.
    if (device.handler === 'hue') {
      store.addDevice({
        spec: {
          id: `dev_added_bridge_${counter}`,
          name: 'Philips Hue Bridge',
          manufacturer: 'Signify Netherlands B.V.',
          model: 'BSB002',
          platform: 'hue',
          entityIds: [],
          serial: `bridge-${counter}`,
        },
        entities: [],
      });
    }
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
    if (state.origin.kind === 'tv') tvsTaken.add(state.origin.id);
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

  /** The person answered the current step: the next one, an error on the same one, or the end. */
  const answer = async (
    state: FlowState,
    input: Record<string, unknown>
  ): Promise<MockResponse> => {
    const refuse = (field: string, code: string, message: string) =>
      reply(stepOf(state, [{ field, code, message }]));
    switch (state.step) {
      case 'pin': {
        const pin = String(input.pin ?? '').trim();
        if (!/^\d{4}$/.test(pin) || pin === '0000') {
          return refuse('pin', 'invalid_auth', 'Il codice non è giusto. Guarda la TV e riprova.');
        }
        await pause(delays.checkMs);
        return reply(finish(state));
      }
      case 'consent': {
        // The call stays open while the person accepts on the TV, then the TV is set up.
        await pause(delays.consentMs);
        if (delays.progressMs <= 0) return reply(finish(state));
        state.step = 'progress';
        state.progressSince = now();
        return reply(stepOf(state));
      }
      case 'link':
        await pause(delays.checkMs);
        return reply(finish(state));
      case 'login': {
        if (!String(input.password ?? '').trim()) {
          return refuse('password', 'invalid_auth', 'Scrivi la password della videocamera.');
        }
        await pause(delays.checkMs);
        return reply(finish(state));
      }
      case 'host': {
        const host = String(input.host ?? '').trim();
        if (!/^[\w.-]+$/.test(host)) {
          return refuse('host', 'cannot_connect', 'Non riesco a raggiungere questo indirizzo.');
        }
        await pause(delays.checkMs);
        return reply(finish(state));
      }
      default:
        return reply(finish(state));
    }
  };

  /** A read of the flow: a progress step ends by itself once its wait is over. */
  const read = (state: FlowState): FlowResponseDto => {
    if (
      state.step === 'progress' &&
      state.progressSince !== null &&
      now() - state.progressSince >= delays.progressMs
    ) {
      return finish(state);
    }
    return stepOf(state);
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

  /** A new device of the catalogue, whose address nobody knows yet. */
  const catalogDevice = (handler: string): DemoDevice => {
    const entry = CATALOG.find((item) => item.domain === handler);
    return {
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
        // Home Assistant knows the address of what it found: the first step is the one that
        // needs the person (the button, the password), or a plain confirmation.
        const existing = flows.get(found.flowId);
        const state =
          existing ??
          openFlow(
            found.device,
            { kind: 'discovered', id: found.flowId },
            FIRST_STEP[found.device.handler] ?? 'confirm',
            found.flowId
          );
        return reply(stepOf(state));
      }
    }

    if (area === 'tv-in-rete') {
      if (first === undefined && get) return reply({ tvs: tvsNow() });
      const tv = DEMO_TVS.find((item) => item.id === first);
      if (tv && second === 'collega' && post) {
        const step = FIRST_STEP[tv.demo.handler] ?? 'confirm';
        return reply(stepOf(openFlow(tv.demo, { kind: 'tv', id: tv.id }, step)));
      }
    }

    if (area === 'flussi') {
      if (first === undefined && get) return reply({ flows: [] });
      if (first === undefined && post) {
        const handler = String(readBody(request).handler ?? 'demo');
        // A brand picked from the catalogue: the integration asks what it needs, an address
        // when it has nothing else to ask.
        const step = FIRST_STEP[handler] ?? 'host';
        return reply(
          stepOf(openFlow(catalogDevice(handler), { kind: 'catalog', id: handler }, step))
        );
      }
      const state = first ? flows.get(first) : undefined;
      if (first && !state) return fail(404, 'FLOW_NOT_FOUND', 'Questa procedura non esiste più.');
      if (state && get) return reply(read(state));
      if (state && post) {
        const input = readBody(request).input;
        return answer(
          state,
          typeof input === 'object' && input !== null && !Array.isArray(input)
            ? (input as Record<string, unknown>)
            : {}
        );
      }
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
      for (const flowId of hiddenAtStart) ignored.add(flowId);
      taken.clear();
      tvsTaken.clear();
      flows.clear();
    },
  };
}
