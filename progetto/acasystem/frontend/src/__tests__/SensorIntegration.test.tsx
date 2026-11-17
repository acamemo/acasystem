import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductBindingSection } from '@/templates/sheets/ProductBindingSection';
import { initialSensorBindingMode, SensorBindingSection } from '@/templates/sheets/SensorBindingSection';
import { ProductDevicePreview } from '@/templates/launcher/ProductDevicePreview';
import { mockHouse, buildRegistries, mockBindingSettings } from '@/utils/mockup/mockData';
import { buildMockupSeed } from '@/utils/mockup/seed';
import { classifyDevices } from '@/utils/devices/classify';
import { resolveSensorDeviceBinding, sensorProductBinding } from '@/utils/devices/productBinding';
import { createCategoryWidgetSeed } from '@/utils/launcher/categoryModels';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import type { CardSettingsMap } from '@/@types/dashboard';
import { fakeConnection, renderWithRuntime, serviceMock } from './ControlsHarness';

afterEach(cleanup);
const cases = [
  { deviceId: 'dev_sensor_environment', name: 'Sensore ambiente studio', channels: ['sensor.studio_co2', 'sensor.studio_temperatura', 'sensor.studio_umidita'] },
  { deviceId: 'dev_sensor_contact', name: 'Sensore finestra studio', channels: ['binary_sensor.finestra_studio'] },
];
function scenario() {
  const house = mockHouse('normal'), registry = buildRegistries(house.entities, house.devices);
  const { conn } = fakeConnection(message => message.type === 'config/device_registry/list' ? registry.devices
    : message.type === 'config/entity_registry/list' ? registry.entities : []);
  return { house, registry, conn };
}

