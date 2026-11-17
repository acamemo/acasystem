import { describe, expect, it } from 'vitest';
import { devicesAfterAdd, oneWidgetPerDevice } from '@/templates/discovery/selectionAfterAdd';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection } from './UtilityHarness';
import { entryDto } from './devicesFakeServer';

describe('dispositivi reali di una nuova integrazione', () => {
  it('legge tutti i device dell’entry, oltre il primo campione e le prime venti entità', async () => {
    const devices = Array.from({ length: 24 }, (_, index) => ({
      id: `lamp-${index}`, name: `Luce ${index}`, config_entries: ['hub-entry'],
    }));
    const registry = devices.map((device, index) => ({
      entity_id: `light.lamp_${index}`, device_id: device.id, platform: 'hue', config_entry_id: 'hub-entry',
    }));
    const conn = fakeConnection({
      'config/device_registry/list': () => [...devices, { id: 'other', name: 'Altra luce', config_entries: ['other-entry'] }],
      'config/entity_registry/list': () => [...registry, { entity_id: 'light.other', device_id: 'other', platform: 'hue', config_entry_id: 'other-entry' }],
    });
    const runtime = createFixtureRuntime({ conn: conn.conn, entities: fixtureEntities([
      ...registry.map((entry) => fixtureEntity(entry.entity_id, 'off')), fixtureEntity('light.other', 'on'),
    ]) });
    const result = await devicesAfterAdd(runtime, entryDto({
      entryId: 'hub-entry', domain: 'hue', device: null,
      entities: registry.slice(0, 20).map((entry) => entry.entity_id),
    }));
    expect(result.devices).toHaveLength(24);
    expect(new Set(result.devices.map((device) => device.deviceId))).toEqual(new Set(devices.map((device) => device.id)));
    expect(result.devices.every((device) => device.family === 'light')).toBe(true);
    expect(result.singleDevice).toBe(false);
  });

  it('non indovina un’identità fisica quando il registro non è disponibile', async () => {
    const conn = fakeConnection({
      'config/device_registry/list': () => { throw new Error('offline'); },
      'config/entity_registry/list': () => [],
    });
    await expect(devicesAfterAdd(createFixtureRuntime({ conn: conn.conn }), entryDto())).resolves.toEqual({ devices: [], singleDevice: false });
  });

  it('un hub tecnico con una sola luce non diventa una entry a dispositivo unico', async () => {
    const conn = fakeConnection({
      'config/device_registry/list': () => [
        { id: 'bridge', name: 'Bridge', config_entries: ['hue-entry'] },
        { id: 'lamp', name: 'Lampada', config_entries: ['hue-entry'] },
      ],
      'config/entity_registry/list': () => [
        { entity_id: 'light.lamp', device_id: 'lamp', platform: 'hue', config_entry_id: 'hue-entry' },
      ],
    });
    const result = await devicesAfterAdd(createFixtureRuntime({ conn: conn.conn,
      entities: fixtureEntities([fixtureEntity('light.lamp', 'off')]),
    }), entryDto({ entryId: 'hue-entry', domain: 'hue', device: null, entities: ['light.lamp'] }));
    expect(result.devices.map((device) => device.deviceId)).toEqual(['lamp']);
    expect(result.singleDevice).toBe(false);
  });
});

describe('oneWidgetPerDevice', () => {
  it('keeps one stream of a camera with two', () => {
    expect(
      oneWidgetPerDevice({
        type: 'camera',
        entityIds: ['camera.reolink_fluent', 'camera.reolink_clear'],
      })
    ).toEqual({ type: 'camera', entityIds: ['camera.reolink_fluent'] });
  });

  it('leaves the other types as they are', () => {
    const lights = { type: 'light', entityIds: ['light.a', 'light.b'] };
    expect(oneWidgetPerDevice(lights)).toBe(lights);
  });
});
