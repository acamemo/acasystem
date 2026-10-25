import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Casa3dPlanError,
  DRAFT_KEY,
  createCasa3dPlanApi,
  forgetDraftOfOtherUser,
  parseImageDataUrl,
  planErrorFrom,
  toImageDataUrl,
  type PlanRequest,
  type PlanRequestInit,
  type PlanResponse,
} from '@/casa3d/planApi';
import { createCasa3dHass, EMPTY_REGISTRIES } from '@/casa3d/haShim';

/**
 * The Casa 3D plan commands as REST calls (ADR-0014, T6): the command-to-route translation, the
 * revision that goes with every save (compare-and-swap), the failures with their codes, the
 * pictures as binary, the follow-up by looking at the revision, and the draft that stays with the
 * person who made it. The request is injected: no browser and no server.
 */

interface Call {
  path: string;
  init: PlanRequestInit;
}

type Answer = { status?: number; json?: unknown; bytes?: number[]; type?: string };

function respond({ status = 200, json = {}, bytes, type }: Answer = {}): PlanResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(json),
    arrayBuffer: () => Promise.resolve(new Uint8Array(bytes ?? []).buffer),
    headers: { get: (name) => (name.toLowerCase() === 'content-type' ? (type ?? null) : null) },
  };
}

/** A request that answers from a queue and keeps what was asked. */
function fakeRequest(...answers: Answer[]): PlanRequest & { calls: Call[] } {
  const calls: Call[] = [];
  const queue = [...answers];
  const request = ((path: string, init: PlanRequestInit) => {
    calls.push({ path, init });
    return Promise.resolve(respond(queue.shift()));
  }) as PlanRequest & { calls: Call[] };
  request.calls = calls;
  return request;
}

const BUILDING = { version: 1, floors: [] };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Casa 3D plan API: reading and saving', () => {
  it('reads the plan and keeps its revision', async () => {
    const request = fakeRequest({ json: { building: BUILDING, revision: 3, updated_at: 'x' } });
    const api = createCasa3dPlanApi({ request });
    expect(api.revision).toBeNull();
    await expect(api.call({ type: 'casa3d/building/get' })).resolves.toEqual({
      building: BUILDING,
      revision: 3,
    });
    expect(api.revision).toBe(3);
    expect(request.calls).toEqual([{ path: '/building', init: { method: 'GET' } }]);
  });

  it('saves with the revision it last read as base_revision and keeps the new one', async () => {
    const request = fakeRequest(
      { json: { building: BUILDING, revision: 3 } },
      { json: { revision: 4, updated_at: 'x' } },
      { json: { revision: 5, updated_at: 'y' } }
    );
    const api = createCasa3dPlanApi({ request });
    await api.call({ type: 'casa3d/building/get' });
    await expect(api.call({ type: 'casa3d/building/save', building: BUILDING })).resolves.toEqual({
      revision: 4,
    });
    await api.call({ type: 'casa3d/building/save', building: BUILDING });
    const [, first, second] = request.calls;
    expect(first?.path).toBe('/building');
    expect(first?.init.method).toBe('PUT');
    expect(first?.init.headers).toEqual({ 'content-type': 'application/json' });
    expect(JSON.parse(String(first?.init.body))).toEqual({ building: BUILDING, base_revision: 3 });
    expect(JSON.parse(String(second?.init.body))).toEqual({ building: BUILDING, base_revision: 4 });
    expect(api.revision).toBe(5);
  });

  it('does not save a plan it has not read: the revision is unknown', async () => {
    const request = fakeRequest();
    const api = createCasa3dPlanApi({ request });
    await expect(
      api.call({ type: 'casa3d/building/save', building: BUILDING })
    ).rejects.toMatchObject({ code: 'revision_unknown' });
    expect(request.calls).toEqual([]);
  });

  it('a conflict (409) is an error with the code and the revision of the server, and keeps its own', async () => {
    const request = fakeRequest(
      { json: { building: BUILDING, revision: 3 } },
      { status: 409, json: { error: 'Revision conflict', revision: 7 } }
    );
    const api = createCasa3dPlanApi({ request });
    await api.call({ type: 'casa3d/building/get' });
    const error = await api
      .call({ type: 'casa3d/building/save', building: BUILDING })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Casa3dPlanError);
    expect(error).toMatchObject({ code: 'revision_conflict', status: 409, revision: 7 });
    expect((error as Error).message).toMatch(/modificato da un altro dispositivo/);
    // Nothing was overwritten, and the next save still does not pretend to know the new revision.
    expect(api.revision).toBe(3);
  });

  it('refuses a response that has no revision', async () => {
    const api = createCasa3dPlanApi({ request: fakeRequest({ json: { building: BUILDING } }) });
    await expect(api.call({ type: 'casa3d/building/get' })).rejects.toMatchObject({
      code: 'server',
    });
  });

  it('refuses a command it does not know', async () => {
    const api = createCasa3dPlanApi({ request: fakeRequest() });
    expect(api.handles('casa3d/building/get')).toBe(true);
    expect(api.handles('config/area_registry/list')).toBe(false);
    expect(api.handles('')).toBe(false);
    await expect(api.call({ type: 'casa3d/other' })).rejects.toMatchObject({ code: 'invalid' });
    await expect(api.call({})).rejects.toMatchObject({ code: 'invalid' });
  });
});

