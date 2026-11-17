import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Router, json } from 'express';

const version = (value: unknown): value is string => typeof value === 'string' && /^\d{1,6}\.\d{1,6}\.\d{1,6}$/.test(value);
const statuses = new Set(['checking', 'current', 'available', 'updating', 'deferred', 'failed', 'offline']);
export function createUpdateRequests(directory: string, installedVersion: string, enabled: boolean) {
  const requestPath = join(directory, 'aca-update-request.json'), statusPath = join(directory, 'aca-update-status.json');
  const read = (path: string): Record<string, unknown> | null => {
    try { const value: unknown = JSON.parse(readFileSync(path, 'utf8')); return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null; }
    catch { return null; }
  };
  const save = (path: string, value: unknown) => {
    mkdirSync(directory, { recursive: true });
    const temporary = `${path}.${randomUUID()}.tmp`;
    writeFileSync(temporary, JSON.stringify(value), { mode: 0o600, flag: 'wx' }); renameSync(temporary, path);
  };
  const current = () => {
    const value = read(requestPath);
    return value?.schema === 1 && typeof value.requestedAt === 'string'
      && Number.isFinite(Date.parse(value.requestedAt)) && (value.clientKind === 'browser' || version(value.shellVersion))
      ? { requestedAt: value.requestedAt, clientKind: value.clientKind === 'browser' ? 'browser' : 'native',
        ...(version(value.shellVersion) ? { shellVersion: value.shellVersion } : {}) } : null;
  };
  const status = () => {
    if (!enabled) return { status: 'unconfigured', version: installedVersion };
    const value = read(statusPath), request = current();
    if (!value || !statuses.has(String(value.status)) || !version(value.version)
      || typeof value.checkedAt !== 'string' || !Number.isFinite(Date.parse(value.checkedAt))
      || (request && Date.parse(value.checkedAt) < Date.parse(request.requestedAt))) return { status: 'checking', version: installedVersion };
    return { status: value.status, version: value.version, checkedAt: value.checkedAt,
      ...(version(value.availableVersion) ? { availableVersion: value.availableVersion } : {}) };
  };
  const publish = (value: Record<string, unknown>) => {
    if (!statuses.has(String(value.status)) || !version(value.version) || typeof value.checkedAt !== 'string'
      || !Number.isFinite(Date.parse(value.checkedAt)) || (value.availableVersion !== undefined && !version(value.availableVersion))) return false;
    save(statusPath, { schema: 1, status: value.status, version: value.version, checkedAt: value.checkedAt,
      ...(value.availableVersion ? { availableVersion: value.availableVersion } : {}) }); return true;
  };
  const router = Router();
  router.use(json({ limit: '1kb' }));
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get('/status', (_req, res) => res.json(status()));
  // A refresh request contains no user identity and cannot select an artifact, URL or command.
  router.all('/check', (req, res) => {
    if (!['GET', 'POST'].includes(req.method)) { res.sendStatus(405); return; }
    const shellVersion = req.method === 'GET' ? req.query.shellVersion : req.body?.shellVersion;
    if (shellVersion !== undefined && !version(shellVersion)) { res.status(400).json({ code: 'INVALID_SHELL_VERSION' }); return; }
    try { if (enabled) {
      const last = current();
      if (!last || Date.now() - Date.parse(last.requestedAt) >= 10_000) save(requestPath, { schema: 1, requestedAt: new Date().toISOString(),
        clientKind: shellVersion === undefined ? 'browser' : 'native', ...(shellVersion ? { shellVersion } : {}) });
    } } catch { res.status(503).json({ code: 'UPDATE_CHECK_UNAVAILABLE' }); return; }
    res.json(status());
  });
  return { router, current, publish, status };
}
