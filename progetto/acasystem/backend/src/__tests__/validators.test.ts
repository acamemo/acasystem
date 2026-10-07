// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  normalizeDeviceLabel,
  readRequestBody,
  validateRequestUser,
} from '../validators/common.ts';
import { normalizeIconQuery, validateIconName } from '../validators/iconValidators.ts';
import {
  validateCreateProfileBody,
  validateListProfilesQuery,
  validateUpdateProfileBody,
} from '../validators/profileValidators.ts';
import {
  validateCurrentSettingsBody,
  validateDeviceLabelBody,
  validateDeviceQuery,
  validatePublishBody,
  validateUserQuery,
} from '../validators/settingsValidators.ts';

const user = { id: 'user-1', name: '', is_admin: false, is_owner: false };

describe('common validators', () => {
  it('requires an authenticated user with an id (401)', () => {
    expect(validateRequestUser(undefined)).toEqual({
      ok: false,
      failure: { status: 401, error: 'Missing authenticated Home Assistant user' },
    });
    expect(validateRequestUser({ ...user, id: '' })).toMatchObject({ ok: false });
    expect(validateRequestUser(user)).toEqual({ ok: true, value: 'user-1' });
  });

  it('fails like the original destructuring when the JSON body is missing', () => {
    expect(() => readRequestBody(undefined)).toThrow(TypeError);
    expect(() => readRequestBody(null)).toThrow(TypeError);
    expect(readRequestBody({ a: 1 })).toEqual({ a: 1 });
    expect(readRequestBody([])).toEqual([]);
  });

  it('normalizes device labels', () => {
    expect(normalizeDeviceLabel('  Wall\u0000 tablet\u007f ')).toBe('Wall tablet');
    expect(normalizeDeviceLabel('x'.repeat(130))).toHaveLength(120);
    expect(normalizeDeviceLabel('   ')).toBeNull();
    expect(normalizeDeviceLabel(42)).toBeNull();
    expect(normalizeDeviceLabel(undefined)).toBeNull();
  });
});

describe('profile validators', () => {
  it('checks the list query: presence (400) before user match (403)', () => {
    expect(validateListProfilesQuery({}, 'user-1')).toEqual({
      ok: false,
      failure: { status: 400, error: 'ha_user_id query parameter is required' },
    });
    expect(validateListProfilesQuery({ ha_user_id: 'user-2' }, 'user-1')).toEqual({
      ok: false,
      failure: { status: 403, error: 'Forbidden: user mismatch' },
    });
    expect(validateListProfilesQuery({ ha_user_id: ['user-1'] }, 'user-1')).toMatchObject({
      ok: false,
      failure: { status: 403 },
    });
    expect(validateListProfilesQuery({ ha_user_id: 'user-1' }, 'user-1')).toEqual({
      ok: true,
      value: { haUserId: 'user-1' },
    });
  });

  it('requires ha_user_id, name and data on create, without type checks', () => {
    const missing = { ok: false, failure: { status: 400, error: 'ha_user_id, name, and data are required' } };
    expect(validateCreateProfileBody({ ha_user_id: 'user-1', name: 'A' }, 'user-1')).toEqual(missing);
    expect(validateCreateProfileBody({ ha_user_id: 'user-1', name: '', data: {} }, 'user-1')).toEqual(
      missing
    );
    expect(
      validateCreateProfileBody({ ha_user_id: 'user-2', name: 'A', data: {} }, 'user-1')
    ).toMatchObject({ ok: false, failure: { status: 403 } });
    expect(
      validateCreateProfileBody(
        { ha_user_id: 'user-1', name: 7, device_label: 'Tab', data: [1] },
        'user-1'
      )
    ).toEqual({
      ok: true,
      value: { haUserId: 'user-1', name: 7, deviceLabel: 'Tab', data: [1] },
    });
  });

  it('accepts partial updates and requires data to be an object when sent', () => {
    expect(validateUpdateProfileBody({}, 'user-1')).toEqual({
      ok: true,
      value: { name: undefined, deviceLabel: undefined, data: undefined },
    });
    expect(validateUpdateProfileBody({ ha_user_id: 'user-2' }, 'user-1')).toMatchObject({
      ok: false,
      failure: { status: 403 },
    });
    // A falsy ha_user_id is not compared, as in the original route.
    expect(validateUpdateProfileBody({ ha_user_id: '', name: 'B' }, 'user-1')).toMatchObject({
      ok: true,
    });
    for (const data of [null, [], 'text', 0, true]) {
      expect(validateUpdateProfileBody({ data }, 'user-1')).toEqual({
        ok: false,
        failure: { status: 400, error: 'data must be an object when provided' },
      });
    }
    // The user check runs before the data check.
    expect(validateUpdateProfileBody({ ha_user_id: 'x', data: null }, 'user-1')).toMatchObject({
      failure: { status: 403 },
    });
    expect(validateUpdateProfileBody({ data: { a: 1 } }, 'user-1')).toMatchObject({
      ok: true,
      value: { data: { a: 1 } },
    });
  });
});

