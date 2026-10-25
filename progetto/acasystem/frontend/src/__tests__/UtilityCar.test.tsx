import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CarWidget } from '@/components/widgets/utilities/car/CarWidget';
import { CarDetails } from '@/components/widgets/utilities/car/CarDetails';
import {
  chargeControlCall,
  readCar,
  readCarSettings,
} from '@/components/widgets/utilities/car/carData';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { renderWithRuntime } from './UtilityHarness';

const settings = {
  batteryId: 'sensor.leaf_battery',
  rangeId: 'sensor.leaf_range',
  locationId: 'device_tracker.leaf',
  chargingId: 'binary_sensor.leaf_charging',
  pluggedId: 'binary_sensor.leaf_plugged',
  climateId: 'climate.leaf',
  updateButtonId: 'button.leaf_update',
  chargeControlIds: ['switch.leaf_charge', 'button.leaf_start_charge', 'script.leaf_charge_now'],
  chargeLimitNumberId: 'number.leaf_limit',
  chargeLimitSelectId: 'select.leaf_limit',
  lockId: 'lock.leaf',
  ignitionSwitchId: 'switch.leaf_ignition',
  imageUrl: '/local/leaf.png',
};

const entities = fixtureEntities([
  fixtureEntity('sensor.leaf_battery', '74.46'),
  fixtureEntity('sensor.leaf_range', '215', { unit_of_measurement: 'km' }),
  fixtureEntity('device_tracker.leaf', 'home', { latitude: 45.07, longitude: 7.68 }),
  fixtureEntity('binary_sensor.leaf_charging', 'on'),
  fixtureEntity('binary_sensor.leaf_plugged', 'on'),
  fixtureEntity('climate.leaf', 'off', {
    supported_features: 385,
    temperature: 21,
    current_temperature: 14.5,
    temperature_unit: '°C',
  }),
  fixtureEntity('button.leaf_update', 'unknown'),
  fixtureEntity('switch.leaf_charge', 'off', { friendly_name: 'Ricarica' }),
  fixtureEntity('button.leaf_start_charge', 'unknown', { friendly_name: 'Avvia ricarica' }),
  fixtureEntity('script.leaf_charge_now', 'off', { friendly_name: 'Ricarica subito' }),
  fixtureEntity('number.leaf_limit', '80', { min: 50, max: 100, step: 5 }),
  fixtureEntity('select.leaf_limit', '80%', { options: ['80%', '90%', '100%'] }),
  fixtureEntity('lock.leaf', 'locked'),
  fixtureEntity('switch.leaf_ignition', 'off'),
]);

const props = (id = 'car_card_1', w = 2, h = 2) => ({
  id,
  settingsKey: `home::${id}`,
  settings,
  size: { w, h },
  editMode: false,
});
const details = () => (
  <CarDetails
    id="car_card_1"
    settingsKey="home::car_card_1"
    settings={settings}
    onClose={() => {}}
  />
);

afterEach(() => {
  vi.useRealTimers();
});

describe('auto: dati', () => {
  it('chargingId legacy vale come chargingStateId; controlli di ricarica per dominio', () => {
    const car = readCarSettings({
      chargingId: 'binary_sensor.x',
      chargeControlId: 'switch.y',
      chargeControlIds: ['button.z'],
    });
    expect(car.ids.chargingStateId).toBe('binary_sensor.x');
    expect(car.chargeControlIds).toEqual(['button.z', 'switch.y']);
    expect(chargeControlCall('switch.a', 'on')).toEqual({ domain: 'switch', service: 'turn_off' });
    expect(chargeControlCall('input_button.a', undefined)).toEqual({
      domain: 'input_button',
      service: 'press',
    });
    expect(chargeControlCall('script.a', 'off')).toEqual({ domain: 'script', service: 'turn_on' });
    const data = readCar(entities, readCarSettings(settings), createFixtureRuntime().haConfig);
    expect(data).toMatchObject({
      battery: 74.46,
      range: 215,
      rangeUnit: 'km',
      isCharging: true,
      isPlugged: true,
      isClimateOn: false,
    });
  });

  it('autonomia nell’unità di Home Assistant (haConfig), non in quella del sensore', () => {
    const car = readCarSettings(settings);
    const metric = createFixtureRuntime().haConfig;
    const imperial = metric && { ...metric, unit_system: { ...metric.unit_system, length: 'mi' } };
    const miles = readCar(entities, car, imperial);
    expect(miles.rangeUnit).toBe('mi');
    expect(miles.range).toBeCloseTo(215 / 1.609344, 3);
    // A sensor in miles is shown in km on a metric installation.
    const inMiles = fixtureEntities([
      fixtureEntity('sensor.leaf_range', '100', { unit_of_measurement: 'mi' }),
    ]);
    expect(readCar(inMiles, car, metric)).toMatchObject({ rangeUnit: 'km' });
    expect(readCar(inMiles, car, metric).range).toBeCloseTo(160.9344, 3);
    // Not loaded yet: the reading as the sensor gives it, km when it has no unit.
    expect(readCar(inMiles, car, null)).toMatchObject({ range: 100, rangeUnit: 'mi' });
    const noUnit = fixtureEntities([fixtureEntity('sensor.leaf_range', '80')]);
    expect(readCar(noUnit, car, null)).toMatchObject({ range: 80, rangeUnit: 'km' });
  });
});

