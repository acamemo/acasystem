import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  headers: vi.fn(),
  method: vi.fn(() => 'oauth'),
  unauthorized: vi.fn((message: string) => Object.assign(new Error(message), { status: 401 })),
}));

vi.mock('@/api/apiAuth', () => ({
  getValidatedHomeAssistantRequestHeadersAsync: auth.headers,
  getStoredAuthMethod: auth.method,
  notifyHomeAssistantApiUnauthorized: auth.unauthorized,
}));

import {
  GENERIC_DEVICE_ERROR,
  cancelFlow,
  createArea,
  getEntry,
  getFlow,
  getPower,
  addDiscovered,
  getStatus,
  ignoreDiscovered,
  listAreas,
  listDiscovered,
  listFlows,
  removeEntry,
  searchCatalog,
  setupPower,
  startFlow,
  stepFlow,
  toDeviceError,
  updateDevice,
} from '@/api/devicesApi';
import {
  abortDto,
  catalogDto,
  createdDto,
  discoveredDto,
  entryDto,
  errorReply,
  externalDto,
  genericForm,
  installFakeDevices,
  menuDto,
  pairingForm,
  progressDto,
  samsungConfirmForm,
  statusDto,
  userForm,
  type FakeDevices,
} from './devicesFakeServer';

/**
 * The client of the device facade (D1c): the routes, methods and bodies of `./api/dispositivi`
 * with the token of the signed-in user, the errors in Italian, nothing stored in the browser
 * and nothing in the console, and the keys of the answers that the screens read, checked
 * against the DTOs of the server.
 */

let fake: FakeDevices;

beforeEach(() => {
  auth.headers.mockImplementation(({ forceRefreshOAuth }: { forceRefreshOAuth?: boolean } = {}) =>
    Promise.resolve({ Authorization: forceRefreshOAuth ? 'Bearer renewed' : 'Bearer first' })
  );
  auth.method.mockReturnValue('oauth');
  fake = installFakeDevices();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  auth.headers.mockReset();
  auth.unauthorized.mockClear();
});

