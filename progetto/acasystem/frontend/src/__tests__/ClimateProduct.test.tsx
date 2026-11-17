import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClimateWidget } from '@/components/widgets/home/climate/ClimateWidget';
import { ClimateDetails } from '@/components/widgets/home/climate/ClimateDetails';
import { ClimateConsole } from '@/components/widgets/home/climate/ClimateConsole';
import { AdaptiveCategoryWidget } from '@/components/widgets/adaptive/AdaptiveCategoryWidget';
import {
  climateProductBinding,
  climatePowerCall,
  climateTargetCall,
  productClimateView,
} from '@/components/widgets/home/climate/productClimateModel';
import type { ProductDeviceBinding } from '@/utils/devices/productBinding';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';

const binding: ProductDeviceBinding = {
  version: 1,
  family: 'climate',
  deviceId: 'thermostat',
  primaryEntityId: 'climate.main',
  channelEntityIds: ['climate.main'],
  secondaryEntityIds: ['sensor.room', 'sensor.filter', 'switch.led'],
  technicalEntityIds: ['sensor.filter', 'switch.led'],
};
const settings = {
  climateId: 'climate.main',
  categoryWidgetType: 'climate',
  name: 'Clima studio',
  productDevice: binding,
};
const attributes = {
  friendly_name: 'Zona',
  supported_features: 1 | 4 | 8 | 16 | 32 | 128 | 256 | 512,
  current_temperature: 68,
  temperature: 72,
  temperature_unit: '°F',
  min_temp: 50,
  max_temp: 86,
  target_temp_step: 2,
  hvac_modes: ['off', 'heat', 'cool'],
  hvac_action: 'idle',
  humidity: 45,
  current_humidity: 40,
  min_humidity: 30,
  max_humidity: 70,
  target_humidity_step: 5,
  fan_mode: 'auto',
  fan_modes: ['auto', 'high'],
  preset_mode: 'none',
  preset_modes: ['none', 'eco'],
  swing_mode: 'off',
  swing_modes: ['off', 'on'],
  swing_horizontal_mode: 'off',
  swing_horizontal_modes: ['off', 'on'],
};
const entities = fixtureEntities([
  fixtureEntity('climate.main', 'heat', attributes),
  fixtureEntity('sensor.room', '20.1', {
    friendly_name: 'Sonda stanza',
    unit_of_measurement: '°C',
  }),
  fixtureEntity('sensor.filter', '100', {
    friendly_name: 'Durata filtro',
    unit_of_measurement: '%',
  }),
  fixtureEntity('switch.led', 'on', { friendly_name: 'Spia' }),
]);
const services = {
  climate: Object.fromEntries(
    [
      'set_temperature',
      'set_humidity',
      'set_hvac_mode',
      'set_fan_mode',
      'set_preset_mode',
      'set_swing_mode',
      'set_swing_horizontal_mode',
      'turn_on',
      'turn_off',
    ].map((key) => [key, {}])
  ),
  switch: { turn_on: {}, turn_off: {} },
};
const home = (current = settings, editMode = false) => (
  <ClimateWidget
    id="climate_card_studio"
    settingsKey="home::climate"
    settings={current}
    size={{ w: 2, h: 2 }}
    editMode={editMode}
  />
);
const details = (current = settings) => (
  <ClimateDetails
    id="climate_card_studio"
    settingsKey="home::climate"
    settings={current}
    onClose={() => undefined}
  />
);
const runtime = () => ({ entities, services, conn: fakeConnection().conn });
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Clima prodotto: dati e autorizzazione dei comandi', () => {
  it('richiede contratto climate coerente, senza trasformare binding storici o riassegnati', () => {
    expect(climateProductBinding(settings)).toEqual(binding);
    expect(climateProductBinding({ climateId: 'climate.main' })).toBeNull();
    expect(climateProductBinding({ ...settings, climateId: 'climate.new' })).toBeNull();
    expect(
      climateProductBinding({ ...settings, productDevice: { ...binding, family: 'light' } })
    ).toBeNull();
  });
  it('non inventa 21 gradi, limiti, passi, unità o attività quando HA non li fornisce', () => {
    const view = productClimateView(
      fixtureEntity('climate.main', 'heat', { supported_features: 1 }),
      null
    );
    expect([
      view.current,
      view.target,
      view.min,
      view.max,
      view.step,
      view.unit,
      view.action,
    ]).toEqual(Array(7).fill(null));
    expect(climateTargetCall(view, services, 'temperature', 21)).toBeNull();
    expect(
      productClimateView(
        fixtureEntity('climate.main', 'heat', { ...attributes, temperature_unit: undefined }),
        { unit_system: { temperature: '°F' } }
      ).unit
    ).toBe('°F');
  });
  it.each(['min_temp', 'max_temp', 'target_temp_step', 'temperature_unit', 'temperature'])(
    'non invia temperature quando manca %s',
    (key) => {
      expect(
        climateTargetCall(
          productClimateView(
            fixtureEntity('climate.main', 'heat', { ...attributes, [key]: null }),
            null
          ),
          services,
          'temperature',
          74
        )
      ).toBeNull();
    }
  );
  it('convalida range, limiti, feature e servizi prima di generare il payload', () => {
    const view = productClimateView(
      fixtureEntity('climate.main', 'heat_cool', {
        ...attributes,
        supported_features: 3,
        target_temp_low: 64,
        target_temp_high: 78,
      })
    );
    expect(climateTargetCall(view, services, 'target_temp_low', 66)).toEqual({
      service: 'set_temperature',
      data: { target_temp_low: 66, target_temp_high: 78 },
    });
    expect(climateTargetCall(view, services, 'target_temp_high', 62)).toBeNull();
    expect(climateTargetCall(view, services, 'temperature', 74)).toBeNull();
    expect(climateTargetCall(view, {}, 'target_temp_low', 66)).toBeNull();
    expect(
      climateTargetCall({ ...view, has: () => false }, services, 'target_temp_low', 66)
    ).toBeNull();
    expect(climateTargetCall(view, services, 'target_temp_high', 88)).toBeNull();
  });
  it('accensione fallback solo con modalità univoca e servizio dichiarato', () => {
    const view = productClimateView(
      fixtureEntity('climate.main', 'off', { ...attributes, supported_features: 1 })
    );
    expect(climatePowerCall(view, services, true)).toBeNull();
    expect(climatePowerCall({ ...view, modes: ['off', 'heat'] }, services, true)).toEqual({
      service: 'set_hvac_mode',
      data: { hvac_mode: 'heat' },
    });
    expect(climatePowerCall(view, { climate: { turn_on: {} } }, true)).toBeNull();
    expect(climatePowerCall(view, services, false)).toEqual({
      service: 'set_hvac_mode',
      data: { hvac_mode: 'off' },
    });
  });
});

