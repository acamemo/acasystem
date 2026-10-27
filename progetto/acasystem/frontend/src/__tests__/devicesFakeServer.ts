/**
 * A stand-in for the device facade of the backend (`/api/dispositivi`, ADR-0021 and ADR-0022), for
 * the tests of «Aggiungi un dispositivo» (D1): a `fetch` that answers from a table of routes,
 * records every request, and starts with the answers of a healthy server and an LG TV that can be
 * added. A test changes only what it needs with `on()`. The real client (`devicesApi`) and the
 * real `backendRequest` run on top of it, so the tests go through the same code the app uses.
 */
import { vi } from 'vitest';
import type {
  CatalogDto,
  DiscoveredDeviceDto,
  EntryDto,
  FlowAbortDto,
  FlowCreatedDto,
  FlowErrorDto,
  FlowExternalDto,
  FlowFormDto,
  FlowMenuDto,
  FlowProgressDto,
  StatusDto,
} from '@/@types/devices';

export interface RecordedCall {
  method: string;
  /** Path after `./api/dispositivi`, query included. */
  path: string;
  body: unknown;
}

export interface Reply {
  status?: number;
  body: unknown;
}

export type Handler = (
  call: RecordedCall,
  params: Record<string, string>
) => Reply | Promise<Reply>;

const PREFIX = './api/dispositivi';

export const TV_HOST = '192.168.1.26';

// --- Answers of a healthy server ---------------------------------------------------------------

export const statusDto = (overrides: Partial<StatusDto> = {}): StatusDto => ({
  user: { isAdmin: false },
  service: { state: 'active', active: true, message: null },
  homeAssistant: { reachable: true, onboarded: true },
  features: { catalog: true, flows: true, power: true },
  ...overrides,
});

export const catalogDto = (): CatalogDto => ({
  items: [
    {
      domain: 'webostv',
      name: 'webostv',
      brand: null,
      integrationType: null,
      iotClass: null,
      startDomain: 'webostv',
      startable: true,
      requiresInstaller: false,
    },
    {
      domain: 'hue',
      name: 'hue',
      brand: null,
      integrationType: null,
      iotClass: null,
      startDomain: 'hue',
      startable: true,
      requiresInstaller: false,
    },
  ],
  total: 2,
  degraded: true,
  message:
    'L’elenco completo delle marche non è ancora disponibile. Puoi cercare tra le principali.',
});

export const userForm = (errors: FlowErrorDto[] = [], flowId = 'flow1'): FlowFormDto => ({
  type: 'form',
  flowId,
  handler: 'webostv',
  stepId: 'user',
  title: 'Aggiungi il televisore LG',
  description:
    'Accendi il televisore e scrivi qui il suo indirizzo. Lo trovi nelle impostazioni di rete del televisore.',
  waitSeconds: null,
  fields: [
    {
      name: 'host',
      kind: 'text',
      required: true,
      label: 'Indirizzo del televisore',
      hint: 'Per esempio 192.168.1.26',
    },
  ],
  errors,
});

export const pairingForm = (errors: FlowErrorDto[] = [], flowId = 'flow1'): FlowFormDto => ({
  type: 'form',
  flowId,
  handler: 'webostv',
  stepId: 'pairing',
  title: 'Accetta sul televisore',
  description:
    'Sullo schermo del televisore comparirà una richiesta. Premi OK con il telecomando entro 10 secondi, poi tocca Avanti.',
  waitSeconds: 10,
  fields: [],
  errors,
});

export const pairingError: FlowErrorDto = {
  field: null,
  code: 'error_pairing',
  message: 'Non hai premuto OK sul televisore in tempo. Riprova.',
};

export const cannotConnect: FlowErrorDto = {
  field: null,
  code: 'cannot_connect',
  message:
    'Non riesco a collegarmi al televisore. Controlla che sia acceso, collegato alla stessa rete e che l’indirizzo sia giusto.',
};

export const abortDto = (reason = 'already_configured', message?: string): FlowAbortDto => ({
  type: 'abort',
  handler: 'webostv',
  reason,
  message: message ?? 'Questo dispositivo è già stato aggiunto.',
});

export const TV_ENTITY = 'media_player.lg_webos_tv';

