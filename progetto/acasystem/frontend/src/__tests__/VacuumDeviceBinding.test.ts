import { describe, expect, it } from 'vitest';
import type { HaEntityRegistryEntry } from '@/@types/ha';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { isProductDeviceBinding, resolveVacuumDeviceBinding } from '@/utils/devices/productBinding';
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
  fixtureEntity('vacuum.a', 'docked'),
  fixtureEntity('vacuum.b', 'cleaning'),
]);
const resolve = (registry: HaEntityRegistryEntry[], states = entities) =>
  resolveVacuumDeviceBinding('robot-device', devices, registry, states);

describe('Vacuum per esatto dispositivo: binding e ruoli', () => {
  it('non aggrega dispositivi omonimi, stazione o altri robot nella medesima entry hub', () => {
    const registry = [
      row('vacuum.b'),
      row('vacuum.a'),
      row('vacuum.other', { device_id: 'other-device' }),
      row('vacuum.station', { device_id: 'station-device' }),
      row('vacuum.helper', { device_id: null }),
      row('sensor.station', { device_id: 'station-device' }),
    ];
    const namedDevices = devices.map((device) => ({
      ...device,
      name: 'Stesso nome',
      manufacturer: 'Stessa marca',
    }));
    const before = JSON.stringify({ namedDevices, registry, entities });
    const binding = resolveVacuumDeviceBinding('robot-device', namedDevices, registry, entities);
    expect(binding).toEqual({
      version: 1,
      family: 'vacuum',
      deviceId: 'robot-device',
      primaryEntityId: 'vacuum.a',
      channelEntityIds: ['vacuum.a', 'vacuum.b'],
      secondaryEntityIds: [],
      technicalEntityIds: [],
    });
    expect(JSON.stringify({ namedDevices, registry, entities })).toBe(before);
    expect(isProductDeviceBinding(binding)).toBe(true);
  });
  it('include solo ausiliarie proprie, mappa image/camera e ruoli tecnici separati', () => {
    const registry = [
      row('vacuum.a'),
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
      row('vacuum.maintenance', { entity_category: 'config' }),
      row('light.status', { entity_category: 'config' }),
      row('camera.foreign', { device_id: 'other-device' }),
      row('image.station', { device_id: 'station-device' }),
      row('climate.unrelated'),
      row('light.ordinary'),
    ];
    const binding = resolve(registry)!;
    expect(binding.channelEntityIds).toEqual(['vacuum.a']);
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
        'vacuum.maintenance',
        'camera.diagnostic',
        'image.diagnostic',
        'light.status',
      ].sort((a, b) => {
        const technical = new Set([
          'vacuum.maintenance',
          'camera.diagnostic',
          'image.diagnostic',
          'light.status',
        ]);
        return Number(technical.has(a)) - Number(technical.has(b)) || (a < b ? -1 : a > b ? 1 : 0);
      })
    );
    expect(binding.technicalEntityIds).toEqual(
      ['vacuum.maintenance', 'camera.diagnostic', 'image.diagnostic', 'light.status'].sort()
    );
    expect(binding.secondaryEntityIds).not.toContain('light.ordinary');
    expect(isProductDeviceBinding(binding)).toBe(true);
  });
  it('filtra hidden/disabled e deduplica senza modificare il registro', () => {
    const registry = [
      row('vacuum.a'),
      row('vacuum.a'),
      row('vacuum.b', { hidden_by: 'user' }),
      row('vacuum.disabled', { disabled_by: 'integration' }),
      row('image.hidden', { hidden_by: 'user' }),
      row('camera.disabled', { disabled_by: 'user' }),
    ];
    const before = JSON.stringify(registry);
    expect(resolve(registry)?.channelEntityIds).toEqual(['vacuum.a']);
    expect(resolve(registry)?.secondaryEntityIds).toEqual([]);
    expect(JSON.stringify(registry)).toBe(before);
  });
  it.each(['cleaning', 'docked', 'idle', 'paused', 'returning', 'error'])(
    'preferisce lo stato ufficiale %s a stato sconosciuto o anomalo',
    (state) => {
      const registry = [row('vacuum.a'), row('vacuum.b'), row('vacuum.c')];
      const states = fixtureEntities([
        fixtureEntity('vacuum.a', 'constructor'),
        fixtureEntity('vacuum.b', state),
      ]);
      expect(resolve(registry, states)).toMatchObject({
        primaryEntityId: 'vacuum.b',
        channelEntityIds: ['vacuum.a', 'vacuum.b', 'vacuum.c'],
      });
      expect(states['vacuum.c']).toBeUndefined();
    }
  );
  it('usa stato presente non unknown prima del fallback indisponibile e non inventa snapshot', () => {
    const registry = [row('vacuum.a'), row('vacuum.b'), row('vacuum.c')];
    const states = fixtureEntities([
      fixtureEntity('vacuum.a', 'unavailable'),
      fixtureEntity('vacuum.b', 'vendor_state'),
    ]);
    expect(resolve(registry, states)?.primaryEntityId).toBe('vacuum.b');
    expect(
      resolve(registry, fixtureEntities([fixtureEntity('vacuum.a', 'unknown')]))?.primaryEntityId
    ).toBe('vacuum.a');
    expect(resolve(registry, {})).toBeNull();
  });
  it('rivaluta il primario disabilitato senza riusare canali precedenti', () => {
    const registry = [row('vacuum.a'), row('vacuum.b')];
    expect(resolve(registry)?.primaryEntityId).toBe('vacuum.a');
    expect(
      resolve(
        registry.map((entry) =>
          entry.entity_id === 'vacuum.a' ? { ...entry, disabled_by: 'user' } : entry
        )
      )
    ).toMatchObject({ primaryEntityId: 'vacuum.b', channelEntityIds: ['vacuum.b'] });
  });
  it('rifiuta device assente/disabilitato o senza canali ordinari', () => {
    expect(resolveVacuumDeviceBinding('missing', devices, [row('vacuum.a')], entities)).toBeNull();
    expect(
      resolveVacuumDeviceBinding(
        'robot-device',
        [{ id: 'robot-device', disabled_by: 'user' }],
        [row('vacuum.a')],
        entities
      )
    ).toBeNull();
    for (const entity_category of ['config', 'diagnostic'])
      expect(resolve([row('vacuum.a', { entity_category })])).toBeNull();
    expect(resolve([row('image.map'), row('camera.map'), row('sensor.battery')])).toBeNull();
  });
  it('persiste solo i sette campi identità/ruoli, mai mappe, token, URL o attributi', () => {
    const secret = 'SYNTHETIC_ROBOT_SECRET';
    const registry = [
      row('vacuum.a', { access_token: secret, stream_url: secret }),
      row('camera.map'),
      row('image.map'),
    ];
    const states = fixtureEntities([
      fixtureEntity('vacuum.a', 'cleaning', {
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
      row('vacuum.b'),
      row('sensor.temperature'),
      row('vacuum.a'),
      row('camera.map'),
      row('number.offset', { entity_category: 'config' }),
    ];
    const binding = resolve(registry);
    expect(binding).toEqual(resolve([...registry].reverse()));
    expect(binding?.primaryEntityId).toBe('vacuum.a');
  });
  it('rifiuta canali di altro dominio, ruoli sovrapposti, duplicati e famiglia prototype', () => {
    const binding = resolve([row('vacuum.a')])!;
    for (const invalid of [
      { ...binding, primaryEntityId: 'switch.a', channelEntityIds: ['switch.a'] },
      { ...binding, channelEntityIds: ['vacuum.a', 'camera.map'] },
      { ...binding, primaryEntityId: 'vacuum.missing' },
      { ...binding, channelEntityIds: ['vacuum.a', 'vacuum.a'] },
      { ...binding, technicalEntityIds: ['vacuum.a'] },
      { ...binding, secondaryEntityIds: ['vacuum.a'] },
      { ...binding, technicalEntityIds: ['sensor.foreign'] },
      { ...binding, family: 'constructor' },
      { ...binding, family: '__proto__' },
    ])
      expect(isProductDeviceBinding(invalid)).toBe(false);
  });
});

describe('Vacuum: priorità classificazione preservata', () => {
  it.each(['config', 'diagnostic'])(
    'il LED %s non precede il robot ordinario',
    (entity_category) => {
      expect(
        classifyDevices({
          devices,
          entityRegistry: [row('vacuum.a'), row('light.led', { entity_category })],
          entities: { ...entities, 'light.led': fixtureEntity('light.led', 'on') },
        })
      ).toMatchObject([{ family: 'vacuum', widgetType: 'vacuum', primaryEntityId: 'vacuum.a' }]);
    }
  );
  it.each(['config', 'diagnostic'])(
    'il robot %s non è un canale prodotto e lascia il relè ordinario',
    (entity_category) => {
      const technical = row('vacuum.a', { entity_category });
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
      row('vacuum.a'),
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
        entityRegistry: [row('vacuum.a'), row('camera.view'), row('switch.output')],
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
        entityRegistry: [row('vacuum.a'), row('switch.output')],
        entities: { ...entities, 'switch.output': fixtureEntity('switch.output', 'on') },
      })
    ).toMatchObject([{ family: 'vacuum' }]);
  });
  it('una camera tecnica è una secondaria e non prevale sulla classificazione robot', () => {
    const states = { ...entities, 'camera.map': fixtureEntity('camera.map', 'idle') };
    expect(
      classifyDevices({
        devices,
        entityRegistry: [row('vacuum.a'), row('camera.map', { entity_category: 'diagnostic' })],
        entities: states,
      })
    ).toMatchObject([{ family: 'vacuum' }]);
  });
});
