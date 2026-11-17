import { describe, expect, it, vi } from 'vitest';
import type { EntityMap, HaEntityRegistryEntry } from '@/@types/ha';
import type { CardSettings } from '@/@types/dashboard';
import type { LauncherLayout } from '@/@types/launcher';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { isProductDeviceBinding, resolveSensorDeviceBinding, sensorProductBinding } from '@/utils/devices/productBinding';
import { classifyDevices, SENSOR_HELPER_PLATFORMS } from '@/utils/devices/classify';
import { deviceWidgetDestinations } from '@/utils/devices/widgetDestinations';
import { BINDING_KEYS } from '../../../contracts/widgetIdentity';

// The pure destination index does not need to mount unrelated renderer modules.
vi.mock('@/components/widgets/registry', () => ({ findWidgetDefinition: () => undefined }));

const devices = [{ id: 'sensor-device', name: 'Nome condiviso', manufacturer: 'Stessa marca', config_entries: ['hub'] },
  { id: 'other-device', name: 'Nome condiviso', manufacturer: 'Stessa marca', config_entries: ['hub'] }];
const row = (entity_id: string, extra: Record<string, unknown> = {}): HaEntityRegistryEntry => ({ entity_id, device_id: 'sensor-device', platform: 'zha', config_entry_id: 'hub', ...extra });
const states = fixtureEntities([fixtureEntity('sensor.temperature', '21.5', { device_class: 'temperature', unit_of_measurement: '°C' }),
  fixtureEntity('sensor.humidity', '54', { device_class: 'humidity', unit_of_measurement: '%' }),
  fixtureEntity('binary_sensor.motion', 'off', { device_class: 'motion' })]);
const resolve = (registry: HaEntityRegistryEntry[], entities = states) => resolveSensorDeviceBinding('sensor-device', devices, registry, entities);
const classify = (registry: HaEntityRegistryEntry[], entities = states) => classifyDevices({ devices, entityRegistry: registry, entities });

