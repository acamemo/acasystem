import type { Request } from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import type { SqliteDatabase } from '../models/database.ts';
import {
  ACTIVITY_DAY_MS, ACTIVITY_QUOTA_BYTES, ACTIVITY_RETENTION_MS, DIAGNOSTIC_QUOTA_BYTES, pseudonymizeActivities,
} from '../../../contracts/activity.ts';
import { createActivityFacets } from './activityFacets.ts';
import type {
  ActivityActor, ActivityEvent, ActivityExport, ActivityInput, ActivityKind, ActivityOutcome,
  ActivityPage, ActivityQuery, ClientDiagnostic,
} from '../../../contracts/activity.ts';

export type { ActivityActor, ActivityInput } from '../../../contracts/activity.ts';
export interface ActivityAuthorization { actor: ActivityActor; accessToken: string; usageLeaseId?: string }
export type AuthorizeActivity = (req: Request) => Promise<ActivityAuthorization>;
const actorContext = new AsyncLocalStorage<ActivityActor>();
export const runWithActivityActor = <T>(actor: ActivityActor, run: () => T): T => actorContext.run(actor, run);
export const getActivityActor = (): ActivityActor | undefined => actorContext.getStore();
export class ActivityError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message); this.status = status; this.code = code;
  }
}
const KINDS: readonly ActivityKind[] = ['configuration', 'command', 'diagnostic'];
const OUTCOMES: readonly ActivityOutcome[] = ['pending', 'accepted', 'error', 'unknown'];
const identifier = (value: unknown): string | undefined =>
  typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,160}$/.test(value) ? value : undefined;
// eslint-disable-next-line no-control-regex
const label = (value: string): string => value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80);
interface ActivityRow { id: number; at: number; event: string; bytes: number; kind: ActivityKind }
export interface ActivityService {
  record(input: ActivityInput): ActivityEvent;
  recordDiagnostic(actor: ActivityActor, diagnostic: ClientDiagnostic): boolean;
  list(query?: ActivityQuery): ActivityPage;
  exportData(query?: ActivityQuery): ActivityExport;
  prune(): void;
  /** Pubblicare solo dopo il commit della transazione che contiene record(). */
  publish(): void;
  subscribe(listener: () => void): () => void;
}
export interface ActivityOptions { now?: () => number; quotaBytes?: number; diagnosticQuotaBytes?: number }

