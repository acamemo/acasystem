import { describe, expect, it } from 'vitest';
import type { HaEntityRegistryEntry } from '@/@types/ha';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { isProductDeviceBinding, resolveMowerDeviceBinding } from '@/utils/devices/productBinding';
import { classifyDevices } from '@/utils/devices/classify';

const devices = [
  { id: 'robot-device', config_entries: ['hub'] },
  { id: 'station-device', config_entries: ['hub'] },
  { id: 'other-device', config_entries: ['hub'] },
];
const row = (entity_id: string, extra: Record<string, unknown> = {}): HaEntityRegistryEntry => ({
  entity_id,
  device_id: 'robot-device',
  config_entry_id: 'hub',
  ...extra,
});
const entities = fixtureEntities([
  fixtureEntity('lawn_mower.a', 'docked'),
  fixtureEntity('lawn_mower.b', 'mowing'),
]);
const resolve = (registry: HaEntityRegistryEntry[], states = entities) =>
  resolveMowerDeviceBinding('robot-device', devices, registry, states);

describe('Mower per esatto dispositivo: binding e ruoli', () => {
  it('non aggrega dispositivi omonimi, stazione o altri robot nella medesima entry hub', () => {
    const registry = [
      row('lawn_mower.b'),
      row('lawn_mower.a'),
      row('lawn_mower.other', { device_id: 'other-device' }),
      row('lawn_mower.station', { device_id: 'station-device' }),
      row('lawn_mower.helper', { device_id: null }),
      row('sensor.station', { device_id: 'station-device' }),
    ];
    const namedDevices = devices.map((device) => ({
      ...device,
      name: 'Stesso nome',
      manufacturer: 'Stessa marca',
    }));
    const before = JSON.stringify({ namedDevices, registry, entities });
    const binding = resolveMowerDeviceBinding('robot-device', namedDevices, registry, entities);
    expect(binding).toEqual({
      version: 1,
      family: 'mower',
      deviceId: 'robot-device',
      primaryEntityId: 'lawn_mower.a',
      channelEntityIds: ['lawn_mower.a', 'lawn_mower.b'],
      secondaryEntityIds: [],
      technicalEntityIds: [],
    });
    expect(JSON.stringify({ namedDevices, registry, entities })).toBe(before);
    expect(isProductDeviceBinding(binding)).toBe(true);
  });
  it('include solo ausiliarie proprie, mappa image/camera e ruoli tecnici separati', () => {
    const registry = [
      row('lawn_mower.a'),
      row('sensor.battery'),
      row('binary_sensor.obstruction'),
      row('switch.mop'),
      row('number.water'),
      row('select.room'),
      row('button.locate'),
      row('event.service'),
      row('update.firmware'),
      row('image.map'),
      row('camera.map'),
      row('image.diagnostic', { entity_category: 'diagnostic' }),
      row('camera.diagnostic', { entity_category: 'diagnostic' }),
      row('lawn_mower.maintenance', { entity_category: 'config' }),
      row('light.status', { entity_category: 'config' }),
      row('camera.foreign', { device_id: 'other-device' }),
      row('image.station', { device_id: 'station-device' }),
      row('climate.unrelated'),
      row('light.ordinary'),
    ];
    const binding = resolve(registry)!;
    expect(binding.channelEntityIds).toEqual(['lawn_mower.a']);
    expect(binding.secondaryEntityIds).toEqual(
      [
        'binary_sensor.obstruction',
        'button.locate',
        'camera.map',
        'event.service',
        'image.map',
        'number.water',
        'select.room',
        'sensor.battery',
        'switch.mop',
        'update.firmware',
        'lawn_mower.maintenance',
        'camera.diagnostic',
        'image.diagnostic',
        'light.status',
      ].sort((a, b) => {
        const technical = new Set([
          'lawn_mower.maintenance',
          'camera.diagnostic',
          'image.diagnostic',
          'light.status',
        ]);
        return Number(technical.has(a)) - Number(technical.has(b)) || (a < b ? -1 : a > b ? 1 : 0);
      })
    );
    expect(binding.technicalEntityIds).toEqual(
      ['lawn_mower.maintenance', 'camera.diagnostic', 'image.diagnostic', 'light.status'].sort()
    );
    expect(binding.secondaryEntityIds).not.toContain('light.ordinary');
    expect(isProductDeviceBinding(binding)).toBe(true);
  });
  it('filtra hidden/disabled e deduplica senza modificare il registro', () => {
    const registry = [
      row('lawn_mower.a'),
      row('lawn_mower.a'),
      row('lawn_mower.b', { hidden_by: 'user' }),
      row('lawn_mower.disabled', { disabled_by: 'integration' }),
      row('image.hidden', { hidden_by: 'user' }),
      row('camera.disabled', { disabled_by: 'user' }),
    ];
    const before = JSON.stringify(registry);
    expect(resolve(registry)?.channelEntityIds).toEqual(['lawn_mower.a']);
    expect(resolve(registry)?.secondaryEntityIds).toEqual([]);
    expect(JSON.stringify(registry)).toBe(before);
  });
  it.each(['mowing', 'docked', 'idle', 'paused', 'returning', 'error'])(
    'preferisce lo stato ufficiale %s a stato sconosciuto o anomalo',
    (state) => {
      const registry = [row('lawn_mower.a'), row('lawn_mower.b'), row('lawn_mower.c')];
      const states = fixtureEntities([
        fixtureEntity('lawn_mower.a', 'constructor'),
        fixtureEntity('lawn_mower.b', state),
      ]);
      expect(resolve(registry, states)).toMatchObject({
        primaryEntityId: 'lawn_mower.b',
        channelEntityIds: ['lawn_mower.a', 'lawn_mower.b', 'lawn_mower.c'],
      });
      expect(states['lawn_mower.c']).toBeUndefined();
    }
  );
  it('usa stato presente non unknown prima del fallback indisponibile e non inventa snapshot', () => {
    const registry = [row('lawn_mower.a'), row('lawn_mower.b'), row('lawn_mower.c')];
    const states = fixtureEntities([
      fixtureEntity('lawn_mower.a', 'unavailable'),
      fixtureEntity('lawn_mower.b', 'vendor_state'),
    ]);
    expect(resolve(registry, states)?.primaryEntityId).toBe('lawn_mower.b');
    expect(
      resolve(registry, fixtureEntities([fixtureEntity('lawn_mower.a', 'unknown')]))
        ?.primaryEntityId
    ).toBe('lawn_mower.a');
    expect(resolve(registry, {})).toBeNull();
  });
  it('rivaluta il primario disabilitato senza riusare canali precedenti', () => {
    const registry = [row('lawn_mower.a'), row('lawn_mower.b')];
    expect(resolve(registry)?.primaryEntityId).toBe('lawn_mower.a');
    expect(
      resolve(
        registry.map((entry) =>
          entry.entity_id === 'lawn_mower.a' ? { ...entry, disabled_by: 'user' } : entry
        )
      )
    ).toMatchObject({ primaryEntityId: 'lawn_mower.b', channelEntityIds: ['lawn_mower.b'] });
  });
  it('rifiuta device assente/disabilitato o senza canali ordinari', () => {
    expect(
      resolveMowerDeviceBinding('missing', devices, [row('lawn_mower.a')], entities)
    ).toBeNull();
    expect(
      resolveMowerDeviceBinding(
        'robot-device',
        [{ id: 'robot-device', disabled_by: 'user' }],
        [row('lawn_mower.a')],
        entities
      )
    ).toBeNull();
    for (const entity_category of ['config', 'diagnostic'])
      expect(resolve([row('lawn_mower.a', { entity_category })])).toBeNull();
    expect(resolve([row('image.map'), row('camera.map'), row('sensor.battery')])).toBeNull();
  });
  it('persiste solo i sette campi identità/ruoli, mai mappe, token, URL o attributi', () => {
    const secret = 'SYNTHETIC_ROBOT_SECRET';
    const registry = [
      row('lawn_mower.a', { access_token: secret, stream_url: secret }),
      row('camera.map'),
      row('image.map'),
    ];
    const states = fixtureEntities([
      fixtureEntity('lawn_mower.a', 'mowing', {
        map: { data: secret },
        fan_speed_list: [secret],
        supported_features: 65535,
      }),
      fixtureEntity('camera.map', 'idle', {
        access_token: secret,
        entity_picture: '/api/camera_proxy/map?token=' + secret,
      }),
      fixtureEntity('image.map', '2026-11-11', {
        entity_picture: 'https://invalid.example/' + secret,
      }),
    ]);
    const binding = resolve(registry, states)!;
    expect(Object.keys(binding).sort()).toEqual(
      [
        'version',
        'family',
        'deviceId',
        'primaryEntityId',
        'channelEntityIds',
        'secondaryEntityIds',
        'technicalEntityIds',
      ].sort()
    );
    expect(JSON.stringify(binding)).not.toContain(secret);
    expect(binding).not.toHaveProperty('supported_features');
    expect(binding).not.toHaveProperty('entity_picture');
  });
  it('ha risultato deterministico e primario ordinato invertendo i registri', () => {
    const registry = [
      row('lawn_mower.b'),
      row('sensor.temperature'),
      row('lawn_mower.a'),
      row('camera.map'),
      row('number.offset', { entity_category: 'config' }),
    ];
    const binding = resolve(registry);
    expect(binding).toEqual(resolve([...registry].reverse()));
    expect(binding?.primaryEntityId).toBe('lawn_mower.a');
  });
  it('rifiuta canali di altro dominio, ruoli sovrapposti, duplicati e famiglia prototype', () => {
    const binding = resolve([row('lawn_mower.a')])!;
    for (const invalid of [
      { ...binding, primaryEntityId: 'switch.a', channelEntityIds: ['switch.a'] },
      { ...binding, channelEntityIds: ['lawn_mower.a', 'camera.map'] },
      { ...binding, primaryEntityId: 'lawn_mower.missing' },
      { ...binding, channelEntityIds: ['lawn_mower.a', 'lawn_mower.a'] },
      { ...binding, technicalEntityIds: ['lawn_mower.a'] },
      { ...binding, secondaryEntityIds: ['lawn_mower.a'] },
      { ...binding, technicalEntityIds: ['sensor.foreign'] },
      { ...binding, family: 'constructor' },
      { ...binding, family: '__proto__' },
    ])
      expect(isProductDeviceBinding(invalid)).toBe(false);
  });
});