describe('Sensore per dispositivo: canali osservati e identità', () => {
  it('raccoglie sensori/binari del dispositivo esatto senza aggregare marca, nome o hub', () => {
    const registry = [row('sensor.temperature'), row('binary_sensor.motion'), row('sensor.humidity'),
      row('sensor.other', { device_id: 'other-device' }), row('binary_sensor.other', { device_id: 'other-device' }),
      row('sensor.helper_without_device', { device_id: null })];
    const before = JSON.stringify({ devices, registry, states });
    const binding = resolve(registry)!;
    expect(binding).toEqual({ version: 1, family: 'sensor', deviceId: 'sensor-device', primaryEntityId: 'binary_sensor.motion',
      channelEntityIds: ['binary_sensor.motion', 'sensor.humidity', 'sensor.temperature'], secondaryEntityIds: [], technicalEntityIds: [] });
    expect(classify(registry)).toMatchObject([{ family: 'sensor', widgetType: 'sensor', entityIds: ['binary_sensor.motion', 'sensor.humidity', 'sensor.temperature'] }]);
    expect(isProductDeviceBinding(binding)).toBe(true);
    expect(JSON.stringify({ devices, registry, states })).toBe(before);
  });
  it.each(['temperature', 'humidity', 'power', 'energy', 'current', 'voltage', 'carbon_dioxide', 'carbon_monoxide', 'aqi', 'pm1', 'pm10', 'pm25', 'volatile_organic_compounds', 'pressure', 'illuminance'])(
    'accetta la misura HA %s senza inventare tariffe o aggregazioni', device_class => {
      const entities = fixtureEntities([fixtureEntity('sensor.reading', '0', { device_class, unit_of_measurement: 'unità HA' })]);
      const binding = resolve([row('sensor.reading')], entities)!;
      expect(binding.primaryEntityId).toBe('sensor.reading'); expect(binding.channelEntityIds).toEqual(['sensor.reading']);
      expect(binding).not.toHaveProperty('unit_of_measurement'); expect(binding).not.toHaveProperty('cost');
    }
  );
  it.each(['motion', 'occupancy', 'presence', 'door', 'window', 'opening', 'garage_door', 'smoke', 'moisture', 'gas', 'carbon_monoxide'])(
    'classifica il binario HA %s come sensore senza simulare uno stato sicuro', device_class => {
      const registry = [row('binary_sensor.reading', { original_device_class: device_class })];
      const entities = fixtureEntities([fixtureEntity('binary_sensor.reading', 'unavailable')]);
      expect(resolve(registry, entities)?.primaryEntityId).toBe('binary_sensor.reading');
      expect(classify(registry, entities)).toMatchObject([{ family: 'sensor', primaryEntityId: 'binary_sensor.reading' }]);
      expect(entities['binary_sensor.reading']?.state).toBe('unavailable');
    }
  );
  it('tiene configurazione/diagnostica soltanto nelle secondarie e non muta le categorie HA', () => {
    const registry = [row('sensor.temperature'), row('sensor.battery', { entity_category: 'diagnostic' }),
      row('binary_sensor.tamper', { entity_category: 'diagnostic' }), row('number.threshold', { entity_category: 'config' }),
      row('select.sensitivity', { entity_category: 'config' }), row('switch.led', { entity_category: 'config' }),
      row('button.reset', { entity_category: 'config' }), row('event.report', { entity_category: 'diagnostic' }),
      row('update.firmware', { entity_category: 'config' }), row('light.led', { entity_category: 'diagnostic' }), row('remote.foreign_domain')];
    const before = JSON.stringify(registry), binding = resolve(registry)!;
    expect(binding.channelEntityIds).toEqual(['sensor.temperature']);
    expect(binding.secondaryEntityIds).toEqual(['binary_sensor.tamper', 'button.reset', 'event.report', 'light.led', 'number.threshold', 'select.sensitivity', 'sensor.battery', 'switch.led', 'update.firmware']);
    expect(binding.technicalEntityIds).toEqual(binding.secondaryEntityIds);
    expect(JSON.stringify(registry)).toBe(before);
  });
  it('non sceglie la batteria ordinaria prima della misura e ammette il monitor batteria come unica misura reale', () => {
    const registry = [row('sensor.a_battery', { original_device_class: 'battery' }), row('sensor.temperature')];
    const entities: EntityMap = { ...states, 'sensor.a_battery': fixtureEntity('sensor.a_battery', '90') };
    expect(resolve(registry, entities)?.primaryEntityId).toBe('sensor.temperature');
    expect(resolve([registry[0]!], entities)?.primaryEntityId).toBe('sensor.a_battery');
    expect(resolve([row('sensor.a_battery', { entity_category: 'diagnostic' })], entities)).toBeNull();
    delete entities['sensor.temperature'];
    expect(resolve(registry, entities)).toBeNull();
    expect(entities['sensor.temperature']).toBeUndefined();
  });
  it('usa la classe corrente con fallback al registro e mantiene il primario indisponibile senza sostituirlo con la batteria', () => {
    const registry = [row('binary_sensor.a_battery'), row('sensor.temperature')];
    const entities = fixtureEntities([fixtureEntity('binary_sensor.a_battery', 'on', { device_class: 'battery' }), fixtureEntity('sensor.temperature', 'unavailable')]);
    expect(resolve(registry, entities)?.primaryEntityId).toBe('sensor.temperature');
  });
  it('conserva i canali temporaneamente assenti e usa il primo osservabile disponibile', () => {
    const registry = [row('sensor.humidity'), row('sensor.temperature')];
    const entities = fixtureEntities([fixtureEntity('sensor.temperature', '0')]);
    expect(resolve(registry, entities)).toMatchObject({ primaryEntityId: 'sensor.temperature', channelEntityIds: ['sensor.humidity', 'sensor.temperature'] });
    expect(classify(registry, entities)).toMatchObject([{ primaryEntityId: 'sensor.temperature', entityIds: ['sensor.temperature', 'sensor.humidity'] }]);
    expect(resolve(registry, {})).toBeNull();
  });
  it('filtra hidden/disabled, deduplica e rivaluta un primario disabilitato', () => {
    const registry = [row('sensor.temperature'), row('sensor.temperature'), row('sensor.humidity'),
      row('binary_sensor.motion', { hidden_by: 'user' }), row('sensor.disabled', { disabled_by: 'integration' }), row('sensor.battery', { entity_category: 'diagnostic', hidden_by: 'user' })];
    expect(resolve(registry)?.channelEntityIds).toEqual(['sensor.humidity', 'sensor.temperature']);
    expect(resolve(registry)?.secondaryEntityIds).toEqual([]);
    expect(resolve(registry.map(entry => entry.entity_id === 'sensor.humidity' ? { ...entry, disabled_by: 'user' } : entry))?.primaryEntityId).toBe('sensor.temperature');
  });
  it('è deterministico invertendo il registro e preserva valori enumerati/data osservati', () => {
    const registry = [row('sensor.temperature'), row('sensor.humidity'), row('sensor.battery', { entity_category: 'diagnostic' })];
    expect(resolve(registry)).toEqual(resolve([...registry].reverse()));
    const entity = fixtureEntity('sensor.reading', '2026-11-11', { device_class: 'date' });
    expect(resolve([row(entity.entity_id)], { [entity.entity_id]: entity })?.primaryEntityId).toBe(entity.entity_id);
  });
  it('rifiuta dispositivi mancanti/disabilitati/di servizio e soli sensori tecnici', () => {
    const registry = [row('sensor.temperature')];
    expect(resolveSensorDeviceBinding('missing', devices, registry, states)).toBeNull();
    for (const extra of [{ disabled_by: 'user' }, { entry_type: 'service' }]) {
      expect(resolveSensorDeviceBinding('sensor-device', [{ id: 'sensor-device', ...extra }], registry, states)).toBeNull();
      expect(classifyDevices({ devices: [{ id: 'sensor-device', ...extra }], entityRegistry: registry, entities: states })).toEqual([]);
    }
    for (const entity_category of ['config', 'diagnostic']) {
      expect(resolve([row('sensor.temperature', { entity_category })])).toBeNull();
      expect(classify([row('sensor.temperature', { entity_category })])).toEqual([]);
    }
  });
  it('persiste soltanto i sette campi identità/ruoli, mai stato, storico, template o segreti', () => {
    const secret = 'SYNTHETIC_SENSOR_SECRET';
    const binding = resolve([row('sensor.temperature', { template: secret, access_token: secret }), row('sensor.signal', { entity_category: 'diagnostic' })],
      fixtureEntities([fixtureEntity('sensor.temperature', '21.5', { history: [secret], access_token: secret, configuration: secret })]))!;
    expect(Object.keys(binding).sort()).toEqual(['version', 'deviceId', 'family', 'primaryEntityId', 'channelEntityIds', 'secondaryEntityIds', 'technicalEntityIds'].sort());
    expect(JSON.stringify(binding)).not.toContain(secret);
  });
});

