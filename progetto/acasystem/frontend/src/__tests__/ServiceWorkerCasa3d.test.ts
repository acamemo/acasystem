import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Regola del service worker per i bundle della Casa 3D (ADR-0014, D16, T2b): un bundle con
 * l'impronta nel nome si tiene in una cache propria e una nuova impronta lo sostituisce; il
 * manifest, le lingue e il resto sotto /casa3d/ vanno sempre alla rete. Il file public/sw.js
 * è eseguito in un contesto isolato con una cache finta.
 */

interface FakeRequest {
  method: string;
  url: string;
  mode?: string;
}
interface FakeResponse {
  ok: boolean;
  body: string;
  clone(): FakeResponse;
}
type Listener = (event: FakeEvent) => void;
interface FakeEvent {
  request?: FakeRequest;
  respondWith?: (response: Promise<FakeResponse>) => void;
  waitUntil?: (promise: Promise<unknown>) => void;
}

const ORIGIN = 'https://aca.test';
let source = '';
let runInNewContext: (code: string, context: object) => unknown;

beforeAll(async () => {
  // The strict program of the frontend has no Node types (see FixKitReview).
  const fsName = 'node:fs';
  const vmName = 'node:vm';
  const fs = (await import(/* @vite-ignore */ fsName)) as {
    readFileSync: (path: string, encoding: 'utf8') => string;
  };
  const vm = (await import(/* @vite-ignore */ vmName)) as {
    runInNewContext: (code: string, context: object) => unknown;
  };
  source = fs.readFileSync('public/sw.js', 'utf8');
  runInNewContext = vm.runInNewContext;
});

const response = (body: string, ok = true): FakeResponse => ({ ok, body, clone: () => response(body, ok) });

/** Starts the worker with a fake network (path -> body) and returns what it did. */
function startWorker(network: Record<string, string>) {
  const listeners = new Map<string, Listener>();
  const caches = new Map<string, Map<string, FakeResponse>>();
  const fetched: string[] = [];

  const cacheApi = {
    async open(name: string) {
      if (!caches.has(name)) caches.set(name, new Map());
      const store = caches.get(name) as Map<string, FakeResponse>;
      return {
        async match(request: FakeRequest) {
          return store.get(request.url);
        },
        async put(request: FakeRequest, value: FakeResponse) {
          store.set(request.url, value);
        },
        async delete(request: FakeRequest) {
          return store.delete(request.url);
        },
        async keys() {
          return [...store.keys()].map((url) => ({ method: 'GET', url }));
        },
        async addAll() {},
      };
    },
    async keys() {
      return [...caches.keys()];
    },
    async delete(name: string) {
      return caches.delete(name);
    },
    async match() {
      return undefined;
    },
  };

  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
    skipWaiting() {},
    clients: { claim() {} },
  };
  const fakeFetch = async (request: FakeRequest) => {
    fetched.push(request.url);
    const path = request.url.slice(ORIGIN.length);
    return path in network ? response(network[path] as string) : response('Not found', false);
  };

  runInNewContext(source, { self, caches: cacheApi, fetch: fakeFetch, URL, Promise });

  /** The response the worker gives to a GET, or null when it leaves the request to the network. */
  async function get(path: string, method = 'GET'): Promise<FakeResponse | null> {
    let answer: Promise<FakeResponse> | null = null;
    (listeners.get('fetch') as Listener)({
      request: { method, url: path.startsWith('http') ? path : `${ORIGIN}${path}`, mode: 'cors' },
      respondWith: (value) => {
        answer = value;
      },
    });
    return answer ? await answer : null;
  }
  async function activate(): Promise<void> {
    let pending: Promise<unknown> = Promise.resolve();
    (listeners.get('activate') as Listener)({
      waitUntil: (promise) => {
        pending = promise;
      },
    });
    await pending;
  }
  const cached = (name: string) => [...(caches.get(name)?.keys() ?? [])].map((url) => url.slice(ORIGIN.length));

  return { get, activate, cached, fetched, caches };
}

