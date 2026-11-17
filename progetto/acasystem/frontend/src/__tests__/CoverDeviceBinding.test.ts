import { describe, expect, it } from 'vitest';
import type { HaEntityRegistryEntry } from '@/@types/ha';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { isProductDeviceBinding, resolveCoverDeviceBinding } from '@/utils/devices/productBinding';
import { classifyDevices } from '@/utils/devices/classify';

const devices = [{ id: 'cover-device', config_entries: ['hub'] }, { id: 'other', config_entries: ['hub'] }];
const row = (entity_id: string, extra: Record<string, unknown> = {}): HaEntityRegistryEntry =>
  ({ entity_id, device_id: 'cover-device', config_entry_id: 'hub', ...extra });
const entities = fixtureEntities([fixtureEntity('cover.a', 'closed'), fixtureEntity('cover.b', 'opening')]);
const resolve = (registry: HaEntityRegistryEntry[], states = entities) =>
  resolveCoverDeviceBinding('cover-device', devices, registry, states);

describe('binding Tapparelle, tende e veneziane per dispositivo', () => {
  it('raccoglie i canali dello stesso dispositivo senza aggregare gli altri terminali della entry hub', () => {
    const registry = [row('cover.b'), row('cover.a'), row('sensor.temperature'), row('binary_sensor.obstruction'),
      row('switch.auxiliary'), row('select.mode'), row('button.identify'), row('event.control'), row('update.firmware'),
      row('cover.other', { device_id: 'other' }), row('sensor.other', { device_id: 'other' }), row('cover.helper', { device_id: null })];
    const before = JSON.stringify({ devices, registry, entities });
    const binding = resolve(registry);
    expect(binding).toEqual({ version: 1, family: 'cover', deviceId: 'cover-device', primaryEntityId: 'cover.a',
      channelEntityIds: ['cover.a', 'cover.b'],
      secondaryEntityIds: ['binary_sensor.obstruction', 'button.identify', 'event.control', 'select.mode', 'sensor.temperature', 'switch.auxiliary', 'update.firmware'],
      technicalEntityIds: [] });
    expect(isProductDeviceBinding(binding)).toBe(true);
    expect(JSON.stringify({ devices, registry, entities })).toBe(before);
  });

  it('separa i cover configurativi, i LED e i sensori tecnici secondo il registro, non secondo il nome', () => {
    const registry = [row('cover.a'), row('cover.calibration', { entity_category: 'config' }),
      row('light.status_led', { entity_category: 'config' }), row('sensor.battery', { entity_category: 'diagnostic' }),
      row('number.offset', { entity_category: 'config' }), row('sensor.signal_name_but_daily'), row('light.ordinary')];
    const binding = resolve(registry);
    expect(binding?.channelEntityIds).toEqual(['cover.a']);
    expect(binding?.primaryEntityId).toBe('cover.a');
    expect(binding?.secondaryEntityIds).toEqual(['sensor.signal_name_but_daily', 'cover.calibration', 'light.status_led', 'number.offset', 'sensor.battery']);
    expect(binding?.technicalEntityIds).toEqual(['cover.calibration', 'light.status_led', 'number.offset', 'sensor.battery']);
    expect(binding?.technicalEntityIds).not.toContain('sensor.signal_name_but_daily');
    expect(isProductDeviceBinding(binding)).toBe(true);
  });

  it('esclude hidden e disabled e deduplica i registri senza abilitare o modificare entità', () => {
    const registry = [row('cover.a'), row('cover.a'), row('cover.b', { hidden_by: 'user' }),
      row('cover.disabled', { disabled_by: 'integration' }), row('sensor.hidden', { hidden_by: 'integration' }),
      row('switch.disabled', { disabled_by: 'user' })];
    const before = JSON.stringify(registry);
    expect(resolve(registry)?.channelEntityIds).toEqual(['cover.a']);
    expect(resolve(registry)?.secondaryEntityIds).toEqual([]);
    expect(JSON.stringify(registry)).toBe(before);
  });

  it('preferisce un canale disponibile e conserva quelli temporaneamente senza stato', () => {
    const registry = [row('cover.a'), row('cover.b'), row('cover.c')];
    const states = fixtureEntities([fixtureEntity('cover.a', 'unavailable'), fixtureEntity('cover.b', 'closing')]);
    const binding = resolve(registry, states);
    expect(binding?.primaryEntityId).toBe('cover.b');
    expect(binding?.channelEntityIds).toEqual(['cover.a', 'cover.b', 'cover.c']);
    expect(states['cover.c']).toBeUndefined();
    expect(resolve(registry, {})).toBeNull();
  });

  it('non inventa posizione, inclinazione, stato o capacità per i canali indisponibili', () => {
    const states = fixtureEntities([fixtureEntity('cover.a', 'unknown'), fixtureEntity('cover.b', 'unavailable')]);
    const binding = resolve([row('cover.b'), row('cover.a')], states);
    expect(binding?.primaryEntityId).toBe('cover.a');
    expect(binding?.channelEntityIds).toEqual(['cover.a', 'cover.b']);
    for (const key of ['current_position', 'current_tilt_position', 'supported_features', 'supported_speeds'])
      expect(states['cover.a']?.attributes).not.toHaveProperty(key);
    expect(binding).not.toHaveProperty('current_position');
    expect(binding).not.toHaveProperty('supported_features');
  });

  it('mantiene un risultato deterministico al cambio di ordine dei registri', () => {
    const registry = [row('cover.b'), row('sensor.temperature'), row('cover.a'), row('number.offset', { entity_category: 'config' })];
    expect(resolve(registry)).toEqual(resolve([...registry].reverse()));
  });

  it('rifiuta dispositivi mancanti, disabilitati, senza cover ordinari o con soli canali tecnici', () => {
    expect(resolveCoverDeviceBinding('missing', devices, [row('cover.a')], entities)).toBeNull();
    expect(resolveCoverDeviceBinding('cover-device', [{ id: 'cover-device', disabled_by: 'user' }], [row('cover.a')], entities)).toBeNull();
    expect(resolve([row('cover.a', { entity_category: 'config' })])).toBeNull();
    expect(resolve([row('cover.a', { entity_category: 'diagnostic' })])).toBeNull();
    expect(resolve([row('sensor.temperature'), row('valve.water'), row('switch.motor')])).toBeNull();
  });

  it('non classifica un cover tecnico come prodotto e mantiene l’uscita ordinaria del relè', () => {
    for (const entity_category of ['config', 'diagnostic']) {
      const technical = row('cover.a', { entity_category });
      expect(classifyDevices({ devices, entityRegistry: [technical], entities })).toEqual([]);
      expect(classifyDevices({ devices, entityRegistry: [technical, row('switch.output')],
        entities: { ...entities, 'switch.output': fixtureEntity('switch.output', 'on') } }))
        .toMatchObject([{ family: 'plug', primaryEntityId: 'switch.output' }]);
    }
  });

  it.each([['climate', 'climate.room', 'heat'], ['camera', 'camera.room', 'idle'], ['light', 'light.room', 'on']])(
    'conserva la precedenza della famiglia %s su cover e relè accessori', (family, entityId, state) => {
      expect(classifyDevices({ devices, entityRegistry: [row('cover.a'), row(entityId), row('switch.output')],
        entities: { ...entities, [entityId]: fixtureEntity(entityId, state), 'switch.output': fixtureEntity('switch.output', 'on') } }))
        .toMatchObject([{ family, primaryEntityId: entityId }]);
    }
  );

  it('mantiene il tipo cover e sceglie solo i canali ordinari del prodotto', () => {
    expect(classifyDevices({ devices, entityRegistry: [row('cover.a', { entity_category: 'config' }), row('cover.b'), row('switch.output')],
      entities: { ...entities, 'switch.output': fixtureEntity('switch.output', 'on') } }))
      .toMatchObject([{ family: 'cover', widgetType: 'cover', primaryEntityId: 'cover.b', entityIds: ['cover.b'] }]);
  });

  it('la guardia cover accetta solo canali cover operativi e secondarie disgiunte', () => {
    const binding = resolve([row('cover.a')])!;
    expect(isProductDeviceBinding(binding)).toBe(true);
    for (const invalid of [
      { ...binding, primaryEntityId: 'switch.a', channelEntityIds: ['switch.a'] },
      { ...binding, channelEntityIds: ['cover.a', 'light.b'] },
      { ...binding, technicalEntityIds: ['cover.a'] },
      { ...binding, channelEntityIds: ['cover.a', 'cover.a'] },
      { ...binding, secondaryEntityIds: ['cover.a'] },
      { ...binding, technicalEntityIds: ['sensor.foreign'] },
    ]) expect(isProductDeviceBinding(invalid)).toBe(false);
  });
});