describe('devices API: routes, methods and bodies', () => {
  it('reads state, catalogue, flows, entries, rooms and power on the right paths', async () => {
    fake.on('GET /accensione/:id', () => ({
      body: { entryId: 'e1', configured: true, active: true, message: null },
    }));
    await getStatus();
    await searchCatalog('');
    await listFlows();
    await getFlow('f 1');
    await getEntry('e1');
    await listAreas();
    await getPower('e1');
    expect(fake.calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      'GET /stato',
      'GET /catalogo?limit=50',
      'GET /flussi',
      'GET /flussi/f%201',
      'GET /voci/e1',
      'GET /stanze',
      'GET /accensione/e1',
    ]);
    const [url, init] = fake.fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('./api/dispositivi/stato');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer first' });
  });

  it('sends the bodies the server accepts and no others', async () => {
    fake.on('POST /flussi/:id', () => ({ body: pairingForm() }));
    fake.on('PATCH /dispositivi/:id', () => ({ body: entryDto().device }));
    fake.on('POST /stanze', () => ({ status: 201, body: { id: 'cucina', name: 'Cucina' } }));
    fake.on('POST /accensione/:id', () => ({
      body: { entryId: 'e1', configured: true, active: true, message: null },
    }));
    await startFlow('webostv');
    await stepFlow('flow1', { host: '192.168.1.26' });
    await stepFlow('flow1', {});
    await cancelFlow('flow1');
    await updateDevice('dev1', { name: 'Televisore', areaId: 'salotto' });
    await createArea('Cucina');
    await setupPower('e1');
    await setupPower('e1', {
      mac: '02:00:00:00:00:01',
      broadcastAddress: '192.168.1.255',
      broadcastPort: 9,
    });
    const sent = fake.calls.filter((call) => call.method !== 'GET');
    expect(sent.map((call) => [call.method, call.path, call.body])).toEqual([
      ['POST', '/flussi', { handler: 'webostv' }],
      ['POST', '/flussi/flow1', { input: { host: '192.168.1.26' } }],
      ['POST', '/flussi/flow1', { input: {} }],
      ['DELETE', '/flussi/flow1', undefined],
      ['PATCH', '/dispositivi/dev1', { name: 'Televisore', areaId: 'salotto' }],
      ['POST', '/stanze', { name: 'Cucina' }],
      ['POST', '/accensione/e1', {}],
      [
        'POST',
        '/accensione/e1',
        { mac: '02:00:00:00:00:01', broadcastAddress: '192.168.1.255', broadcastPort: 9 },
      ],
    ]);
  });

  it('reads the discoveries, takes one over and ignores one, on the paths of the server', async () => {
    fake.on('GET /scoperti', () => ({ body: { devices: [discoveredDto()] } }));
    fake.on('POST /scoperti/:id/aggiungi', () => ({ body: samsungConfirmForm() }));
    fake.on('POST /scoperti/:id/ignora', () => ({ body: { ignored: true } }));
    expect(await listDiscovered()).toEqual([discoveredDto()]);
    expect(await addDiscovered('found/1')).toMatchObject({ type: 'form', stepId: 'confirm' });
    await ignoreDiscovered('found 2');
    expect(fake.calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      'GET /scoperti',
      'POST /scoperti/found%2F1/aggiungi',
      'POST /scoperti/found%202/ignora',
    ]);
    // A malformed list is an empty one.
    fake.on('GET /scoperti', () => ({ body: 'no' }));
    expect(await listDiscovered()).toEqual([]);
  });

  it('removes an entry on its own path', async () => {
    fake.on('DELETE /voci/:id', () => ({ body: { removed: true } }));
    await removeEntry('entry 1');
    expect(fake.calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      'DELETE /voci/entry%201',
    ]);
  });

  it('passes the abort signal of taking a discovery over to fetch', async () => {
    const controller = new AbortController();
    fake.on('POST /scoperti/:id/aggiungi', () => ({ body: samsungConfirmForm() }));
    await addDiscovered('found1', controller.signal);
    const [, init] = fake.fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBe(controller.signal);
  });

  it('writes the search text in the query, encoded, with the limit', async () => {
    await searchCatalog('  lg & più  ', 20);
    expect(fake.calls[0]?.path).toBe('/catalogo?q=lg%20%26%20pi%C3%B9&limit=20');
  });

  it('unwraps the lists the server wraps in an object, and tolerates a malformed one', async () => {
    fake.on('GET /flussi', () => ({
      body: {
        flows: [{ flowId: 'f1', handler: 'webostv', stepId: 'user', createdAt: '', expiresAt: '' }],
      },
    }));
    expect(await listFlows()).toHaveLength(1);
    fake.on('GET /stanze', () => ({ body: 'non un oggetto' }));
    expect(await listAreas()).toEqual([]);
  });

  it('retries once with a renewed token after a 401 with OAuth, like the other calls', async () => {
    let first = true;
    fake.on('GET /stato', () => {
      if (first) {
        first = false;
        return errorReply(401, 'UNAUTHORIZED', 'Non autorizzato');
      }
      return { body: statusDto() };
    });
    await getStatus();
    const tokens = fake.fetchMock.mock.calls.map(
      (call) => ((call[1] as RequestInit).headers as Record<string, string>).Authorization
    );
    expect(tokens).toEqual(['Bearer first', 'Bearer renewed']);
  });

  it('passes the abort signal of a step to fetch (the pairing call can stay open)', async () => {
    const controller = new AbortController();
    fake.on('POST /flussi/:id', () => ({ body: pairingForm() }));
    await stepFlow('flow1', {}, controller.signal);
    const [, init] = fake.fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBe(controller.signal);
  });
});

