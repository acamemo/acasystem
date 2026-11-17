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
import { fakeConnection, flush } from './ControlsHarness';

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
  fixtureEntity('sensor.leaf_battery', '74.46', { unit_of_measurement: '%' }),
  fixtureEntity('sensor.leaf_range', '215', { unit_of_measurement: 'km' }),
  fixtureEntity('device_tracker.leaf', 'home', { latitude: 45.07, longitude: 7.68 }),
  fixtureEntity('binary_sensor.leaf_charging', 'on'),
  fixtureEntity('binary_sensor.leaf_plugged', 'on'),
  fixtureEntity('climate.leaf', 'off', {
    supported_features: 385,
    temperature: 21,
    current_temperature: 14.5,
    temperature_unit: '°C',
    min_temp: 16,
    max_temp: 30,
    target_temp_step: 0.5,
  }),
  fixtureEntity('button.leaf_update', 'unknown'),
  fixtureEntity('switch.leaf_charge', 'off', { friendly_name: 'Ricarica' }),
  fixtureEntity('button.leaf_start_charge', 'unknown', { friendly_name: 'Avvia ricarica' }),
  fixtureEntity('script.leaf_charge_now', 'off', { friendly_name: 'Ricarica subito' }),
  fixtureEntity('number.leaf_limit', '80', {
    min: 50,
    max: 100,
    step: 5,
    unit_of_measurement: '%',
  }),
  fixtureEntity('select.leaf_limit', '80%', { options: ['80%', '90%', '100%'] }),
  fixtureEntity('lock.leaf', 'locked'),
  fixtureEntity('switch.leaf_ignition', 'off'),
]);

const services = {
  switch: { turn_on: {}, turn_off: {} },
  button: { press: {} },
  script: { turn_on: {} },
  number: { set_value: {} },
  select: { select_option: {} },
  climate: { turn_on: {}, turn_off: {}, set_temperature: {} },
  lock: { lock: {}, unlock: {} },
};

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
  it('2×2: due misure native, stato ricarica e immagine sicura, senza soglia batteria inventata', () => {
    const { container } = renderWithRuntime(<CarWidget {...props()} />, { entities });
    expect(screen.getByText('Auto')).toBeInTheDocument();
    expect(screen.getByText('74,5')).toBeInTheDocument();
    expect(screen.getByText('215')).toBeInTheDocument();
    expect(screen.getByText('In carica')).toBeInTheDocument();
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'http://ha.local/local/leaf.png'
    );
  });

  it('sensori mantengono l’unità nativa; clima usa i valori già serializzati nell’unità HA', () => {
    const metric = createFixtureRuntime().haConfig,
      haConfig = metric && {
        ...metric,
        unit_system: { ...metric.unit_system, length: 'mi', temperature: '°F' },
      };
    const imperialEntities = {
      ...entities,
      'climate.leaf': fixtureEntity('climate.leaf', 'off', {
        supported_features: 385,
        temperature: 70,
        current_temperature: 58,
        min_temp: 62,
        max_temp: 86,
        target_temp_step: 1,
      }),
    };
    const view = renderWithRuntime(<CarWidget {...props()} />, {
      entities: imperialEntities,
      haConfig,
    });
    expect(screen.getByText('215')).toBeInTheDocument();
    expect(screen.getByText('km')).toBeInTheDocument();
    view.update({ services, conn: fakeConnection().conn }, details());
    expect(screen.getByText('215 km')).toBeInTheDocument();
    expect(screen.getByText('Temperatura desiderata: 70 °F')).toBeInTheDocument();
    expect(screen.queryByText('Temperatura desiderata: 21 °C')).not.toBeInTheDocument();
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
    expect(screen.getByText('Collega le fonti dell’auto')).toBeInTheDocument();
  });
});

describe('auto: dettagli (stessi servizi di LeafModal)', () => {
  it('clima e aggiornamento espliciti; serratura e motore con conferma, mappa solo su click', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const view = renderWithRuntime(details(), {
      entities,
      callService,
      services,
      conn: fakeConnection().conn,
    });
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Accendi clima' }));
    expect(callService).toHaveBeenLastCalledWith('climate', 'turn_on', {
      entity_id: 'climate.leaf',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tecnica e manutenzione' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aggiorna dati' }));
    expect(callService).toHaveBeenLastCalledWith('button', 'press', {
      entity_id: 'button.leaf_update',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sblocca' }));
    expect(callService).not.toHaveBeenCalledWith('lock', 'unlock', expect.anything());
    fireEvent.click(screen.getByRole('button', { name: 'Conferma sblocco' }));
    expect(callService).toHaveBeenLastCalledWith('lock', 'unlock', { entity_id: 'lock.leaf' });
    fireEvent.click(screen.getByRole('button', { name: 'Avvio motore' }));
    expect(callService).not.toHaveBeenCalledWith('switch', 'turn_on', {
      entity_id: 'switch.leaf_ignition',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Conferma avvio motore' }));
    expect(callService).toHaveBeenLastCalledWith('switch', 'turn_on', {
      entity_id: 'switch.leaf_ignition',
    });
    expect(view.container.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('link', { name: 'Apri la posizione sulla mappa' })).toHaveAttribute(
      'href',
      expect.stringContaining('mlat=45.07&mlon=7.68')
    );
  });

  it('temperatura desiderata: passo e limiti dichiarati dal dispositivo, inviata una volta', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const callService = vi.fn().mockResolvedValue(undefined);
    renderWithRuntime(details(), { entities, callService, services, conn: fakeConnection().conn });
    await flush();
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
    expect(screen.getByRole('slider', { name: 'Temperatura desiderata' })).toHaveAttribute(
      'aria-busy',
      'true'
    );
  });

  it('ricarica: switch, pulsante, script, limite nativo numerico e scelta supportata', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const callService = vi.fn().mockResolvedValue(undefined);
    renderWithRuntime(details(), { entities, callService, services, conn: fakeConnection().conn });
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Avvia ricarica: Ricarica' }));
    expect(callService).toHaveBeenLastCalledWith('switch', 'turn_on', {
      entity_id: 'switch.leaf_charge',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Avvia ricarica' }));
    expect(callService).toHaveBeenLastCalledWith('button', 'press', {
      entity_id: 'button.leaf_start_charge',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ricarica subito' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Limite di ricarica: 80%' }));
    fireEvent.click(screen.getByRole('button', { name: '90%' }));
    expect(callService).toHaveBeenLastCalledWith('select', 'select_option', {
      entity_id: 'select.leaf_limit',
      option: '90%',
    });
  });
});
