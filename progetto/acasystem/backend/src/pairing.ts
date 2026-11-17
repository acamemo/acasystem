import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { dataCrypto } from './helpers/dataCrypto.ts';
import type { DataCrypto } from './helpers/dataCrypto.ts';
import type { SqliteDatabase } from './models/database.ts';
import { portableConfiguration } from './pairingPortable.ts';

export const PAIRING_TTL_MS = 5 * 60_000;
export type PairingAction = 'account' | 'configuration';
type JsonObject = Record<string, unknown>;
export interface SharedConfiguration {
  snapshot: { version: 1; layout: JsonObject; appearance: JsonObject };
  appearance: JsonObject;
}
export interface AccountSettings {
  revision: number;
  configuration: SharedConfiguration;
  updatedAt: string;
}
export interface PairingAcceptance {
  schema: 1;
  pairingId: string;
  houseId: string;
  endpoint: string;
  mode: PairingAction;
  loginRequired: true;
  accountUserId?: string;
  configuration?: SharedConfiguration;
}
interface Invitation {
  pairingId: string;
  userId: string;
  endpoint: string;
  expiresAt: number;
  configuration: SharedConfiguration;
}

const object = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const LAYOUT_KEYS = [
  'pagesConfig', 'cardSettings', 'widgetMemory', 'customNames', 'customIcons', 'pageSettings',
  'gridColumns', 'dynamicGridColumns', 'gridGapH', 'gridGapV', 'cardBorderRadius', 'cardsOnlyMode',
  'headerSettings', 'headerTitle', 'headerScale', 'sectionSpacing', 'statusPillsConfig', 'launcherLayout',
] as const;
const FORBIDDEN_KEY = /token|password|authorization|secret|credential|^ha_(?:url|fallback_url)$|^__proto__$|^constructor$|^prototype$/i;
const clean = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(clean);
  if (object(value)) return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !FORBIDDEN_KEY.test(key)).map(([key, item]) => [key, clean(item)]));
  return value;
};

/** Only portable dashboard data: no credentials, device preferences or local photos. */
export const sanitizeSharedConfiguration = (input: unknown): SharedConfiguration | null => {
  if (!object(input) || !object(input.snapshot) || input.snapshot.version !== 1
    || !object(input.snapshot.layout) || !object(input.appearance)) return null;
  const source = input.snapshot.layout;
  const layout = Object.fromEntries(LAYOUT_KEYS.filter((key) => key in source)
    .map((key) => [key, clean(source[key])]));
  const theme = input.appearance.theme;
  const accent = input.appearance.accent;
  const wallpaper = input.appearance.wallpaper;
  const appearance: JsonObject = {
    theme: ['light', 'dark', 'auto'].includes(String(theme)) ? theme : 'light',
    accent: ['violet', 'red', 'cyan', 'orange', 'wallpaper'].includes(String(accent)) ? accent : 'violet',
    wallpaper: ['alba', 'mare', 'bosco', 'tramonto', 'notte'].includes(String(wallpaper)) ? wallpaper : 'none',
  };
  if (wallpaper !== 'photo' && typeof input.appearance.wallpaperHue === 'number'
    && Number.isFinite(input.appearance.wallpaperHue)) appearance.wallpaperHue = input.appearance.wallpaperHue;
  return { snapshot: { version: 1, layout, appearance: {} }, appearance };
};

/** A phone must reach the PC's private LAN address, never its own loopback. */
export const parsePairingEndpoint = (input: unknown): string | null => {
  if (typeof input !== 'string') return null;
  try {
    const url = new URL(input);
    const octets = url.hostname.split('.').map(Number);
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) || octets.some((n) => n < 0 || n > 255)) return null;
    const [a, b] = octets;
    if (!(a === 10 || (a === 172 && b !== undefined && b >= 16 && b <= 31) || (a === 192 && b === 168))) return null;
    if (url.protocol !== 'http:' || url.username || url.password
      || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch { return null; }
};