describe('auto: widget', () => {
  it('2×2: batteria, autonomia, posizione, ricarica e immagine', () => {
    const { container } = renderWithRuntime(<CarWidget {...props()} />, { entities });
    expect(screen.getByText('Auto')).toBeInTheDocument();
    expect(screen.getByText('74,5')).toBeInTheDocument();
    expect(screen.getByText('215')).toBeInTheDocument();
    expect(screen.getByText('A casa')).toBeInTheDocument();
    expect(screen.getByText('In carica')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Livello della batteria' })).toHaveAttribute(
      'aria-valuenow',
      '75'
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'http://ha.local/local/leaf.png'
    );
  });

  it('widget e dettagli in miglia e °F con un’installazione imperiale', () => {
    const metric = createFixtureRuntime().haConfig;
    const haConfig = metric && {
      ...metric,
      unit_system: { ...metric.unit_system, length: 'mi', temperature: '°F' },
    };
    const view = renderWithRuntime(<CarWidget {...props()} />, { entities, haConfig });
    expect(screen.getByText('133,6')).toBeInTheDocument();
    expect(screen.getByText('mi')).toBeInTheDocument();
    view.update({}, details());
    expect(screen.getByText('133,6 mi')).toBeInTheDocument();
    // The climate entity already reports in the HA unit: only the label changes.
    expect(screen.getByText('14,5 °F')).toBeInTheDocument();
  });

  it('id legacy «car», taglia 2×1, nome personalizzato', () => {
    renderWithRuntime(<CarWidget {...props('car', 2, 1)} />, {
      entities,
      customNames: { car: 'Leaf' },
    });
    expect(screen.getByText('Leaf')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Leaf, apri i dettagli dell’auto' })
    ).toBeInTheDocument();
  });

  it('stati: caricamento e non configurata', () => {
    const view = renderWithRuntime(<CarWidget {...props()} />, { entities, entitiesLoaded: false });
    expect(screen.getByRole('status')).toHaveTextContent(/Caricamento/);
    view.update({ entitiesLoaded: true }, <CarWidget {...props()} settings={{}} />);
    expect(screen.getByText('Collega le entità dell’auto')).toBeInTheDocument();
  });
});

describe('auto: dettagli (stessi servizi di LeafModal)', () => {
  it('clima, aggiornamento, serratura e motore', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    renderWithRuntime(details(), { entities, callService, conn: {} as never });
    fireEvent.click(screen.getByRole('switch', { name: 'Clima dell’auto' }));
    expect(callService).toHaveBeenLastCalledWith('climate', 'turn_on', {
      entity_id: 'climate.leaf',
    });
    fireEvent.click(screen.getByRole('button', { name: /Aggiorna dati/ }));
    expect(callService).toHaveBeenLastCalledWith('button', 'press', {
      entity_id: 'button.leaf_update',
    });
    const unlock = screen.getByRole('button', { name: /Sblocca/ });
    fireEvent.click(unlock);
    expect(callService).not.toHaveBeenCalledWith('lock', 'unlock', expect.anything());
    fireEvent.click(unlock);
    expect(callService).toHaveBeenLastCalledWith('lock', 'unlock', { entity_id: 'lock.leaf' });
    fireEvent.click(screen.getByRole('button', { name: /Avvia il motore/ }));
    expect(callService).toHaveBeenLastCalledWith('switch', 'turn_on', {
      entity_id: 'switch.leaf_ignition',
    });
    expect(
      screen.getByTitle('Mappa con l’ultima posizione dell’auto').getAttribute('src')
    ).toContain('marker=45.07%2C7.68');
  });

  it('temperatura desiderata: passi di 0,5 e limite 16–30, inviata una volta', async () => {
    vi.useFakeTimers();
    const callService = vi.fn().mockResolvedValue(undefined);
    renderWithRuntime(details(), { entities, callService });
    const up = screen.getByRole('button', { name: 'Aumenta temperatura desiderata' });
    fireEvent.click(up);
    fireEvent.click(up);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenLastCalledWith('climate', 'set_temperature', {
      entity_id: 'climate.leaf',
      temperature: 22,
    });
    // Requested, not yet confirmed.
    expect(screen.getByRole('slider', { name: 'Temperatura desiderata' })).toHaveAttribute(
      'aria-busy',
      'true'
    );
    fireEvent.change(screen.getByRole('slider', { name: 'Temperatura desiderata' }), {
      target: { value: '40' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(callService).toHaveBeenLastCalledWith('climate', 'set_temperature', {
      entity_id: 'climate.leaf',
      temperature: 30,
    });
  });

  it('ricarica: interruttore, pulsante, script, limite numerico e a scelta', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const callService = vi.fn().mockResolvedValue(undefined);
    renderWithRuntime(details(), { entities, callService });
    fireEvent.click(screen.getByRole('switch', { name: 'Ricarica' }));
    expect(callService).toHaveBeenLastCalledWith('switch', 'turn_on', {
      entity_id: 'switch.leaf_charge',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Premi: Avvia ricarica' }));
    expect(callService).toHaveBeenLastCalledWith('button', 'press', {
      entity_id: 'button.leaf_start_charge',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Esegui: Ricarica subito' }));
    expect(callService).toHaveBeenLastCalledWith('script', 'turn_on', {
      entity_id: 'script.leaf_charge_now',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aumenta limite di carica' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(callService).toHaveBeenLastCalledWith('number', 'set_value', {
      entity_id: 'number.leaf_limit',
      value: 85,
    });
    fireEvent.click(screen.getByRole('button', { name: /leaf limit: 80%/ }));
    fireEvent.click(screen.getByRole('button', { name: '90%' }));
    expect(callService).toHaveBeenLastCalledWith('select', 'select_option', {
      entity_id: 'select.leaf_limit',
      option: '90%',
    });
  });
});
