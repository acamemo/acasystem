import { describe, expect, it } from 'vitest';
import type { HaEntityRegistryEntry } from '@/@types/ha';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { isProductDeviceBinding, resolveLockDeviceBinding } from '@/utils/devices/productBinding';
import { classifyDevices } from '@/utils/devices/classify';

const devices = [{ id: 'lock-device', config_entries: ['hub'] }, { id: 'other', config_entries: ['hub'] }];
const row = (entity_id: string, extra: Record<string, unknown> = {}): HaEntityRegistryEntry =>
  ({ entity_id, device_id: 'lock-device', config_entry_id: 'hub', ...extra });
const entities = fixtureEntities([fixtureEntity('lock.a', 'locked'), fixtureEntity('lock.b', 'unlocking')]);
const resolve = (registry: HaEntityRegistryEntry[], states = entities) =>
  resolveLockDeviceBinding('lock-device', devices, registry, states);

describe('binding Serrature per dispositivo', () => {
  it('raccoglie i canali dello stesso dispositivo senza aggregare gli altri terminali della entry hub', () => {
    const registry = [row('lock.b'), row('lock.a'), row('sensor.temperature'), row('binary_sensor.obstruction'),
      row('switch.auxiliary'), row('select.mode'), row('button.identify'), row('event.control'), row('update.firmware'),
      row('lock.other', { device_id: 'other' }), row('sensor.other', { device_id: 'other' }), row('lock.helper', { device_id: null })];
    const before = JSON.stringify({ devices, registry, entities });
    const binding = resolve(registry);
    expect(binding).toEqual({ version: 1, family: 'lock', deviceId: 'lock-device', primaryEntityId: 'lock.a',
      channelEntityIds: ['lock.a', 'lock.b'],
      secondaryEntityIds: ['binary_sensor.obstruction', 'button.identify', 'event.control', 'select.mode', 'sensor.temperature', 'switch.auxiliary', 'update.firmware'],
      technicalEntityIds: [] });
    expect(isProductDeviceBinding(binding)).toBe(true);
    expect(JSON.stringify({ devices, registry, entities })).toBe(before);
  });

  it('separa i lock configurativi, i LED e i sensori tecnici secondo il registro, non secondo il nome', () => {
    const registry = [row('lock.a'), row('lock.calibration', { entity_category: 'config' }),
      row('light.status_led', { entity_category: 'config' }), row('sensor.battery', { entity_category: 'diagnostic' }),
      row('number.offset', { entity_category: 'config' }), row('sensor.signal_name_but_daily'), row('light.ordinary')];
    const binding = resolve(registry);
    expect(binding?.channelEntityIds).toEqual(['lock.a']);
    expect(binding?.primaryEntityId).toBe('lock.a');
    expect(binding?.secondaryEntityIds).toEqual(['sensor.signal_name_but_daily', 'light.status_led', 'lock.calibration', 'number.offset', 'sensor.battery']);
    expect(binding?.technicalEntityIds).toEqual(['light.status_led', 'lock.calibration', 'number.offset', 'sensor.battery']);
    expect(binding?.technicalEntityIds).not.toContain('sensor.signal_name_but_daily');
    expect(isProductDeviceBinding(binding)).toBe(true);
  });

  it('esclude hidden e disabled e deduplica i registri senza abilitare o modificare entità', () => {
    const registry = [row('lock.a'), row('lock.a'), row('lock.b', { hidden_by: 'user' }),
      row('lock.disabled', { disabled_by: 'integration' }), row('sensor.hidden', { hidden_by: 'integration' }),
      row('switch.disabled', { disabled_by: 'user' })];
    const before = JSON.stringify(registry);
    expect(resolve(registry)?.channelEntityIds).toEqual(['lock.a']);
    expect(resolve(registry)?.secondaryEntityIds).toEqual([]);
    expect(JSON.stringify(registry)).toBe(before);
  });

  it('preferisce un canale disponibile e conserva quelli temporaneamente senza stato', () => {
    const registry = [row('lock.a'), row('lock.b'), row('lock.c')];
    const states = fixtureEntities([fixtureEntity('lock.a', 'unavailable'), fixtureEntity('lock.b', 'unlocking')]);
    const binding = resolve(registry, states);
    expect(binding?.primaryEntityId).toBe('lock.b');
    expect(binding?.channelEntityIds).toEqual(['lock.a', 'lock.b', 'lock.c']);
    expect(states['lock.c']).toBeUndefined();
    expect(resolve(registry, {})).toBeNull();
  });

  it('non inventa codici, stato o capacità per i canali indisponibili', () => {
    const states = fixtureEntities([fixtureEntity('lock.a', 'unknown'), fixtureEntity('lock.b', 'unavailable')]);
    const binding = resolve([row('lock.b'), row('lock.a')], states);
    expect(binding?.primaryEntityId).toBe('lock.a');
    expect(binding?.channelEntityIds).toEqual(['lock.a', 'lock.b']);
    for (const key of ['code', 'supported_features', 'changed_by'])
      expect(states['lock.a']?.attributes).not.toHaveProperty(key);
    expect(binding).not.toHaveProperty('code');
    expect(binding).not.toHaveProperty('supported_features');
  });

  it('salva solo identificativi e ruoli, mai codici o attributi delle entità principali e secondarie', () => {
    const registry = [row('lock.a', { code: 'TEST_CODE_NOT_TO_PERSIST' }), row('number.configuration', { entity_category: 'config' })];
    const states = fixtureEntities([
      fixtureEntity('lock.a', 'locked', { code: 'TEST_CODE_NOT_TO_PERSIST', code_format: 'number', changed_by: 'Persona di prova', supported_features: 1 }),
      fixtureEntity('number.configuration', '12', { code: 'TEST_CODE_NOT_TO_PERSIST' }),
    ]);
    const binding = resolve(registry, states)!;
    expect(Object.keys(binding).sort()).toEqual(['version', 'family', 'deviceId', 'primaryEntityId', 'channelEntityIds', 'secondaryEntityIds', 'technicalEntityIds'].sort());
    expect(JSON.stringify(binding)).not.toContain('TEST_CODE_NOT_TO_PERSIST');
    expect(JSON.stringify(binding)).not.toContain('Persona di prova');
    expect(binding.secondaryEntityIds).toEqual(['number.configuration']);
  });

  it('mantiene un risultato deterministico al cambio di ordine dei registri', () => {
    const registry = [row('lock.b'), row('sensor.temperature'), row('lock.a'), row('number.offset', { entity_category: 'config' })];
    expect(resolve(registry)).toEqual(resolve([...registry].reverse()));
  });

  it('rifiuta dispositivi mancanti, disabilitati, senza lock ordinari o con soli canali tecnici', () => {
    expect(resolveLockDeviceBinding('missing', devices, [row('lock.a')], entities)).toBeNull();
    expect(resolveLockDeviceBinding('lock-device', [{ id: 'lock-device', disabled_by: 'user' }], [row('lock.a')], entities)).toBeNull();
    expect(resolve([row('lock.a', { entity_category: 'config' })])).toBeNull();
    expect(resolve([row('lock.a', { entity_category: 'diagnostic' })])).toBeNull();
    expect(resolve([row('sensor.temperature'), row('valve.water'), row('switch.motor')])).toBeNull();
  });

  it('non classifica un lock tecnico come prodotto e mantiene l’uscita ordinaria del relè', () => {
    for (const entity_category of ['config', 'diagnostic']) {
      const technical = row('lock.a', { entity_category });
      expect(classifyDevices({ devices, entityRegistry: [technical], entities })).toEqual([]);
      expect(classifyDevices({ devices, entityRegistry: [technical, row('switch.output')],
        entities: { ...entities, 'switch.output': fixtureEntity('switch.output', 'on') } }))
        .toMatchObject([{ family: 'plug', primaryEntityId: 'switch.output' }]);
    }
  });

  it.each([['climate', 'climate.room', 'heat'], ['camera', 'camera.room', 'idle'], ['light', 'light.room', 'on'], ['cover', 'cover.room', 'open']])(
    'conserva la precedenza della famiglia %s su lock e relè accessori', (family, entityId, state) => {
      expect(classifyDevices({ devices, entityRegistry: [row('lock.a'), row(entityId), row('switch.output')],
        entities: { ...entities, [entityId]: fixtureEntity(entityId, state), 'switch.output': fixtureEntity('switch.output', 'on') } }))
        .toMatchObject([{ family, primaryEntityId: entityId }]);
    }
  );

  it.each(['config', 'diagnostic'])('un LED %s non identifica come luce una serratura ordinaria', entity_category => {
    const states = { ...entities, 'light.led': fixtureEntity('light.led', 'on') };
    expect(classifyDevices({ devices, entityRegistry: [row('lock.a'), row('light.led', { entity_category })], entities: states }))
      .toMatchObject([{ family: 'lock', primaryEntityId: 'lock.a' }]);
  });

  it('conserva la precedenza della luce ordinaria, anche quando il suo primo stato non è ancora arrivato', () => {
    const registry = [row('lock.a'), row('light.led', { entity_category: 'config' }), row('light.main')];
    const states = { ...entities, 'light.led': fixtureEntity('light.led', 'on'), 'light.main': fixtureEntity('light.main', 'on') };
    expect(classifyDevices({ devices, entityRegistry: registry, entities: states })).toMatchObject([{ family: 'light' }]);
    const booting: typeof entities = { ...states }; delete booting['light.main'];
    expect(classifyDevices({ devices, entityRegistry: registry, entities: booting })).toMatchObject([{ family: 'light' }]);
  });

  it('mantiene il tipo lock e sceglie solo i canali ordinari del prodotto', () => {
    expect(classifyDevices({ devices, entityRegistry: [row('lock.a', { entity_category: 'config' }), row('lock.b'), row('switch.output')],
      entities: { ...entities, 'switch.output': fixtureEntity('switch.output', 'on') } }))
      .toMatchObject([{ family: 'lock', widgetType: 'lock', primaryEntityId: 'lock.b', entityIds: ['lock.b'] }]);
  });

  it('la guardia lock accetta solo canali lock operativi e secondarie disgiunte', () => {
    const binding = resolve([row('lock.a')])!;
    expect(isProductDeviceBinding(binding)).toBe(true);
    for (const invalid of [
      { ...binding, primaryEntityId: 'switch.a', channelEntityIds: ['switch.a'] },
      { ...binding, channelEntityIds: ['lock.a', 'light.b'] },
      { ...binding, technicalEntityIds: ['lock.a'] },
      { ...binding, channelEntityIds: ['lock.a', 'lock.a'] },
      { ...binding, secondaryEntityIds: ['lock.a'] },
      { ...binding, technicalEntityIds: ['sensor.foreign'] },
    ]) expect(isProductDeviceBinding(invalid)).toBe(false);
  });
});
