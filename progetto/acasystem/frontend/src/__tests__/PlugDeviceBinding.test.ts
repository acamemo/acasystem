import { describe, expect, it } from 'vitest';
import type { HaEntityRegistryEntry } from '@/@types/ha';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { isProductDeviceBinding, resolvePlugDeviceBinding } from '@/utils/devices/productBinding';
import { classifyDevices } from '@/utils/devices/classify';

const devices = [{ id: 'relay', config_entries: ['hub'] }, { id: 'other', config_entries: ['hub'] }];
const row = (entity_id: string, extra: Record<string, unknown> = {}): HaEntityRegistryEntry =>
  ({ entity_id, device_id: 'relay', config_entry_id: 'hub', ...extra });
const entities = fixtureEntities([fixtureEntity('switch.a', 'on'), fixtureEntity('switch.b', 'off')]);
const resolve = (registry: HaEntityRegistryEntry[], states = entities) =>
  resolvePlugDeviceBinding('relay', devices, registry, states);

describe('binding di prese e interruttori per dispositivo', () => {
  it('raccoglie i canali ordinari e le misure dello stesso dispositivo senza aggregare la entry hub', () => {
    const registry = [row('switch.b'), row('switch.a'), row('sensor.energy'), row('sensor.power'),
      row('sensor.voltage'), row('switch.other', { device_id: 'other' }), row('sensor.other', { device_id: 'other' })];
    const before = JSON.stringify({ devices, registry, entities });
    const binding = resolve(registry);
    expect(binding).toEqual({ version: 1, family: 'plug', deviceId: 'relay', primaryEntityId: 'switch.a',
      channelEntityIds: ['switch.a', 'switch.b'], secondaryEntityIds: ['sensor.energy', 'sensor.power', 'sensor.voltage'], technicalEntityIds: [] });
    expect(isProductDeviceBinding(binding)).toBe(true);
    expect(JSON.stringify({ devices, registry, entities })).toBe(before);
  });

  it('non usa i comandi configurativi o diagnostici come uscite, anche se chiamati presa', () => {
    const binding = resolve([row('switch.a'), row('switch.b', { entity_category: 'config', original_device_class: 'outlet' }),
      row('switch.restart', { entity_category: 'diagnostic' }), row('sensor.signal', { entity_category: 'diagnostic' }),
      row('number.timer', { entity_category: 'config' }), row('sensor.battery_name_but_daily')]);
    expect(binding?.channelEntityIds).toEqual(['switch.a']);
    expect(binding?.secondaryEntityIds).toEqual(['sensor.battery_name_but_daily', 'number.timer', 'sensor.signal', 'switch.b', 'switch.restart']);
    expect(binding?.technicalEntityIds).toEqual(['number.timer', 'sensor.signal', 'switch.b', 'switch.restart']);
    expect(resolve([row('switch.a', { entity_category: 'config' })])).toBeNull();
  });

  it('esclude hidden e disabled, deduplica e non abilita né modifica il registro', () => {
    const registry = [row('switch.a'), row('switch.a'), row('switch.b', { hidden_by: 'user' }),
      row('switch.disabled', { disabled_by: 'integration' }), row('sensor.hidden', { hidden_by: 'integration' })];
    const before = JSON.stringify(registry);
    expect(resolve(registry)?.channelEntityIds).toEqual(['switch.a']);
    expect(resolve(registry)?.secondaryEntityIds).toEqual([]);
    expect(JSON.stringify(registry)).toBe(before);
  });

  it('preferisce un canale on/off e conserva i canali temporaneamente senza stato', () => {
    const states = fixtureEntities([fixtureEntity('switch.a', 'unavailable'), fixtureEntity('switch.b', 'off')]);
    const binding = resolve([row('switch.a'), row('switch.b'), row('switch.c')], states);
    expect(binding?.primaryEntityId).toBe('switch.b');
    expect(binding?.channelEntityIds).toEqual(['switch.a', 'switch.b', 'switch.c']);
    expect(states['switch.c']).toBeUndefined();
    expect(resolve([row('switch.a')], fixtureEntities([fixtureEntity('switch.a', 'unavailable')]))?.primaryEntityId).toBe('switch.a');
    expect(resolve([row('switch.a')], {})).toBeNull();
  });

  it.each(['outlet', 'switch', undefined])('accetta la classe operativa %s senza inferenze dal nome o dal marchio', deviceClass => {
    const registry = [row('switch.a', deviceClass ? { original_device_class: deviceClass } : {})];
    expect(resolve(registry)?.channelEntityIds).toEqual(['switch.a']);
    const classified = classifyDevices({ devices, entityRegistry: registry, entities });
    expect(classified).toMatchObject([{ deviceId: 'relay', family: 'plug', widgetType: 'plug', primaryEntityId: 'switch.a' }]);
  });

  it('non inventa prodotti da switch tecnici, classi estranee o helper senza device_id', () => {
    const registry = [row('switch.a', { entity_category: 'config' }), row('switch.b', { entity_category: 'diagnostic' }),
      row('switch.helper', { device_id: null }), row('switch.unknown', { original_device_class: 'unknown_class' })];
    const states = { ...entities, ...fixtureEntities([fixtureEntity('switch.helper', 'on'), fixtureEntity('switch.unknown', 'off')]) };
    expect(resolve(registry, states)).toBeNull();
    expect(classifyDevices({ devices, entityRegistry: registry, entities: states })).toEqual([]);
    expect(resolvePlugDeviceBinding('missing', devices, [row('switch.a')], entities)).toBeNull();
    expect(resolvePlugDeviceBinding('relay', [{ id: 'relay', disabled_by: 'user' }], [row('switch.a')], entities)).toBeNull();
  });

  it.each([
    ['light', 'light'], ['camera', 'camera'], ['climate', 'climate'], ['cover', 'cover'], ['lock', 'lock'],
    ['vacuum', 'vacuum'], ['lawn_mower', 'mower'], ['fan', 'fan'], ['alarm_control_panel', 'alarm'], ['media_player', 'media'],
  ])('la funzione principale %s mantiene la priorità sugli interruttori accessori', (domain, family) => {
    const id = `${domain}.main`;
    const registry = [row('switch.a', { original_device_class: 'outlet' }), row(id)];
    expect(classifyDevices({ devices, entityRegistry: registry, entities: { ...entities, [id]: fixtureEntity(id, 'on') } }))
      .toMatchObject([{ family, entityIds: [id] }]);
  });

  it.each(['device_tracker', 'valve', 'water_heater', 'humidifier'])('uno switch accessorio non trasforma un prodotto %s in una presa', domain => {
    const id = `${domain}.main`;
    const own = [row('switch.a'), row(id)];
    const states = { ...entities, [id]: fixtureEntity(id, 'on') };
    expect(classifyDevices({ devices, entityRegistry: own, entities: states })).toEqual([]);
    expect(classifyDevices({ devices, entityRegistry: [row('switch.a', { original_device_class: 'outlet' }), row(id)], entities: states }))
      .toMatchObject([{ family: 'plug', entityIds: ['switch.a'] }]);
  });

  it('un relè con una sola luce tecnica viene classificato plug, non Luce', () => {
    const own = [row('switch.a'), row('light.status_led', { entity_category: 'config' })];
    const states = { ...entities, 'light.status_led': fixtureEntity('light.status_led', 'on') };
    expect(classifyDevices({ devices, entityRegistry: own, entities: states }))
      .toMatchObject([{ family: 'plug', widgetType: 'plug', primaryEntityId: 'switch.a', entityIds: ['switch.a'] }]);
  });

  it('una luce ordinaria conserva la priorità sullo switch anche in presenza di un LED tecnico', () => {
    const own = [row('switch.a'), row('light.status_led', { entity_category: 'config' }), row('light.main')];
    const states = { ...entities, 'light.status_led': fixtureEntity('light.status_led', 'on'), 'light.main': fixtureEntity('light.main', 'off') };
    expect(classifyDevices({ devices, entityRegistry: own, entities: states })).toMatchObject([{ family: 'light' }]);
  });

  it('conserva il LED tecnico come secondaria tecnica, mai come uscita o entità principale', () => {
    const own = [row('switch.a'), row('light.status_led', { entity_category: 'config' })];
    const binding = resolve(own, { ...entities, 'light.status_led': fixtureEntity('light.status_led', 'on') });
    expect(binding).toMatchObject({ family: 'plug', primaryEntityId: 'switch.a', channelEntityIds: ['switch.a'],
      secondaryEntityIds: ['light.status_led'], technicalEntityIds: ['light.status_led'] });
    expect(isProductDeviceBinding(binding)).toBe(true);
  });

  it('una luce ordinaria registrata ma senza stato conserva la priorità legacy sulle uscite accessorie', () => {
    const own = [row('switch.a'), row('light.status_led', { entity_category: 'config' }), row('light.main')];
    const states = { ...entities, 'light.status_led': fixtureEntity('light.status_led', 'on') };
    expect(classifyDevices({ devices, entityRegistry: own, entities: states })).toMatchObject([{ family: 'light' }]);
    for (const extra of [{ hidden_by: 'user' }, { disabled_by: 'integration' }]) {
      const registry = [...own.slice(0, 2), row('light.main', extra)];
      expect(classifyDevices({ devices, entityRegistry: registry, entities: states })).toMatchObject([{ family: 'plug' }]);
    }
  });

  it('restringe il contratto plug a canali switch ordinari, conservando le secondarie tecniche', () => {
    const binding = resolve([row('switch.a'), row('switch.b', { entity_category: 'config' })])!;
    expect(isProductDeviceBinding(binding)).toBe(true);
    expect(isProductDeviceBinding({ ...binding, primaryEntityId: 'light.a', channelEntityIds: ['light.a'] })).toBe(false);
    expect(isProductDeviceBinding({ ...binding, technicalEntityIds: ['switch.a'] })).toBe(false);
    expect(isProductDeviceBinding({ ...binding, channelEntityIds: ['switch.a', 'switch.a'] })).toBe(false);
  });
});