describe('Mower: priorità classificazione preservata', () => {
  it.each(['config', 'diagnostic'])(
    'il LED %s non precede il robot ordinario',
    (entity_category) => {
      expect(
        classifyDevices({
          devices,
          entityRegistry: [row('lawn_mower.a'), row('light.led', { entity_category })],
          entities: { ...entities, 'light.led': fixtureEntity('light.led', 'on') },
        })
      ).toMatchObject([{ family: 'mower', widgetType: 'mower', primaryEntityId: 'lawn_mower.a' }]);
    }
  );
  it.each(['config', 'diagnostic'])(
    'il robot %s non è un canale prodotto e lascia il relè ordinario',
    (entity_category) => {
      const technical = row('lawn_mower.a', { entity_category });
      expect(classifyDevices({ devices, entityRegistry: [technical], entities })).toEqual([]);
      expect(
        classifyDevices({
          devices,
          entityRegistry: [technical, row('switch.outlet')],
          entities: { ...entities, 'switch.outlet': fixtureEntity('switch.outlet', 'on') },
        })
      ).toMatchObject([{ family: 'plug', primaryEntityId: 'switch.outlet' }]);
    }
  );
  it('preserva la precedenza della luce ordinaria anche se il primo stato è in ritardo', () => {
    const registry = [
      row('lawn_mower.a'),
      row('light.led', { entity_category: 'diagnostic' }),
      row('light.main'),
    ];
    const states = {
      ...entities,
      ...fixtureEntities([fixtureEntity('light.led', 'on'), fixtureEntity('light.main', 'on')]),
    };
    expect(classifyDevices({ devices, entityRegistry: registry, entities: states })).toMatchObject([
      { family: 'light' },
    ]);
    delete states['light.main'];
    expect(classifyDevices({ devices, entityRegistry: registry, entities: states })).toMatchObject([
      { family: 'light' },
    ]);
  });
  it('mantiene la camera ordinaria prima del robot e il robot prima di un relè ausiliario', () => {
    expect(
      classifyDevices({
        devices,
        entityRegistry: [row('lawn_mower.a'), row('camera.view'), row('switch.output')],
        entities: {
          ...entities,
          ...fixtureEntities([
            fixtureEntity('camera.view', 'idle'),
            fixtureEntity('switch.output', 'on'),
          ]),
        },
      })
    ).toMatchObject([{ family: 'camera' }]);
    expect(
      classifyDevices({
        devices,
        entityRegistry: [row('lawn_mower.a'), row('switch.output')],
        entities: { ...entities, 'switch.output': fixtureEntity('switch.output', 'on') },
      })
    ).toMatchObject([{ family: 'mower' }]);
  });
  it('una camera tecnica è una secondaria e non prevale sulla classificazione robot', () => {
    const states = { ...entities, 'camera.map': fixtureEntity('camera.map', 'idle') };
    expect(
      classifyDevices({
        devices,
        entityRegistry: [row('lawn_mower.a'), row('camera.map', { entity_category: 'diagnostic' })],
        entities: states,
      })
    ).toMatchObject([{ family: 'mower' }]);
  });
});