describe('devices API: errors', () => {
  const failing = async (reply: ReturnType<typeof errorReply>) => {
    fake.on('POST /flussi', () => reply);
    try {
      await startFlow('webostv');
    } catch (error) {
      return toDeviceError(error);
    }
    throw new Error('the call should have failed');
  };

  it('keeps the code, the field, the flow and the wait that the server gives', async () => {
    const conflict = await failing(
      errorReply(409, 'FLOW_ALREADY_OPEN', 'Hai già un’aggiunta in corso.', { flowId: 'flow9' })
    );
    expect(conflict).toMatchObject({ status: 409, code: 'FLOW_ALREADY_OPEN', flowId: 'flow9' });

    const invalid = await failing(
      errorReply(400, 'INVALID_INPUT', 'I dati inseriti non sono validi.', { field: 'host' })
    );
    expect(invalid).toMatchObject({ code: 'INVALID_INPUT', field: 'host', flowId: null });

    const limited = await failing(
      errorReply(429, 'RATE_LIMITED', 'Troppi tentativi.', { retryAfterSeconds: 30 })
    );
    expect(limited).toMatchObject({ code: 'RATE_LIMITED', retryAfterSeconds: 30 });
    expect(limited.message).toBe('Troppi tentativi.');
  });

  it('never shows a text of the browser or of the transport: a generic Italian one instead', async () => {
    fake.on('POST /flussi', () => ({ status: 500, body: {} }));
    const error = await startFlow('webostv').catch((failure: unknown) => toDeviceError(failure));
    expect(error).toMatchObject({ status: 500, code: null, message: GENERIC_DEVICE_ERROR });

    // The network is down: fetch itself rejects.
    fake.fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const offline = await getStatus().catch((failure: unknown) => toDeviceError(failure));
    expect(offline).toMatchObject({ status: 0, code: null, message: GENERIC_DEVICE_ERROR });
    expect(GENERIC_DEVICE_ERROR).toBe('Qualcosa non ha funzionato. Riprova.');
    expect(toDeviceError('boom').message).toBe(GENERIC_DEVICE_ERROR);
    expect(toDeviceError(null).message).toBe(GENERIC_DEVICE_ERROR);
  });
});

describe('devices API: nothing kept, nothing said', () => {
  it('writes nothing in the browser storage and prints nothing in the console', async () => {
    const stores = [
      vi.spyOn(Storage.prototype, 'setItem'),
      vi.spyOn(Storage.prototype, 'removeItem'),
    ];
    const consoles = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined)
    );
    fake.on('POST /flussi/:id', () => ({ body: abortDto() }));
    fake.on('POST /accensione/:id', () => ({
      body: { entryId: 'e1', configured: true, active: true, message: null },
    }));
    await startFlow('webostv');
    await stepFlow('flow1', { host: '192.168.1.26' });
    await setupPower('e1', { mac: '02:00:00:00:00:01' });
    await getStatus();
    await cancelFlow('flow1');
    await getFlow('flow1').catch(() => undefined);
    for (const spy of [...stores, ...consoles]) expect(spy).not.toHaveBeenCalled();
  });
});

// --- The keys the screens read, against the DTOs of the server -----------------------------------

/**
 * The strict program has no Node types: the server files are read through a typed dynamic import.
 * Vitest runs from the frontend folder; where the server is not beside it, the checks are skipped.
 */
const SERVER = '../backend/src/services/devices/';
type Fs = {
  existsSync: (path: string) => boolean;
  readFileSync: (path: string, encoding: 'utf8') => string;
};

async function readServer(file: string): Promise<string | null> {
  const specifier = 'node:fs';
  const fs = (await import(/* @vite-ignore */ specifier)) as Fs;
  return fs.existsSync(SERVER + file)
    ? fs.readFileSync(SERVER + file, 'utf8').replace(/\r\n/g, '\n')
    : null;
}

