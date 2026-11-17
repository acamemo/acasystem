import { Router } from 'express';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

interface ClientManifest {
  schema: 1;
  version: string;
  archive: { name: string; sha256: string; size: number };
  minServer: string;
  minShell: string;
}
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const version = (value: unknown): value is string => typeof value === 'string' && /^v?\d{1,6}\.\d{1,6}\.\d{1,6}$/.test(value);
const MAX_ARCHIVE_BYTES = 200 * 1024 * 1024; // Same bound as the client manifest contract.

/** Only the packaged manifest and the archive it names; never a request-supplied path. */
const loadBundle = (directory: string): { manifest: ClientManifest; archive: Buffer } | null => {
  try {
    const manifestPath = join(directory, 'manifest.json');
    if (statSync(manifestPath).size > 64 * 1024) return null;
    const value: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (!object(value) || value.schema !== 1 || !version(value.version)
      || !version(value.minServer) || !version(value.minShell) || !object(value.archive)) return null;
    const { name, sha256, size } = value.archive;
    if (typeof name !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*\.zip$/.test(name)
      || typeof sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(sha256)
      || typeof size !== 'number' || !Number.isInteger(size) || size <= 0 || size > MAX_ARCHIVE_BYTES) return null;
    const archivePath = join(directory, name);
    if (statSync(archivePath).size !== size) return null;
    const archive = readFileSync(archivePath);
    if (archive.byteLength !== size || createHash('sha256').update(archive).digest('hex') !== sha256) return null;
    return { manifest: { schema: 1, version: value.version, archive: { name, sha256, size }, minServer: value.minServer, minShell: value.minShell }, archive };
  } catch { return null; }
};

export const readVerifiedClientManifest = (directory: string) => loadBundle(directory)?.manifest ?? null;

/** Public read-only assets used before login; a verified snapshot is held until restart. */
export const createClientBundleRouter = (directory = process.env.CLIENT_BUNDLE_DIR || '/app/client-bundle'): Router => {
  const router = Router();
  const bundle = loadBundle(directory);
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get('/manifest', (_req, res) => {
    if (!bundle) { res.status(404).json({ error: 'Bundle locale non disponibile.' }); return; }
    res.json(bundle.manifest);
  });
  router.get('/archive', (_req, res) => {
    if (!bundle) { res.status(404).json({ error: 'Bundle locale non disponibile.' }); return; }
    res.type('application/zip').send(bundle.archive);
  });
  return router;
};