describe('Casa 3D plan API: failures', () => {
  const cases: [number, unknown, string][] = [
    [403, { error: 'Forbidden' }, 'forbidden'],
    [404, {}, 'not_found'],
    [413, {}, 'too_large'],
    [415, { error: 'SVG and markup are not allowed' }, 'rejected'],
    [422, { error: 'PNG is truncated' }, 'rejected'],
    [400, { error: 'Invalid building: x' }, 'invalid'],
    [500, {}, 'server'],
    [503, {}, 'server'],
  ];

  it.each(cases)('status %i is the code %s', async (status, json, code) => {
    const error = await planErrorFrom(respond({ status, json }));
    expect(error.code).toBe(code);
    expect(error.status).toBe(status);
  });

  it('says in Italian that only the installer writes', async () => {
    const error = await planErrorFrom(respond({ status: 403 }));
    expect(error.message).toBe('Non hai il permesso di modificare il piano.');
  });

  it('carries the reason of a rejected picture', async () => {
    const error = await planErrorFrom(
      respond({ status: 422, json: { error: 'PNG is truncated' } })
    );
    expect(error.message).toBe('Immagine non accettata: PNG is truncated');
  });

  it('survives a body that is not JSON', async () => {
    const response: PlanResponse = {
      ...respond({ status: 409 }),
      json: () => Promise.reject(new Error('not json')),
    };
    const error = await planErrorFrom(response);
    expect(error.code).toBe('revision_conflict');
    expect(error.revision).toBeUndefined();
  });
});

describe('Casa 3D plan API: pictures', () => {
  it('sends a picture as binary with its own type, not as a data address', async () => {
    const request = fakeRequest({ json: { id: 'bg-1' } });
    const api = createCasa3dPlanApi({ request });
    await api.call({
      type: 'casa3d/image/set',
      image_id: 'bg-1',
      data: 'data:image/png;base64,AQID',
    });
    const [call] = request.calls;
    expect(call?.path).toBe('/images/bg-1');
    expect(call?.init.method).toBe('PUT');
    expect(call?.init.headers).toEqual({ 'content-type': 'image/png' });
    expect(Array.from(call?.init.body as Uint8Array)).toEqual([1, 2, 3]);
  });

  it('refuses before sending what is not a picture data address, an external address and a bad id', async () => {
    const request = fakeRequest();
    const api = createCasa3dPlanApi({ request });
    for (const data of [
      'https://example.com/a.png',
      'http://example.com/a.png',
      '//example.com/a.png',
      'data:text/html;base64,PGI+',
      'data:image/svg+xml;utf8,<svg/>',
      'data:image/png;base64,@@@',
      '',
      42,
      null,
    ]) {
      await expect(
        api.call({ type: 'casa3d/image/set', image_id: 'a', data })
      ).rejects.toMatchObject({ code: 'rejected' });
    }
    for (const image_id of ['', '../x', 'a/b', 'a'.repeat(65), 'https://x', 7, undefined]) {
      await expect(
        api.call({ type: 'casa3d/image/set', image_id, data: 'data:image/png;base64,AQID' })
      ).rejects.toMatchObject({ code: 'invalid' });
      await expect(api.call({ type: 'casa3d/image/get', image_id })).rejects.toMatchObject({
        code: 'invalid',
      });
    }
    expect(request.calls).toEqual([]);
  });

  it('reads a picture back as a data address of the type the server says', async () => {
    const request = fakeRequest({ bytes: [1, 2, 3], type: 'image/webp' });
    const api = createCasa3dPlanApi({ request });
    await expect(api.call({ type: 'casa3d/image/get', image_id: 'bg-1' })).resolves.toEqual({
      data: 'data:image/webp;base64,AQID',
    });
    expect(request.calls[0]?.path).toBe('/images/bg-1');
  });

  it('a picture the server rejects is an error with the reason', async () => {
    const request = fakeRequest({ status: 415, json: { error: 'SVG and markup are not allowed' } });
    const api = createCasa3dPlanApi({ request });
    await expect(
      api.call({ type: 'casa3d/image/set', image_id: 'a', data: 'data:image/png;base64,AQID' })
    ).rejects.toMatchObject({ code: 'rejected', status: 415 });
  });

  it('turns a data address into bytes and back', () => {
    const parsed = parseImageDataUrl('data:image/jpeg;base64,/9j/4A==');
    expect(parsed?.mime).toBe('image/jpeg');
    expect(Array.from(parsed?.bytes ?? [])).toEqual([0xff, 0xd8, 0xff, 0xe0]);
    expect(toImageDataUrl('image/jpeg', parsed?.bytes ?? new Uint8Array())).toBe(
      'data:image/jpeg;base64,/9j/4A=='
    );
    const big = new Uint8Array(100_000).map((_, index) => index % 251);
    const again = parseImageDataUrl(toImageDataUrl('image/png', big));
    expect(again?.bytes.length).toBe(100_000);
    expect(again?.bytes[99_999]).toBe(big[99_999]);
  });
});