describe('Sensori fisici e helper: percorsi distinti senza euristiche', () => {
  it.each(SENSOR_HELPER_PLATFORMS)('la piattaforma certificata %s resta manuale anche con device_id', platform => {
    const registry = [row('sensor.temperature', { platform })];
    expect(resolve(registry)).toBeNull(); expect(classify(registry)).toEqual([]);
  });
  it('non include helper collegati al device fra canali o secondarie di un sensore fisico', () => {
    const registry = [row('sensor.temperature'), row('sensor.derived', { platform: 'template' }), row('binary_sensor.derived', { platform: 'threshold' }), row('number.derived', { platform: 'template' })];
    expect(resolve(registry)?.channelEntityIds).toEqual(['sensor.temperature']);
    expect(resolve(registry)?.secondaryEntityIds).toEqual([]);
  });
  it('non deduce la natura helper da nomi, marca o attributes.platform', () => {
    const registry = [row('sensor.temperature')];
    const entities = fixtureEntities([fixtureEntity('sensor.temperature', '21.5', { friendly_name: 'Template helper Sonos', platform: 'template' })]);
    expect(resolve(registry, entities)?.family).toBe('sensor'); expect(classify(registry, entities)[0]?.family).toBe('sensor');
  });
  it('non converte input o comandi manuali in canali fisici', () => {
    for (const domain of ['input_number', 'input_boolean', 'input_select', 'input_button', 'button', 'script', 'scene', 'automation', 'select', 'number', 'event']) {
      const id = `${domain}.manual`, registry = [row(id)];
      expect(resolve(registry, fixtureEntities([fixtureEntity(id, 'on')]))).toBeNull();
    }
  });
});

