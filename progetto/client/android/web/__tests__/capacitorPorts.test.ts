// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { HttpRequestError } from '../../../core/src/index.ts';
import type { ReleaseManifest } from '../../../core/src/index.ts';
import {
  base64ToBytes,
  bytesToBase64,
  createCapacitorHttpClient,
  createPluginBundleCache,
  createPluginConfigStore,
} from '../capacitorPorts.ts';
import type { AcaShellPlugin, CapacitorHttpPlugin } from '../capacitorPorts.ts';

const httpReturning = (respond: (url: string, responseType?: string) => Promise<{ status: number; data: unknown }>) => {
  const calls: { url: string; headers?: Record<string, string>; responseType?: string }[] = [];
  const plugin: CapacitorHttpPlugin = {
    get: (options) => {
      calls.push(options);
      return respond(options.url, options.responseType);
    },
  };
  return { plugin, calls };
};

const fakeShell = () => {
  const state = { config: null as string | null, manifests: [] as string[], installed: [] as { manifest: string; archive: string }[] };
  const plugin: AcaShellPlugin = {
    listBundles: async () => ({ manifests: state.manifests }),
    installBundle: async (options) => {
      state.installed.push(options);
    },
    loadConfig: async () => ({ value: state.config }),
    saveConfig: async ({ value }) => {
      state.config = value;
    },
    launch: async () => {},
    consumeIntent: async () => ({ changeAddress: false }),
    shellVersion: async () => ({ version: '0.1.0' }),
    addListener: async () => ({}),
  };
  return { plugin, state };
};

const manifest: ReleaseManifest = {
  schema: 1,
  version: '0.9.30',
  archive: { name: 'acasystem-web-0.9.30.zip', sha256: 'a'.repeat(64), size: 3 },
  minServer: '0.9.28',
  minShell: '0.1.0',
};

describe('base64', () => {
  it('converte avanti e indietro anche oltre il blocco di 32 KB', () => {
    const bytes = new Uint8Array(100_000).map((_value, index) => index % 256);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });
});

describe('HttpClient con CapacitorHttp', () => {
  it('legge JSON già interpretato o come testo, con lo User-Agent', async () => {
    const { plugin, calls } = httpReturning(async (url) =>
      url.endsWith('text') ? { status: 200, data: '{"status":"ok"}' } : { status: 200, data: { status: 'ok' } }
    );
    const http = createCapacitorHttpClient(plugin, 'Acasystem-client/0.1.0 (Android)');
    expect(await http.getJson('https://x/obj', 1000)).toEqual({ status: 'ok' });
    expect(await http.getJson('https://x/text', 1000)).toEqual({ status: 'ok' });
    expect(calls[0]?.headers?.['User-Agent']).toBe('Acasystem-client/0.1.0 (Android)');
  });

  it('distingue stato HTTP, formato, rete e timeout', async () => {
    const http = createCapacitorHttpClient(
      httpReturning(async (url) => {
        if (url.endsWith('404')) return { status: 404, data: '' };
        if (url.endsWith('html')) return { status: 200, data: '<html>' };
        if (url.endsWith('slow')) throw new Error('SocketTimeoutException: timeout');
        throw new Error('ConnectException: failed to connect');
      }).plugin,
      'ua'
    );
    const kindOf = (url: string) =>
      http.getJson(url, 1000).then(
        () => 'ok',
        (error: HttpRequestError) => `${error.kind}:${error.status ?? ''}`
      );
    expect(await kindOf('https://x/404')).toBe('status:404');
    expect(await kindOf('https://x/html')).toBe('format:');
    expect(await kindOf('https://x/slow')).toBe('timeout:');
    expect(await kindOf('https://x/down')).toBe('network:');
  });

  it('decodifica i byte dall\'arraybuffer in base64', async () => {
    const http = createCapacitorHttpClient(
      httpReturning(async (_url, responseType) => ({
        status: 200,
        data: responseType === 'arraybuffer' ? bytesToBase64(new Uint8Array([1, 2, 3])) : null,
      })).plugin,
      'ua'
    );
    expect(await http.getBytes('https://x/zip', 1000)).toEqual(new Uint8Array([1, 2, 3]));
  });
});

describe('porte sul plugin del guscio', () => {
  it('salva e rilegge la configurazione, scartando valori alterati', async () => {
    const { plugin, state } = fakeShell();
    const store = createPluginConfigStore(plugin);
    expect(await store.load()).toBeNull();
    await store.save({ host: '192.168.1.184', port: 3002 });
    expect(await store.load()).toEqual({ host: '192.168.1.184', port: 3002 });
    state.config = '{"host":"8.8.8.8","port":3002}';
    expect(await store.load()).toBeNull();
    state.config = 'non json';
    expect(await store.load()).toBeNull();
  });

  it('elenca solo manifesti validi e passa l\'archivio in base64', async () => {
    const { plugin, state } = fakeShell();
    state.manifests = [JSON.stringify(manifest), '{"schema":2}', 'rotto'];
    const cache = createPluginBundleCache(plugin);
    expect(await cache.list()).toEqual([manifest]);
    await cache.install(manifest, new Uint8Array([1, 2, 3]));
    expect(state.installed[0]).toEqual({ manifest: JSON.stringify(manifest), archive: 'AQID' });
  });
});