export const entryDto = (overrides: Partial<EntryDto> = {}): EntryDto => ({
  entryId: 'entry1',
  domain: 'webostv',
  title: 'LG webOS TV',
  state: 'loaded',
  loaded: true,
  device: {
    id: 'dev1',
    name: 'LG webOS TV',
    manufacturer: 'LG',
    model: 'OLED55',
    areaId: null,
    areaName: null,
  },
  entities: [TV_ENTITY],
  mediaPlayerEntityId: TV_ENTITY,
  power: { configured: false },
  message: null,
  ...overrides,
});

export const createdDto = (
  entry: EntryDto | null = entryDto(),
  pending = entry === null || !entry.loaded
): FlowCreatedDto => ({
  type: 'create_entry',
  handler: 'webostv',
  entryId: 'entry1',
  domain: 'webostv',
  title: 'LG webOS TV',
  entry,
  pending,
});

// --- Devices Home Assistant found on the network (F2) -----------------------------------------

export const SAMSUNG_FLOW = 'found-samsung';
export const SAMSUNG_ENTITY = 'media_player.samsung_7_series';

export const discoveredDto = (
  overrides: Partial<DiscoveredDeviceDto> = {}
): DiscoveredDeviceDto => ({
  flowId: SAMSUNG_FLOW,
  handler: 'samsungtv',
  source: 'zeroconf',
  name: 'Samsung 7 Series (49)',
  model: 'UE49NU7100',
  family: 'tv',
  addable: true,
  ...overrides,
});

/** The first step of the Samsung flow: «Consenti» on the TV, a call held open. */
export const samsungConfirmForm = (errors: FlowErrorDto[] = []): FlowFormDto => ({
  type: 'form',
  flowId: SAMSUNG_FLOW,
  handler: 'samsungtv',
  stepId: 'confirm',
  title: 'Accetta sul televisore',
  description: 'Accendi il televisore. Premi Avanti e scegli Consenti con il telecomando.',
  waitSeconds: 30,
  fields: [],
  errors,
});

export const samsungEntry = (overrides: Partial<EntryDto> = {}): EntryDto =>
  entryDto({
    entryId: 'entry-samsung',
    domain: 'samsungtv',
    title: 'Samsung 7 Series (49)',
    device: {
      id: 'dev-samsung',
      name: 'Samsung 7 Series (49)',
      manufacturer: 'Samsung',
      model: 'UE49NU7100',
      areaId: null,
      areaName: null,
    },
    entities: [SAMSUNG_ENTITY],
    mediaPlayerEntityId: SAMSUNG_ENTITY,
    power: null,
    ...overrides,
  });

export const samsungCreated = (entry: EntryDto = samsungEntry()): FlowCreatedDto => ({
  type: 'create_entry',
  handler: 'samsungtv',
  entryId: 'entry-samsung',
  domain: 'samsungtv',
  title: 'Samsung 7 Series (49)',
  entry,
  pending: false,
});

// --- Steps that are not forms, and generic forms (F4) -----------------------------------------

export const menuDto = (flowId = 'flow-brand'): FlowMenuDto => ({
  type: 'menu',
  flowId,
  handler: 'acme',
  stepId: 'menu',
  title: 'Scegli come continuare',
  description: 'Puoi usare il cloud oppure la rete di casa.',
  options: [
    { id: 'cloud', label: 'Usa il cloud' },
    { id: 'local_setup', label: 'Usa la rete di casa' },
  ],
});

export const progressDto = (flowId = 'flow-brand'): FlowProgressDto => ({
  type: 'progress',
  flowId,
  handler: 'acme',
  stepId: 'scan',
  title: 'Un momento',
  description: 'Cerco il dispositivo sulla rete.',
  progressAction: 'scan',
});

export const externalDto = (flowId = 'flow-brand'): FlowExternalDto => ({
  type: 'external',
  flowId,
  handler: 'acme',
  stepId: 'auth',
  title: 'Accedi sul sito del produttore',
  description: 'Accedi al tuo account Acme: si apre in una nuova pagina.',
  url: 'https://accounts.acme.test/oauth?state=abc',
});

