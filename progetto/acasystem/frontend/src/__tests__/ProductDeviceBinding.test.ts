import { describe, expect, it } from 'vitest';
import { isProductDeviceBinding, resolveLightDeviceBinding } from '@/utils/devices/productBinding';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import type { HaEntityRegistryEntry } from '@/@types/ha';

const devices = [{ id: 'lamp', config_entries: ['shared-hub'] }, { id: 'other', config_entries: ['shared-hub'] }];
const row = (entity_id: string, extra: Record<string, unknown> = {}): HaEntityRegistryEntry => ({ entity_id, device_id: 'lamp', config_entry_id: 'shared-hub', ...extra });
const entities = fixtureEntities([fixtureEntity('light.a', 'on'), fixtureEntity('light.b', 'off')]);

describe('binding di un dispositivo Luce', () => {
  it('raccoglie tutti i canali e le sole funzioni dello stesso dispositivo, mai l’intera entry hub', () => {
    const registry = [row('light.b'), row('light.a'), row('sensor.power'), row('switch.night'), row('light.other', { device_id: 'other' }), row('sensor.other', { device_id: 'other' }), row('remote.unrelated')];
    const before = JSON.stringify({ devices, registry, entities });
    const result = resolveLightDeviceBinding('lamp', devices, registry, entities)!;
    expect(result).toEqual({ version: 1, family: 'light', deviceId: 'lamp', primaryEntityId: 'light.a', channelEntityIds: ['light.a', 'light.b'], secondaryEntityIds: ['sensor.power', 'switch.night'], technicalEntityIds: [] });
    expect(isProductDeviceBinding(result)).toBe(true); expect(JSON.stringify({ devices, registry, entities })).toBe(before);
  });
  it('esclude entità disabilitate o nascoste senza abilitarle e deduplica i registri', () => {
    const registry = [row('light.a'), row('light.a'), row('light.b', { disabled_by: 'integration' }), row('sensor.hidden', { hidden_by: 'user' }), row('button.hidden', { disabled_by: 'user' })];
    expect(resolveLightDeviceBinding('lamp', devices, registry, entities)?.channelEntityIds).toEqual(['light.a']);
    expect(resolveLightDeviceBinding('lamp', devices, registry, entities)?.secondaryEntityIds).toEqual([]);
    expect(registry[2].disabled_by).toBe('integration');
  });
  it('conserva la classificazione diagnostica/configurazione del registro, non la deduce dal nome', () => {
    const registry = [row('light.a'), row('sensor.battery', { entity_category: 'diagnostic' }), row('number.startup', { entity_category: 'config' }), row('sensor.signal_name_but_daily')];
    const result = resolveLightDeviceBinding('lamp', devices, registry, entities)!;
    expect(result.technicalEntityIds).toEqual(['number.startup', 'sensor.battery']);
    expect(result.secondaryEntityIds).toContain('sensor.signal_name_but_daily');
    expect(result.technicalEntityIds).not.toContain('sensor.signal_name_but_daily');
  });
  it('un canale temporaneamente assente resta associato senza inventare uno stato', () => {
    const result = resolveLightDeviceBinding('lamp', devices, [row('light.a'), row('light.b')], fixtureEntities([fixtureEntity('light.b', 'unavailable')]))!;
    expect(result.channelEntityIds).toEqual(['light.a', 'light.b']); expect(result.primaryEntityId).toBe('light.b');
    expect(resolveLightDeviceBinding('lamp', devices, [row('light.a')], {})).toBeNull();
  });
  it('non associa un dispositivo inesistente/disabilitato o un dispositivo senza canali luce', () => {
    expect(resolveLightDeviceBinding('absent', devices, [row('light.a')], entities)).toBeNull();
    expect(resolveLightDeviceBinding('lamp', [{ id: 'lamp', disabled_by: 'user' }], [row('light.a')], entities)).toBeNull();
    expect(resolveLightDeviceBinding('lamp', devices, [row('sensor.power')], entities)).toBeNull();
  });
  it('rifiuta versioni, famiglie, duplicati e metadati tecnici non coerenti', () => {
    const binding = resolveLightDeviceBinding('lamp', devices, [row('light.a')], entities)!;
    for (const invalid of [null, {}, { ...binding, version: 2 }, { ...binding, family: 'invented' }, { ...binding, primaryEntityId: 'light.missing' }, { ...binding, channelEntityIds: ['light.a', 'light.a'] }, { ...binding, channelEntityIds: ['switch.a'], primaryEntityId: 'switch.a' }, { ...binding, secondaryEntityIds: ['light.a'] }, { ...binding, technicalEntityIds: ['sensor.outside'] }])
      expect(isProductDeviceBinding(invalid)).toBe(false);
  });
});
