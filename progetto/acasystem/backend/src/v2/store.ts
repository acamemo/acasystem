import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { ClientRecord, Configuration, EditLease, EditTarget, LiveProfile, MigrationSource, ProfileMigration, ProfileOperation, CollaborationEvent, ProfileUsageLease } from '../../../contracts/collaboration.ts';
import { EDIT_LEASE_MS, PROFILE_USAGE_MS, PROFILE_USAGE_HANDOFF_MS } from '../../../contracts/collaboration.ts';
import { applyChanges, resourcesForChanges, resourcesForTarget, widgetExists } from '../../../contracts/profileResources.ts';
import { dataCrypto, type DataCrypto } from '../helpers/dataCrypto.ts';
import type { SqliteDatabase } from '../models/database.ts';

export class CollaborationError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;
  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) { super(message); this.status = status; this.code = code; this.details = details; }
}
export interface V2Actor { userId: string; userName: string; clientId: string; clientName: string; sessionId: string; userColor?: string; clientPlatform?: ClientRecord['platform'] }
export interface V2Identity { userId: string; userName: string; refreshTokenId: string; tokenType: string }
export interface RecordActivity { (input: { actor: V2Actor; kind: 'configuration'; action: string; outcome: 'accepted' | 'error'; profileId?: string; widgetId?: string; revision?: number; operationId?: string; code?: string }): unknown }
interface ProfileRow { id: string; user_id: string; name: string; data: string; data_enc: string | null; revision: number; resources: string; migration: string | null; created_at: string; updated_at: string }
interface ClientRow { id: string; user_id: string; label: string; platform: ClientRecord['platform']; active_profile_id: string | null; preferences: string; created_at: string; last_seen_at: string; revoked_at: string | null; revocation_pending: number }
interface SourceRow { id: string; kind: MigrationSource['kind']; name: string; profile_id: string | null; device_label: string | null; data: string; data_enc: string | null }
interface SessionRow { user_id: string; client_id: string; refresh_id: string; revoked: number }
interface OwnedProfileUsage extends ProfileUsageLease {
  userId: string; sessionId: string;
  handoffUntil?: number; handoffTimer?: ReturnType<typeof setTimeout>;
  presenceObserved?: boolean; presenceMissingUntil?: number; presenceTimer?: ReturnType<typeof setTimeout>;
}
export interface UsageProof { leaseId?: unknown; usageSessionId?: unknown }
const PROFILE_IN_USE_MESSAGE = 'questo profilo è in uso su un altro dispositivo chiudi le altre sessioni per usare questo dispositivo';
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const label = (v: unknown): string => typeof v === 'string' ? v.trim().slice(0, 80) : '';
const requiredLabel = (v: unknown): string => {
  if (typeof v === 'string' && v.trim().length > 80) throw new CollaborationError(400, 'INVALID_NAME', 'Usa un nome di massimo 80 caratteri.');
  const result = label(v);
  if (!result || [...result].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) throw new CollaborationError(400, 'INVALID_NAME', 'Inserisci un nome valido.');
  return result;
};
const identifier = (v: unknown): string => {
  if (typeof v !== 'string' || !/^[A-Za-z0-9_.:-]{1,160}$/.test(v)) throw new CollaborationError(400, 'INVALID_ID', 'Identificativo non valido.');
  return v;
};
const sessionKey = (id: string): string => createHash('sha256').update(id).digest('hex');
const decode = <T>(text: string): T => JSON.parse(text) as T;
const canonical = (value: unknown): string => JSON.stringify(value, (_key, item: unknown) => object(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item);
const validConfiguration = (value: unknown): Configuration => {
  if (!object(value) || !object(value.snapshot) || !object(value.snapshot.layout) || (value.appearance !== undefined && !object(value.appearance))) throw new CollaborationError(400, 'INVALID_CONFIGURATION', 'Configurazione del profilo non valida.');
  try { return applyChanges(value, []); } catch { throw new CollaborationError(400, 'INVALID_CONFIGURATION', 'Configurazione del profilo non valida.'); }
};

function initialize(database: SqliteDatabase) {
  const existed = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='aca_v2_profiles'").get();
  const accountProfilesExisted = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='aca_v2_account_profiles'").get();
  if ((!existed || !accountProfilesExisted) && database.name && database.name !== ':memory:' && existsSync(database.name)) {
    const dir = join(dirname(database.name), 'checkpoints');
    mkdirSync(dir, { recursive: true });
    database.prepare('VACUUM INTO ?').run(join(dir, `aca-before-v2-${Date.now()}-${randomUUID()}.db`));
  }
  database.exec(`
    CREATE TABLE IF NOT EXISTS aca_pairing_house(id INTEGER PRIMARY KEY CHECK(id=1),house_id TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS aca_v2_users(user_id TEXT PRIMARY KEY,color TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS aca_v2_migrations(user_id TEXT PRIMARY KEY,activated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS aca_v2_clients(id TEXT NOT NULL,user_id TEXT NOT NULL,label TEXT NOT NULL,platform TEXT NOT NULL,active_profile_id TEXT,preferences TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,last_seen_at TEXT NOT NULL,revoked_at TEXT,revocation_pending INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,id));
    CREATE TABLE IF NOT EXISTS aca_v2_account_profiles(user_id TEXT PRIMARY KEY,active_profile_id TEXT,selection_required INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS aca_v2_sessions(user_id TEXT NOT NULL,client_id TEXT NOT NULL,refresh_id TEXT NOT NULL,revoked INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,refresh_id));
    CREATE TABLE IF NOT EXISTS aca_v2_access_tokens(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,refresh_id TEXT NOT NULL,seen_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS aca_v2_profiles(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,name TEXT NOT NULL,data TEXT NOT NULL,data_enc TEXT,revision INTEGER NOT NULL,resources TEXT NOT NULL,migration TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS aca_v2_profiles_user ON aca_v2_profiles(user_id);
    CREATE TABLE IF NOT EXISTS aca_v2_sources(user_id TEXT NOT NULL,id TEXT NOT NULL,kind TEXT NOT NULL,name TEXT NOT NULL,profile_id TEXT,device_label TEXT,data TEXT NOT NULL,data_enc TEXT,original_data TEXT NOT NULL,original_enc TEXT,PRIMARY KEY(user_id,id));
    CREATE TABLE IF NOT EXISTS aca_v2_operations(user_id TEXT NOT NULL,profile_id TEXT NOT NULL,operation_id TEXT NOT NULL,fingerprint TEXT NOT NULL,result TEXT NOT NULL,result_enc TEXT,at INTEGER NOT NULL,PRIMARY KEY(user_id,profile_id,operation_id));
  `);
  database.prepare('INSERT OR IGNORE INTO aca_pairing_house(id,house_id) VALUES(1,?)').run(randomUUID());
  database.prepare('INSERT OR IGNORE INTO aca_v2_migrations(user_id,activated_at) SELECT user_id,MIN(created_at) FROM aca_v2_profiles GROUP BY user_id').run();
}

export function createCollaborationStore(database: SqliteDatabase, { crypto = dataCrypto, now = Date.now, record = () => undefined }: { crypto?: DataCrypto; now?: () => number; record?: RecordActivity } = {}) {
  initialize(database);
  const houseId = (database.prepare('SELECT house_id FROM aca_pairing_house WHERE id=1').get() as { house_id: string }).house_id;
  const listeners = new Set<{ userId: string; clientId: string; send: (event: CollaborationEvent) => void }>();
  const leases = new Map<string, EditLease>();
  const usages = new Map<string, OwnedProfileUsage>();
  const usageConnections = new Map<string, Set<symbol>>();
  const iso = () => new Date(now()).toISOString();
  const userColor = (userId: string): string => {
    const stored = database.prepare('SELECT color FROM aca_v2_users WHERE user_id=?').get(userId) as { color: string } | undefined;
    const palette = ['#6b8afd', '#b27ad7', '#4caa91', '#ce8a47', '#c96c86', '#668fbd'];
    return stored?.color ?? palette[Number.parseInt(createHash('sha256').update(userId).digest('hex').slice(0, 8), 16) % palette.length]!;
  };
  const setUserColor = (userId: string, color: unknown, overwrite = true) => {
    if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) throw new CollaborationError(400, 'INVALID_COLOR', 'Scegli un colore valido.');
    database.prepare(overwrite ? 'INSERT INTO aca_v2_users(user_id,color) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET color=excluded.color' : 'INSERT OR IGNORE INTO aca_v2_users(user_id,color) VALUES(?,?)').run(userId, color.toLowerCase());
  };
  const publish = (userId: string | null, event: CollaborationEvent) => {
    for (const listener of listeners) if (userId === null || listener.userId === userId) listener.send(event);
  };
  const encode = (value: unknown) => {
    const text = JSON.stringify(value);
    const encrypted = crypto.encryptDataText(text);
    if (encrypted === null && crypto.isEncryptionWriteRequired()) throw new CollaborationError(503, 'ENCRYPTION_UNAVAILABLE', 'La configurazione non può essere salvata ora.');
    return { data: crypto.shouldPersistPlaintextData() ? text : crypto.getEncryptedOnlyPlaintextStub(), data_enc: encrypted };
  };
  const readData = <T>(row: { data: string; data_enc: string | null }): T => {
    const text = crypto.resolveStoredDataText({ plainText: row.data, encryptedText: row.data_enc, context: 'aca-v2' });
    if (!text) throw new CollaborationError(503, 'CONFIGURATION_UNREADABLE', 'La configurazione non è leggibile: gli originali sono conservati.');
    try { return decode<T>(text); } catch { throw new CollaborationError(503, 'CONFIGURATION_UNREADABLE', 'La configurazione non è leggibile: gli originali sono conservati.'); }
  };
  const toClient = (r: ClientRow): ClientRecord => ({ id: r.id, userId: r.user_id, label: r.label, platform: r.platform, activeProfileId: r.active_profile_id, preferences: decode(r.preferences), createdAt: r.created_at, lastSeenAt: r.last_seen_at, revokedAt: r.revoked_at, revocationPending: Boolean(r.revocation_pending) });
  const toProfile = (r: ProfileRow): LiveProfile => ({ id: r.id, userId: r.user_id, name: r.name, configuration: readData(r), revision: r.revision, resourceRevisions: decode(r.resources), migration: r.migration ? decode(r.migration) : null, createdAt: r.created_at, updatedAt: r.updated_at });
  const client = (userId: string, clientId: string) => {
    const row = database.prepare('SELECT * FROM aca_v2_clients WHERE user_id=? AND id=?').get(userId, clientId) as ClientRow | undefined;
    return row ? toClient(row) : null;
  };
  const clients = (userId: string) => (database.prepare('SELECT * FROM aca_v2_clients WHERE user_id=? ORDER BY created_at,id').all(userId) as ClientRow[]).map(toClient);
  const profiles = (userId: string) => (database.prepare('SELECT * FROM aca_v2_profiles WHERE user_id=? ORDER BY updated_at DESC,id').all(userId) as ProfileRow[]).map(toProfile);
  /** La scelta dell'interfaccia appartiene all'account; gli originali divergenti restano recuperabili. */
  const accountSelection = (userId: string): { activeProfileId: string | null; selectionRequired: boolean } => {
    let clientsChanged = false;
    const selection = database.transaction(() => {
      const saved = database.prepare('SELECT active_profile_id,selection_required FROM aca_v2_account_profiles WHERE user_id=?').get(userId) as { active_profile_id: string | null; selection_required: number } | undefined;
      const available = database.prepare('SELECT id FROM aca_v2_profiles WHERE user_id=?').all(userId) as { id: string }[];
      let active = saved?.active_profile_id ?? null;
      let required = Boolean(saved?.selection_required);
      if (saved) {
        if (active && !available.some(item => item.id === active)) {
          active = null;
          required = available.length > 0;
        }
        if (!active && !required && available.length === 1) active = available[0]!.id;
        else if (!active && !required && available.length > 1) required = true;
      } else {
        const previous = database.prepare('SELECT DISTINCT c.active_profile_id AS id FROM aca_v2_clients c JOIN aca_v2_profiles p ON p.id=c.active_profile_id AND p.user_id=c.user_id WHERE c.user_id=? AND c.revoked_at IS NULL').all(userId) as { id: string }[];
        active = previous.length === 1 ? previous[0]!.id : previous.length === 0 && available.length === 1 ? available[0]!.id : null;
        required = !active && (previous.length > 1 || available.length > 1);
      }
      if (!available.length) { active = null; required = false; }
      if ((!saved && (active || required)) || (saved && (saved.active_profile_id !== active || Boolean(saved.selection_required) !== required))) database.prepare('INSERT INTO aca_v2_account_profiles(user_id,active_profile_id,selection_required) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET active_profile_id=excluded.active_profile_id,selection_required=excluded.selection_required').run(userId, active, required ? 1 : 0);
      if (active) clientsChanged = database.prepare('UPDATE aca_v2_clients SET active_profile_id=? WHERE user_id=? AND revoked_at IS NULL AND (active_profile_id IS NULL OR active_profile_id<>?)').run(active, userId, active).changes > 0;
      return { activeProfileId: active, selectionRequired: required };
    })();
    if (clientsChanged) publish(userId, { type: 'client' });
    return selection;
  };
  const profile = (userId: string, id: string): LiveProfile => {
    const row = database.prepare('SELECT * FROM aca_v2_profiles WHERE user_id=? AND id=?').get(userId, id) as ProfileRow | undefined;
    if (!row) throw new CollaborationError(404, 'PROFILE_NOT_FOUND', 'Il profilo non è disponibile.');
    return toProfile(row);
  };
  const publicUsage = (usage: OwnedProfileUsage): ProfileUsageLease => ({ id: usage.id, profileId: usage.profileId, usageSessionId: usage.usageSessionId, clientId: usage.clientId, expiresAt: usage.expiresAt, serverTime: now() });
  const releaseUsageEditors = (usage: OwnedProfileUsage) => {
    let removedEditors = false;
    for (const [id, edit] of leases) if (edit.userId === usage.userId && edit.profileId === usage.profileId && edit.clientId === usage.clientId) { leases.delete(id); removedEditors = true; }
    if (removedEditors) publish(usage.userId, { type: 'lease', profileId: usage.profileId });
  };
  const dropUsage = (usage: OwnedProfileUsage) => {
    if (usages.get(usage.id) !== usage) return;
    usages.delete(usage.id);
    if (usage.handoffTimer) clearTimeout(usage.handoffTimer);
    if (usage.presenceTimer) clearTimeout(usage.presenceTimer);
    releaseUsageEditors(usage);
    publish(usage.userId, { type: 'usage', profileId: usage.profileId });
  };
  const pruneUsages = () => { for (const usage of usages.values()) if ((usage.handoffUntil ?? Math.min(usage.expiresAt, usage.presenceMissingUntil ?? Infinity)) <= now()) dropUsage(usage); };
  const sameUsageOwner = (usage: OwnedProfileUsage, who: V2Actor, usageSessionId: unknown) => usage.userId === who.userId && usage.clientId === who.clientId && usage.sessionId === who.sessionId && usage.usageSessionId === usageSessionId;
  const usageConnectionKey = (who: Pick<V2Actor, 'userId' | 'clientId' | 'sessionId'>, usageSessionId: string) => JSON.stringify([who.userId, who.clientId, who.sessionId, usageSessionId]);
  const connectionCount = (usage: OwnedProfileUsage) => usageConnections.get(usageConnectionKey(usage, usage.usageSessionId))?.size ?? 0;
  const armPresenceDeadline = (usage: OwnedProfileUsage) => {
    if (usages.get(usage.id) !== usage || usage.handoffUntil !== undefined || !usage.presenceObserved || connectionCount(usage)) return;
    usage.presenceMissingUntil ??= now() + PROFILE_USAGE_HANDOFF_MS;
    if (usage.presenceTimer) clearTimeout(usage.presenceTimer);
    const until = usage.presenceMissingUntil;
    usage.presenceTimer = setTimeout(() => {
      if (usages.get(usage.id) === usage && usage.handoffUntil === undefined && usage.presenceMissingUntil === until && !connectionCount(usage)) dropUsage(usage);
    }, Math.max(0, until - now()));
    usage.presenceTimer.unref();
  };
  /** La presenza appartiene all'istanza autenticata, anche attraverso una nuova concessione. */
  const connectUsage = (who: V2Actor, usageSession: unknown): (() => void) => {
    if (usageSession === undefined) return () => undefined;
    const usageSessionId = identifier(usageSession);
    pruneUsages();
    const key = usageConnectionKey(who, usageSessionId);
    const connections = usageConnections.get(key) ?? new Set<symbol>();
    const connection = Symbol();
    connections.add(connection);
    usageConnections.set(key, connections);
    for (const usage of usages.values()) if (sameUsageOwner(usage, who, usageSessionId)) {
      usage.presenceObserved = true;
      usage.presenceMissingUntil = undefined;
      if (usage.presenceTimer) clearTimeout(usage.presenceTimer);
      usage.presenceTimer = undefined;
    }
    return () => {
      if (!connections.delete(connection) || connections.size || usageConnections.get(key) !== connections) return;
      usageConnections.delete(key);
      for (const usage of usages.values()) if (sameUsageOwner(usage, who, usageSessionId)) armPresenceDeadline(usage);
    };
  };
  const inUse = (): never => { throw new CollaborationError(423, 'PROFILE_IN_USE', PROFILE_IN_USE_MESSAGE); };
  const usageExpired = (): never => { throw new CollaborationError(409, 'PROFILE_USAGE_EXPIRED', 'La sessione di questo profilo è scaduta. Ricollega questo dispositivo.'); };
  const acquireUsage = (who: V2Actor, profileId: string, usageSession: unknown): ProfileUsageLease => {
    profile(who.userId, profileId);
    const usageSessionId = identifier(usageSession);
    pruneUsages();
    const previous = [...usages.values()].filter(item => item.userId === who.userId);
    if (previous.some(item => !sameUsageOwner(item, who, usageSessionId) && !(item.handoffUntil !== undefined && item.userId === who.userId && item.clientId === who.clientId && item.sessionId === who.sessionId))) inUse();
    const connected = (usageConnections.get(usageConnectionKey(who, usageSessionId))?.size ?? 0) > 0;
    const previousInstance = previous.find(item => sameUsageOwner(item, who, usageSessionId));
    // Ogni concessione ha un fencing ID nuovo: un pagehide tardivo non libera il successore.
    const at = now();
    const granted: OwnedProfileUsage = { id: randomUUID(), profileId, usageSessionId, clientId: who.clientId, userId: who.userId, sessionId: who.sessionId, expiresAt: at + PROFILE_USAGE_MS, serverTime: at, presenceObserved: connected || previousInstance?.presenceObserved, ...(!connected && previousInstance?.presenceMissingUntil !== undefined ? { presenceMissingUntil: previousInstance.presenceMissingUntil } : {}) };
    for (const old of previous) dropUsage(old);
    usages.set(granted.id, granted);
    armPresenceDeadline(granted);
    publish(who.userId, { type: 'usage', profileId });
    return publicUsage(granted);
  };
  const ownedUsage = (who: V2Actor, id: string, usageSessionId: unknown): OwnedProfileUsage => {
    pruneUsages();
    const usage = usages.get(id);
    if (!usage) return usageExpired();
    if (!sameUsageOwner(usage, who, usageSessionId)) inUse();
    if (usage.handoffUntil !== undefined) return usageExpired();
    return usage;
  };
  const renewUsage = (who: V2Actor, id: string, usageSessionId: unknown): ProfileUsageLease => {
    const usage = ownedUsage(who, id, usageSessionId);
    usage.expiresAt = now() + PROFILE_USAGE_MS;
    return publicUsage(usage);
  };
  const releaseUsage = (who: V2Actor, id: string, usageSessionId: unknown, options: { handoff?: boolean } = {}): void => {
    pruneUsages();
    const usage = usages.get(id);
    if (!usage) return;
    if (!sameUsageOwner(usage, who, usageSessionId)) inUse();
    // Un cleanup successivo dello stesso documento non annulla né prolunga il pagehide.
    if (usage.handoffUntil !== undefined) return;
    if (options.handoff) {
      // Un EOF già rilevato conserva il suo termine: pagehide non riavvia l'attesa.
      const until = Math.min(now() + PROFILE_USAGE_HANDOFF_MS, usage.presenceMissingUntil ?? Infinity);
      if (usage.presenceTimer) clearTimeout(usage.presenceTimer);
      usage.presenceTimer = undefined;
      usage.presenceMissingUntil = undefined;
      usage.handoffUntil = until;
      releaseUsageEditors(usage);
      usage.handoffTimer = setTimeout(() => {
        if (usages.get(id) === usage && usage.handoffUntil === until) dropUsage(usage);
      }, Math.max(0, until - now()));
      usage.handoffTimer.unref();
      publish(usage.userId, { type: 'usage', profileId: usage.profileId });
      return;
    }
    dropUsage(usage);
  };
  const requireUsage = (who: V2Actor, proof: UsageProof, profileId?: string): ProfileUsageLease => {
    pruneUsages();
    const occupant = [...usages.values()].find(item => item.userId === who.userId);
    if (occupant && !sameUsageOwner(occupant, who, proof.usageSessionId)) inUse();
    if (typeof proof.leaseId !== 'string' || typeof proof.usageSessionId !== 'string') throw new CollaborationError(409, 'PROFILE_USAGE_REQUIRED', 'Collega questo dispositivo al profilo prima di continuare.');
    const usage = ownedUsage(who, proof.leaseId, proof.usageSessionId);
    const selected = profileId ?? accountSelection(who.userId).activeProfileId;
    if (!selected || usage.profileId !== selected) throw new CollaborationError(409, 'PROFILE_USAGE_REQUIRED', 'Collega questo dispositivo al profilo prima di continuare.');
    return publicUsage(usage);
  };
  const sessionClient = (identity: V2Identity): ClientRecord | null => {
    const row = database.prepare('SELECT * FROM aca_v2_sessions WHERE user_id=? AND refresh_id=?').get(identity.userId, identity.refreshTokenId) as SessionRow | undefined;
    if (!row) return null;
    if (row.revoked) throw new CollaborationError(401, 'CLIENT_REVOKED', 'L’accesso di questo dispositivo è stato revocato.');
    const current = client(identity.userId, row.client_id);
    if (!current || current.revokedAt) throw new CollaborationError(401, 'CLIENT_REVOKED', 'L’accesso di questo dispositivo è stato revocato.');
    return current;
  };
  const assertAccessTokenActive = (accessToken: string) => {
    const hash = createHash('sha256').update(accessToken).digest('hex');
    const row = database.prepare('SELECT s.revoked,c.revoked_at FROM aca_v2_access_tokens t JOIN aca_v2_sessions s ON s.user_id=t.user_id AND s.refresh_id=t.refresh_id JOIN aca_v2_clients c ON c.user_id=s.user_id AND c.id=s.client_id WHERE t.token_hash=?').get(hash) as { revoked: number; revoked_at: string | null } | undefined;
    if (row && (row.revoked || row.revoked_at)) throw new CollaborationError(401, 'CLIENT_REVOKED', 'L’accesso di questo dispositivo è stato revocato.');
  };
  const noteAccessToken = (identity: V2Identity, accessToken: string) => {
    database.prepare('INSERT INTO aca_v2_access_tokens(token_hash,user_id,refresh_id,seen_at) VALUES(?,?,?,?) ON CONFLICT(token_hash) DO UPDATE SET seen_at=excluded.seen_at').run(createHash('sha256').update(accessToken).digest('hex'), identity.userId, identity.refreshTokenId, now());
    database.prepare('DELETE FROM aca_v2_access_tokens WHERE seen_at<?').run(now() - 7 * 24 * 60 * 60_000);
  };
  const actor = (identity: V2Identity): V2Actor => {
    const current = sessionClient(identity);
    if (!current) throw new CollaborationError(409, 'CLIENT_REQUIRED', 'Dai un nome a questo dispositivo per continuare.');
    return { userId: identity.userId, userName: identity.userName, clientId: current.id, clientName: current.label, sessionId: sessionKey(identity.refreshTokenId), userColor: userColor(identity.userId), clientPlatform: current.platform };
  };
  const registerClient = (identity: V2Identity, body: { clientId?: unknown; label?: unknown; platform?: unknown }) => {
    if (identity.tokenType !== 'normal') throw new CollaborationError(409, 'SESSION_LOGIN_REQUIRED', 'Accedi con il tuo account per collegare questo dispositivo.');
    const bound = sessionClient(identity);
    if (bound) return bound;
    const id = identifier(body.clientId);
    const name = requiredLabel(body.label);
    const platform = body.platform === 'windows' || body.platform === 'android' ? body.platform : 'web';
    const selection = accountSelection(identity.userId);
    database.transaction(() => {
      const existing = client(identity.userId, id);
      const at = iso();
      if (existing) database.prepare('UPDATE aca_v2_clients SET label=?,platform=?,last_seen_at=?,active_profile_id=?,revoked_at=NULL,revocation_pending=0 WHERE user_id=? AND id=?').run(name, platform, at, selection.activeProfileId ?? existing.activeProfileId, identity.userId, id);
      else database.prepare('INSERT INTO aca_v2_clients(id,user_id,label,platform,active_profile_id,created_at,last_seen_at) VALUES(?,?,?,?,?,?,?)').run(id, identity.userId, name, platform, selection.activeProfileId, at, at);
      database.prepare('INSERT INTO aca_v2_sessions(user_id,client_id,refresh_id) VALUES(?,?,?)').run(identity.userId, id, identity.refreshTokenId);
      record({ actor: actor(identity), kind: 'configuration', action: 'client.connected', outcome: 'accepted' });
    })();
    publish(identity.userId, { type: 'client' }); publish(null, { type: 'activity' });
    return client(identity.userId, id)!;
  };
  const updateClient = (who: V2Actor, id: string, patch: Record<string, unknown>) => {
    const found = client(who.userId, id);
    if (!found) throw new CollaborationError(404, 'CLIENT_NOT_FOUND', 'Dispositivo non disponibile.');
    const name = patch.label === undefined ? found.label : requiredLabel(patch.label);
    const active = patch.activeProfileId === undefined ? found.activeProfileId : patch.activeProfileId === null ? null : identifier(patch.activeProfileId);
    if (active) profile(who.userId, active);
    const preferences = patch.preferences === undefined ? found.preferences : patch.preferences;
    if (!object(preferences) || JSON.stringify(preferences).length > 32_768 || /"[^"\n]*(?:token|password|secret|credential)[^"\n]*"\s*:/i.test(JSON.stringify(preferences))) throw new CollaborationError(400, 'INVALID_PREFERENCES', 'Preferenze del dispositivo non valide.');
    database.transaction(() => {
      database.prepare('UPDATE aca_v2_clients SET label=?,active_profile_id=?,preferences=?,last_seen_at=? WHERE user_id=? AND id=?').run(name, active, JSON.stringify(preferences), iso(), who.userId, id);
      if (patch.activeProfileId !== undefined) {
        const previous = database.prepare('SELECT active_profile_id,selection_required FROM aca_v2_account_profiles WHERE user_id=?').get(who.userId) as { active_profile_id: string | null; selection_required: number } | undefined;
        database.prepare('INSERT INTO aca_v2_account_profiles(user_id,active_profile_id,selection_required) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET active_profile_id=excluded.active_profile_id,selection_required=excluded.selection_required').run(who.userId, active, !active && database.prepare('SELECT 1 FROM aca_v2_profiles WHERE user_id=? LIMIT 1').get(who.userId) ? 1 : 0);
        database.prepare('UPDATE aca_v2_clients SET active_profile_id=? WHERE user_id=? AND revoked_at IS NULL').run(active, who.userId);
        if (previous?.active_profile_id !== active || previous?.selection_required) record({ actor: who, kind: 'configuration', action: 'profile.selected', outcome: 'accepted', ...(active ? { profileId: active } : {}) });
      }
      if (name !== found.label) record({ actor: who, kind: 'configuration', action: 'client.renamed', outcome: 'accepted' });
    })();
    publish(who.userId, { type: 'client' }); if (name !== found.label || patch.activeProfileId !== undefined) publish(null, { type: 'activity' });
    return client(who.userId, id)!;
  };
  const pruneLeases = () => {
    for (const [id, lease] of leases) if (lease.expiresAt <= now()) { leases.delete(id); publish(lease.userId, { type: 'lease', profileId: lease.profileId }); }
  };
  const listLeases = (userId: string, profileId: string) => { profile(userId, profileId); pruneLeases(); return [...leases.values()].filter(l => l.userId === userId && l.profileId === profileId); };
  const conflict = (p: LiveProfile, code = 'EDIT_CONFLICT'): never => { throw new CollaborationError(409, code, 'La configurazione è cambiata. La tua bozza è conservata.', { profile: p, leases: listLeases(p.userId, p.id) }); };
  const overlap = (a: string[], b: string[]) => a.includes('profile') || b.includes('profile') || a.some(v => b.includes(v));
  const acquire = (who: V2Actor, profileId: string, editSessionId: string, target: EditTarget, proposedChanges: ProfileOperation['changes'] = []): EditLease => {
    const p = profile(who.userId, profileId);
    identifier(editSessionId);
    if (target.kind !== 'structure' && target.kind !== 'widget') throw new CollaborationError(400, 'INVALID_TARGET', 'Seleziona un elemento da modificare.');
    if (target.kind === 'widget' && (!target.widgetId || !widgetExists(p.configuration, target))) throw new CollaborationError(409, 'WIDGET_REMOVED', 'Il widget non è più presente. La tua bozza è conservata.');
    if (!Array.isArray(proposedChanges) || proposedChanges.length > 2000) throw new CollaborationError(400, 'INVALID_OPERATION', 'Modifica non valida.');
    let proposed = p.configuration;
    try { proposed = applyChanges(p.configuration, proposedChanges); } catch { throw new CollaborationError(400, 'INVALID_OPERATION', 'Modifica non valida.'); }
    const resources = [...new Set([...resourcesForTarget(p.configuration, target), ...resourcesForTarget(proposed, target), ...resourcesForChanges(p.configuration, proposed, proposedChanges)])];
    if (target.kind === 'widget' && resources.includes('profile')) conflict(p, 'STRUCTURE_EDIT_REQUIRED');
    const current = listLeases(who.userId, profileId);
    if (current.some(l => l.editSessionId !== editSessionId && overlap(l.resources, resources))) conflict(p, 'EDIT_BUSY');
    const existing = current.find(l => l.editSessionId === editSessionId);
    const lease: EditLease = { id: existing?.id ?? randomUUID(), profileId, editSessionId, clientId: who.clientId, userId: who.userId, userName: who.userName, clientName: who.clientName, resources: [...new Set([...(existing?.resources ?? []), ...resources])], expiresAt: now() + EDIT_LEASE_MS };
    if (existing && existing.clientId !== who.clientId) conflict(p, 'EDIT_BUSY');
    leases.set(lease.id, lease); publish(who.userId, { type: 'lease', profileId }); return lease;
  };
  const ownedLease = (who: V2Actor, leaseId: string, editSessionId: string) => {
    pruneLeases(); const lease = leases.get(leaseId);
    if (!lease || lease.userId !== who.userId || lease.clientId !== who.clientId || lease.editSessionId !== editSessionId) throw new CollaborationError(409, 'EDIT_EXPIRED', 'Il permesso di modifica è scaduto. La tua bozza è conservata.');
    return lease;
  };
  const renew = (who: V2Actor, leaseId: string, editSessionId: string) => { const lease = ownedLease(who, leaseId, editSessionId); lease.expiresAt = now() + EDIT_LEASE_MS; return lease; };
  const release = (who: V2Actor, leaseId: string, editSessionId: string) => { const lease = ownedLease(who, leaseId, editSessionId); leases.delete(leaseId); publish(who.userId, { type: 'lease', profileId: lease.profileId }); };
  const sourceConfiguration = (value: unknown): Configuration => {
    if (!object(value)) throw new CollaborationError(503, 'SOURCE_UNREADABLE', 'Una configurazione originale non è leggibile.');
    if (object(value.snapshot)) return value;
    return { snapshot: { version: 1, layout: object(value.layout) ? value.layout : {}, appearance: object(value.appearance) ? value.appearance : {} }, appearance: {} };
  };
  const importSources = (userId: string) => {
    const add = (baseId: string, kind: MigrationSource['kind'], name: string, profileId: string | null, deviceLabel: string | null, raw: { data: string; data_enc: string | null }) => {
      const original = readData(raw);
      const id = `${baseId}:${createHash('sha256').update(JSON.stringify(original)).digest('hex')}`;
      if (database.prepare('SELECT 1 FROM aca_v2_sources WHERE user_id=? AND id=?').get(userId, id)) return;
      const encoded = encode(sourceConfiguration(original));
      const prefix = `${baseId}:`;
      const versions = (database.prepare('SELECT COUNT(*) AS n FROM aca_v2_sources WHERE user_id=? AND substr(id,1,?)=?').get(userId, prefix.length, prefix) as { n: number }).n;
      database.prepare('INSERT INTO aca_v2_sources(user_id,id,kind,name,profile_id,device_label,data,data_enc,original_data,original_enc) VALUES(?,?,?,?,?,?,?,?,?,?)').run(userId, id, kind, versions ? `${name} · versione ${versions + 1}` : name, profileId, deviceLabel, encoded.data, encoded.data_enc, raw.data, raw.data_enc);
    };
    database.transaction(() => {
      const hasAccount = database.prepare("SELECT 1 FROM sqlite_master WHERE name='aca_account_settings'").get();
      if (hasAccount) {
        const row = database.prepare('SELECT data,data_enc FROM aca_account_settings WHERE ha_user_id=?').get(userId) as { data: string; data_enc: string | null } | undefined;
        if (row) add(`account:${userId}`, 'account', 'Configurazione sincronizzata dell’account', null, null, row);
      }
      for (const row of database.prepare('SELECT id,name,device_label,data,data_enc FROM profiles WHERE ha_user_id=?').all(userId) as { id: string; name: string; device_label: string | null; data: string; data_enc: string | null }[]) add(`profile:${row.id}`, 'profile', row.name, row.id, row.device_label, row);
      for (const row of database.prepare('SELECT device_id,device_label,data,data_enc FROM current_settings WHERE ha_user_id=?').all(userId) as { device_id: string; device_label: string | null; data: string; data_enc: string | null }[]) add(`device:${row.device_id}`, 'device', row.device_label || 'Configurazione del dispositivo', null, row.device_label, row);
    })();
  };
  const sources = (userId: string): MigrationSource[] => {
    importSources(userId);
    return (database.prepare('SELECT * FROM aca_v2_sources WHERE user_id=? ORDER BY kind,id').all(userId) as SourceRow[]).map(row => ({ id: row.id, kind: row.kind, name: row.name, configuration: readData(row), ...(row.profile_id ? { profileId: row.profile_id } : {}), deviceLabel: row.device_label }));
  };
  const createProfile = (who: V2Actor, input: { name?: unknown; configuration?: unknown; sourceId?: unknown; sourceClass?: unknown }): LiveProfile => {
    const name = requiredLabel(input.name);
    const configuration = validConfiguration(input.configuration);
    let id: string = randomUUID(); let migration: ProfileMigration | null = null;
    if (input.sourceId !== undefined) {
      const source = sources(who.userId).find(v => v.id === input.sourceId);
      if (!source) throw new CollaborationError(404, 'SOURCE_NOT_FOUND', 'La configurazione originale non è disponibile.');
      const previous = profiles(who.userId).find(v => v.migration?.sourceId === source.id);
      if (previous) return previous;
      id = source.profileId ?? id;
      if (database.prepare('SELECT 1 FROM aca_v2_profiles WHERE id=?').get(id)) id = randomUUID();
      migration = { sourceId: source.id, confirmedAt: iso(), ...(typeof input.sourceClass === 'string' ? { sourceClass: input.sourceClass } : {}) };
    }
    const encoded = encode(configuration); const at = iso();
    database.transaction(() => {
      database.prepare('INSERT INTO aca_v2_profiles(id,user_id,name,data,data_enc,revision,resources,migration,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?,?,?)').run(id, who.userId, name, encoded.data, encoded.data_enc, JSON.stringify({ profile: 1 }), migration ? JSON.stringify(migration) : null, at, at);
      database.prepare('INSERT OR IGNORE INTO aca_v2_migrations(user_id,activated_at) VALUES(?,?)').run(who.userId, at);
      record({ actor: who, kind: 'configuration', action: 'profile.created', outcome: 'accepted', profileId: id, revision: 1 });
    })();
    publish(who.userId, { type: 'profile', profileId: id, revision: 1 }); publish(null, { type: 'activity' }); return profile(who.userId, id);
  };
  const commit = (who: V2Actor, profileId: string, operation: ProfileOperation): LiveProfile => {
    identifier(operation.operationId); identifier(operation.editSessionId);
    if (!Array.isArray(operation.changes) || !operation.changes.length || operation.changes.length > 2000 || !object(operation.expected)) throw new CollaborationError(400, 'INVALID_OPERATION', 'Modifica non valida.');
    const fingerprint = createHash('sha256').update(canonical({ target: operation.target, expected: operation.expected, changes: operation.changes })).digest('hex');
    const prior = database.prepare('SELECT fingerprint,result AS data,result_enc AS data_enc FROM aca_v2_operations WHERE user_id=? AND profile_id=? AND operation_id=?').get(who.userId, profileId, operation.operationId) as { fingerprint: string; data: string; data_enc: string | null } | undefined;
    if (prior) { if (prior.fingerprint !== fingerprint) throw new CollaborationError(409, 'OPERATION_REUSED', 'Questo tentativo è già stato utilizzato.'); return profile(who.userId, profileId); }
    const lease = ownedLease(who, operation.leaseId, operation.editSessionId);
    if (lease.profileId !== profileId) throw new CollaborationError(403, 'EDIT_FORBIDDEN', 'Il permesso appartiene a un altro profilo.');
    const result = database.transaction(() => {
      const current = profile(who.userId, profileId);
      if (operation.target.kind === 'widget' && (!operation.target.widgetId || !widgetExists(current.configuration, operation.target))) conflict(current, 'WIDGET_REMOVED');
      let next: Configuration;
      try { next = validConfiguration(applyChanges(current.configuration, operation.changes)); } catch { throw new CollaborationError(400, 'INVALID_OPERATION', 'Modifica non valida.'); }
      const resources = resourcesForChanges(current.configuration, next, operation.changes);
      if (!resources.length) return current;
      const structural = resources.includes('profile');
      const held = lease.resources.includes('profile');
      if (structural && !held) conflict(current, 'STRUCTURE_EDIT_REQUIRED');
      if (!held && resources.some(r => !lease.resources.includes(r))) conflict(current, 'EDIT_RESOURCE_CHANGED');
      for (const resource of structural ? ['profile'] : resources) if (operation.expected[resource] !== (current.resourceRevisions[resource] ?? 0)) conflict(current);
      // A broad editor must never publish an old snapshot after an intervening change.
      if (held && operation.expected.profile !== current.revision) conflict(current);
      const revisions: Record<string, number> = { ...current.resourceRevisions, profile: current.revision + 1 };
      for (const resource of resources.filter(r => r !== 'profile')) revisions[resource] = (revisions[resource] ?? 0) + 1;
      const encoded = encode(next); const at = iso();
      database.prepare('UPDATE aca_v2_profiles SET data=?,data_enc=?,revision=?,resources=?,updated_at=? WHERE id=? AND user_id=?').run(encoded.data, encoded.data_enc, current.revision + 1, JSON.stringify(revisions), at, profileId, who.userId);
      const saved = profile(who.userId, profileId);
      record({ actor: who, kind: 'configuration', action: 'profile.saved', outcome: 'accepted', profileId, revision: saved.revision, operationId: operation.operationId, ...(operation.target.widgetId ? { widgetId: operation.target.widgetId } : {}) });
      // Solo ricevuta: non duplicare l'intera configurazione per ogni tentativo HTTP.
      const response = encode({ revision: saved.revision });
      database.prepare('INSERT INTO aca_v2_operations(user_id,profile_id,operation_id,fingerprint,result,result_enc,at) VALUES(?,?,?,?,?,?,?)').run(who.userId, profileId, operation.operationId, fingerprint, response.data, response.data_enc, now());
      database.prepare('DELETE FROM aca_v2_operations WHERE at<?').run(now() - 7 * 24 * 60 * 60_000);
      return saved;
    })();
    publish(who.userId, { type: 'profile', profileId, revision: result.revision }); publish(null, { type: 'activity' }); return result;
  };
  const updateProfile = (who: V2Actor, id: string, input: { name?: unknown }) => {
    const current = profile(who.userId, id); const name = requiredLabel(input.name);
    database.transaction(() => { database.prepare('UPDATE aca_v2_profiles SET name=?,updated_at=? WHERE id=? AND user_id=?').run(name, iso(), id, who.userId); record({ actor: who, kind: 'configuration', action: 'profile.renamed', outcome: 'accepted', profileId: id, revision: current.revision }); })();
    publish(who.userId, { type: 'profile', profileId: id, revision: current.revision }); publish(null, { type: 'activity' }); return profile(who.userId, id);
  };
  const deleteProfile = (who: V2Actor, id: string) => {
    profile(who.userId, id);
    if (listLeases(who.userId, id).length) conflict(profile(who.userId, id), 'EDIT_BUSY');
    database.transaction(() => { database.prepare('DELETE FROM aca_v2_profiles WHERE id=? AND user_id=?').run(id, who.userId); database.prepare('UPDATE aca_v2_clients SET active_profile_id=NULL WHERE user_id=? AND active_profile_id=?').run(who.userId, id); database.prepare('UPDATE aca_v2_account_profiles SET active_profile_id=NULL,selection_required=? WHERE user_id=? AND active_profile_id=?').run(database.prepare('SELECT 1 FROM aca_v2_profiles WHERE user_id=? LIMIT 1').get(who.userId) ? 1 : 0, who.userId, id); record({ actor: who, kind: 'configuration', action: 'profile.deleted', outcome: 'accepted', profileId: id }); })();
    for (const usage of usages.values()) if (usage.userId === who.userId && usage.profileId === id) dropUsage(usage);
    publish(who.userId, { type: 'profile', profileId: id }); publish(who.userId, { type: 'client' }); publish(null, { type: 'activity' });
  };
  const markRevoked = (who: V2Actor, id: string, pending = true) => {
    if (!client(who.userId, id)) throw new CollaborationError(404, 'CLIENT_NOT_FOUND', 'Dispositivo non disponibile.');
    database.transaction(() => { database.prepare('UPDATE aca_v2_clients SET revoked_at=COALESCE(revoked_at,?),revocation_pending=? WHERE user_id=? AND id=?').run(iso(), pending ? 1 : 0, who.userId, id); database.prepare('UPDATE aca_v2_sessions SET revoked=1 WHERE user_id=? AND client_id=?').run(who.userId, id); record({ actor: who, kind: 'configuration', action: pending ? 'client.revoke_pending' : 'client.revoked', outcome: 'accepted' }); })();
    for (const [key, value] of leases) if (value.userId === who.userId && value.clientId === id) leases.delete(key);
    for (const usage of usages.values()) if (usage.userId === who.userId && usage.clientId === id) dropUsage(usage);
    publish(who.userId, { type: 'client' }); publish(who.userId, { type: 'lease' }); publish(null, { type: 'activity' });
    return client(who.userId, id)!;
  };
  return {
    houseId, userColor, setUserColor, clients, client, profiles, profile, sources, sessionClient, accountSelection, assertAccessTokenActive, noteAccessToken, actor, registerClient, updateClient, createProfile, updateProfile, deleteProfile,
    acquire, renew, release, listLeases, commit, markRevoked,
    acquireUsage, renewUsage, releaseUsage, requireUsage, pruneUsages, connectUsage,
    sessionIds: (userId: string, id: string) => (database.prepare('SELECT refresh_id FROM aca_v2_sessions WHERE user_id=? AND client_id=?').all(userId, id) as { refresh_id: string }[]).map(v => v.refresh_id),
    migrated: (userId: string) => !!database.prepare('SELECT 1 FROM aca_v2_migrations WHERE user_id=?').get(userId),
    subscribe: (userId: string, clientId: string, send: (event: CollaborationEvent) => void) => { const listener = { userId, clientId, send }; listeners.add(listener); return () => { listeners.delete(listener); }; },
    publish,
    updateActivity: () => { pruneLeases(); return { activeEditors: leases.size }; },
  };
}
export type CollaborationStore = ReturnType<typeof createCollaborationStore>;
