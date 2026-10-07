// @vitest-environment node

import express from 'express';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDataCrypto } from '../helpers/dataCrypto.ts';
import { openDatabase } from '../models/database.ts';
import type { SqliteDatabase } from '../models/database.ts';
import { createProfilesRouter } from '../routes/profiles.ts';
import { createSettingsRouter } from '../routes/settings.ts';

/**
 * HTTP contract of /api/profiles and /api/settings (status codes and JSON shapes),
 * with the real schema and a fake authenticated user (x-test-user-id).
 */

const plainCrypto = createDataCrypto({ mode: 'off', key: '', salt: '' });

let server: Server;
let database: SqliteDatabase;

const request = async (
  path: string,
  { method = 'GET', body, json = true }: { method?: string; body?: unknown; json?: boolean } = {}
) => {
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('No TCP address');
  const headers = new Headers({ 'x-test-user-id': 'user-1' });
  if (body !== undefined && json) headers.set('content-type', 'application/json');
  return fetch(`http://127.0.0.1:${address.port}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
};

beforeEach(async () => {
  database = openDatabase(':memory:');
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const userId = req.get('x-test-user-id');
    if (userId) req.authenticatedHaUser = { id: userId, name: '', is_admin: false, is_owner: false };
    next();
  });
  app.use('/api/profiles', createProfilesRouter(database, plainCrypto));
  app.use('/api/settings', createSettingsRouter(database, plainCrypto));
  server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  database.close();
});

describe('profiles API', () => {
  it('creates (201), lists, reads and deletes profiles', async () => {
    const created = await request('/api/profiles', {
      method: 'POST',
      body: { ha_user_id: 'user-1', name: 'Tablet', data: { version: 1 } },
    });
    expect(created.status).toBe(201);
    const profile: unknown = await created.json();
    expect(profile).toEqual({
      id: expect.any(String),
      ha_user_id: 'user-1',
      name: 'Tablet',
      data: { version: 1 },
      created_at: expect.any(String),
      updated_at: expect.any(String),
    });
    const id = (profile as { id: string }).id;

    const list = await request('/api/profiles?ha_user_id=user-1');
    await expect(list.json()).resolves.toEqual([
      expect.objectContaining({ id, device_label: null, data: { version: 1 } }),
    ]);

    const single = await request(`/api/profiles/${id}`);
    await expect(single.json()).resolves.toMatchObject({ id, name: 'Tablet' });

    const removed = await request(`/api/profiles/${id}`, { method: 'DELETE' });
    await expect(removed.json()).resolves.toEqual({ success: true });

    const missing = await request(`/api/profiles/${id}`);
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: 'Profile not found' });
  });

  it('answers 400 for missing fields', async () => {
    const response = await request('/api/profiles', {
      method: 'POST',
      body: { ha_user_id: 'user-1', name: 'Tablet' },
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'ha_user_id, name, and data are required',
    });
  });
});

describe('settings API', () => {
  it('writes, reads and conflicts on the current snapshot', async () => {
    const first = await request('/api/settings/current', {
      method: 'PUT',
      body: { ha_user_id: 'user-1', device_id: 'tablet', data: { v: 1 }, device_label: 'Hall' },
    });
    await expect(first.json()).resolves.toEqual({
      ha_user_id: 'user-1',
      device_id: 'tablet',
      revision: 1,
      updated_at: expect.any(String),
    });

    const conflict = await request('/api/settings/current', {
      method: 'PUT',
      body: { ha_user_id: 'user-1', device_id: 'tablet', data: { v: 2 } },
    });
    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toEqual({ error: 'Revision conflict', revision: 1 });

    const current = await request('/api/settings/current?ha_user_id=user-1&device_id=tablet');
    await expect(current.json()).resolves.toEqual({
      ha_user_id: 'user-1',
      device_id: 'tablet',
      data: { v: 1 },
      revision: 1,
      device_label: 'Hall',
      updated_at: expect.any(String),
    });

    const none = await request('/api/settings/current?ha_user_id=user-1&device_id=phone');
    expect(none.status).toBe(200);
    await expect(none.json()).resolves.toBeNull();

    const history = await request('/api/settings/history?ha_user_id=user-1&device_id=tablet');
    await expect(history.json()).resolves.toEqual([
      { revision: 1, updated_at: expect.any(String) },
    ]);
  });

  it('manages devices and their labels', async () => {
    await request('/api/settings/current', {
      method: 'PUT',
      body: { ha_user_id: 'user-1', device_id: 'tablet', data: { v: 1 } },
    });

    const label = await request('/api/settings/devices/label', {
      method: 'PUT',
      body: { ha_user_id: 'user-1', device_id: 'tablet', device_label: 'Wall' },
    });
    await expect(label.json()).resolves.toEqual({
      success: true,
      ha_user_id: 'user-1',
      device_id: 'tablet',
      device_label: 'Wall',
    });

    const devices = await request('/api/settings/devices?ha_user_id=user-1');
    await expect(devices.json()).resolves.toEqual([
      { device_id: 'tablet', device_label: 'Wall', revision: 1, updated_at: expect.any(String) },
    ]);

    const missing = await request('/api/settings/devices/label', {
      method: 'PUT',
      body: { ha_user_id: 'user-1', device_id: 'phone' },
    });
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: 'Device not found' });

    const removed = await request('/api/settings/devices?ha_user_id=user-1&device_id=tablet', {
      method: 'DELETE',
    });
    await expect(removed.json()).resolves.toEqual({
      success: true,
      deleted_current: 1,
      deleted_history: 1,
    });
  });

  it('keeps the original 400 messages and the 500 for a write without a JSON body', async () => {
    const noDevice = await request('/api/settings/history?ha_user_id=user-1');
    expect(noDevice.status).toBe(400);
    await expect(noDevice.json()).resolves.toEqual({
      error: 'ha_user_id and device_id query parameters are required',
    });

    const mismatch = await request('/api/settings/devices?ha_user_id=user-2');
    expect(mismatch.status).toBe(403);

    const withoutBody = await request('/api/settings/current', {
      method: 'PUT',
      body: { ignored: true },
      json: false,
    });
    expect(withoutBody.status).toBe(500);
  });
});