describe('Clima prodotto in Home', () => {
  it('separa temperature, modalità e attività osservate senza inviare comandi', async () => {
    const callService = serviceMock(),
      { conn, sendMessagePromise } = fakeConnection();
    renderWithRuntime(home(), { entities, services, conn, callService });
    await flush();
    expect(screen.getByText('68 °F')).toBeInTheDocument();
    expect(screen.getAllByText('72 °F').length).toBeGreaterThan(0);
    expect(screen.getByText('Caldo')).toHaveTextContent('Caldo · In pausa');
    expect(callService).not.toHaveBeenCalled();
    expect(sendMessagePromise).not.toHaveBeenCalled();
  });
  it('usa il passo effettivo e mantiene la richiesta fino alla conferma HA', async () => {
    const callService = serviceMock();
    const view = renderWithRuntime(home(), { ...runtime(), callService });
    fireEvent.click(
      screen.getByRole('button', { name: 'Aumenta temperatura desiderata di Clima studio' })
    );
    await flush();
    expect(callService).toHaveBeenCalledExactlyOnceWith('climate', 'set_temperature', {
      entity_id: 'climate.main',
      temperature: 74,
    });
    expect(screen.getByText('In attesa di conferma')).toBeInTheDocument();
    view.setEntities([fixtureEntity('climate.main', 'heat', { ...attributes, temperature: 74 })]);
    expect(screen.queryByText('In attesa di conferma')).toBeNull();
  });
  it.each([
    { service: 'turn_on', state: 'off', feature: 256, outcome: 'denied' },
    { service: 'turn_off', state: 'heat', feature: 128, outcome: 'denied' },
    { service: 'turn_on', state: 'off', feature: 256, outcome: 'unknown' },
    { service: 'turn_off', state: 'heat', feature: 128, outcome: 'unknown' },
  ])('mantiene il tracking di $service senza comando inverso fino a $outcome', async ({ service, state, feature, outcome }) => {
    let reject!: (reason: unknown) => void;
    const callService = serviceMock(() => new Promise<void>((_resolve, rejectCall) => { reject = rejectCall; }));
    const channel = { ...attributes, supported_features: feature, hvac_modes: [] };
    const view = renderWithRuntime(home(), {
      ...runtime(),
      callService,
      services: { climate: { [service]: {} } },
      entities: { ...entities, 'climate.main': fixtureEntity('climate.main', state, channel) },
    });
    const power = screen.getByRole('switch', { name: 'Accensione di Clima studio' });
    expect(power).toBeEnabled();
    fireEvent.click(power);
    await flush();
    expect(callService).toHaveBeenCalledExactlyOnceWith('climate', service, { entity_id: 'climate.main' });
    expect(screen.getByText('In attesa di conferma')).toBeInTheDocument();
    expect(power).toBeDisabled();
    fireEvent.click(power);
    expect(callService).toHaveBeenCalledOnce();
    if (outcome === 'denied') {
      reject(Object.assign(new Error('Permesso negato'), { status: 403 }));
      await flush();
      expect(screen.getByText('Comando non riuscito')).toBeInTheDocument();
    } else {
      view.setEntities([fixtureEntity('climate.main', 'unknown', channel)]);
      await flush();
      expect(screen.getAllByText('Non disponibile').length).toBeGreaterThan(0);
      expect(screen.queryByRole('switch')).toBeNull();
    }
    expect(screen.queryByText('In attesa di conferma')).toBeNull();
    await flush();
    expect(callService).toHaveBeenCalledOnce();
  });
  it('multicanale solo riepilogo, senza comandi individuali o collettivi da preferenze vecchie', () => {
    const current = {
      ...settings,
      productDevice: {
        ...binding,
        channelEntityIds: ['climate.main', 'climate.second', 'climate.third'],
      },
      adaptiveControls: { visible: ['power', 'temperature'], order: ['power', 'temperature'] },
    };
    renderWithRuntime(
      <AdaptiveCategoryWidget
        type="climate"
        entityId="climate.main"
        id="climate_card_studio"
        settings={current}
        size={{ w: 2, h: 2 }}
        editMode={false}
      />,
      {
        ...runtime(),
        entities: {
          ...entities,
          'climate.second': fixtureEntity('climate.second', 'off', attributes),
          'climate.third': fixtureEntity('climate.third', 'unavailable', attributes),
        },
      }
    );
    expect(screen.getByText('1 di 3 canali attivi')).toBeInTheDocument();
    expect(screen.getByText('1 non disponibili')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('button', { name: /Aumenta/ })).toBeNull();
  });
  it('unknown non diventa spento né una temperatura predefinita', () => {
    const callService = serviceMock();
    renderWithRuntime(home(), {
      ...runtime(),
      entities: {
        ...entities,
        'climate.main': fixtureEntity('climate.main', 'unknown', { supported_features: 1 }),
      },
      callService,
    });
    expect(screen.queryByText(/Spento/)).toBeNull();
    expect(screen.getAllByText('Non disponibile').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Aumenta/ })).toBeDisabled();
    expect(callService).not.toHaveBeenCalled();
  });
  it('connessione, servizi assenti ed editing impediscono comandi', () => {
    const view = renderWithRuntime(home(), { entities, services });
    expect(screen.getByRole('button', { name: /Aumenta/ })).toBeDisabled();
    view.update({ conn: fakeConnection().conn, services: {} });
    expect(screen.getByRole('button', { name: /Aumenta/ })).toBeDisabled();
    view.unmount();
    renderWithRuntime(home(settings, true), runtime());
    expect(screen.getByRole('button', { name: /Aumenta/ })).toBeDisabled();
  });
});