describe('Casa 3D plan API: history, backup and packs', () => {
  it('lists, snapshots and restores, and a restore changes the revision', async () => {
    const request = fakeRequest(
      {
        json: {
          snapshots: [{ id: 'a', revision: 2, saved_at: 10, floors: 1, rooms: 2, furniture: 3 }],
        },
      },
      { json: { snapshot: null } },
      { json: { revision: 9 } }
    );
    const api = createCasa3dPlanApi({ request });
    await expect(api.call({ type: 'casa3d/history/list' })).resolves.toEqual({
      snapshots: [{ id: 'a', revision: 2, saved_at: 10, floors: 1, rooms: 2, furniture: 3 }],
    });
    await expect(api.call({ type: 'casa3d/history/snapshot' })).resolves.toEqual({});
    await expect(api.call({ type: 'casa3d/history/restore', snapshot_id: 'a' })).resolves.toEqual({
      revision: 9,
    });
    expect(api.revision).toBeNull(); // the document in memory is not the restored one
    expect(request.calls.map((c) => `${c.init.method} ${c.path}`)).toEqual([
      'GET /history',
      'POST /history',
      'POST /history/a/restore',
    ]);
    await expect(
      api.call({ type: 'casa3d/history/restore', snapshot_id: '../x' })
    ).rejects.toMatchObject({ code: 'invalid' });
  });

  it('exports the plan, and imports a backup without any pack', async () => {
    const request = fakeRequest(
      { json: { format: 'acasystem-casa3d-backup', version: 1, building: BUILDING, packs: [] } },
      {
        json: {
          revision: 6,
          building: BUILDING,
          packs: 0,
          skipped: [{ id: 'p', reason: 'unsupported' }],
        },
      }
    );
    const api = createCasa3dPlanApi({ request });
    await expect(api.call({ type: 'casa3d/backup/export' })).resolves.toEqual({
      format: 'acasystem-casa3d-backup',
      version: 1,
      building: BUILDING,
      packs: [],
    });
    const result = await api.call<{ revision: number; skipped: unknown[] }>({
      type: 'casa3d/backup/import',
      building: BUILDING,
      packs: [{ id: 'p' }],
    });
    expect(result.revision).toBe(6);
    expect(result.skipped).toHaveLength(1);
    expect(api.revision).toBe(6);
    expect(JSON.parse(String(request.calls[1]?.init.body))).toEqual({
      building: BUILDING,
      packs: [{ id: 'p' }],
    });
  });

  it('has no furniture packs: the list is empty without asking the server', async () => {
    const request = fakeRequest();
    const api = createCasa3dPlanApi({ request });
    await expect(api.call({ type: 'casa3d/packs/list' })).resolves.toEqual({ packs: [] });
    expect(request.calls).toEqual([]);
  });
});

