import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, openSync, closeSync, fsyncSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Duplex } from 'node:stream';
import express from 'express';
import type { RequestHandler } from 'express';
import type { SqliteDatabase } from './models/database.ts';
import { removeIngressPrefix } from './middlewares/ingressPath.ts';

interface MaintenanceOptions {
  directory: string;
  targetId: string;
  token: string;
  version: string;
  appVersion: string;
  database: SqliteDatabase;
  bundle: () => unknown;
  activeEditors: () => number;
  checkRequest?: () => unknown;
  publishStatus?: (value: Record<string, unknown>) => boolean;
  pause?: () => Promise<void>;
  resume?: () => void | Promise<void>;
}
const id = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9-]{1,100}$/.test(value);
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const syncDirectory = (directory: string) => {
  // Windows directory durability is provided by the host/volume, not by POSIX fsync.
  if (process.platform === 'win32') return;
  const descriptor = openSync(directory, 'r');
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
};

/** Only a digest leaves the process; volatile sessions, events and command receipts are excluded. */
export function updateDataFingerprint(database: SqliteDatabase): string {
  const hash = createHash('sha256');
  const tables = database.prepare<[], { name: string }>("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()
    .map(row => row.name).filter(name => /^(profiles|current_settings(?:_history)?|casa3d_\w+|device_(?:flows|actions|power_links)|aca_pairing_house|aca_v2_(?:users|clients|sessions|profiles|sources|accounts|account_images|account_profiles|migrations))$/.test(name));
  for (const table of tables) {
    const columns = database.prepare<[], { name: string }>(`PRAGMA table_info("${table}")`).all()
      .map(column => column.name).filter(name => !['seen_at', 'last_seen_at'].includes(name));
    const rows = database.prepare(`SELECT ${columns.map(name => `"${name.replaceAll('"', '""')}"`).join(',')} FROM "${table}"`).all();
    const encoded = rows.map(row => JSON.stringify(row)).sort();
    hash.update(JSON.stringify([table, columns, encoded]));
  }
  return hash.digest('hex');
}

/** Enabled only by a separate per-installation credential, never by an HA user's token. */
export function createUpdateMaintenance(options: MaintenanceOptions) {
  if (!id(options.targetId) || !/^[a-f0-9]{64}$/.test(options.token)) throw new Error('Configurazione manutenzione ACA non valida.');
  const path = join(options.directory, 'aca-update-maintenance.json');
  const sockets = new Set<Duplex>();
  let pendingWrites = 0;
  let activeStreams = 0;
  let changing = false;
  const read = (): { active: boolean; transactionId?: string } => {
    if (!existsSync(path)) return { active: false };
    const value = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
    if (value.schema !== 1 || value.targetId !== options.targetId || !uuid(value.transactionId)) throw new Error('Stato manutenzione non valido.');
    return { active: true, transactionId: value.transactionId };
  };
  // Invalid persisted state must not reopen writes after a restart.
  read();
  const blocked = (): boolean => { try { return changing || read().active; } catch { return true; } };
  const activity = () => ({ pendingWrites, activeEditors: options.activeEditors(), activeConnections: sockets.size + activeStreams,
    activeCommands: options.database.prepare<[], { count: number }>("SELECT COUNT(*) AS count FROM aca_command_intents WHERE state='pending'").get()?.count ?? 0 });
  const state = () => ({ targetId: options.targetId, version: options.version, appVersion: options.appVersion,
    maintenance: read(), activity: activity(), bundle: options.bundle(), dataFingerprint: updateDataFingerprint(options.database), checkRequest: options.checkRequest?.() ?? null });
  const exempt = (path: string) => /^\/api\/(?:internal\/update(?:\/|$)|health$|client-bundle(?:\/|$)|updates(?:\/|$))/.test(path);
  const middleware: RequestHandler = (req, res, next) => {
    const requestPath = removeIngressPrefix(req.path, req.headers['x-ingress-path']);
    if (exempt(requestPath) || !/^\/(?:api|ha)(?:\/|$)/.test(requestPath)) { next(); return; }
    if (blocked()) { res.set('Retry-After', '3').status(503).json({ code: 'ACA_UPDATING', error: 'Aggiornamento ACA in corso. Riprova fra poco.' }); return; }
    // Reads may update authentication/session metadata too. A disconnected unfinished request
    // stays busy: a lost client socket does not prove that its asynchronous write completed.
    pendingWrites++;
    let requestPending = true;
    const finishRequest = () => { if (requestPending) { requestPending = false; pendingWrites--; } };
    res.once('finish', finishRequest);
    // SSE authorization finishes before converting the request to a connection. An async
    // keep-alive check stays busy even if the stream closes while that check is running.
    res.locals.acaUpdateTask = () => {
      pendingWrites++; let done = false;
      return () => { if (!done) { done = true; pendingWrites--; } };
    };
    res.locals.acaUpdateStreamReady = () => {
      finishRequest();
      if (!res.destroyed && !res.writableEnded) { activeStreams++; res.once('close', () => { activeStreams--; }); }
    };
    next();
  };
  const router = express.Router();
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const supplied = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
    const a = Buffer.from(supplied), b = Buffer.from(options.token);
    if (a.length !== b.length || !timingSafeEqual(a, b)) { res.status(401).json({ code: 'UPDATE_AUTH_REQUIRED' }); return; }
    next();
  });
  router.use(express.json({ limit: '1kb' }));
  router.get('/state', (_req, res) => { try { res.json(state()); } catch { res.status(503).json({ code: 'UPDATE_STATE_UNAVAILABLE' }); } });
  router.post('/status', (req, res) => {
    try { if (options.publishStatus?.(req.body ?? {})) { res.json({ ok: true }); return; } }
    catch { res.status(503).json({ code: 'UPDATE_STATE_UNAVAILABLE' }); return; }
    res.status(400).json({ code: 'INVALID_UPDATE_STATUS' });
  });
  router.post('/:action', async (req, res) => {
    const { targetId, transactionId } = (req.body ?? {}) as Record<string, unknown>;
    if (targetId !== options.targetId || !uuid(transactionId) || !['drain', 'resume'].includes(String(req.params.action))) {
      res.status(400).json({ code: 'INVALID_UPDATE_REQUEST' }); return;
    }
    if (changing) { res.status(409).json({ code: 'OTHER_UPDATE_ACTIVE' }); return; }
    try {
      const current = read();
      if (current.active && current.transactionId !== transactionId) { res.status(409).json({ code: 'OTHER_UPDATE_ACTIVE' }); return; }
      if (req.params.action === 'resume') {
        changing = true;
        if (current.active) { unlinkSync(path); syncDirectory(options.directory); }
        await options.resume?.();
        res.json({ maintenance: { active: false } }); return;
      }
      const busy = activity();
      if (Object.values(busy).some(count => count > 0)) { res.status(409).json({ code: 'ACA_BUSY', activity: busy }); return; }
      if (!current.active) {
        changing = true;
        await options.pause?.();
        if (res.destroyed) { await options.resume?.(); return; }
        mkdirSync(options.directory, { recursive: true });
        const temporary = `${path}.${randomUUID()}.tmp`;
        const descriptor = openSync(temporary, 'wx', 0o600);
        try { writeFileSync(descriptor, JSON.stringify({ schema: 1, targetId, transactionId })); fsyncSync(descriptor); }
        finally { closeSync(descriptor); }
        renameSync(temporary, path);
        syncDirectory(options.directory);
      }
      res.json(state());
    } catch { res.status(503).json({ code: 'UPDATE_STATE_UNAVAILABLE' }); }
    finally { changing = false; }
  });
  return { middleware, router, blocked,
    acceptSocket: (socket: Duplex) => {
      if (blocked()) return false;
      sockets.add(socket); socket.once('close', () => sockets.delete(socket)); return true;
    } };
}

export type UpdateMaintenance = ReturnType<typeof createUpdateMaintenance>;
