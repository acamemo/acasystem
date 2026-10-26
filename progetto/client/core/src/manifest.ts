import { parseVersion } from './version.ts';

/**
 * `manifest.json` di ogni Release (ADR-0023): versione dell'interfaccia, archivio con
 * SHA-256 (P-2) e versioni minime di server e guscio (P-1 bis, Q-A4).
 */

export interface ReleaseManifest {
  schema: 1;
  version: string;
  archive: { name: string; sha256: string; size: number };
  minServer: string;
  minShell: string;
}

const ARCHIVE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*\.zip$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
/** Limite di sicurezza contro un manifesto che annuncia un download enorme. */
export const MAX_ARCHIVE_BYTES = 200 * 1024 * 1024;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isVersion = (value: unknown): value is string =>
  typeof value === 'string' && parseVersion(value) !== null;

/** Valida un manifesto letto da GitHub o dalla cache; `null` se qualcosa non torna. */
export const parseManifest = (value: unknown): ReleaseManifest | null => {
  if (!isObject(value) || value.schema !== 1) return null;
  const { version, archive, minServer, minShell } = value;
  if (!isVersion(version) || !isVersion(minServer) || !isVersion(minShell)) return null;
  if (!isObject(archive)) return null;
  const { name, sha256, size } = archive;
  if (typeof name !== 'string' || !ARCHIVE_NAME_PATTERN.test(name)) return null;
  if (typeof sha256 !== 'string' || !SHA256_PATTERN.test(sha256)) return null;
  if (typeof size !== 'number' || !Number.isInteger(size) || size <= 0 || size > MAX_ARCHIVE_BYTES) {
    return null;
  }
  return { schema: 1, version, archive: { name, sha256, size }, minServer, minShell };
};
