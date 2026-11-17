import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LightDetails } from '@/components/widgets/controls/light/LightDetails';
import { operationalProfile } from '@/components/widgets/adaptive/operationalProfile';
import type { ProductDeviceBinding } from '@/utils/devices/productBinding';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';

const binding: ProductDeviceBinding = { version: 1, family: 'light', deviceId: 'lamp', primaryEntityId: 'light.a', channelEntityIds: ['light.a', 'light.b'], secondaryEntityIds: ['sensor.power', 'sensor.battery', 'button.identify'], technicalEntityIds: ['sensor.battery', 'button.identify'] };
const entities = fixtureEntities([
  fixtureEntity('light.a', 'on', { friendly_name: 'Canale lettura', brightness: 128, supported_color_modes: ['brightness'] }),
  fixtureEntity('light.b', 'off', { friendly_name: 'Canale ambiente', brightness: 64, supported_color_modes: ['hs', 'color_temp'], hs_color: [120, 80], color_temp_kelvin: 3000, min_color_temp_kelvin: 2200, max_color_temp_kelvin: 6500, effect_list: ['Nessuno', 'Arcobaleno'], effect: 'Nessuno' }),
  fixtureEntity('sensor.power', '12', { friendly_name: 'Consumo attuale', unit_of_measurement: 'W' }),
  fixtureEntity('sensor.battery', '80', { friendly_name: 'Batteria tecnica', unit_of_measurement: '%' }),
  fixtureEntity('button.identify', 'unknown', { friendly_name: 'Identifica lampada' }),
]);
const services = { light: { turn_on: {}, turn_off: {} }, button: { press: {} } };
const settings = { categoryWidgetType: 'light', bindingEntityId: 'light.a', productDevice: binding };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('un widget Luce per dispositivo', () => {
  it('mantiene gli ID dei controlli principali e distingue ogni controllo del secondo canale', () => {
    const legacy = operationalProfile({ type: 'light', entityId: 'light.a', settings: { categoryWidgetType: 'light' }, entities, services });
    const product = operationalProfile({ type: 'light', entityId: 'light.a', settings, entities, services });
    expect(product.capabilities.filter(cap => !cap.id.startsWith('channel:'))).toEqual(legacy.capabilities);
    expect(product.capabilities.map(cap => cap.id)).toContain('channel:light.b:power');
    expect(product.capabilities.map(cap => cap.id)).toContain('channel:light.b:brightness');
    expect(new Set(product.capabilities.map(cap => cap.id)).size).toBe(product.capabilities.length);
    expect(product.execute('channel:light.b:power', true, product.values)?.calls).toEqual([{ domain: 'light', service: 'turn_on', data: { entity_id: 'light.b' } }]);
    expect(product.execute('power', false, product.values)?.calls[0]?.data.entity_id).toBe('light.a');
  });
  it('attributi/servizi mancanti e canali non disponibili non generano comandi fantasma', () => {
    const reduced = { ...entities, 'light.b': fixtureEntity('light.b', 'unavailable', { supported_color_modes: ['onoff'] }) };
    const product = operationalProfile({ type: 'light', entityId: 'light.a', settings, entities: reduced, services });
    expect(product.capabilities.find(cap => cap.id === 'channel:light.b:brightness')).toBeUndefined();
    expect(product.execute('channel:light.b:power', true, product.values)).toBeNull();
    const denied = operationalProfile({ type: 'light', entityId: 'light.a', settings, entities, services: {} });
    expect(denied.execute('power', true, denied.values)).toBeNull(); expect(denied.execute('channel:light.b:power', true, denied.values)).toBeNull();
  });
  it('mostra tutti i canali e le misure, tiene separata la tecnica e non invia nulla all’apertura', async () => {
    const callService = serviceMock(), { conn, sendMessagePromise } = fakeConnection();
    renderWithRuntime(<LightDetails id="light.a" settingsKey="home::light.widget" settings={settings} onClose={() => undefined} />, { entities, services, conn, callService });
    await flush();
    expect(screen.getByRole('region', { name: 'Canale lettura' })).toBeInTheDocument(); expect(screen.getByRole('region', { name: 'Canale ambiente' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Misure' })).getByText('Consumo attuale')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Misure' })).queryByText('Batteria tecnica')).toBeNull();
    const tech = screen.getByRole('button', { name: 'Tecnica e manutenzione' }); expect(tech).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(tech.getAttribute('aria-controls')!)).toHaveAttribute('inert');
    expect(callService).not.toHaveBeenCalled(); expect(sendMessagePromise).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('region', { name: 'Canale ambiente' })).getByRole('button', { name: 'Accensione luce' }));
    await flush(); expect(callService).toHaveBeenCalledWith('light', 'turn_on', { entity_id: 'light.b' });
  });
  it('il secondo canale conserva colore ed effetti propri nella schermata completa', async () => {
    const callService = serviceMock(), { conn } = fakeConnection();
    renderWithRuntime(<LightDetails id="light.a" settingsKey="widget" settings={settings} onClose={() => undefined} />, { entities, services, conn, callService });
    const second = within(screen.getByRole('region', { name: 'Canale ambiente' }));
    expect(second.getByRole('slider', { name: 'Colore della luce' })).toBeInTheDocument();
    fireEvent.click(second.getByRole('button', { name: 'Effetto: Nessuno' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Arcobaleno$/ }));
    await flush(); expect(callService).toHaveBeenCalledWith('light', 'turn_on', { entity_id: 'light.b', effect: 'Arcobaleno' });
  });
  it('i comandi tecnici passano dallo stesso helper e non dichiarano una conferma fisica', async () => {
    const callService = serviceMock(), { conn } = fakeConnection();
    renderWithRuntime(<LightDetails id="light.a" settingsKey="widget" settings={settings} onClose={() => undefined} />, { entities, services, conn, callService });
    fireEvent.click(screen.getByRole('button', { name: 'Tecnica e manutenzione' }));
    fireEvent.click(screen.getByRole('button', { name: 'Identifica lampada' }));
    await flush(); expect(callService).toHaveBeenCalledWith('button', 'press', { entity_id: 'button.identify' });
    expect(screen.getByText('Comando accettato da Home Assistant')).toBeInTheDocument();
  });
  it('luminosità, tonalità e temperatura comandano il canale corretto con i valori della sua capacità', async () => {
    const callService = serviceMock(), { conn } = fakeConnection();
    renderWithRuntime(<LightDetails id="light.a" settingsKey="widget" settings={settings} onClose={() => undefined} />, { entities, services, conn, callService });
    const second = within(screen.getByRole('region', { name: 'Canale ambiente' }));
    fireEvent.keyDown(second.getByRole('slider', { name: 'Luminosità della luce' }), { key: 'ArrowRight' });
    fireEvent.keyDown(second.getByRole('slider', { name: 'Colore della luce' }), { key: 'ArrowRight' });
    fireEvent.keyDown(second.getByRole('slider', { name: 'Temperatura del bianco' }), { key: 'ArrowRight' });
    await flush();
    expect(callService).toHaveBeenCalledWith('light', 'turn_on', { entity_id: 'light.b', brightness_pct: 26 });
    expect(callService).toHaveBeenCalledWith('light', 'turn_on', { entity_id: 'light.b', hs_color: [121, 80] });
    expect(callService).toHaveBeenCalledWith('light', 'turn_on', { entity_id: 'light.b', color_temp_kelvin: 3100 });
    expect(callService.mock.calls.every(call => call[2]?.entity_id === 'light.b')).toBe(true);
  });
  it('un widget manuale mantiene l’interfaccia precedente senza sezioni o associazioni nuove', () => {
    renderWithRuntime(<LightDetails id="light.a" settingsKey="light.a" settings={{}} onClose={() => undefined} />, { entities, services });
    expect(screen.getByRole('switch', { name: 'Accensione di Canale lettura' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tecnica e manutenzione' })).toBeNull();
    expect(screen.queryByText('Canale ambiente')).toBeNull();
  });
  it('dopo un’associazione manuale diversa ignora i vecchi metadati e non comanda i canali precedenti', async () => {
    const callService = serviceMock(), { conn } = fakeConnection();
    const rebound = { ...settings, bindingEntityId: 'light.c' };
    const current = { ...entities, 'light.c': fixtureEntity('light.c', 'on', { friendly_name: 'Nuovo dispositivo', supported_color_modes: ['brightness'], brightness: 128 }) };
    const profile = operationalProfile({ type: 'light', entityId: 'light.c', settings: rebound, entities: current, services });
    expect(profile.capabilities.some(cap => cap.id.startsWith('channel:'))).toBe(false);
    expect(profile.execute('power', false, profile.values)?.calls[0]?.data.entity_id).toBe('light.c');
    renderWithRuntime(<LightDetails id="light.c" settingsKey="widget" settings={rebound} onClose={() => undefined} />, { entities: current, services, conn, callService });
    expect(screen.queryByRole('region', { name: 'Canale lettura' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Canale ambiente' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tecnica e manutenzione' })).toBeNull();
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('switch', { name: 'Accensione di Nuovo dispositivo' }));
    await flush();
    expect(callService).toHaveBeenCalledWith('light', 'toggle', { entity_id: 'light.c' });
    expect(callService.mock.calls.every(call => call[2]?.entity_id === 'light.c')).toBe(true);
  });
});
