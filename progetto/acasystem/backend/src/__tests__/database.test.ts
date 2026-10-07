// @vitest-environment node

import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { initializeSchema, openDatabase, resolveDatabasePath } from '../models/database.ts';

const tempDirs: string[] = [];

const columnsOf = (database: Database.Database, table: string): string[] =>
  database
    .prepare<[], { name: string }>(`PRAGMA table_info(${table})`)
    .all()
    .map((column) => column.name);

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('database model', () => {
  it('keeps the tunet.db file name inside DATA_DIR', () => {
    expect(resolveDatabasePath(join('srv', 'data'))).toBe(join('srv', 'data', 'tunet.db'));
  });

  it('creates the Tunet schema with all columns', () => {
    const database = openDatabase(':memory:');

    expect(columnsOf(database, 'profiles')).toEqual([
      'id',
      'ha_user_id',
      'name',
      'device_label',
      'data',
      'created_at',
      'updated_at',
      'data_enc',
    ]);
    expect(columnsOf(database, 'current_settings')).toEqual([
      'ha_user_id',
      'device_id',
      'device_label',
      'data',
      'revision',
      'updated_at',
      'data_enc',
    ]);
    expect(columnsOf(database, 'current_settings_history')).toEqual([
      'ha_user_id',
      'device_id',
      'revision',
      'data',
      'updated_at',
      'data_enc',
    ]);
    database.close();
  });

  it('migrates an older file in place without losing rows, in WAL mode', () => {
    const dir = mkdtempSync(join(tmpdir(), 'acasystem-db-'));
    tempDirs.push(dir);
    const filePath = join(dir, 'tunet.db');

    const legacy = new Database(filePath);
    legacy.exec(`
      CREATE TABLE profiles (
        id TEXT PRIMARY KEY, ha_user_id TEXT NOT NULL, name TEXT NOT NULL, device_label TEXT,
        data TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE current_settings (
        ha_user_id TEXT NOT NULL, device_id TEXT NOT NULL, data TEXT NOT NULL,
        revision INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (ha_user_id, device_id)
      );
      INSERT INTO profiles (id, ha_user_id, name, data) VALUES ('p1', 'u1', 'Tablet', '{}');
    `);
    legacy.close();

    const database = openDatabase(filePath);
    expect(columnsOf(database, 'profiles')).toContain('data_enc');
    expect(columnsOf(database, 'current_settings')).toEqual(
      expect.arrayContaining(['device_label', 'data_enc'])
    );
    expect(database.prepare('SELECT id, name FROM profiles').all()).toEqual([
      { id: 'p1', name: 'Tablet' },
    ]);
    expect(database.pragma('journal_mode', { simple: true })).toBe('wal');

    // Running the initialization again is a no-op.
    expect(() => initializeSchema(database)).not.toThrow();
    database.close();
  });
});