describe('Sensori: raccordi dispositivo, anteprima e identità conservativa', () => {
  it.each(cases)('$name usa lo stesso prodotto in Trova e nella preparazione della disposizione', ({ deviceId, channels }) => {
    const { house, registry } = scenario();
    const classified = classifyDevices({ devices: registry.devices, entityRegistry: registry.entities, entities: house.entities }).find(device => device.deviceId === deviceId);
    expect(classified).toMatchObject({ family: 'sensor', widgetType: 'sensor' });
    const binding = resolveSensorDeviceBinding(deviceId, registry.devices, registry.entities, house.entities)!;
    expect([...binding.channelEntityIds].sort()).toEqual([...channels].sort());
    const seed = createCategoryWidgetSeed('sensor', 'isolated')!;
    seed.settings = { ...seed.settings, entityId: binding.primaryEntityId, bindingEntityId: null, sensorBindingMode: 'device', productDevice: binding };
    expect(sensorProductBinding(seed.settings)).toEqual(binding);
    expect(findWidgetDefinition(seed.id, seed.settings)?.sizes.min).toEqual({ w: 2, h: 2 });
    const callService = serviceMock();
    const view = renderWithRuntime(<ProductDevicePreview binding={binding} entities={house.entities} label="Anteprima sensore" />, { entities: house.entities, callService });
    expect(view.container.querySelectorAll('button, input, video, audio, img, iframe')).toHaveLength(0);
    expect(callService).not.toHaveBeenCalled();
    expect(binding.technicalEntityIds?.some(id => channels.includes(id))).toBe(false);
  });
  it.each(cases)('$name viene associato manualmente con una sola patch e nessun comando', async ({ deviceId, name }) => {
    const { house, registry, conn } = scenario(), saveBinding = vi.fn(async () => undefined), callService = serviceMock();
    renderWithRuntime(<ProductBindingSection family="sensor" settings={{ categoryWidgetType: 'sensor', entityId: null }} saveBinding={saveBinding} />,
      { conn, entities: house.entities, entitiesLoaded: true, callService });
    fireEvent.click(await screen.findByRole('button', { name: 'Dispositivo da collegare: Non collegato' }));
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^${name}$`) }));
    await waitFor(() => expect(saveBinding).toHaveBeenCalledTimes(1));
    const binding = resolveSensorDeviceBinding(deviceId, registry.devices, registry.entities, house.entities)!;
    expect(saveBinding).toHaveBeenCalledWith(expect.objectContaining({ entityId: binding.primaryEntityId, bindingEntityId: null, sensorBindingMode: 'device', productDevice: binding, name }));
    expect(callService).not.toHaveBeenCalled();
  });
  it('la Console e il minimo prodotto non migrano i vecchi helper o i metadati riassociati', () => {
    const { house, registry } = scenario();
    const binding = resolveSensorDeviceBinding('dev_sensor_environment', registry.devices, registry.entities, house.entities)!;
    const saved = { categoryWidgetType: 'sensor', entityId: binding.primaryEntityId };
    const legacy = findWidgetDefinition('entity_card_legacy', saved)!;
    const product = findWidgetDefinition('entity_card_new', { ...saved, productDevice: binding, sensorBindingMode: 'device' })!;
    expect(product.Console).toBeDefined(); expect(product.sizes.min).toEqual({ w: 2, h: 2 });
    expect(legacy.Console).toBeUndefined(); expect(legacy.sizes.min).toEqual({ w: 1, h: 1 });
    expect(findWidgetDefinition('entity_card_new', { ...saved, productDevice: binding, sensorBindingMode: 'helper' })).toBe(legacy);
    expect(findWidgetDefinition('entity_card_new', { ...saved, entityId: 'input_number.helper', productDevice: binding })).toBe(legacy);
  });
  it('la scelta iniziale rispetta la modalità helper esplicita anche con metadati prodotto stantii', () => {
    const { house, registry } = scenario();
    const binding = resolveSensorDeviceBinding('dev_sensor_environment', registry.devices, registry.entities, house.entities)!;
    expect(initialSensorBindingMode({})).toBe('device');
    expect(initialSensorBindingMode({ entityId: 'input_number.helper' })).toBe('helper');
    expect(initialSensorBindingMode({ entityId: binding.primaryEntityId, productDevice: binding })).toBe('device');
    expect(initialSensorBindingMode({ entityId: binding.primaryEntityId, productDevice: binding, sensorBindingMode: 'helper' })).toBe('helper');
  });
  it('sfogliare le due modalità non scrive né invia comandi, e un helper mantiene il solo entityId storico', async () => {
    const { house, conn } = scenario(), saveBinding = vi.fn(async () => undefined), callService = serviceMock();
    const entities = { ...house.entities, ...fixtureEntities([fixtureEntity('input_number.manual', '4', { friendly_name: 'Soglia manuale', min: 0, max: 10, step: 1 })]) };
    renderWithRuntime(<SensorBindingSection settings={{ categoryWidgetType: 'sensor' }} saveBinding={saveBinding} />, { conn, entities, entitiesLoaded: true, callService });
    fireEvent.click(screen.getByRole('button', { name: /^Helper e comandi$/ }));
    expect(saveBinding).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^Dispositivo$/ }));
    expect(saveBinding).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^Helper e comandi$/ }));
    fireEvent.click(await screen.findByRole('button', { name: /^Helper o comando: Non collegato$/ }));
    fireEvent.click(await screen.findByRole('button', { name: /^Soglia manuale$/ }));
    await waitFor(() => expect(saveBinding).toHaveBeenCalledTimes(1));
    expect(saveBinding).toHaveBeenCalledWith({ entityId: 'input_number.manual', bindingEntityId: null, productDevice: undefined, sensorBindingMode: 'helper' });
    expect(callService).not.toHaveBeenCalled();
  });
  it.each([
    ['unavailable', 'Non disponibile'], ['unknown', 'Stato sconosciuto'], ['constructor', 'Valore non valido'],
  ])('l’anteprima numerica %s non fabbrica una misura valida o uno zero', (state, expected) => {
    const { house, registry } = scenario();
    const binding = resolveSensorDeviceBinding('dev_sensor_environment', registry.devices, registry.entities, house.entities)!;
    const entities = { ...house.entities, [binding.primaryEntityId]: fixtureEntity(binding.primaryEntityId, state, { device_class: 'carbon_dioxide', unit_of_measurement: 'ppm' }) };
    const view = renderWithRuntime(<ProductDevicePreview binding={binding} entities={entities} label="Sensore" />, { entities, callService: serviceMock() });
    expect(screen.getByText(expected)).toBeInTheDocument(); expect(screen.queryByText(/^0(?:,0)?$/)).toBeNull();
    expect(view.container.querySelector('button, img, video, iframe')).toBeNull();
  });
  it('la finestra chiusa rimane uno stato osservato e non viene reinterpretata come assenza di fumo', () => {
    const { house, registry } = scenario(), binding = resolveSensorDeviceBinding('dev_sensor_contact', registry.devices, registry.entities, house.entities)!;
    renderWithRuntime(<ProductDevicePreview binding={binding} entities={house.entities} label="Finestra" />);
    expect(screen.getByText('Chiusa')).toBeInTheDocument();
    expect(screen.queryByText(/Nessun fumo|Sicuro/)).toBeNull();
  });
  it('il seed cold contiene prodotti sensore coerenti e conserva la seconda configurazione manuale', () => {
    const seed = buildMockupSeed(), cards = JSON.parse(seed.storage.tunet_card_settings!) as CardSettingsMap;
    const products = Object.values(cards).filter(settings => sensorProductBinding(settings));
    expect(products.length).toBeGreaterThan(0);
    for (const settings of products) expect(settings.entityId).toBe(settings.productDevice?.primaryEntityId);
    const legacy = mockBindingSettings('sensor', true);
    expect(sensorProductBinding(legacy)).toBeNull(); expect(legacy.productDevice).toBeUndefined();
    expect(legacy.sensorBindingMode).toBe('helper');
  });
});
