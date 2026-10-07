// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDataCrypto } from '../helpers/dataCrypto.ts';
import { openDatabase } from '../models/database.ts';
import type { SqliteDatabase } from '../models/database.ts';
import {
  createSettingsService,
  hasUsableBaseRevision,
  resolveKeepLimit,
} from '../services/settingsService.ts';
import type { SettingsService } from '../services/settingsService.ts';

const plainCrypto = createDataCrypto({ mode: 'off', key: '', salt: '' });

describe('settings helpers', () => {
  it('clamps the history keep limit to 5–500 and defaults non-numbers', () => {
    expect(resolveKeepLimit(1)).toBe(5);
    expect(resolveKeepLimit('12.9')).toBe(12);
    expect(resolveKeepLimit(10_000)).toBe(500);
    expect(resolveKeepLimit(undefined)).toBe(50);
    expect(resolveKeepLimit('abc')).toBe(50);
  });

  it('treats null as a usable base revision (0), like Number(null)', () => {
    expect(hasUsableBaseRevision(null)).toBe(true);
    expect(hasUsableBaseRevision('3')).toBe(true);
    expect(hasUsableBaseRevision(undefined)).toBe(false);
    expect(hasUsableBaseRevision('x')).toBe(false);
  });
});

describe('settings service', () => {
  let database: SqliteDatabase;
  let service: SettingsService;

  const write = (deviceId: string, data: unknown, baseRevision: unknown, deviceLabel?: unknown) =>
    service.writeCurrent({
      haUserId: 'user-1',
      deviceId,
      data,
      baseRevision,
      historyKeepLimit: undefined,
      deviceLabel,
    });

  beforeEach(() => {
    database = openDatabase(':memory:');
    service = createSettingsService(database, plainCrypto);
  });

  afterEach(() => {
    database.close();
  });

  it('reads the latest snapshot or a stored revision', () => {
    expect(service.getCurrent('user-1', 'tablet', undefined)).toBeNull();

    write('tablet', { v: 1 }, null, ' Hall ');
    write('tablet', { v: 2 }, 1);

    expect(service.getCurrent('user-1', 'tablet', undefined)).toMatchObject({
      ha_user_id: 'user-1',
      device_id: 'tablet',
      data: { v: 2 },
      revision: 2,
      device_label: 'Hall',
    });
    // History rows have no label.
    expect(service.getCurrent('user-1', 'tablet', '1')).toMatchObject({
      data: { v: 1 },
      revision: 1,
      device_label: null,
    });
    expect(service.getCurrent('user-1', 'tablet', '9')).toBeNull();
  });

  it('keeps the device label unless a new one is sent', () => {
    write('tablet', { v: 1 }, null, 'Hall');
    write('tablet', { v: 2 }, 1);
    expect(service.listDevices('user-1')).toMatchObject([{ device_label: 'Hall', revision: 2 }]);

    write('tablet', { v: 3 }, 2, '   ');
    expect(service.listDevices('user-1')).toMatchObject([{ device_label: null, revision: 3 }]);
  });

  it('lists and prunes the history', () => {
    write('tablet', { v: 1 }, null);
    for (let revision = 1; revision < 8; revision += 1) {
      service.writeCurrent({
        haUserId: 'user-1',
        deviceId: 'tablet',
        data: { v: revision + 1 },
        baseRevision: revision,
        historyKeepLimit: 5,
        deviceLabel: undefined,
      });
    }

    expect(service.listHistory('user-1', 'tablet', undefined).map((row) => row.revision)).toEqual([
      8, 7, 6, 5, 4,
    ]);
    expect(service.listHistory('user-1', 'tablet', '2')).toHaveLength(2);
    expect(service.listHistory('user-1', 'tablet', '0')).toHaveLength(5);

    expect(service.deleteHistory('user-1', 'tablet', undefined)).toEqual({
      success: true,
      deleted: 4,
      kept_revision: 8,
    });
    expect(service.deleteHistory('user-1', 'tablet', '0')).toEqual({ success: true, deleted: 1 });
    expect(service.deleteHistory('user-1', 'unknown', undefined)).toEqual({
      success: true,
      deleted: 0,
    });
  });

  it('renames and deletes devices', () => {
    write('tablet', { v: 1 }, null);

    expect(
      service.updateDeviceLabel({ haUserId: 'user-1', deviceId: 'phone', deviceLabel: 'Phone' })
    ).toEqual({ ok: false, failure: { status: 404, error: 'Device not found' } });
    expect(
      service.updateDeviceLabel({ haUserId: 'user-1', deviceId: 'tablet', deviceLabel: ' Wall ' })
    ).toEqual({
      ok: true,
      value: { success: true, ha_user_id: 'user-1', device_id: 'tablet', device_label: 'Wall' },
    });

    expect(service.deleteDevice('user-1', 'tablet')).toEqual({
      success: true,
      deleted_current: 1,
      deleted_history: 1,
    });
    expect(service.listDevices('user-1')).toEqual([]);
  });

  it('publishes to a single new target and reports a missing source', () => {
    write('tablet', { v: 5 }, null);

    expect(
      service.publish({
        haUserId: 'user-1',
        sourceDeviceId: 'phone',
        targetDeviceId: undefined,
        historyKeepLimit: undefined,
      })
    ).toEqual({ ok: false, failure: { status: 404, error: 'Source device config not found' } });

    expect(
      service.publish({
        haUserId: 'user-1',
        sourceDeviceId: 'tablet',
        targetDeviceId: 'kitchen',
        historyKeepLimit: undefined,
      })
    ).toEqual({ ok: true, value: { success: true, affected: 1 } });
    expect(service.getCurrent('user-1', 'kitchen', undefined)).toMatchObject({
      data: { v: 5 },
      revision: 1,
      device_label: null,
    });
  });

  it('answers 500 when the source payload is unreadable', () => {
    database
      .prepare(
        `INSERT INTO current_settings (ha_user_id, device_id, data, data_enc, revision)
         VALUES ('user-1', 'tablet', '', NULL, 1)`
      )
      .run();

    expect(
      service.publish({
        haUserId: 'user-1',
        sourceDeviceId: 'tablet',
        targetDeviceId: undefined,
        historyKeepLimit: undefined,
      })
    ).toEqual({ ok: false, failure: { status: 500, error: 'Source device config is unreadable' } });
  });
});
