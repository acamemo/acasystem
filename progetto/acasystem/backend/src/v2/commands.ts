import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import type { CommandIntent, CommandState, HaUserCommand, ActivityActor } from '../../../contracts/activity.ts';
import { COMMAND_PREPARE_MS } from '../../../contracts/activity.ts';
import type { SqliteDatabase } from '../models/database.ts';
import { getHomeAssistantUrlCandidates } from '../middlewares/homeAssistantAuth.ts';
import { createSlidingWindowLimiter } from '../helpers/slidingWindow.ts';
import { createHaTransport, isHaError } from '../services/devices/haTransport.ts';
import type { HaWsCall } from '../config/homeAssistantApiCatalog.ts';
import { ActivityError } from './activity.ts';
import type { ActivityService, AuthorizeActivity } from './activity.ts';
import { activityFailure } from './activityRoutes.ts';

interface IntentRow {
  id: string; user_id: string; client_id: string; session_id: string; actor: string;
  state: CommandState; created_at: number; expires_at: number; fingerprint: Buffer;
  action: string; target_id: string | null; code: string | null;
  usage_lease_id: string | null;
}
export interface CommandsOptions {
  database: SqliteDatabase;
  activity: ActivityService;
  authorize: AuthorizeActivity;
  execute?: (accessToken: string, command: HaUserCommand) => Promise<unknown>;
  now?: () => number;
}
export type CommandsRouter = ReturnType<typeof Router> & { prune: () => void };
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const invalid = () => new ActivityError(400, 'INVALID_COMMAND', 'Comando non valido.');
export const parseUserCommand = (raw: unknown): HaUserCommand => {
  if (!isRecord(raw)) throw invalid();
  if (raw.kind === 'service') {
    if (typeof raw.domain !== 'string' || typeof raw.service !== 'string'
      || !/^[a-z][a-z0-9_]{0,63}$/.test(raw.domain) || !/^[a-z][a-z0-9_]{0,63}$/.test(raw.service)
      || (raw.data !== undefined && raw.data !== null && !isRecord(raw.data))) throw invalid();
    const data = raw.data === undefined || raw.data === null ? null : raw.data;
    if (Buffer.byteLength(JSON.stringify(data)) > 32 * 1024) throw invalid();
    return { kind: 'service', domain: raw.domain, service: raw.service, data };
  }
  if (raw.kind === 'home.location' && typeof raw.latitude === 'number' && typeof raw.longitude === 'number'
    && Number.isFinite(raw.latitude) && Number.isFinite(raw.longitude)
    && Math.abs(raw.latitude) <= 90 && Math.abs(raw.longitude) <= 180)
    return { kind: 'home.location', latitude: raw.latitude, longitude: raw.longitude };
  if (raw.kind === 'zigbee.backup') return { kind: 'zigbee.backup' };
  throw invalid();
};
const descriptor = (type: string): HaWsCall => ({
  id: `aca.user.${type}`, transport: 'ws', type, haClass: type === 'call_service' ? 'DOC' : 'INT', kind: type === 'call_service' ? 'public' : 'internal',
  permission: 'user', verifiedVersion: '2026.10', evidence: 'code', checks: ['commands.test'],
});
const sendToHomeAssistant = async (accessToken: string, command: HaUserCommand): Promise<unknown> => {
  const transport = createHaTransport({ baseUrls: getHomeAssistantUrlCandidates });
  const session = await transport.openSession(accessToken, 10_000);
  try {
    if (command.kind === 'home.location') return await session.send(descriptor('config/core/update'), {
      payload: { latitude: command.latitude, longitude: command.longitude }, timeoutMs: 10_000,
    });
    if (command.kind === 'zigbee.backup') return await session.send(descriptor('zha/network/backups/create'), { timeoutMs: 10_000 });
    const { target, ...rest } = command.data ?? {};
    const payload: Record<string, unknown> = { domain: command.domain, service: command.service };
    if (target) { payload.target = target; payload.service_data = rest; }
    else if (command.data?.entity_id && command.service === 'clean_area') {
      const { entity_id, ...data } = command.data;
      payload.target = { entity_id }; payload.service_data = data;
    } else payload.service_data = command.data;
    return await session.send(descriptor('call_service'), { payload, timeoutMs: 10_000 });
  } finally { session.close(); }
};
const actionOf = (command: HaUserCommand): string => command.kind === 'service'
  ? `ha.${command.domain}.${command.service}` : command.kind;