describe('Casa 3D plan API: following the revision', () => {
  function timers() {
    let tick: (() => void) | null = null;
    const cleared: unknown[] = [];
    return {
      setTimer: (callback: () => void) => {
        tick = callback;
        return 'handle';
      },
      clearTimer: (handle: unknown) => cleared.push(handle),
      fire: () => tick?.(),
      cleared,
    };
  }
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('tells the callback a revision that is not the one it holds, only while the page is visible', async () => {
    const request = fakeRequest(
      { json: { building: BUILDING, revision: 3 } },
      { json: { revision: 3 } },
      { json: { revision: 4 } },
      { json: { revision: 5 } }
    );
    const clock = timers();
    let visible = true;
    const api = createCasa3dPlanApi({ request, ...clock, isVisible: () => visible });
    await api.call({ type: 'casa3d/building/get' });
    const callback = vi.fn();
    const stop = await api.subscribe(callback, { type: 'casa3d/building/subscribe' });

    clock.fire(); // same revision: nothing to tell
    await flush();
    expect(callback).not.toHaveBeenCalled();

    clock.fire(); // another client saved
    await flush();
    expect(callback).toHaveBeenCalledWith({ revision: 4 });

    visible = false; // hidden page: nothing is asked
    clock.fire();
    await flush();
    expect(request.calls.filter((c) => c.path === '/building/revision')).toHaveLength(2);

    await stop();
    expect(clock.cleared).toEqual(['handle']);
  });

  it('a restore tells the subscribers at once and does not move the base: the old document cannot overwrite it', async () => {
    let server = { name: 'A', edit: 0, revision: 3 };
    const request = (async (path: string, init: PlanRequestInit) => {
      if (path === '/building' && init.method === 'GET')
        return respond({ json: { building: { name: server.name }, revision: server.revision } });
      if (path === '/building/revision') return respond({ json: { revision: server.revision } });
      if (path.endsWith('/restore')) {
        server = { name: 'restored', edit: 0, revision: 5 };
        return respond({ json: { revision: 5 } });
      }
      const sent = JSON.parse(String(init.body)) as { base_revision: number };
      if (sent.base_revision !== server.revision)
        return respond({ status: 409, json: { error: 'Revision conflict', revision: server.revision } });
      server = { ...server, revision: server.revision + 1 };
      return respond({ json: { revision: server.revision } });
    }) as PlanRequest;
    const clock = timers();
    const api = createCasa3dPlanApi({ request, ...clock });
    await api.call({ type: 'casa3d/building/get' });
    const callback = vi.fn();
    await api.subscribe(callback, { type: 'casa3d/building/subscribe' });

    await api.call({ type: 'casa3d/history/restore', snapshot_id: 'a' });
    expect(callback).toHaveBeenCalledWith({ revision: 5 });
    expect(api.revision).toBe(3);

    // The periodic look also says it, until the bundle has read the plan again.
    callback.mockClear();
    clock.fire();
    await flush();
    expect(callback).toHaveBeenCalledWith({ revision: 5 });

    // The stale document is refused; after a new reading the same call saves.
    await expect(
      api.call({ type: 'casa3d/building/save', building: { name: 'old' } })
    ).rejects.toMatchObject({ code: 'revision_conflict', revision: 5 });
    await api.call({ type: 'casa3d/building/get' });
    callback.mockClear();
    clock.fire();
    await flush();
    expect(callback).not.toHaveBeenCalled();
    await expect(
      api.call({ type: 'casa3d/building/save', building: { name: 'new' } })
    ).resolves.toEqual({ revision: 6 });
  });

  it('a reading by another consumer does not move the base of this document (one instance per element)', async () => {
    let revision = 1;
    const request = (async (_path: string, init: PlanRequestInit) => {
      if (init.method === 'GET') return respond({ json: { building: {}, revision } });
      const sent = JSON.parse(String(init.body)) as { base_revision: number };
      if (sent.base_revision !== revision)
        return respond({ status: 409, json: { error: 'Revision conflict', revision } });
      revision += 1;
      return respond({ json: { revision } });
    }) as PlanRequest;
    const editor = createCasa3dPlanApi({ request });
    const other = createCasa3dPlanApi({ request });
    await editor.call({ type: 'casa3d/building/get' });
    await other.call({ type: 'casa3d/building/get' });
    await other.call({ type: 'casa3d/building/save', building: { from: 'other' } });
    await expect(
      editor.call({ type: 'casa3d/building/save', building: { from: 'editor' } })
    ).rejects.toMatchObject({ code: 'revision_conflict' });
    expect(editor.revision).toBe(1);
  });

  it('a failed look is not an error: the next one tries again', async () => {
    const request = ((path: string) =>
      path === '/building/revision'
        ? Promise.reject(new Error('offline'))
        : Promise.resolve(respond({ json: { building: BUILDING, revision: 1 } }))) as PlanRequest;
    const clock = timers();
    const api = createCasa3dPlanApi({ request, ...clock });
    const callback = vi.fn();
    await api.subscribe(callback, { type: 'casa3d/building/subscribe' });
    clock.fire();
    await flush();
    expect(callback).not.toHaveBeenCalled();
  });
});