describe('settings validators', () => {
  it('requires ha_user_id and device_id in device queries', () => {
    expect(validateDeviceQuery({ ha_user_id: 'user-1' }, 'user-1')).toEqual({
      ok: false,
      failure: { status: 400, error: 'ha_user_id and device_id query parameters are required' },
    });
    expect(validateDeviceQuery({ ha_user_id: 'u', device_id: 'd' }, 'user-1')).toMatchObject({
      failure: { status: 403 },
    });
    expect(
      validateDeviceQuery(
        { ha_user_id: 'user-1', device_id: 'd', revision: '3', limit: '5', keep_latest: '0' },
        'user-1'
      )
    ).toEqual({
      ok: true,
      value: { haUserId: 'user-1', deviceId: 'd', revision: '3', limit: '5', keepLatest: '0' },
    });
  });

  it('requires only ha_user_id for the device list', () => {
    expect(validateUserQuery({}, 'user-1')).toEqual({
      ok: false,
      failure: { status: 400, error: 'ha_user_id query parameter is required' },
    });
    expect(validateUserQuery({ ha_user_id: 'user-1' }, 'user-1')).toEqual({
      ok: true,
      value: 'user-1',
    });
  });

  it('validates the body fields of each write with the original messages', () => {
    expect(validateDeviceLabelBody({ ha_user_id: 'user-1' }, 'user-1')).toEqual({
      ok: false,
      failure: { status: 400, error: 'ha_user_id and device_id are required' },
    });
    expect(validateCurrentSettingsBody({ ha_user_id: 'user-1', device_id: 'd' }, 'user-1')).toEqual(
      {
        ok: false,
        failure: { status: 400, error: 'ha_user_id, device_id and data are required' },
      }
    );
    expect(validatePublishBody({ ha_user_id: 'user-1' }, 'user-1')).toEqual({
      ok: false,
      failure: { status: 400, error: 'ha_user_id and source_device_id are required' },
    });
    expect(
      validatePublishBody({ ha_user_id: 'user-2', source_device_id: 'd' }, 'user-1')
    ).toMatchObject({ failure: { status: 403 } });
  });

  it('passes the optional fields through unchanged', () => {
    expect(
      validateCurrentSettingsBody(
        {
          ha_user_id: 'user-1',
          device_id: 'd',
          data: { v: 1 },
          base_revision: '2',
          history_keep_limit: 9,
          device_label: 'Hall',
        },
        'user-1'
      )
    ).toEqual({
      ok: true,
      value: {
        haUserId: 'user-1',
        deviceId: 'd',
        data: { v: 1 },
        baseRevision: '2',
        historyKeepLimit: 9,
        deviceLabel: 'Hall',
      },
    });
    expect(
      validatePublishBody(
        { ha_user_id: 'user-1', source_device_id: 'a', target_device_id: 'b' },
        'user-1'
      )
    ).toEqual({
      ok: true,
      value: {
        haUserId: 'user-1',
        sourceDeviceId: 'a',
        targetDeviceId: 'b',
        historyKeepLimit: undefined,
      },
    });
  });
});

describe('icon validators', () => {
  it('normalizes the search query', () => {
    expect(normalizeIconQuery('  LiGhT ')).toBe('light');
    expect(normalizeIconQuery(['light'])).toBe('');
    expect(normalizeIconQuery(undefined)).toBe('');
  });

  it('accepts kebab-case names only', () => {
    expect(validateIconName(' Lightbulb-On ')).toEqual({ ok: true, value: 'lightbulb-on' });
    expect(validateIconName('numeric-1-box')).toEqual({ ok: true, value: 'numeric-1-box' });
    for (const name of ['', undefined, 'bad_name', 'mdi:light', '../x']) {
      expect(validateIconName(name)).toEqual({
        ok: false,
        failure: { status: 400, error: 'Invalid icon name' },
      });
    }
  });
});
