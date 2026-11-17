import { describe, expect, it } from 'vitest';
import type { HaEntityRegistryEntry } from '@/@types/ha';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { isProductDeviceBinding, resolveClimateDeviceBinding } from '@/utils/devices/productBinding';
import { classifyDevices } from '@/utils/devices/classify';

const devices = [{ id: 'climate-device', config_entries: ['hub'] }, { id: 'other', config_entries: ['hub'] }];
const row = (entity_id: string, extra: Record<string, unknown> = {}): HaEntityRegistryEntry =>
  ({ entity_id, device_id: 'climate-device', config_entry_id: 'hub', ...extra });
const entities = fixtureEntities([fixtureEntity('climate.a', 'off'), fixtureEntity('climate.b', 'heat')]);
const resolve = (registry: HaEntityRegistryEntry[], states = entities) =>
  resolveClimateDeviceBinding('climate-device', devices, registry, states);

describe('binding Clima per dispositivo', () => {
  it('associa tutti i canali ordinari e le secondarie del device esatto senza aggregare altri terminali dello stesso hub', () => {
    const registry = [row('climate.b'), row('climate.a'), row('sensor.temperature'), row('sensor.humidity'),
      row('switch.auxiliary'), row('select.mode'), row('button.identify'), row('event.control'), row('update.firmware'),
      row('climate.other', { device_id: 'other' }), row('sensor.other', { device_id: 'other' }), row('climate.helper', { device_id: null })];
    const before = JSON.stringify({ devices, registry, entities });
    const binding = resolve(registry);
    expect(binding).toEqual({ version: 1, family: 'climate', deviceId: 'climate-device', primaryEntityId: 'climate.a',
      channelEntityIds: ['climate.a', 'climate.b'],
      secondaryEntityIds: ['button.identify', 'event.control', 'select.mode', 'sensor.humidity', 'sensor.temperature', 'switch.auxiliary', 'update.firmware'],
      technicalEntityIds: [] });
    expect(isProductDeviceBinding(binding)).toBe(true);
    expect(JSON.stringify({ devices, registry, entities })).toBe(before);
  });

  it('tiene i climate configurativi e i LED tecnici fuori dai canali operativi e non deduce i ruoli dal nome', () => {
    const registry = [row('climate.a'), row('climate.calibration', { entity_category: 'config' }),
      row('light.status_led', { entity_category: 'config' }), row('sensor.battery', { entity_category: 'diagnostic' }),
      row('number.offset', { entity_category: 'config' }), row('sensor.signal_name_but_daily'), row('light.ordinary')];
    const binding = resolve(registry);
    expect(binding?.channelEntityIds).toEqual(['climate.a']);
    expect(binding?.primaryEntityId).toBe('climate.a');
    expect(binding?.secondaryEntityIds).toEqual(['sensor.signal_name_but_daily', 'climate.calibration', 'light.status_led', 'number.offset', 'sensor.battery']);
    expect(binding?.technicalEntityIds).toEqual(['climate.calibration', 'light.status_led', 'number.offset', 'sensor.battery']);
    expect(binding?.technicalEntityIds).not.toContain('sensor.signal_name_but_daily');
    expect(isProductDeviceBinding(binding)).toBe(true);
  });

  it('esclude hidden e disabled e deduplica i registri senza modificarli', () => {
    const registry = [row('climate.a'), row('climate.a'), row('climate.b', { hidden_by: 'user' }),
      row('climate.disabled', { disabled_by: 'integration' }), row('sensor.hidden', { hidden_by: 'integration' }),
      row('switch.disabled', { disabled_by: 'user' })];
    const before = JSON.stringify(registry);
    expect(resolve(registry)?.channelEntityIds).toEqual(['climate.a']);
    expect(resolve(registry)?.secondaryEntityIds).toEqual([]);
    expect(JSON.stringify(registry)).toBe(before);
  });

  it('preferisce uno stato disponibile ma conserva i canali temporaneamente senza stato', () => {
    const registry = [row('climate.a'), row('climate.b'), row('climate.c')];
    const states = fixtureEntities([fixtureEntity('climate.a', 'unavailable'), fixtureEntity('climate.b', 'cool')]);
    const binding = resolve(registry, states);
    expect(binding?.primaryEntityId).toBe('climate.b');
    expect(binding?.channelEntityIds).toEqual(['climate.a', 'climate.b', 'climate.c']);
    expect(states['climate.c']).toBeUndefined();
    expect(resolve(registry, {})).toBeNull();
  });

  it('non inventa modalità, temperature o servizi per un dispositivo temporaneamente indisponibile', () => {
    const states = fixtureEntities([fixtureEntity('climate.a', 'unknown'), fixtureEntity('climate.b', 'unavailable')]);
    const binding = resolve([row('climate.b'), row('climate.a')], states);
    expect(binding?.primaryEntityId).toBe('climate.a');
    expect(binding?.channelEntityIds).toEqual(['climate.a', 'climate.b']);
    expect(binding).not.toHaveProperty('hvac_modes');
    expect(binding).not.toHaveProperty('temperature');
    expect(states['climate.a']?.attributes).not.toHaveProperty('temperature');
  });

  it('mantiene un risultato deterministico se cambia solo l’ordine dei registri', () => {
    const registry = [row('climate.b'), row('sensor.temperature'), row('climate.a'), row('number.offset', { entity_category: 'config' })];
    expect(resolve(registry)).toEqual(resolve([...registry].reverse()));
  });

  it('non crea un prodotto senza device, con device disabilitato o con soli climate tecnici', () => {
    expect(resolveClimateDeviceBinding('missing', devices, [row('climate.a')], entities)).toBeNull();
    expect(resolveClimateDeviceBinding('climate-device', [{ id: 'climate-device', disabled_by: 'user' }], [row('climate.a')], entities)).toBeNull();
    expect(resolve([row('climate.a', { entity_category: 'config' })])).toBeNull();
    expect(resolve([row('sensor.temperature'), row('water_heater.boiler'), row('humidifier.room')])).toBeNull();
  });

  it('il classificatore non usa un climate tecnico come prodotto e conserva la priorità del climate ordinario', () => {
    const technical = row('climate.a', { entity_category: 'config' });
    expect(classifyDevices({ devices, entityRegistry: [technical], entities })).toEqual([]);
    const own = [technical, row('switch.auxiliary'), row('climate.b')];
    const states = { ...entities, 'switch.auxiliary': fixtureEntity('switch.auxiliary', 'on') };
    expect(classifyDevices({ devices, entityRegistry: own, entities: states }))
      .toMatchObject([{ family: 'climate', primaryEntityId: 'climate.b', entityIds: ['climate.b'] }]);
  });

  it('restringe la guardia climate ai canali climate ordinari e alle secondarie disgiunte', () => {
    const binding = resolve([row('climate.a')])!;
    expect(isProductDeviceBinding(binding)).toBe(true);
    for (const invalid of [
      { ...binding, primaryEntityId: 'switch.a', channelEntityIds: ['switch.a'] },
      { ...binding, channelEntityIds: ['climate.a', 'light.b'] },
      { ...binding, technicalEntityIds: ['climate.a'] },
      { ...binding, channelEntityIds: ['climate.a', 'climate.a'] },
      { ...binding, secondaryEntityIds: ['climate.a'] },
      { ...binding, technicalEntityIds: ['sensor.foreign'] },
    ]) expect(isProductDeviceBinding(invalid)).toBe(false);
  });
});