/** Property names of `interface <name> {…}` in a server file, with whether each is optional. */
async function serverKeys(
  file: string,
  name: string
): Promise<{ key: string; optional: boolean }[]> {
  const text = await readServer(file);
  if (text === null) throw new Error(`${file} not found`);
  const start = text.search(new RegExp(`export interface ${name}\\b[^{]*\\{`));
  if (start < 0) throw new Error(`interface ${name} not found in ${file}`);
  const open = text.indexOf('{', start);
  const end = text.indexOf('\n}', open);
  const keys: { key: string; optional: boolean }[] = [];
  for (const line of text.slice(open, end).split('\n')) {
    const match = /^ {2}([A-Za-z]+)(\?)?:/.exec(line);
    if (match) keys.push({ key: match[1] ?? '', optional: match[2] === '?' });
  }
  return keys;
}

describe('devices API: the keys of the DTOs match the server', () => {
  /** Every key of the fixture is a key of the server, and every required key of the server is there. */
  const matches = async (
    fixture: object,
    file: string,
    name: string,
    extraServer: { key: string; optional: boolean }[] = []
  ) => {
    const server = [...(await serverKeys(file, name)), ...extraServer];
    const wanted = Object.keys(fixture);
    expect(
      wanted.filter((key) => !server.some((item) => item.key === key)),
      `${name}: keys the screens read that the server does not send`
    ).toEqual([]);
    expect(
      server.filter((item) => !item.optional && !wanted.includes(item.key)).map((item) => item.key),
      `${name}: keys the server always sends that the fixture lacks`
    ).toEqual([]);
  };

  it('the flow steps, errors and end results', async (context) => {
    const service = await readServer('deviceService.ts');
    if (service === null) return context.skip();
    const form = userForm([{ field: null, code: 'x', message: 'y' }]);
    await matches(form, 'flowModel.ts', 'FlowFormDto');
    await matches(form.errors[0] ?? {}, 'flowModel.ts', 'FlowErrorDto');
    await matches(form.fields[0] ?? {}, 'flowModel.ts', 'FlowFieldDto');
    await matches(abortDto(), 'flowModel.ts', 'FlowAbortDto');
    // The steps that are not forms, and a generic form with every kind of field (F4).
    await matches(menuDto(), 'flowModel.ts', 'FlowMenuDto');
    await matches(progressDto(), 'flowModel.ts', 'FlowProgressDto');
    await matches(externalDto(), 'flowModel.ts', 'FlowExternalDto');
    const generic = genericForm();
    await matches(generic, 'flowModel.ts', 'FlowFormDto');
    for (const field of generic.fields) await matches(field, 'flowModel.ts', 'FlowFieldDto');
    // The created result is the server's one plus the entry and the pending flag.
    const { entry, pending, ...created } = createdDto();
    expect([entry === null, pending]).toEqual([false, false]);
    await matches(created, 'flowModel.ts', 'FlowCreatedDto');
    expect(service).toMatch(/FlowCreatedDto & \{ entry: EntryDto \| null; pending: boolean \}/);
  });

  it('the entry, the device, the state, the catalogue and the power state', async (context) => {
    if ((await readServer('deviceService.ts')) === null) return context.skip();
    await matches(entryDto(), 'deviceService.ts', 'EntryDto');
    await matches(entryDto().device ?? {}, 'deviceService.ts', 'DeviceDto');
    await matches(statusDto(), 'deviceService.ts', 'StatusDto');
    await matches(catalogDto(), 'deviceService.ts', 'CatalogDto');
    const item = catalogDto().items[0] ?? {};
    await matches(
      item,
      'catalog.ts',
      'CatalogEntryDto',
      await serverKeys('catalog.ts', 'CatalogItem')
    );
    await matches({ ...discoveredDto(), reason: 'x' }, 'discovered.ts', 'DiscoveredDeviceDto');
    await matches(
      { entryId: 'e1', configured: true, active: true, message: null },
      'powerRecipe.ts',
      'PowerStatusDto'
    );
    await matches(
      { flowId: 'f', handler: 'webostv', stepId: 'user', createdAt: '', expiresAt: '' },
      'deviceService.ts',
      'FlowSummaryDto'
    );
  });
});
