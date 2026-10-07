// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDataCrypto } from '../helpers/dataCrypto.ts';
import { openDatabase } from '../models/database.ts';
import type { SqliteDatabase } from '../models/database.ts';
import { createProfileService } from '../services/profileService.ts';

const HEX_KEY = 'ab'.repeat(32);
const plainCrypto = createDataCrypto({ mode: 'off', key: '', salt: '' });
const encOnlyCrypto = createDataCrypto({ mode: 'enc_only', key: HEX_KEY, salt: '' });

interface StoredProfile {
  name: string;
  device_label: string | null;
  data: string;
  data_enc: string | null;
}

describe('profile service', () => {
  let database: SqliteDatabase;

  const readStored = (id: string): StoredProfile | undefined =>
    database
      .prepare<[string], StoredProfile>(
        'SELECT name, device_label, data, data_enc FROM profiles WHERE id = ?'
      )
      .get(id);

  beforeEach(() => {
    database = openDatabase(':memory:');
  });

  afterEach(() => {
    database.close();
  });

  it('creates, lists, reads, updates and deletes a profile', () => {
    const service = createProfileService(database, plainCrypto);

    const created = service.create({
      haUserId: 'user-1',
      name: 'Tablet',
      deviceLabel: undefined,
      data: { version: 1 },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const { id } = created.value;
    expect(created.value).toMatchObject({ ha_user_id: 'user-1', name: 'Tablet', data: { version: 1 } });
    expect(created.value.created_at).toBe(created.value.updated_at);
    expect(readStored(id)).toEqual({
      name: 'Tablet',
      device_label: null,
      data: '{"version":1}',
      data_enc: null,
    });

    expect(service.list('user-1')).toEqual([
      expect.objectContaining({ id, data: { version: 1 }, device_label: null }),
    ]);
    expect(service.list('user-2')).toEqual([]);

    expect(service.get('user-2', id)).toEqual({
      ok: false,
      failure: { status: 404, error: 'Profile not found' },
    });

    const updated = service.update('user-1', id, {
      name: undefined,
      deviceLabel: 'Hall',
      data: { version: 2 },
    });
    expect(updated).toMatchObject({
      ok: true,
      value: { id, name: 'Tablet', device_label: 'Hall', data: { version: 2 } },
    });

    expect(service.update('user-1', 'missing', { name: 'x', deviceLabel: undefined, data: undefined }))
      .toEqual({ ok: false, failure: { status: 404, error: 'Profile not found' } });

    expect(service.remove('user-2', id)).toMatchObject({ ok: false, failure: { status: 404 } });
    expect(service.remove('user-1', id)).toEqual({ ok: true, value: { success: true } });
    expect(service.get('user-1', id)).toMatchObject({ ok: false });
  });

  it('stores only the encrypted payload in enc_only mode and reads it back', () => {
    const service = createProfileService(database, encOnlyCrypto);

    const created = service.create({
      haUserId: 'user-1',
      name: 'Tablet',
      deviceLabel: 'Hall',
      data: { secret: true },
    });
    if (!created.ok) throw new Error('create failed');

    const stored = readStored(created.value.id);
    expect(stored?.data).toBe('{"_enc_only":true}');
    expect(stored?.data_enc).toMatch(/^enc:v1:/);
    expect(service.get('user-1', created.value.id)).toMatchObject({
      ok: true,
      value: { data: { secret: true } },
    });

    // Without the key the payload is unreadable: data becomes null, as in Tunet.
    const otherKey = createDataCrypto({ mode: 'enc_only', key: 'cd'.repeat(32), salt: '' });
    expect(createProfileService(database, otherKey).get('user-1', created.value.id)).toMatchObject({
      ok: true,
      value: { data: null },
    });
  });

  it('refuses writes with 503 when encryption is required but has no key', () => {
    const noKey = createDataCrypto({ mode: 'enc_only', key: '', salt: '' });
    const service = createProfileService(database, noKey);

    expect(
      service.create({ haUserId: 'user-1', name: 'Tablet', deviceLabel: undefined, data: {} })
    ).toEqual({
      ok: false,
      failure: { status: 503, error: 'Encryption is required but unavailable' },
    });
  });
});
