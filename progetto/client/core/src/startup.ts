import { DEFAULT_RELEASE_TIMEOUTS, RELEASE_REPOSITORY } from './defaults.ts';
import type { ReleaseRepository } from './defaults.ts';
import { serverOrigin } from './config.ts';
import { checkServer } from './health.ts';
import { verifyArchive } from './integrity.ts';
import type { ReleaseManifest } from './manifest.ts';
import type { BundleCache, ConfigStore, HttpClient } from './ports.ts';
import { HttpRequestError } from './ports.ts';
import { archiveUrl, fetchLatestManifest, findLatestRelease } from './releases.ts';
import { compareVersionStrings } from './version.ts';

/**
 * Decisione all'avvio del guscio (ADR-0023):
 * 1. senza indirizzo salvato → procedura guidata;
 * 2. il server sul mini PC deve rispondere come Acasystem;
 * 3. si prende l'ultima interfaccia pubblicata (P-1); se chiede un server o un guscio più
 *    recenti, l'ultima compatibile, dalla cache o da GitHub, con un avviso (P-1 bis, Q-A4);
 * 4. senza GitHub si usa la cache (P-4); un archivio che non torna con lo SHA-256 non si usa (P-2).
 */

export type Notice =
  | { kind: 'server-update'; available: string }
  | { kind: 'shell-update'; available: string }
  | { kind: 'offline' }
  | { kind: 'download-failed'; version: string };

export type StartupResult =
  | { kind: 'wizard' }
  | { kind: 'server-unreachable'; origin: string }
  | { kind: 'not-acasystem'; origin: string }
  | { kind: 'launch'; origin: string; version: string; notices: Notice[] }
  | {
      kind: 'no-bundle';
      origin: string;
      reason: 'offline' | 'unpublished' | 'incompatible' | 'download-failed';
    };

export interface StartupDeps {
  http: HttpClient;
  config: ConfigStore;
  cache: BundleCache;
  /** Versione del guscio installato, confrontata con `minShell`. */
  shellVersion: string;
  repository?: ReleaseRepository;
  healthTimeoutMs?: number;
  downloadTimeoutMs?: number;
}

type Blocker = 'server' | 'shell';

const blockersOf = (
  manifest: ReleaseManifest,
  serverVersion: string | null,
  shellVersion: string
): Blocker[] => {
  const blockers: Blocker[] = [];
  // Un server che non dichiara la versione non si può confrontare: non lo si blocca.
  if (serverVersion !== null && compareVersionStrings(manifest.minServer, serverVersion) > 0) {
    blockers.push('server');
  }
  if (compareVersionStrings(manifest.minShell, shellVersion) > 0) blockers.push('shell');
  return blockers;
};

const newest = (manifests: (ReleaseManifest | null)[]): ReleaseManifest | null =>
  manifests.reduce<ReleaseManifest | null>(
    (best, item) =>
      item && (!best || compareVersionStrings(item.version, best.version) > 0) ? item : best,
    null
  );

export const resolveStartup = async ({
  http,
  config,
  cache,
  shellVersion,
  repository = RELEASE_REPOSITORY,
  healthTimeoutMs = DEFAULT_RELEASE_TIMEOUTS.health,
  downloadTimeoutMs = DEFAULT_RELEASE_TIMEOUTS.download,
}: StartupDeps): Promise<StartupResult> => {
  const saved = await config.load();
  if (!saved) return { kind: 'wizard' };
  const origin = serverOrigin(saved);

  const health = await checkServer(http, origin, healthTimeoutMs);
  if (health.kind === 'unreachable') return { kind: 'server-unreachable', origin };
  if (health.kind === 'not-acasystem') return { kind: 'not-acasystem', origin };

  const compatible = (manifest: ReleaseManifest) =>
    blockersOf(manifest, health.version, shellVersion).length === 0;
  const cached = await cache.list();
  const bestCached = newest(cached.filter(compatible));
  const launch = (manifest: ReleaseManifest, notices: Notice[]): StartupResult => ({
    kind: 'launch',
    origin,
    version: manifest.version,
    notices,
  });

  let latest: ReleaseManifest;
  try {
    latest = await fetchLatestManifest(http, repository);
  } catch (error) {
    if (bestCached) return launch(bestCached, [{ kind: 'offline' }]);
    // GitHub risponde ma il repository non ha ancora Release: non è un problema di rete.
    const unpublished = error instanceof HttpRequestError && error.status === 404;
    return { kind: 'no-bundle', origin, reason: unpublished ? 'unpublished' : 'offline' };
  }

  const notices: Notice[] = blockersOf(latest, health.version, shellVersion).map((blocker) =>
    blocker === 'server'
      ? { kind: 'server-update', available: latest.version }
      : { kind: 'shell-update', available: latest.version }
  );

  let remote: ReleaseManifest | null = latest;
  if (notices.length > 0) {
    remote = null;
    try {
      remote = await findLatestRelease(http, repository, latest.version, compatible);
    } catch {
      // Elenco dell'API non raggiungibile (anche per il limite orario): resta la cache.
    }
  }
  const target = notices.length > 0 ? newest([remote, bestCached]) : latest;
  if (!target) return { kind: 'no-bundle', origin, reason: 'incompatible' };

  if (cached.some((item) => item.version === target.version)) return launch(target, notices);

  try {
    const archive = await http.getBytes(archiveUrl(repository, target), downloadTimeoutMs);
    if (!(await verifyArchive(target, archive))) throw new Error('SHA-256 o dimensione diversi');
    await cache.install(target, archive);
    return launch(target, notices);
  } catch {
    if (bestCached) {
      return launch(bestCached, [...notices, { kind: 'download-failed', version: target.version }]);
    }
    return { kind: 'no-bundle', origin, reason: 'download-failed' };
  }
};
