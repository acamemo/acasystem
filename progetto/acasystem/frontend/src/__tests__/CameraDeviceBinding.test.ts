import { describe, expect, it } from 'vitest';
import type { HaEntityRegistryEntry } from '@/@types/ha';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { isProductDeviceBinding, resolveCameraDeviceBinding } from '@/utils/devices/productBinding';
import { classifyDevices } from '@/utils/devices/classify';

const devices = [
  { id: 'camera-device', config_entries: ['hub'] },
  { id: 'other', config_entries: ['hub'] },
];
const row = (entity_id: string, extra: Record<string, unknown> = {}): HaEntityRegistryEntry => ({
  entity_id,
  device_id: 'camera-device',
  config_entry_id: 'hub',
  ...extra,
});
const entities = fixtureEntities([
  fixtureEntity('camera.a', 'idle'),
  fixtureEntity('camera.b', 'recording'),
]);
const resolve = (registry: HaEntityRegistryEntry[], states = entities) =>
  resolveCameraDeviceBinding('camera-device', devices, registry, states);

describe('Videocamera prodotto: associazione esatta per dispositivo', () => {
  it('raccoglie tutti i canali ordinari senza aggregare altre videocamere della entry hub', () => {
    const registry = [
      row('camera.b'),
      row('camera.a'),
      row('camera.other', { device_id: 'other' }),
      row('camera.helper', { device_id: null }),
      row('sensor.other', { device_id: 'other' }),
    ];
    const before = JSON.stringify({ devices, registry, entities });
    expect(resolve(registry)).toEqual({
      version: 1,
      family: 'camera',
      deviceId: 'camera-device',
      primaryEntityId: 'camera.a',
      channelEntityIds: ['camera.a', 'camera.b'],
      secondaryEntityIds: [],
      technicalEntityIds: [],
    });
    expect(JSON.stringify({ devices, registry, entities })).toBe(before);
  });
  it('include floodlight ordinaria e tecnica, otto domini ausiliari e camera tecniche separate', () => {
    const registry = [
      row('camera.a'),
      row('light.floodlight'),
      row('light.status', { entity_category: 'config' }),
      row('camera.maintenance', { entity_category: 'diagnostic' }),
      row('sensor.signal'),
      row('binary_sensor.motion'),
      row('switch.siren'),
      row('number.exposure', { entity_category: 'config' }),
      row('select.mode'),
      row('button.identify'),
      row('event.motion'),
      row('update.firmware'),
      row('climate.other'),
      row('media_player.other'),
      row('light.foreign', { device_id: 'other' }),
    ];
    const binding = resolve(registry)!;
    expect(binding.channelEntityIds).toEqual(['camera.a']);
    expect(binding.secondaryEntityIds).toEqual([
      'binary_sensor.motion',
      'button.identify',
      'event.motion',
      'light.floodlight',
      'select.mode',
      'sensor.signal',
      'switch.siren',
      'update.firmware',
      'camera.maintenance',
      'light.status',
      'number.exposure',
    ]);
    expect(binding.technicalEntityIds).toEqual([
      'camera.maintenance',
      'light.status',
      'number.exposure',
    ]);
    expect(isProductDeviceBinding(binding)).toBe(true);
  });
  it('filtra hidden/disabled e deduplica senza modificare o abilitare il registro', () => {
    const registry = [
      row('camera.a'),
      row('camera.a'),
      row('camera.b', { hidden_by: 'user' }),
      row('camera.disabled', { disabled_by: 'integration' }),
      row('light.hidden', { hidden_by: 'integration' }),
      row('sensor.disabled', { disabled_by: 'user' }),
    ];
    const before = JSON.stringify(registry);
    expect(resolve(registry)?.channelEntityIds).toEqual(['camera.a']);
    expect(resolve(registry)?.secondaryEntityIds).toEqual([]);
    expect(JSON.stringify(registry)).toBe(before);
  });
  it.each(['idle', 'streaming', 'recording'])(
    'preferisce il primario %s rispetto a uno stato indisponibile',
    (state) => {
      const registry = [row('camera.a'), row('camera.b'), row('camera.c')];
      const states = fixtureEntities([
        fixtureEntity('camera.a', 'unavailable'),
        fixtureEntity('camera.b', state),
      ]);
      expect(resolve(registry, states)).toMatchObject({
        primaryEntityId: 'camera.b',
        channelEntityIds: ['camera.a', 'camera.b', 'camera.c'],
      });
      expect(states['camera.c']).toBeUndefined();
    }
  );
  it('mantiene canali senza stato e usa qualunque entità presente soltanto come fallback', () => {
    const registry = [row('camera.a'), row('camera.b')];
    const states = fixtureEntities([fixtureEntity('camera.b', 'unknown')]);
    expect(resolve(registry, states)).toMatchObject({
      primaryEntityId: 'camera.b',
      channelEntityIds: ['camera.a', 'camera.b'],
    });
    expect(resolve(registry, {})).toBeNull();
  });
  it('rivaluta il primario dopo la disabilitazione e non riutilizza canali obsoleti', () => {
    const registry = [row('camera.a'), row('camera.b')];
    expect(resolve(registry)?.primaryEntityId).toBe('camera.a');
    expect(
      resolve(
        registry.map((entry) =>
          entry.entity_id === 'camera.a' ? { ...entry, disabled_by: 'user' } : entry
        )
      )
    ).toMatchObject({ primaryEntityId: 'camera.b', channelEntityIds: ['camera.b'] });
  });
  it('rifiuta device mancanti/disabilitati e dispositivi privi di camera ordinaria', () => {
    expect(resolveCameraDeviceBinding('missing', devices, [row('camera.a')], entities)).toBeNull();
    expect(
      resolveCameraDeviceBinding(
        'camera-device',
        [{ id: 'camera-device', disabled_by: 'user' }],
        [row('camera.a')],
        entities
      )
    ).toBeNull();
    for (const entity_category of ['config', 'diagnostic'])
      expect(resolve([row('camera.a', { entity_category })])).toBeNull();
    expect(resolve([row('light.floodlight'), row('sensor.motion')])).toBeNull();
  });
  it('non persiste token, immagini, URL o attributi del canale e delle ausiliarie', () => {
    const secret = 'FAKE_CAMERA_SECRET_NOT_TO_PERSIST';
    const registry = [
      row('camera.a', { access_token: secret }),
      row('number.configuration', { entity_category: 'config', stream_url: secret }),
    ];
    const states = fixtureEntities([
      fixtureEntity('camera.a', 'streaming', {
        access_token: secret,
        entity_picture: '/api/camera_proxy/a?token=' + secret,
        stream_source: 'rtsp://example.invalid/' + secret,
        frontend_stream_type: 'hls',
        supported_features: 3,
      }),
      fixtureEntity('number.configuration', '12', { access_token: secret }),
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
    expect(binding).not.toHaveProperty('entity_picture');
    expect(binding).not.toHaveProperty('supported_features');
  });
  it('è deterministico al cambio di ordine dei registri', () => {
    const registry = [
      row('camera.b'),
      row('sensor.temperature'),
      row('light.floodlight'),
      row('camera.a'),
      row('number.offset', { entity_category: 'config' }),
    ];
    expect(resolve(registry)).toEqual(resolve([...registry].reverse()));
  });
  it('rifiuta camere con canali di altro dominio, duplicati, primario fuori canali e ruoli sovrapposti', () => {
    const binding = resolve([row('camera.a')])!;
    expect(isProductDeviceBinding(binding)).toBe(true);
    for (const invalid of [
      { ...binding, primaryEntityId: 'switch.a', channelEntityIds: ['switch.a'] },
      { ...binding, channelEntityIds: ['camera.a', 'light.b'] },
      { ...binding, primaryEntityId: 'camera.missing' },
      { ...binding, channelEntityIds: ['camera.a', 'camera.a'] },
      { ...binding, technicalEntityIds: ['camera.a'] },
      { ...binding, secondaryEntityIds: ['camera.a'] },
      { ...binding, technicalEntityIds: ['sensor.foreign'] },
    ])
      expect(isProductDeviceBinding(invalid)).toBe(false);
  });
});

describe('Videocamera prodotto: classificazione e famiglie preesistenti', () => {
  it('camera ordinaria precede luce ordinaria, cover, lock e relè dello stesso dispositivo', () => {
    const registry = [
      row('light.floodlight'),
      row('cover.blind'),
      row('lock.door'),
      row('switch.output'),
      row('camera.b'),
      row('camera.a', { entity_category: 'config' }),
    ];
    const states = {
      ...entities,
      ...fixtureEntities([
        fixtureEntity('light.floodlight', 'on'),
        fixtureEntity('cover.blind', 'open'),
        fixtureEntity('lock.door', 'locked'),
        fixtureEntity('switch.output', 'on'),
      ]),
    };
    expect(classifyDevices({ devices, entityRegistry: registry, entities: states })).toMatchObject([
      {
        family: 'camera',
        widgetType: 'camera',
        primaryEntityId: 'camera.b',
        entityIds: ['camera.b'],
      },
    ]);
  });
  it.each(['config', 'diagnostic'])(
    'camera %s non identifica un prodotto e non prevale sulla sua luce ordinaria',
    (entity_category) => {
      const technical = row('camera.a', { entity_category });
      expect(classifyDevices({ devices, entityRegistry: [technical], entities })).toEqual([]);
      expect(
        classifyDevices({
          devices,
          entityRegistry: [technical, row('light.floodlight')],
          entities: { ...entities, 'light.floodlight': fixtureEntity('light.floodlight', 'on') },
        })
      ).toMatchObject([{ family: 'light', primaryEntityId: 'light.floodlight' }]);
    }
  );
  it('mantiene il relè ordinario quando camera è solo manutenzione', () => {
    expect(
      classifyDevices({
        devices,
        entityRegistry: [row('camera.a', { entity_category: 'config' }), row('switch.output')],
        entities: { ...entities, 'switch.output': fixtureEntity('switch.output', 'on') },
      })
    ).toMatchObject([{ family: 'plug', primaryEntityId: 'switch.output' }]);
  });
  it('preserva la precedenza preesistente di clima rispetto a camera', () => {
    expect(
      classifyDevices({
        devices,
        entityRegistry: [row('camera.a'), row('climate.room')],
        entities: { ...entities, 'climate.room': fixtureEntity('climate.room', 'heat') },
      })
    ).toMatchObject([{ family: 'climate', primaryEntityId: 'climate.room' }]);
  });
  it.each([
    ['light', 'light.a'],
    ['plug', 'switch.a'],
    ['climate', 'climate.a'],
    ['cover', 'cover.a'],
    ['fan', 'fan.a'],
    ['lock', 'lock.a'],
    ['alarm', 'alarm_control_panel.a'],
  ])('preserva la guardia per %s e il divieto di canali tecnici', (family, entityId) => {
    const binding = {
      version: 1,
      family,
      deviceId: 'existing',
      primaryEntityId: entityId,
      channelEntityIds: [entityId],
      secondaryEntityIds: ['sensor.battery'],
      technicalEntityIds: ['sensor.battery'],
    };
    expect(isProductDeviceBinding(binding)).toBe(true);
    expect(
      isProductDeviceBinding({ ...binding, channelEntityIds: [entityId, 'camera.foreign'] })
    ).toBe(false);
    if (family !== 'light')
      expect(isProductDeviceBinding({ ...binding, technicalEntityIds: [entityId] })).toBe(false);
  });
});