export const createActivityService = (database: SqliteDatabase, options: ActivityOptions = {}): ActivityService => {
  const now = options.now ?? Date.now;
  const quota = options.quotaBytes ?? ACTIVITY_QUOTA_BYTES;
  const diagnosticQuota = options.diagnosticQuotaBytes ?? DIAGNOSTIC_QUOTA_BYTES;
  database.exec(`CREATE TABLE IF NOT EXISTS aca_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, kind TEXT NOT NULL,
    user_id TEXT, client_id TEXT, profile_id TEXT, widget_id TEXT, outcome TEXT NOT NULL,
    event TEXT NOT NULL, bytes INTEGER NOT NULL, operation_id TEXT
  ); CREATE INDEX IF NOT EXISTS aca_activity_at ON aca_activity(at);
  CREATE INDEX IF NOT EXISTS aca_activity_user ON aca_activity(user_id,id);
  CREATE UNIQUE INDEX IF NOT EXISTS aca_activity_command ON aca_activity(operation_id) WHERE kind!='diagnostic' AND operation_id IS NOT NULL;
  CREATE TABLE IF NOT EXISTS aca_diagnostic_receipts (id TEXT PRIMARY KEY, at INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS aca_diagnostic_receipts_at ON aca_diagnostic_receipts(at);
  CREATE TABLE IF NOT EXISTS aca_activity_bytes (kind TEXT PRIMARY KEY, bytes INTEGER NOT NULL);
  INSERT OR REPLACE INTO aca_activity_bytes SELECT kind,SUM(bytes) FROM aca_activity GROUP BY kind;
  CREATE TRIGGER IF NOT EXISTS aca_activity_insert AFTER INSERT ON aca_activity BEGIN
    INSERT INTO aca_activity_bytes VALUES (NEW.kind,NEW.bytes) ON CONFLICT(kind) DO UPDATE SET bytes=bytes+NEW.bytes; END;
  CREATE TRIGGER IF NOT EXISTS aca_activity_delete AFTER DELETE ON aca_activity BEGIN
    UPDATE aca_activity_bytes SET bytes=bytes-OLD.bytes WHERE kind=OLD.kind; END;
  CREATE TRIGGER IF NOT EXISTS aca_activity_update AFTER UPDATE ON aca_activity BEGIN
    UPDATE aca_activity_bytes SET bytes=bytes-OLD.bytes WHERE kind=OLD.kind;
    INSERT INTO aca_activity_bytes VALUES (NEW.kind,NEW.bytes) ON CONFLICT(kind) DO UPDATE SET bytes=bytes+NEW.bytes; END;`);
  const listeners = new Set<() => void>();
  const facets = createActivityFacets(database);
  const remove = database.prepare('DELETE FROM aca_activity WHERE id = ?');
  const pruneAt = (at: number) => {
    if (database.prepare('DELETE FROM aca_activity WHERE at <= ?').run(at - ACTIVITY_RETENTION_MS).changes) facets.invalidate();
    database.prepare('DELETE FROM aca_diagnostic_receipts WHERE at <= ?').run(at - ACTIVITY_RETENTION_MS);
    const receipts = database.prepare<[], { count: number }>('SELECT COUNT(*) AS count FROM aca_diagnostic_receipts').get()?.count ?? 0;
    if (receipts > 50000) database.prepare(`DELETE FROM aca_diagnostic_receipts WHERE id IN (
      SELECT id FROM aca_diagnostic_receipts ORDER BY at,rowid LIMIT ?
    )`).run(receipts - 50000);
    const sizes = database.prepare<[], { kind: string; bytes: number }>('SELECT kind,bytes FROM aca_activity_bytes').all();
    let total = sizes.reduce((sum, row) => sum + row.bytes, 0);
    let diagnostics = sizes.find((row) => row.kind === 'diagnostic')?.bytes ?? 0;
    while (total > quota || diagnostics > diagnosticQuota) {
      const row = database.prepare<[], ActivityRow>(`SELECT id,kind,bytes FROM aca_activity
        ${diagnostics > diagnosticQuota ? "WHERE kind='diagnostic'" : ''} ORDER BY id LIMIT 1`).get();
      if (!row) break;
      remove.run(row.id); facets.invalidate(); total -= row.bytes;
      if (row.kind === 'diagnostic') diagnostics -= row.bytes;
    }
  };
  const prune = () => pruneAt(now());
  const clean = (input: ActivityInput): ActivityInput => {
    if (!KINDS.includes(input.kind) || !OUTCOMES.includes(input.outcome) || !/^[a-z0-9_.]{1,160}$/.test(input.action))
      throw new ActivityError(400, 'INVALID_ACTIVITY', 'Evento non valido.');
    const actor = input.actor ? {
      userId: identifier(input.actor.userId) ?? '', userName: label(input.actor.userName),
      clientId: identifier(input.actor.clientId) ?? null,
      clientName: input.actor.clientName ? label(input.actor.clientName) : null,
      sessionId: identifier(input.actor.sessionId) ?? null,
      ...(input.actor.userColor && /^#[0-9a-f]{6}$/i.test(input.actor.userColor) ? { userColor: input.actor.userColor } : {}),
      ...(input.actor.clientPlatform && ['windows', 'android', 'web'].includes(input.actor.clientPlatform) ? { clientPlatform: input.actor.clientPlatform } : {}),
    } : null;
    if (actor && !actor.userId) throw new ActivityError(400, 'INVALID_ACTOR', 'Autore non valido.');
    return {
      kind: input.kind, action: input.action, outcome: input.outcome, actor,
      ...(identifier(input.profileId) ? { profileId: input.profileId } : {}),
      ...(identifier(input.widgetId) ? { widgetId: input.widgetId } : {}),
      ...(identifier(input.targetId) ? { targetId: input.targetId } : {}),
      ...(identifier(input.operationId) ? { operationId: input.operationId } : {}),
      ...(input.kind === 'diagnostic' && input.originAt && Number.isFinite(Date.parse(input.originAt))
        ? { originAt: new Date(input.originAt).toISOString() } : {}),
      ...(input.code && /^[A-Za-z0-9_.:-]{1,64}$/.test(input.code) ? { code: input.code } : {}),
      ...(Number.isSafeInteger(input.revision) && Number(input.revision) >= 0 ? { revision: input.revision } : {}),
    };
  };
  const reference = (query: ActivityQuery, current: number): number => {
    if (query.asOf === undefined) return current;
    const at = typeof query.asOf === 'string' ? Date.parse(query.asOf) : NaN;
    if (!Number.isFinite(at) || new Date(at).toISOString() !== query.asOf || at > current)
      throw new ActivityError(400, 'INVALID_ANCHOR', 'Aggiorna il registro per riallineare l’orario.');
    return at;
  };
  const read = (query: ActivityQuery, limit: number, current: number, asOf: number): ActivityEvent[] => {
    const where = ['at > ?', 'at <= ?']; const params: (number | string)[] = [current - ACTIVITY_RETENTION_MS, asOf];
    if (query.ageDays !== undefined) {
      if (!Number.isSafeInteger(query.ageDays) || query.ageDays < 0 || query.ageDays > 6)
        throw new ActivityError(400, 'INVALID_AGE_DAYS', 'Giorni non validi.');
      where.push('at > ?', 'at <= ?');
      params.push(asOf - (query.ageDays + 1) * ACTIVITY_DAY_MS, asOf - query.ageDays * ACTIVITY_DAY_MS);
    }
    if (query.before !== undefined) {
      if (!Number.isSafeInteger(query.before) || query.before < 1) throw new ActivityError(400, 'INVALID_CURSOR', 'Pagina non valida.');
      where.push('id < ?'); params.push(query.before);
    }
    for (const [field, value] of [['user_id', query.userId], ['client_id', query.clientId], ['profile_id', query.profileId], ['widget_id', query.widgetId]] as const) {
      if (value !== undefined) {
        if (!identifier(value)) throw new ActivityError(400, 'INVALID_FILTER', 'Filtro non valido.');
        where.push(`${field} = ?`); params.push(value);
      }
    }
    for (const [field, value, allowed] of [['kind', query.kind, KINDS], ['outcome', query.outcome, OUTCOMES]] as const) {
      if (value !== undefined) {
        if (!(allowed as readonly string[]).includes(value)) throw new ActivityError(400, 'INVALID_FILTER', 'Filtro non valido.');
        where.push(`${field} = ?`); params.push(value);
      }
    }
    for (const [field, value] of [['from', query.from], ['to', query.to]] as const) {
      if (value !== undefined) {
        const at = Date.parse(value);
        if (!Number.isFinite(at)) throw new ActivityError(400, 'INVALID_DATE', 'Intervallo non valido.');
        where.push(`at ${field === 'from' ? '>=' : '<='} ?`); params.push(at);
      }
    }
    const rows = database.prepare<(number | string)[], ActivityRow>(
      `SELECT id,event FROM aca_activity WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT ?`
    ).all(...params, limit);
    return rows.map((row) => ({ ...JSON.parse(row.event) as ActivityEvent, id: row.id }));
  };
  const service: ActivityService = {
    record: database.transaction((input: ActivityInput) => {
      const receivedAt = now();
      const event = { ...clean(input), at: new Date(receivedAt).toISOString() };
      const operationKey = event.operationId && event.kind !== 'diagnostic' ? createHash('sha256')
        .update(JSON.stringify([event.kind, event.action, event.actor?.userId, event.actor?.clientId, event.profileId, event.operationId])).digest('hex') : null;
      const previous = event.kind !== 'diagnostic' && event.operationId
        ? database.prepare<[string], ActivityRow>("SELECT id,event FROM aca_activity WHERE operation_id=? AND kind!='diagnostic'").get(operationKey!) : undefined;
      const finalEvent = previous ? { ...event, at: (JSON.parse(previous.event) as ActivityEvent).at, updatedAt: event.at } : event;
      const text = JSON.stringify(finalEvent);
      let id: number;
      if (previous) {
        database.prepare('UPDATE aca_activity SET outcome=?,event=?,bytes=? WHERE id=?')
          .run(event.outcome, text, Buffer.byteLength(text), previous.id);
        id = previous.id;
      } else {
        const result = database.prepare(`INSERT INTO aca_activity(at,kind,user_id,client_id,profile_id,widget_id,outcome,event,bytes,operation_id)
          VALUES (?,?,?,?,?,?,?,?,?,?)`).run(receivedAt, event.kind, event.actor?.userId ?? null, event.actor?.clientId ?? null,
          event.profileId ?? null, event.widgetId ?? null, event.outcome, text, Buffer.byteLength(text), operationKey);
        id = Number(result.lastInsertRowid);
      }
      facets.invalidate();
      pruneAt(receivedAt);
      return { ...finalEvent, id };
    }),
    recordDiagnostic: database.transaction((actor: ActivityActor, event: ClientDiagnostic) => {
      const id = `${actor.userId}:${actor.clientId ?? 'client'}:${event.eventId}`;
      if (database.prepare('INSERT OR IGNORE INTO aca_diagnostic_receipts(id,at) VALUES (?,?)').run(id, now()).changes === 0) return false;
      service.record({ actor, kind: 'diagnostic', action: event.code, outcome: 'error', operationId: event.eventId,
        code: 'CLIENT_REPORTED', originAt: event.occurredAt });
      return true;
    }),
    list(query = {}) {
      const current = now();
      const asOf = reference(query, current);
      const limit = query.limit ?? 30;
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new ActivityError(400, 'INVALID_LIMIT', 'Limite non valido.');
      const events = read(query, limit + 1, current, asOf);
      pruneAt(current);
      const more = events.length > limit; events.splice(limit);
      const earliest = database.prepare<[number, number], { at: number | null }>('SELECT MIN(at) AS at FROM aca_activity WHERE at > ? AND at <= ?').get(current - ACTIVITY_RETENTION_MS, current);
      return { events, nextCursor: more ? events.at(-1)?.id ?? null : null,
        availableFrom: earliest?.at != null ? new Date(earliest.at).toISOString() : null, retentionDays: 7, quotaBytes: quota,
        serverNow: new Date(current).toISOString(), asOf: new Date(asOf).toISOString(), facets: facets.get(query, current) };
    },
    exportData(query = {}) {
      const current = now();
      const asOf = reference(query, current);
      const events = read(query, 5001, current, asOf);
      pruneAt(current);
      const truncated = events.length > 5000; events.splice(5000);
      return { schema: 1, generatedAt: new Date(current).toISOString(), asOf: new Date(asOf).toISOString(), retentionDays: 7, pseudonymized: true, truncated,
        events: pseudonymizeActivities(events), versions: { aca: process.env.ACASYSTEM_VERSION ?? null, ha: null, client: null } };
    },
    prune,
    publish() { for (const listener of listeners) listener(); },
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
  prune();
  return service;
};
