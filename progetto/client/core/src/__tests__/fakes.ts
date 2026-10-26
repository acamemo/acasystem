import type { ClientConfig } from '../config.ts';
import { sha256Hex } from '../integrity.ts';
import type { ReleaseManifest } from '../manifest.ts';
import type { BundleCache, ConfigStore, HttpClient } from '../ports.ts';
import { HttpRequestError } from '../ports.ts';

/** Finti delle porte: rete come tabella URL → risposta, cache e configurazione in memoria. */

type Route = unknown | Uint8Array | HttpRequestError;

export const createHttp = (routes: Record<string, Route>) => {
  const requested: string[] = [];
  const answer = (url: string): Route => {
    requested.push(url);
    if (!(url in routes)) throw new HttpRequestError('network', `Nessuna rete per ${url}`);
    const route = routes[url];
    if (route instanceof HttpRequestError) throw route;
    return route;
  };
  const http: HttpClient = {
    getJson: async (url) => answer(url),
    getBytes: async (url) => {
      const route = answer(url);
      if (!(route instanceof Uint8Array)) throw new HttpRequestError('format', 'Non sono byte');
      return route;
    },
  };
  return { http, requested };
};

export const createConfigStore = (initial: ClientConfig | null = null) => {
  let stored = initial;
  const store: ConfigStore = {
    load: async () => stored,
    save: async (config) => {
      stored = config;
    },
  };
  return { store, current: () => stored };
};

export const createCache = (initial: ReleaseManifest[] = []) => {
  const manifests = [...initial];
  const cache: BundleCache = {
    list: async () => [...manifests],
    install: async (manifest) => {
      manifests.push(manifest);
    },
  };
  return { cache, versions: () => manifests.map((item) => item.version) };
};

/** Manifesto con archivio vero, così lo SHA-256 si verifica davvero. */
export const makeRelease = async (
  version: string,
  { minServer = '0.1.0', minShell = '0.1.0' }: { minServer?: string; minShell?: string } = {}
) => {
  const archive = new TextEncoder().encode(`acasystem-web ${version}`);
  const manifest: ReleaseManifest = {
    schema: 1,
    version,
    archive: { name: `acasystem-web-${version}.zip`, sha256: await sha256Hex(archive), size: archive.byteLength },
    minServer,
    minShell,
  };
  return { manifest, archive };
};
