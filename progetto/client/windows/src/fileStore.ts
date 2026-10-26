import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { compareVersionStrings, parseManifest, parseStoredConfig } from '../../core/src/index.ts';
import type { BundleCache, ClientConfig, ConfigStore, ReleaseManifest } from '../../core/src/index.ts';
import { readZip } from './zip.ts';

/**
 * Porte del nucleo su disco, nella cartella dati dell'app (`%APPDATA%\Acasystem`):
 * `config.json` con l'indirizzo, `bundles/<versione>/` con l'interfaccia e il suo manifesto.
 */

const MANIFEST_FILE = 'acasystem-manifest.json';
/** Versioni tenute in cache: la corrente più qualche ripiego per P-1 bis e P-4. */
const KEPT_BUNDLES = 3;

/** Scrittura atomica: un'interruzione lascia il file vecchio, non uno a metà. */
const writeAtomic = async (path: string, content: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, content, 'utf8');
  await rename(temporary, path);
};

export const createFileConfigStore = (dataDir: string): ConfigStore => {
  const path = join(dataDir, 'config.json');
  return {
    load: async () => {
      try {
        return parseStoredConfig(JSON.parse(await readFile(path, 'utf8')));
      } catch {
        return null;
      }
    },
    save: (config: ClientConfig) => writeAtomic(path, `${JSON.stringify(config, null, 2)}\n`),
  };
};

/** Mini PC dell'ultimo avvio dell'interfaccia (`last-server.json`): serve a needsBrowserReset. */
export interface LastServerStore {
  load(): Promise<string | null>;
  save(origin: string): Promise<void>;
}

export const createLastServerStore = (dataDir: string): LastServerStore => {
  const path = join(dataDir, 'last-server.json');
  return {
    load: async () => {
      try {
        const { origin } = JSON.parse(await readFile(path, 'utf8')) as { origin?: unknown };
        return typeof origin === 'string' ? origin : null;
      } catch {
        return null;
      }
    },
    save: (origin) => writeAtomic(path, `${JSON.stringify({ origin })}\n`),
  };
};

export interface FileBundleCache extends BundleCache {
  /** Cartella da servire per una versione installata. */
  directoryOf(version: string): string;
}

export const createFileBundleCache = (dataDir: string): FileBundleCache => {
  const root = join(dataDir, 'bundles');
  const directoryOf = (version: string) => join(root, version);

  const list = async (): Promise<ReleaseManifest[]> => {
    let names: string[];
    try {
      names = await readdir(root);
    } catch {
      return [];
    }
    const manifests = await Promise.all(
      names.map(async (name) => {
        try {
          const manifest = parseManifest(JSON.parse(await readFile(join(root, name, MANIFEST_FILE), 'utf8')));
          return manifest && manifest.version === name ? manifest : null;
        } catch {
          return null; // cartella temporanea o rimasta a metà: non è una versione
        }
      })
    );
    return manifests.filter((manifest): manifest is ReleaseManifest => manifest !== null);
  };

  const prune = async (current: string): Promise<void> => {
    const installed = (await list()).map((manifest) => manifest.version);
    const sorted = installed.sort((a, b) => compareVersionStrings(b, a));
    const keep = new Set([current, ...sorted.slice(0, KEPT_BUNDLES)]);
    await Promise.all(
      sorted.filter((version) => !keep.has(version)).map((version) =>
        rm(directoryOf(version), { recursive: true, force: true })
      )
    );
  };

  const install = async (manifest: ReleaseManifest, archive: Uint8Array): Promise<void> => {
    const entries = readZip(archive);
    if (!entries.some((entry) => entry.path === 'index.html')) {
      throw new Error("L'archivio non contiene index.html");
    }
    const staging = join(root, `.staging-${manifest.version}-${process.pid}`);
    await rm(staging, { recursive: true, force: true });
    for (const entry of entries) {
      const target = join(staging, ...entry.path.split('/'));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, entry.data);
    }
    // Il manifesto si scrive per ultimo: senza di lui la cartella non conta come installata.
    await writeFile(join(staging, MANIFEST_FILE), JSON.stringify(manifest), 'utf8');
    await rm(directoryOf(manifest.version), { recursive: true, force: true });
    await rename(staging, directoryOf(manifest.version));
    await prune(manifest.version);
  };

  return { list, install, directoryOf };
};