const products = [
  ['tv', 'media_player.main', 'androidtv_remote', 'on'], ['sonos', 'media_player.main', 'sonos', 'playing'], ['media', 'media_player.main', 'dlna_dmr', 'idle'],
  ['light', 'light.main', 'zha', 'on'], ['plug', 'switch.main', 'zha', 'on'], ['climate', 'climate.main', 'zha', 'heat'],
  ['cover', 'cover.main', 'zha', 'closed'], ['fan', 'fan.main', 'zha', 'on'], ['lock', 'lock.main', 'zha', 'locked'],
  ['alarm', 'alarm_control_panel.main', 'zha', 'disarmed'], ['camera', 'camera.main', 'zha', 'idle'],
  ['vacuum', 'vacuum.main', 'zha', 'docked'], ['mower', 'lawn_mower.main', 'zha', 'docked'],
] as const;
describe('La telemetria non sostituisce le tredici famiglie precedenti', () => {
  it.each(products)('%s mantiene la precedenza sulla propria temperatura ordinaria', (family, id, platform, state) => {
    const registry = [row(id, { platform }), row('sensor.temperature')];
    const entities: EntityMap = { ...states, [id]: fixtureEntity(id, state) };
    expect(resolve(registry, entities)).toBeNull(); expect(classify(registry, entities)[0]?.family).toBe(family);
  });
  it.each(products)('%s non diventa sensore prima del primo snapshot principale', (_family, id, platform) => {
    const registry = [row(id, { platform }), row('sensor.temperature')];
    expect(resolve(registry)).toBeNull(); expect(classify(registry)).toEqual([]);
  });
  it.each(products)('%s non diventa sensore quando il primario è hidden/disabled', (_family, id, platform, state) => {
    for (const extra of [{ hidden_by: 'user' }, { disabled_by: 'integration' }]) {
      const registry = [row(id, { platform, ...extra }), row('sensor.temperature')];
      const entities = { ...states, [id]: fixtureEntity(id, state) };
      expect(resolve(registry, entities)).toBeNull(); expect(classify(registry, entities)).toEqual([]);
    }
  });
  it('il LED tecnico proprio non trasforma il sensore in una luce', () => {
    const registry = [row('light.led', { entity_category: 'diagnostic' }), row('sensor.temperature')];
    const entities: EntityMap = { ...states, 'light.led': fixtureEntity('light.led', 'on') };
    expect(classify(registry, entities)).toMatchObject([{ family: 'sensor', primaryEntityId: 'sensor.temperature' }]);
    delete entities['sensor.temperature'];
    expect(classify(registry, entities)).toEqual([]);
    expect(resolve(registry, entities)).toBeNull();
  });
  it('non estende la correzione del LED ai dispositivi con un’altra funzione ordinaria', () => {
    const registry = [row('light.led', { entity_category: 'diagnostic' }), row('light.main'), row('sensor.temperature')];
    const entities: EntityMap = { ...states, 'light.led': fixtureEntity('light.led', 'on') };
    expect(classify(registry, entities)).toMatchObject([{ family: 'light' }]); expect(resolve(registry, entities)).toBeNull();
  });
});