export const createPairingService = (
  database: SqliteDatabase,
  { now = Date.now, crypto = dataCrypto }: { now?: () => number; crypto?: DataCrypto } = {},
) => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS aca_pairing_house (id INTEGER PRIMARY KEY CHECK (id = 1), house_id TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS aca_account_settings (
      ha_user_id TEXT PRIMARY KEY, revision INTEGER NOT NULL, data TEXT NOT NULL,
      data_enc TEXT, updated_at TEXT NOT NULL
    );
  `);
  database.prepare('INSERT OR IGNORE INTO aca_pairing_house (id, house_id) VALUES (1, ?)').run(randomUUID());
  const house = database.prepare('SELECT house_id FROM aca_pairing_house WHERE id = 1').get() as { house_id: string };
  const invitations = new Map<string, Invitation>();
  const listeners = new Map<string, Set<(revision: number) => void>>();
  const hash = (token: string) => createHash('sha256').update(token).digest('hex');
  const prune = () => {
    for (const [key, invite] of invitations) if (invite.expiresAt <= now()) invitations.delete(key);
  };
  const readSettings = (userId: string): AccountSettings | null => {
    const row = database.prepare('SELECT revision, data, data_enc, updated_at FROM aca_account_settings WHERE ha_user_id = ?')
      .get(userId) as { revision: number; data: string; data_enc: string | null; updated_at: string } | undefined;
    if (!row) return null;
    const text = crypto.resolveStoredDataText({ plainText: row.data, encryptedText: row.data_enc, context: 'account-settings' });
    const configuration = text ? sanitizeSharedConfiguration(JSON.parse(text)) : null;
    if (!configuration) throw new Error('Configurazione condivisa non leggibile.');
    return { revision: row.revision, configuration, updatedAt: row.updated_at };
  };
  return {
    houseId: house.house_id,
    issue(userId: string, endpoint: string, configuration: SharedConfiguration) {
      prune();
      for (const [key, invite] of invitations) if (invite.userId === userId) invitations.delete(key);
      if (invitations.size >= 100) throw new Error('Troppi inviti attivi. Riprova fra qualche minuto.');
      const invite = randomBytes(32).toString('base64url');
      const expiresAt = now() + PAIRING_TTL_MS;
      invitations.set(hash(invite), { pairingId: randomUUID(), userId, endpoint, expiresAt, configuration });
      return { schema: 1 as const, houseId: house.house_id, endpoint, invite, expiresAt };
    },
    accept(token: unknown, houseId: unknown, action: PairingAction): PairingAcceptance | null {
      prune();
      if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token) || houseId !== house.house_id) return null;
      const key = hash(token);
      const invitation = invitations.get(key);
      if (!invitation) return null;
      invitations.delete(key);
      return {
        schema: 1, pairingId: invitation.pairingId, houseId: house.house_id, endpoint: invitation.endpoint,
        mode: action, loginRequired: true,
        ...(action === 'account' ? { accountUserId: invitation.userId } : { configuration: portableConfiguration(invitation.configuration) }),
      };
    },
    subscribe(userId: string, listener: (revision: number) => void) {
      const subscriptions = listeners.get(userId) ?? new Set<(revision: number) => void>();
      subscriptions.add(listener);
      listeners.set(userId, subscriptions);
      return () => { subscriptions.delete(listener); if (!subscriptions.size) listeners.delete(userId); };
    },
    readSettings,
    writeSettings(userId: string, baseRevision: number, configuration: SharedConfiguration): AccountSettings | null {
      const saved = database.transaction(() => {
        const row = database.prepare('SELECT revision FROM aca_account_settings WHERE ha_user_id = ?')
          .get(userId) as { revision: number } | undefined;
        if ((row?.revision ?? 0) !== baseRevision) return null;
        const revision = baseRevision + 1;
        const text = JSON.stringify(configuration);
        const encrypted = crypto.encryptDataText(text);
        if (encrypted === null && crypto.isEncryptionWriteRequired()) throw new Error('Cifratura non disponibile.');
        const plain = crypto.shouldPersistPlaintextData() ? text : crypto.getEncryptedOnlyPlaintextStub();
        const updatedAt = new Date(now()).toISOString();
        database.prepare(`INSERT INTO aca_account_settings (ha_user_id, revision, data, data_enc, updated_at)
          VALUES (?, ?, ?, ?, ?) ON CONFLICT(ha_user_id) DO UPDATE SET
          revision=excluded.revision, data=excluded.data, data_enc=excluded.data_enc, updated_at=excluded.updated_at`)
          .run(userId, revision, plain, encrypted, updatedAt);
        return { revision, configuration, updatedAt };
      })();
      if (saved) for (const listener of listeners.get(userId) ?? []) listener(saved.revision);
      return saved;
    },
  };
};