describe('service worker, Casa 3D rule', () => {
  it('keeps a bundle with the hash in its name in its own cache and serves it from there', async () => {
    const worker = startWorker({ '/casa3d/casa3d-3d-727720bdd276.js': 'viewer v1' });

    const first = await worker.get('/casa3d/casa3d-3d-727720bdd276.js');
    expect(first?.body).toBe('viewer v1');
    expect(worker.cached('tunet-casa3d-v1')).toEqual(['/casa3d/casa3d-3d-727720bdd276.js']);

    const second = await worker.get('/casa3d/casa3d-3d-727720bdd276.js');
    expect(second?.body).toBe('viewer v1');
    expect(worker.fetched).toHaveLength(1);
  });

  it('replaces the old hash of a bundle with the new one and leaves the other bundles alone', async () => {
    const worker = startWorker({
      '/casa3d/casa3d-3d-111111111111.js': 'viewer v1',
      '/casa3d/casa3d-3d-222222222222.js': 'viewer v2',
      '/casa3d/casa3d-editor-333333333333.js': 'editor',
      '/casa3d/casa3d-444444444444.js': 'main v1',
      '/casa3d/casa3d-555555555555.js': 'main v2',
    });

    await worker.get('/casa3d/casa3d-3d-111111111111.js');
    await worker.get('/casa3d/casa3d-editor-333333333333.js');
    await worker.get('/casa3d/casa3d-444444444444.js');
    await worker.get('/casa3d/casa3d-3d-222222222222.js');
    expect(worker.cached('tunet-casa3d-v1').sort()).toEqual([
      '/casa3d/casa3d-3d-222222222222.js',
      '/casa3d/casa3d-444444444444.js',
      '/casa3d/casa3d-editor-333333333333.js',
    ]);

    // the main bundle ("casa3d") and the viewer ("casa3d-3d") are different stems
    await worker.get('/casa3d/casa3d-555555555555.js');
    expect(worker.cached('tunet-casa3d-v1').sort()).toEqual([
      '/casa3d/casa3d-3d-222222222222.js',
      '/casa3d/casa3d-555555555555.js',
      '/casa3d/casa3d-editor-333333333333.js',
    ]);
  });

  it('never caches an answer that is not ok (a stale name is a 404)', async () => {
    const worker = startWorker({});
    const answer = await worker.get('/casa3d/casa3d-3d-000000000000.js');

    expect(answer?.ok).toBe(false);
    expect(worker.cached('tunet-casa3d-v1')).toEqual([]);
  });

  it('leaves the manifest, the languages, the notices and other methods to the network', async () => {
    const worker = startWorker({
      '/casa3d/manifest.json': '{}',
      '/casa3d/lang/en.json': '{}',
      '/casa3d/NOTICE.txt': 'notice',
      '/casa3d/casa3d-3d-727720bdd276.js.LEGAL.txt': 'legal',
    });

    for (const path of [
      '/casa3d/manifest.json',
      '/casa3d/lang/en.json?v=abc',
      '/casa3d/NOTICE.txt',
      '/casa3d/casa3d-3d-727720bdd276.js.LEGAL.txt',
    ]) {
      expect(await worker.get(path), path).toBeNull();
    }
    expect(await worker.get('/casa3d/casa3d-3d-727720bdd276.js', 'POST')).toBeNull();
    expect(worker.caches.has('tunet-casa3d-v1')).toBe(false);
  });

  it('does not touch a bundle named like Casa 3D outside /casa3d/ or on another origin', async () => {
    const worker = startWorker({});

    expect(await worker.get('/other/casa3d-3d-727720bdd276.js')).toBeNull();
    expect(await worker.get('https://elsewhere.test/casa3d/casa3d-3d-727720bdd276.js')).toBeNull();
    expect(worker.caches.has('tunet-casa3d-v1')).toBe(false);
  });

  it('keeps its cache when the worker activates and still drops unknown caches', async () => {
    const worker = startWorker({ '/casa3d/casa3d-3d-727720bdd276.js': 'viewer' });
    await worker.get('/casa3d/casa3d-3d-727720bdd276.js');
    worker.caches.set('tunet-old', new Map());

    await worker.activate();

    expect(worker.caches.has('tunet-casa3d-v1')).toBe(true);
    expect(worker.caches.has('tunet-old')).toBe(false);
  });

  it('keeps the rule for /assets/ as it was', async () => {
    const worker = startWorker({ '/assets/index-AbC12345.js': 'index' });

    expect((await worker.get('/assets/index-AbC12345.js'))?.body).toBe('index');
    expect(worker.cached('tunet-assets-v2')).toEqual(['/assets/index-AbC12345.js']);
  });
});