describe('Dettagli e console Clima prodotto', () => {
  it('range ha target distinti e payload completo, non incrociato né inviato all’apertura', async () => {
    const callService = serviceMock();
    renderWithRuntime(details(), {
      ...runtime(),
      callService,
      entities: {
        ...entities,
        'climate.main': fixtureEntity('climate.main', 'heat_cool', {
          ...attributes,
          supported_features: 3,
          target_temp_low: 64,
          target_temp_high: 78,
        }),
      },
    });
    expect(callService).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: 'Aumenta temperatura desiderata di Zona' })
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Aumenta temperatura minima desiderata di Zona' })
    );
    await flush();
    expect(callService).toHaveBeenCalledExactlyOnceWith('climate', 'set_temperature', {
      entity_id: 'climate.main',
      target_temp_low: 66,
      target_temp_high: 78,
    });
    expect(
      screen.getByRole('button', { name: 'Diminuisci temperatura massima desiderata di Zona' })
    ).toBeDisabled();
  });
  it('canali con nomi uguali hanno comandi univoci rivolti solo al loro entity_id', async () => {
    const callService = serviceMock();
    renderWithRuntime(
      details({
        ...settings,
        productDevice: { ...binding, channelEntityIds: ['climate.main', 'climate.second'] },
      }),
      {
        ...runtime(),
        callService,
        entities: {
          ...entities,
          'climate.second': fixtureEntity('climate.second', 'cool', attributes),
        },
      }
    );
    fireEvent.click(
      within(screen.getByRole('region', { name: 'Zona (climate.second)' })).getByRole('button', {
        name: /Aumenta temperatura desiderata/,
      })
    );
    await flush();
    expect(callService).toHaveBeenCalledExactlyOnceWith('climate', 'set_temperature', {
      entity_id: 'climate.second',
      temperature: 74,
    });
  });
  it('ventola, preset, oscillazioni V/H e umidità rispettano attributi, feature e servizi', async () => {
    const callService = serviceMock();
    const view = renderWithRuntime(details(), { ...runtime(), callService });
    for (const label of ['Ventola', 'Preset', 'Oscillazione verticale', 'Oscillazione orizzontale'])
      expect(
        screen.getByRole('button', { name: new RegExp(`${label} di Zona:`) })
      ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Oscillazione orizzontale di Zona: Ferma' })
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Attiva' }));
    await flush();
    expect(callService).toHaveBeenCalledWith('climate', 'set_swing_horizontal_mode', {
      entity_id: 'climate.main',
      swing_horizontal_mode: 'on',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aumenta umidità desiderata di Zona' }));
    await flush();
    expect(callService).toHaveBeenCalledWith('climate', 'set_humidity', {
      entity_id: 'climate.main',
      humidity: 50,
    });
    view.update({ services: { climate: { set_temperature: {} } } });
    expect(screen.getByRole('button', { name: /Ventola di Zona:/ })).toBeDisabled();
    view.setEntities([
      fixtureEntity('climate.main', 'heat', { ...attributes, supported_features: 1 }),
    ]);
    expect(screen.queryByRole('button', { name: /Oscillazione orizzontale/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Aumenta umidità/ })).toBeNull();
  });
  it('mantiene misure e tecnica separate e non invia comandi al mount', async () => {
    const callService = serviceMock();
    renderWithRuntime(
      <ClimateConsole
        id="climate_card_studio"
        settingsKey="home::climate"
        settings={settings}
        onClose={() => undefined}
      />,
      { ...runtime(), callService }
    );
    expect(
      within(screen.getByRole('region', { name: 'Misure' })).getByText('Sonda stanza')
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Misure' })).queryByText('Durata filtro')
    ).toBeNull();
    const technical = screen.getByRole('button', { name: 'Tecnica e manutenzione' });
    expect(technical).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(technical.getAttribute('aria-controls')!)).toHaveAttribute(
      'inert'
    );
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(technical);
    fireEvent.click(
      within(screen.getByRole('region', { name: 'Spia' })).getByRole('button', { name: 'Spia' })
    );
    await flush();
    expect(callService).toHaveBeenCalledWith('switch', 'turn_off', { entity_id: 'switch.led' });
  });
  it('non dichiara attività idle/off quando HA non la fornisce', () => {
    renderWithRuntime(details(), {
      ...runtime(),
      entities: {
        ...entities,
        'climate.main': fixtureEntity('climate.main', 'off', {
          ...attributes,
          hvac_action: undefined,
        }),
      },
    });
    expect(screen.getByText('Attività non disponibile')).toBeInTheDocument();
    expect(screen.queryByText('In pausa')).toBeNull();
  });
  it('un rifiuto personale non conferma lo stato e non ritenta automaticamente', async () => {
    const callService = serviceMock(async () => {
      throw Object.assign(new Error('Permesso negato'), { status: 403 });
    });
    renderWithRuntime(details(), { ...runtime(), callService });
    fireEvent.click(screen.getByRole('button', { name: 'Aumenta temperatura desiderata di Zona' }));
    await flush();
    expect(callService).toHaveBeenCalledOnce();
    expect(screen.getByText(/non riuscito/i)).toBeInTheDocument();
    await flush();
    expect(callService).toHaveBeenCalledOnce();
  });
});
