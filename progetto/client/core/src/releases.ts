import { GITHUB_TIMEOUT_MS, MANIFEST_ASSET, MAX_RELEASES_SCANNED } from './defaults.ts';
import type { ReleaseRepository } from './defaults.ts';
import type { ReleaseManifest } from './manifest.ts';
import { parseManifest } from './manifest.ts';
import type { HttpClient } from './ports.ts';
import { HttpRequestError } from './ports.ts';
import { compareVersionStrings, parseVersion } from './version.ts';

/**
 * Lettura delle GitHub Releases pubbliche, senza chiavi (ADR-0023). L'ultima arriva dal
 * collegamento `releases/latest/download`, che non conta nel limite dell'API; l'elenco
 * dell'API (60 richieste l'ora senza chiave) serve solo per cercare una versione più vecchia.
 */

const releaseBase = ({ owner, repo, webBase = 'https://github.com' }: ReleaseRepository): string =>
  `${webBase}/${owner}/${repo}/releases`;

export const latestManifestUrl = (repository: ReleaseRepository): string =>
  `${releaseBase(repository)}/latest/download/${MANIFEST_ASSET}`;

export const manifestUrl = (repository: ReleaseRepository, version: string): string =>
  `${releaseBase(repository)}/download/v${version}/${MANIFEST_ASSET}`;

export const archiveUrl = (repository: ReleaseRepository, manifest: ReleaseManifest): string =>
  `${releaseBase(repository)}/download/v${manifest.version}/${manifest.archive.name}`;

const readManifest = async (
  http: HttpClient,
  url: string,
  expectedVersion?: string
): Promise<ReleaseManifest> => {
  const manifest = parseManifest(await http.getJson(url, GITHUB_TIMEOUT_MS));
  // Il tag e il manifesto devono dire la stessa versione: altrimenti l'archivio non si trova.
  if (!manifest || (expectedVersion !== undefined && manifest.version !== expectedVersion)) {
    throw new HttpRequestError('format', `Manifesto non valido: ${url}`);
  }
  return manifest;
};

export const fetchLatestManifest = (
  http: HttpClient,
  repository: ReleaseRepository
): Promise<ReleaseManifest> => readManifest(http, latestManifestUrl(repository));

/** Versioni pubblicate (non bozze né pre-release), dalla più recente. */
export const fetchReleaseVersions = async (
  http: HttpClient,
  repository: ReleaseRepository
): Promise<string[]> => {
  const { owner, repo, apiBase = 'https://api.github.com' } = repository;
  const url = `${apiBase}/repos/${owner}/${repo}/releases?per_page=30`;
  const body = await http.getJson(url, GITHUB_TIMEOUT_MS);
  if (!Array.isArray(body)) throw new HttpRequestError('format', 'Elenco delle Release non valido');
  const versions = body.flatMap((release: unknown) => {
    if (typeof release !== 'object' || release === null) return [];
    const { tag_name: tag, draft, prerelease } = release as Record<string, unknown>;
    if (draft === true || prerelease === true || typeof tag !== 'string') return [];
    return parseVersion(tag) && tag.startsWith('v') ? [tag.slice(1)] : [];
  });
  return versions.sort((a, b) => compareVersionStrings(b, a));
};

/**
 * Prima Release, dalla più recente sotto `below`, che soddisfa `accept`; `null` se nelle
 * ultime MAX_RELEASES_SCANNED non ce n'è. I manifesti illeggibili si saltano.
 */
export const findLatestRelease = async (
  http: HttpClient,
  repository: ReleaseRepository,
  below: string,
  accept: (manifest: ReleaseManifest) => boolean
): Promise<ReleaseManifest | null> => {
  const candidates = (await fetchReleaseVersions(http, repository))
    .filter((version) => compareVersionStrings(version, below) < 0)
    .slice(0, MAX_RELEASES_SCANNED);
  for (const version of candidates) {
    try {
      const manifest = await readManifest(http, manifestUrl(repository, version), version);
      if (accept(manifest)) return manifest;
    } catch {
      // Una Release rotta non deve impedire di trovarne una più vecchia.
    }
  }
  return null;
};
