import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { readDataDir } from '../config/env.ts';
import { DATABASE_FILE_NAME } from '../config/paths.ts';

export type SqliteDatabase = Database.Database;

interface TableColumn {
  name: string;
}

/** Schema di Tunet (tabelle, indici e colonne aggiunte nel tempo) più le tabelle `casa3d_*` di Acasystem. */
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    ha_user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    device_label TEXT,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_profiles_ha_user_id ON profiles(ha_user_id);

  CREATE TABLE IF NOT EXISTS current_settings (
    ha_user_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    device_label TEXT,
    data TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (ha_user_id, device_id)
  );

  CREATE INDEX IF NOT EXISTS idx_current_settings_ha_user_id ON current_settings(ha_user_id);

  CREATE TABLE IF NOT EXISTS current_settings_history (
    ha_user_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    revision INTEGER NOT NULL,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (ha_user_id, device_id, revision)
  );

  CREATE INDEX IF NOT EXISTS idx_current_settings_history_lookup
    ON current_settings_history(ha_user_id, device_id, revision DESC);

  -- Casa 3D (ADR-0014, T6): il piano della casa, le immagini e i punti di ripristino.
  -- home_id è 'default': una casa per installazione (più case per condominio: REQ-17, non deciso).
  CREATE TABLE IF NOT EXISTS casa3d_building (
    home_id TEXT PRIMARY KEY,
    revision INTEGER NOT NULL,
    data TEXT NOT NULL,
    data_enc TEXT,
    updated_by TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS casa3d_image (
    home_id TEXT NOT NULL,
    image_id TEXT NOT NULL,
    mime TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    bytes BLOB NOT NULL,
    size INTEGER NOT NULL,
    sha256 TEXT NOT NULL,
    updated_by TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (home_id, image_id)
  );

  CREATE TABLE IF NOT EXISTS casa3d_history (
    id TEXT PRIMARY KEY,
    home_id TEXT NOT NULL,
    revision INTEGER NOT NULL,
    saved_at INTEGER NOT NULL,
    floors INTEGER NOT NULL,
    rooms INTEGER NOT NULL,
    furniture INTEGER NOT NULL,
    data TEXT NOT NULL,
    data_enc TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_casa3d_history_lookup
    ON casa3d_history(home_id, saved_at DESC);

  -- Device configuration facade (/api/dispositivi, ADR-0021 and ADR-0022).
  -- Open Home Assistant configuration flows: cancelled at expiry and at start-up. No field
  -- values are stored (no address, MAC or token).
  CREATE TABLE IF NOT EXISTS device_flows (
    flow_id TEXT PRIMARY KEY,
    ha_user_id TEXT NOT NULL,
    handler TEXT NOT NULL,
    step_id TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_device_flows_user ON device_flows(ha_user_id);
  CREATE INDEX IF NOT EXISTS idx_device_flows_expiry ON device_flows(expires_at);

  -- Registry of the actions of the facade: who, what, domain, entry id, outcome. No secrets.
  CREATE TABLE IF NOT EXISTS device_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at INTEGER NOT NULL,
    ha_user_id TEXT,
    ha_user_name TEXT,
    source TEXT NOT NULL,
    action TEXT NOT NULL,
    domain TEXT,
    entry_id TEXT,
    outcome TEXT NOT NULL,
    code TEXT
  );

  -- Links of the power-on recipe (D1b): what Acasystem created in HA for one TV. No MAC, and no
  -- entity id of the Wake on LAN button either: HA names it after the MAC, so it is looked up.
  CREATE TABLE IF NOT EXISTS device_power_links (
    webostv_entry_id TEXT PRIMARY KEY,
    wol_entry_id TEXT NOT NULL,
    automation_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    media_player_entity_id TEXT NOT NULL,
    trigger_form TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`;

/** Colonne aggiunte dopo la prima versione dello schema: tabella, colonna, definizione. */
const ADDED_COLUMNS: readonly (readonly [string, string, string])[] = [
  ['current_settings', 'device_label', 'TEXT'],
  ['profiles', 'data_enc', 'TEXT'],
  ['current_settings', 'data_enc', 'TEXT'],
  ['current_settings_history', 'data_enc', 'TEXT'],
];

const ensureColumn = (
  database: SqliteDatabase,
  tableName: string,
  columnName: string,
  columnSql: string
): void => {
  const columns = database.prepare<[], TableColumn>(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnSql}`);
  }
};

/** Pragmi, tabelle e colonne mancanti; idempotente su un database esistente. */
export const initializeSchema = (database: SqliteDatabase): SqliteDatabase => {
  // WAL mode for better concurrent read performance
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  database.exec(SCHEMA_SQL);
  ADDED_COLUMNS.forEach(([tableName, columnName, columnSql]) => {
    ensureColumn(database, tableName, columnName, columnSql);
  });
  return database;
};

/** Apre (o crea) un database SQLite e ne prepara lo schema. Accetta anche ':memory:'. */
export const openDatabase = (filePath: string): SqliteDatabase =>
  initializeSchema(new Database(filePath));

/** Percorso del database del processo: `<DATA_DIR>/tunet.db`. */
export const resolveDatabasePath = (dataDir: string = readDataDir()): string =>
  join(dataDir, DATABASE_FILE_NAME);

let processDatabase: SqliteDatabase | null = null;

/**
 * Database del processo, aperto alla prima richiesta (all'avvio del server) e poi
 * riusato. Crea DATA_DIR se manca, come db.js.
 */
export const getDatabase = (): SqliteDatabase => {
  if (processDatabase) return processDatabase;

  const dataDir = readDataDir();
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  processDatabase = openDatabase(resolveDatabasePath(dataDir));
  return processDatabase;
};