/** A generic form: every kind of field the server can draw from the schema of Home Assistant. */
export const genericForm = (flowId = 'flow-brand', errors: FlowErrorDto[] = []): FlowFormDto => ({
  type: 'form',
  flowId,
  handler: 'acme',
  stepId: 'user',
  title: 'Collega Acme',
  description: 'Scrivi i dati del tuo account.',
  waitSeconds: null,
  fields: [
    {
      name: 'host',
      kind: 'text',
      required: true,
      label: 'Indirizzo IP o nome',
      hint: 'Lo trovi sull’etichetta.',
    },
    { name: 'password', kind: 'password', required: true, label: 'Password' },
    { name: 'retries', kind: 'integer', required: false, label: 'Tentativi', min: 1, max: 5 },
    { name: 'ssl', kind: 'boolean', required: false, label: 'Usa SSL', default: true },
    {
      name: 'mode',
      kind: 'select',
      required: false,
      label: 'Modo',
      options: [
        { value: 'fast', label: 'Veloce' },
        { value: 'slow', label: 'Lento' },
      ],
      default: 'fast',
    },
    {
      name: 'rooms',
      kind: 'multiselect',
      required: false,
      label: 'Stanze',
      options: [
        { value: 'kitchen', label: 'Cucina' },
        { value: 'bath', label: 'Bagno' },
      ],
    },
  ],
  errors,
});

export const errorReply = (
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {}
): Reply => ({ status, body: { error: message, code, ...extra } });

// --- The fake itself ---------------------------------------------------------------------------

export interface FakeDevices {
  calls: RecordedCall[];
  /** Replaces the answer of a route: `on('POST /flussi/:id', handler)`. */
  on: (route: string, handler: Handler) => void;
  /** Requests whose `METHOD path` starts with this text. */
  callsTo: (prefix: string) => RecordedCall[];
  fetchMock: ReturnType<typeof vi.fn>;
}

const matchRoute = (pattern: string, method: string, path: string) => {
  const [routeMethod, routePath] = pattern.split(' ');
  if (routeMethod !== method) return null;
  const want = routePath.split('/');
  const have = path.split('?')[0].split('/');
  if (want.length !== have.length) return null;
  const params: Record<string, string> = {};
  for (let index = 0; index < want.length; index += 1) {
    if (want[index].startsWith(':')) params[want[index].slice(1)] = decodeURIComponent(have[index]);
    else if (want[index] !== have[index]) return null;
  }
  return params;
};

/** Installs the fake as the global `fetch`; call `vi.unstubAllGlobals()` after each test. */
export function installFakeDevices(
  options: { isAdmin?: boolean; status?: StatusDto } = {}
): FakeDevices {
  const calls: RecordedCall[] = [];
  const routes: [string, Handler][] = [
    [
      'GET /stato',
      () => ({
        body: options.status ?? statusDto({ user: { isAdmin: options.isAdmin === true } }),
      }),
    ],
    ['GET /flussi', () => ({ body: { flows: [] } })],
    ['GET /scoperti', () => ({ body: { devices: [] } })],
    ['GET /catalogo', () => ({ body: catalogDto() })],
    ['POST /flussi', () => ({ status: 201, body: userForm() })],
    ['GET /flussi/:id', () => ({ body: userForm() })],
    ['DELETE /flussi/:id', () => ({ body: { cancelled: true, pending: false } })],
    ['GET /stanze', () => ({ body: { areas: [{ id: 'salotto', name: 'Salotto' }] } })],
    ['GET /voci/:id', () => ({ body: entryDto() })],
  ];

  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = (init.method ?? 'GET').toUpperCase();
    const path = url.startsWith(PREFIX) ? url.slice(PREFIX.length) : url;
    const call: RecordedCall = {
      method,
      path,
      body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
    };
    calls.push(call);
    for (const [pattern, handler] of routes) {
      const params = matchRoute(pattern, method, path);
      if (!params) continue;
      const reply = await handler(call, params);
      const status = reply.status ?? 200;
      return { ok: status < 400, status, json: async () => reply.body };
    }
    return {
      ok: false,
      status: 404,
      json: async () => ({ error: 'Percorso non trovato.', code: 'NOT_FOUND' }),
    };
  });
  vi.stubGlobal('fetch', fetchMock);

  return {
    calls,
    fetchMock,
    on: (route, handler) => {
      // A route set later wins over the default.
      routes.unshift([route, handler]);
    },
    callsTo: (prefix) => calls.filter((call) => `${call.method} ${call.path}`.startsWith(prefix)),
  };
}