describe('Sensore: contratto, identità entityId e destinazioni', () => {
  const binding = resolve([row('sensor.temperature')])!;
  const base: LauncherLayout = { version: 1, cover: { enabled: false }, pages: [{ id: 'home', kind: 'widgets', label: 'Casa', order: ['entity_card_new'], placements: {} }] };
  const key = (page: string, id: string) => `${page}::${id}`;
  it('rifiuta altri domini, sovrapposizioni tecniche, duplicati e famiglie prototype', () => {
    for (const invalid of [{ ...binding, primaryEntityId: 'switch.main', channelEntityIds: ['switch.main'] },
      { ...binding, channelEntityIds: ['sensor.temperature', 'input_number.helper'] }, { ...binding, technicalEntityIds: ['sensor.temperature'] },
      { ...binding, secondaryEntityIds: ['sensor.temperature'] }, { ...binding, primaryEntityId: 'sensor.missing' },
      { ...binding, channelEntityIds: ['sensor.temperature', 'sensor.temperature'] }, { ...binding, technicalEntityIds: ['sensor.foreign'] },
      { ...binding, family: '__proto__' }, { ...binding, family: 'constructor' }]) expect(isProductDeviceBinding(invalid)).toBe(false);
  });
  it('usa entityId esatto e ignora qualsiasi bindingEntityId di ripiego', () => {
    expect(BINDING_KEYS.sensor).toBe('entityId');
    expect(sensorProductBinding({ productDevice: binding, entityId: 'sensor.temperature' })).toBe(binding);
    expect(sensorProductBinding({ productDevice: binding, entityId: 'sensor.humidity' })).toBeNull();
    expect(sensorProductBinding({ productDevice: binding, entityId: ['sensor.temperature'] })).toBeNull();
    expect(sensorProductBinding({ productDevice: binding })).toBeNull();
    expect(sensorProductBinding({ productDevice: binding, entityId: 'sensor.temperature', sensorBindingMode: 'helper' })).toBeNull();
  });
  it('risolve il prodotto senza registro ma non riusa metadati stantii dopo riassociazione o modalità helper', () => {
    const settings = { categoryWidgetType: 'sensor', entityId: 'sensor.temperature', productDevice: binding };
    expect(deviceWidgetDestinations('sensor-device', base, [], () => settings, key)).toHaveLength(1);
    expect(deviceWidgetDestinations('sensor-device', base, [], () => ({ ...settings, entityId: 'sensor.humidity', bindingEntityId: 'sensor.temperature' }), key)).toEqual([]);
    expect(deviceWidgetDestinations('sensor-device', base, [], () => ({ ...settings, sensorBindingMode: 'helper' }), key)).toEqual([]);
  });
  it('preserva la destinazione legacy/manuale dal registro senza convertirla in Product', () => {
    const settings: CardSettings = { categoryWidgetType: 'sensor', entityId: 'sensor.temperature', sensorBindingMode: 'helper' };
    expect(sensorProductBinding(settings)).toBeNull();
    expect(deviceWidgetDestinations('sensor-device', base, [row('sensor.temperature')], () => settings, key)).toHaveLength(1);
    expect(settings).not.toHaveProperty('productDevice');
  });
  it('raggiunge pile e pagine nascoste e deduplica i segmenti senza scrivere il profilo', () => {
    const layout: LauncherLayout = { ...base, stacks: { pile: { ids: ['entity_card_new'] } }, commonOrderVersion: 1,
      pages: [{ ...base.pages[0]!, id: 'hidden', hidden: true, order: ['pile'] }, { ...base.pages[0]!, id: 'segment', logicalPageId: 'hidden', order: ['pile'] }] };
    const settings = { entityId: 'sensor.temperature', productDevice: binding };
    const before = JSON.stringify({ layout, settings });
    expect(deviceWidgetDestinations('sensor-device', layout, [], () => settings, key)).toMatchObject([{ widgetId: 'entity_card_new', pageId: 'hidden', stackId: 'pile' }]);
    expect(deviceWidgetDestinations('sensor-device', layout, [], () => settings, key)).toHaveLength(1);
    expect(JSON.stringify({ layout, settings })).toBe(before);
  });
});
