import { HttpRequestError, parseManifest, parseStoredConfig } from '../../core/src/index.ts';
import type { BundleCache, ConfigStore, HttpClient, ReleaseManifest } from '../../core/src/index.ts';

/**
 * Porte del nucleo sul guscio Android (ADR-0023, C6). Senza bundler: Capacitor e i plugin
 * si leggono dall'oggetto globale che il guscio inietta nella sola pagina locale.
 */

/** Plugin nativo del guscio (android/app/src/main/java/it/acasystem/client/AcaShellPlugin.java). */
export interface AcaShellPlugin {
  listBundles(): Promise<{ manifests: string[] }>;
  installBundle(options: { manifest: string; archive: string }): Promise<void>;
  loadConfig(): Promise<{ value: string | null }>;
  saveConfig(options: { value: string }): Promise<void>;
  launch(options: { version: string; serverOrigin: string; notices: string[] }): Promise<void>;
  consumeIntent(): Promise<{ changeAddress: boolean }>;
  shellVersion(): Promise<{ version: string }>;
  addListener(event: 'changeAddress', listener: () => void): Promise<unknown>;
}

interface HttpResponse {
  status: number;
  data: unknown;
}

export interface CapacitorHttpPlugin {
  get(options: {
    url: string;
    headers?: Record<string, string>;
    connectTimeout?: number;
    readTimeout?: number;
    responseType?: 'json' | 'arraybuffer' | 'text';
  }): Promise<HttpResponse>;
}

export const base64ToBytes = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

export const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
};

const toRequestError = (url: string, error: unknown): HttpRequestError => {
  const text = String(error instanceof Error ? error.message : error);
  return new HttpRequestError(/timeout|timed out/i.test(text) ? 'timeout' : 'network', `${url}: ${text}`);
};

/** HttpClient con CapacitorHttp: richieste native, senza CORS e senza contenuto misto. */
export const createCapacitorHttpClient = (http: CapacitorHttpPlugin, userAgent: string): HttpClient => {
  const request = async (url: string, timeoutMs: number, responseType: 'json' | 'arraybuffer') => {
    let response: HttpResponse;
    try {
      response = await http.get({
        url,
        headers: { 'User-Agent': userAgent, Accept: 'application/json, application/octet-stream' },
        connectTimeout: timeoutMs,
        readTimeout: timeoutMs,
        responseType,
      });
    } catch (error) {
      throw toRequestError(url, error);
    }
    if (response.status < 200 || response.status >= 300) {
      throw new HttpRequestError('status', `${url}: HTTP ${response.status}`, response.status);
    }
    return response.data;
  };

  return {
    getJson: async (url, timeoutMs) => {
      const data = await request(url, timeoutMs, 'json');
      if (typeof data !== 'string') return data;
      try {
        return JSON.parse(data) as unknown;
      } catch {
        throw new HttpRequestError('format', `${url}: risposta non JSON`);
      }
    },
    getBytes: async (url, timeoutMs) => {
      const data = await request(url, timeoutMs, 'arraybuffer');
      if (typeof data !== 'string') throw new HttpRequestError('format', `${url}: dati non binari`);
      return base64ToBytes(data);
    },
  };
};

export const createPluginConfigStore = (plugin: AcaShellPlugin): ConfigStore => ({
  load: async () => {
    const { value } = await plugin.loadConfig();
    if (!value) return null;
    try {
      return parseStoredConfig(JSON.parse(value));
    } catch {
      return null;
    }
  },
  save: (config) => plugin.saveConfig({ value: JSON.stringify(config) }),
});

export const createPluginBundleCache = (plugin: AcaShellPlugin): BundleCache => ({
  list: async () => {
    const { manifests } = await plugin.listBundles();
    return manifests.flatMap((text) => {
      try {
        const manifest = parseManifest(JSON.parse(text));
        return manifest ? [manifest] : [];
      } catch {
        return [];
      }
    });
  },
  install: (manifest: ReleaseManifest, archive: Uint8Array) =>
    plugin.installBundle({ manifest: JSON.stringify(manifest), archive: bytesToBase64(archive) }),
});