const targetOf = (command: HaUserCommand): string | null => {
  if (command.kind !== 'service') return null;
  const target = command.data?.target;
  const entity = isRecord(target) ? target.entity_id : command.data?.entity_id;
  const id = Array.isArray(entity) ? entity[0] : entity;
  return typeof id === 'string' && /^[a-z0-9_]+\.[A-Za-z0-9_]{1,120}$/.test(id) ? id : null;
};
const asIntent = (row: IntentRow): CommandIntent => ({ id: row.id, state: row.state,
  createdAt: new Date(row.created_at).toISOString(), expiresAt: new Date(row.expires_at).toISOString(), code: row.code });

export const createCommandsRouter = ({ database, activity, authorize, execute = sendToHomeAssistant, now = Date.now }: CommandsOptions): CommandsRouter => {
  database.exec(`CREATE TABLE IF NOT EXISTS aca_command_intents (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, client_id TEXT NOT NULL, session_id TEXT NOT NULL,
    actor TEXT NOT NULL, state TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
    fingerprint BLOB NOT NULL, action TEXT NOT NULL, target_id TEXT, code TEXT, usage_lease_id TEXT
  ); CREATE INDEX IF NOT EXISTS aca_command_created ON aca_command_intents(created_at);`);
  if (!(database.prepare('PRAGMA table_info(aca_command_intents)').all() as { name: string }[]).some(column => column.name === 'usage_lease_id')) database.exec('ALTER TABLE aca_command_intents ADD COLUMN usage_lease_id TEXT');
  const key = randomBytes(32);
  const fingerprint = (command: HaUserCommand): Buffer => createHmac('sha256', key).update(JSON.stringify(command)).digest();
  const find = database.prepare<[string], IntentRow>('SELECT * FROM aca_command_intents WHERE id=?');
  const setState = database.prepare('UPDATE aca_command_intents SET state=?,code=? WHERE id=?');
  const publishRecord = (row: IntentRow, state: 'pending' | 'accepted' | 'error' | 'unknown', code?: string) => {
    activity.record({ kind: row.action.startsWith('ha.') ? 'command' : 'configuration',
      actor: JSON.parse(row.actor) as ActivityActor, action: row.action, outcome: state, operationId: row.id,
      ...(row.target_id ? { targetId: row.target_id } : {}), ...(code ? { code } : {}) });
  };
  // Nessun intent preparato prima di questo processo può diventare un nuovo invio.
  database.transaction(() => {
    for (const row of database.prepare<[], IntentRow>("SELECT * FROM aca_command_intents WHERE state='pending'").all()) {
      setState.run('unknown', 'PROCESS_INTERRUPTED', row.id); publishRecord(row, 'unknown', 'PROCESS_INTERRUPTED');
    }
    database.prepare("UPDATE aca_command_intents SET state='error',code='INTENT_EXPIRED' WHERE state='prepared'").run();
  })();
  const prune = () => {
    database.prepare("UPDATE aca_command_intents SET state='error',code='INTENT_EXPIRED' WHERE state='prepared' AND expires_at<=?").run(now());
    database.prepare("DELETE FROM aca_command_intents WHERE created_at < ? AND state != 'pending'").run(now() - 24 * 60 * 60 * 1000);
    // Un ID eliminato resta inutilizzabile: execute non crea mai una riga.
    database.prepare(`DELETE FROM aca_command_intents WHERE id IN (
      SELECT id FROM aca_command_intents WHERE state NOT IN ('pending','prepared') ORDER BY created_at DESC LIMIT -1 OFFSET 20000
    )`).run();
    activity.prune();
  };
  prune();
  const own = (id: string, actor: ActivityActor): IntentRow => {
    const row = find.get(id);
    if (!row || row.created_at <= now() - 24 * 60 * 60 * 1000 || row.user_id !== actor.userId || row.client_id !== actor.clientId || row.session_id !== actor.sessionId)
      throw new ActivityError(410, 'INTENT_UNAVAILABLE', 'Questo comando non è più disponibile. Non è stato reinviato.');
    return row;
  };
  const expire = (row: IntentRow): IntentRow => {
    if (row.state === 'prepared' && row.expires_at <= now()) {
      setState.run('error', 'INTENT_EXPIRED', row.id);
      return { ...row, state: 'error', code: 'INTENT_EXPIRED' };
    }
    return row;
  };
  const limiter = createSlidingWindowLimiter(600, 60_000, now);
  const router = Router() as CommandsRouter;
  router.prune = prune;
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  router.post('/prepare', async (req, res) => {
    try {
      const { actor, usageLeaseId } = await authorize(req);
      if (!actor.clientId || !actor.sessionId) throw new ActivityError(401, 'CLIENT_REQUIRED', 'Collega prima questo dispositivo.');
      if (!limiter.take(actor.clientId).allowed) throw new ActivityError(429, 'COMMAND_RATE_LIMIT', 'Attendi prima di inviare altri comandi.');
      prune();
      const active = database.prepare<[], { count: number }>("SELECT COUNT(*) AS count FROM aca_command_intents WHERE state IN ('pending','prepared')").get()?.count ?? 0;
      if (active >= 10000) throw new ActivityError(429, 'COMMAND_CAPACITY', 'Attendi prima di inviare altri comandi.');
      const command = parseUserCommand(req.body?.command);
      const id = randomUUID(); const at = now();
      database.prepare(`INSERT INTO aca_command_intents(id,user_id,client_id,session_id,actor,state,created_at,expires_at,fingerprint,action,target_id,usage_lease_id)
        VALUES (?,?,?,?,?,'prepared',?,?,?,?,?,?)`).run(id, actor.userId, actor.clientId, actor.sessionId, JSON.stringify(actor),
        at, at + COMMAND_PREPARE_MS, fingerprint(command), actionOf(command), targetOf(command), usageLeaseId ?? null);
      res.status(201).json(asIntent(find.get(id)!));
    } catch (error) { activityFailure(res, error); }
  });
  router.get('/:id', async (req, res) => {
    try { const { actor } = await authorize(req); res.json(asIntent(expire(own(String(req.params.id), actor)))); }
    catch (error) { activityFailure(res, error); }
  });
  router.post('/:id/execute', async (req, res) => {
    try {
      const { actor, accessToken, usageLeaseId } = await authorize(req);
      if (!accessToken) throw new ActivityError(401, 'USER_TOKEN_REQUIRED', 'Accedi con il tuo account prima di inviare comandi.');
      const command = parseUserCommand(req.body?.command);
      const row = expire(own(String(req.params.id), actor));
      if (row.state !== 'prepared') { res.json(asIntent(row)); return; }
      if (row.usage_lease_id && row.usage_lease_id !== usageLeaseId) throw new ActivityError(409, 'PROFILE_USAGE_EXPIRED', 'Il comando appartiene a una sessione del profilo terminata. Non è stato inviato.');
      if (!timingSafeEqual(row.fingerprint, fingerprint(command))) throw new ActivityError(409, 'INTENT_MISMATCH', 'Il comando preparato è diverso.');
      const reserved = database.transaction(() => {
        const result = database.prepare("UPDATE aca_command_intents SET state='pending' WHERE id=? AND state='prepared' AND expires_at>?").run(row.id, now());
        if (!result.changes) return false;
        publishRecord(row, 'pending'); return true;
      })();
      if (!reserved) { res.json(asIntent(find.get(row.id)!)); return; }
      activity.publish();
      let state: 'accepted' | 'error' | 'unknown' = 'accepted'; let code: string | undefined;
      try { await execute(accessToken, command); }
      catch (error) {
        const rejected = isHaError(error) && ['unauthorized', 'forbidden', 'not_found', 'bad_request', 'ha_error'].includes(error.kind);
        state = rejected ? 'error' : 'unknown';
        code = rejected ? 'HA_REJECTED' : 'RESULT_UNKNOWN';
      }
      database.transaction(() => { setState.run(state, code ?? null, row.id); publishRecord(row, state, code); })();
      activity.publish(); res.json(asIntent(find.get(row.id)!));
    } catch (error) { activityFailure(res, error); }
  });
  return router;
};