describe('Casa 3D plan API: the draft stays with the person who made it', () => {
  function storage(initial: Record<string, string> = {}) {
    const data = new Map(Object.entries(initial));
    return {
      data,
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    };
  }

  it('removes the draft when another user signs in, keeps it for the same one', () => {
    const store = storage();
    expect(forgetDraftOfOtherUser('ana', store)).toBe(false); // nothing to remove
    store.setItem(DRAFT_KEY, '{"building":{},"savedAt":1}');
    expect(forgetDraftOfOtherUser('ana', store)).toBe(false);
    expect(store.getItem(DRAFT_KEY)).not.toBeNull();
    expect(forgetDraftOfOtherUser('bruno', store)).toBe(true);
    expect(store.getItem(DRAFT_KEY)).toBeNull();
  });

  it('a draft nobody claimed is removed for the first user too', () => {
    const store = storage({ [DRAFT_KEY]: '{}' });
    expect(forgetDraftOfOtherUser('ana', store)).toBe(true);
    expect(store.getItem(DRAFT_KEY)).toBeNull();
  });

  it('does nothing without a user or without storage, and survives a storage that throws', () => {
    const store = storage({ [DRAFT_KEY]: '{}' });
    expect(forgetDraftOfOtherUser(null, store)).toBe(false);
    expect(store.getItem(DRAFT_KEY)).toBe('{}');
    expect(forgetDraftOfOtherUser('ana', null)).toBe(false);
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    expect(forgetDraftOfOtherUser('ana', broken)).toBe(false);
  });
});

describe('Casa 3D adapter with the plan API', () => {
  const build = (planApi: ReturnType<typeof createCasa3dPlanApi>) =>
    createCasa3dHass({
      states: {},
      registries: EMPTY_REGISTRIES,
      user: { id: 'u', is_admin: true },
      config: null,
      conn: null,
      hassUrl: 'https://aca.test/ha',
      planApi,
    });

  it('sends the plan commands to the backend and nothing of the plan to Home Assistant', async () => {
    const request = fakeRequest(
      { json: { building: BUILDING, revision: 1 } },
      { json: { revision: 2 } }
    );
    const hass = build(createCasa3dPlanApi({ request }));
    await hass.callWS({ type: 'casa3d/building/get' });
    await expect(
      hass.callWS({ type: 'casa3d/building/save', building: BUILDING })
    ).resolves.toEqual({
      revision: 2,
    });
    expect(request.calls.map((c) => `${c.init.method} ${c.path}`)).toEqual([
      'GET /building',
      'PUT /building',
    ]);
  });

  it('keeps Home Assistant read-only: a service call and a writing command are still refused', async () => {
    const request = fakeRequest();
    const hass = build(createCasa3dPlanApi({ request }));
    await expect(hass.callService('light', 'turn_on')).rejects.toMatchObject({ code: 'read_only' });
    await expect(hass.callWS({ type: 'call_service' })).rejects.toMatchObject({
      code: 'read_only',
    });
    await expect(hass.callWS({ type: 'config/area_registry/delete' })).rejects.toMatchObject({
      code: 'read_only',
    });
    expect(request.calls).toEqual([]);
  });

  it('the plan subscription follows the backend revision', async () => {
    let tick: (() => void) | null = null;
    const request = fakeRequest({ json: { revision: 8 } });
    const hass = build(
      createCasa3dPlanApi({
        request,
        setTimer: (callback) => {
          tick = callback;
          return 1;
        },
        clearTimer: () => undefined,
        isVisible: () => true,
      })
    );
    const callback = vi.fn();
    await hass.connection.subscribeMessage(callback, { type: 'casa3d/building/subscribe' });
    (tick as (() => void) | null)?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(callback).toHaveBeenCalledWith({ revision: 8 });
    // Other subscriptions are still refused.
    await expect(
      hass.connection.subscribeMessage(() => undefined, { type: 'subscribe_events' })
    ).rejects.toMatchObject({ code: 'read_only' });
  });
});
