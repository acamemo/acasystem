import { describe, expect, it } from 'vitest';
import type { HaEntityRegistryEntry } from '@/@types/ha';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { isProductDeviceBinding, resolveFanDeviceBinding } from '@/utils/devices/productBinding';
import { classifyDevices } from '@/utils/devices/classify';

const devices = [{ id: 'fan-device', config_entries: ['hub'] }, { id: 'other', config_entries: ['hub'] }];
const row = (entity_id: string, extra: Record<string, unknown> = {}): HaEntityRegistryEntry =>
  ({ entity_id, device_id: 'fan-device', config_entry_id: 'hub', ...extra });
const entities = fixtureEntities([fixtureEntity('fan.a', 'off'), fixtureEntity('fan.b', 'on')]);
const resolve = (registry: HaEntityRegistryEntry[], states = entities) =>
  resolveFanDeviceBinding('fan-device', devices, registry, states);

describe('binding Ventilatori per dispositivo', () => {
  it('raccoglie i canali dello stesso dispositivo senza aggregare gli altri terminali della entry hub', () => {
    const registry = [row('fan.b'), row('fan.a'), row('sensor.temperature'), row('binary_sensor.obstruction'),
      row('switch.auxiliary'), row('select.mode'), row('button.identify'), row('event.control'), row('update.firmware'),
      row('fan.other', { device_id: 'other' }), row('sensor.other', { device_id: 'other' }), row('fan.helper', { device_id: null })];
    const before = JSON.stringify({ devices, registry, entities });
    const binding = resolve(registry);
    expect(binding).toEqual({ version: 1, family: 'fan', deviceId: 'fan-device', primaryEntityId: 'fan.a',
      channelEntityIds: ['fan.a', 'fan.b'],
      secondaryEntityIds: ['binary_sensor.obstruction', 'button.identify', 'event.control', 'select.mode', 'sensor.temperature', 'switch.auxiliary', 'update.firmware'],
      technicalEntityIds: [] });
    expect(isProductDeviceBinding(binding)).toBe(true);
    expect(JSON.stringify({ devices, registry, entities })).toBe(before);
  });

  it('separa i fan configurativi, i LED e i sensori tecnici secondo il registro, non secondo il nome', () => {
    const registry = [row('fan.a'), row('fan.calibration', { entity_category: 'config' }),
      row('light.status_led', { entity_category: 'config' }), row('sensor.battery', { entity_category: 'diagnostic' }),
      row('number.offset', { entity_category: 'config' }), row('sensor.signal_name_but_daily'), row('light.ordinary')];
    const binding = resolve(registry);
    expect(binding?.channelEntityIds).toEqual(['fan.a']);
    expect(binding?.primaryEntityId).toBe('fan.a');
    expect(binding?.secondaryEntityIds).toEqual(['sensor.signal_name_but_daily', 'fan.calibration', 'light.status_led', 'number.offset', 'sensor.battery']);
    expect(binding?.technicalEntityIds).toEqual(['fan.calibration', 'light.status_led', 'number.offset', 'sensor.battery']);
    expect(binding?.technicalEntityIds).not.toContain('sensor.signal_name_but_daily');
    expect(isProductDeviceBinding(binding)).toBe(true);
  });

  it('esclude hidden e disabled e deduplica i registri senza abilitare o modificare entità', () => {
    const registry = [row('fan.a'), row('fan.a'), row('fan.b', { hidden_by: 'user' }),
      row('fan.disabled', { disabled_by: 'integration' }), row('sensor.hidden', { hidden_by: 'integration' }),
      row('switch.disabled', { disabled_by: 'user' })];
    const before = JSON.stringify(registry);
    expect(resolve(registry)?.channelEntityIds).toEqual(['fan.a']);
    expect(resolve(registry)?.secondaryEntityIds).toEqual([]);
    expect(JSON.stringify(registry)).toBe(before);
  });

  it('preferisce un canale disponibile e conserva quelli temporaneamente senza stato', () => {
    const registry = [row('fan.a'), row('fan.b'), row('fan.c')];
    const states = fixtureEntities([fixtureEntity('fan.a', 'unavailable'), fixtureEntity('fan.b', 'on')]);
    const binding = resolve(registry, states);
    expect(binding?.primaryEntityId).toBe('fan.b');
    expect(binding?.channelEntityIds).toEqual(['fan.a', 'fan.b', 'fan.c']);
    expect(states['fan.c']).toBeUndefined();
    expect(resolve(registry, {})).toBeNull();
  });

  it('non inventa velocità, oscillazione, direzione o capacità per i canali indisponibili', () => {
    const states = fixtureEntities([fixtureEntity('fan.a', 'unknown'), fixtureEntity('fan.b', 'unavailable')]);
    const binding = resolve([row('fan.b'), row('fan.a')], states);
    expect(binding?.primaryEntityId).toBe('fan.a');
    expect(binding?.channelEntityIds).toEqual(['fan.a', 'fan.b']);
    for (const key of ['percentage', 'percentage_step', 'oscillating', 'direction', 'preset_modes', 'supported_features'])
      expect(states['fan.a']?.attributes).not.toHaveProperty(key);
    expect(binding).not.toHaveProperty('percentage');
    expect(binding).not.toHaveProperty('supported_features');
  });

  it('mantiene un risultato deterministico al cambio di ordine dei registri', () => {
    const registry = [row('fan.b'), row('sensor.temperature'), row('fan.a'), row('number.offset', { entity_category: 'config' })];
    expect(resolve(registry)).toEqual(resolve([...registry].reverse()));
  });

  it('rifiuta dispositivi mancanti, disabilitati, senza fan ordinari o con soli canali tecnici', () => {
    expect(resolveFanDeviceBinding('missing', devices, [row('fan.a')], entities)).toBeNull();
    expect(resolveFanDeviceBinding('fan-device', [{ id: 'fan-device', disabled_by: 'user' }], [row('fan.a')], entities)).toBeNull();
    expect(resolve([row('fan.a', { entity_category: 'config' })])).toBeNull();
    expect(resolve([row('fan.a', { entity_category: 'diagnostic' })])).toBeNull();
    expect(resolve([row('sensor.temperature'), row('valve.water'), row('switch.motor')])).toBeNull();
  });

  it('non classifica un fan tecnico come prodotto e mantiene l’uscita ordinaria del relè', () => {
    for (const entity_category of ['config', 'diagnostic']) {
      const technical = row('fan.a', { entity_category });
      expect(classifyDevices({ devices, entityRegistry: [technical], entities })).toEqual([]);
      expect(classifyDevices({ devices, entityRegistry: [technical, row('switch.output')],
        entities: { ...entities, 'switch.output': fixtureEntity('switch.output', 'on') } }))
        .toMatchObject([{ family: 'plug', primaryEntityId: 'switch.output' }]);
    }
  });

  it.each([['climate', 'climate.room', 'heat'], ['camera', 'camera.room', 'idle'], ['light', 'light.room', 'on'], ['cover', 'cover.room', 'open']])(
    'conserva la precedenza della famiglia %s su fan e relè accessori', (family, entityId, state) => {
      expect(classifyDevices({ devices, entityRegistry: [row('fan.a'), row(entityId), row('switch.output')],
        entities: { ...entities, [entityId]: fixtureEntity(entityId, state), 'switch.output': fixtureEntity('switch.output', 'on') } }))
        .toMatchObject([{ family, primaryEntityId: entityId }]);
    }
  );

  it('mantiene il tipo fan e sceglie solo i canali ordinari del prodotto', () => {
    expect(classifyDevices({ devices, entityRegistry: [row('fan.a', { entity_category: 'config' }), row('fan.b'), row('switch.output')],
      entities: { ...entities, 'switch.output': fixtureEntity('switch.output', 'on') } }))
      .toMatchObject([{ family: 'fan', widgetType: 'fan', primaryEntityId: 'fan.b', entityIds: ['fan.b'] }]);
  });

  it('la guardia fan accetta solo canali fan operativi e secondarie disgiunte', () => {
    const binding = resolve([row('fan.a')])!;
    expect(isProductDeviceBinding(binding)).toBe(true);
    for (const invalid of [
      { ...binding, primaryEntityId: 'switch.a', channelEntityIds: ['switch.a'] },
      { ...binding, channelEntityIds: ['fan.a', 'light.b'] },
      { ...binding, technicalEntityIds: ['fan.a'] },
      { ...binding, channelEntityIds: ['fan.a', 'fan.a'] },
      { ...binding, secondaryEntityIds: ['fan.a'] },
      { ...binding, technicalEntityIds: ['sensor.foreign'] },
    ]) expect(isProductDeviceBinding(invalid)).toBe(false);
  });
});
