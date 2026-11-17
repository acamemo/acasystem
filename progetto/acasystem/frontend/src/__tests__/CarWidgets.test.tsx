import type { WidgetRuntime } from '@/@types/launcher';
import type { CardSettings } from '@/@types/dashboard';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CarControlScope } from '@/components/widgets/utilities/car/CarControls';
import { CarWidget } from '@/components/widgets/utilities/car/CarWidget';
import { CarConsole, CarDetails } from '@/components/widgets/utilities/car/CarDetails';
import { WidgetRuntimeProvider, useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const settings: CardSettings = {
  batteryId: 'sensor.battery',
  rangeId: 'sensor.range',
  chargingStateId: 'sensor.charging',
  pluggedId: 'binary_sensor.plug',
  chargeControlIds: ['switch.charge', 'switch.second'],
  chargeLimitNumberId: 'number.limit',
  chargeLimitSelectId: 'select.limit',
  climateId: 'climate.car',
  lockId: 'lock.car',
  ignitionSwitchId: 'switch.ignition',
  updateButtonId: 'button.refresh',
  locationId: 'device_tracker.car',
  imageUrl: '/local/car.png',
};
const services = {
  switch: { turn_on: {}, turn_off: {} },
  climate: { turn_on: {}, turn_off: {}, set_temperature: {} },
  number: { set_value: {} },
  select: { select_option: {} },
  lock: { lock: {}, unlock: {}, open: {} },
  button: { press: {} },
};
const entities = () =>
  fixtureEntities([
    fixtureEntity('sensor.battery', '74.46', { unit_of_measurement: '%', device_class: 'battery' }),
    fixtureEntity('sensor.range', '215', { unit_of_measurement: 'mi', device_class: 'distance' }),
    fixtureEntity('sensor.charging', 'unknown'),
    fixtureEntity('binary_sensor.plug', 'unknown', { device_class: 'plug' }),
    fixtureEntity('switch.charge', 'off', { friendly_name: 'Caricatore A' }),
    fixtureEntity('switch.second', 'off', { friendly_name: 'Caricatore B' }),
    fixtureEntity('number.limit', '64', { min: 52, max: 100, step: 3, unit_of_measurement: '%' }),
    fixtureEntity('select.limit', 'Eco', { options: ['Eco', 'Rapida'] }),
    fixtureEntity('climate.car', 'off', {
      temperature: 21,
      min_temp: 17,
      max_temp: 29,
      target_temp_step: 0.5,
      temperature_unit: '°C',
      supported_features: 385,
    }),
    fixtureEntity('lock.car', 'locked', { supported_features: 1, code_format: '^\\d{4}$' }),
    fixtureEntity('switch.ignition', 'off'),
    fixtureEntity('button.refresh', 'unknown'),
    fixtureEntity('device_tracker.car', 'home', { latitude: 45, longitude: 7 }),
  ]);
const details = (config = settings) => (
  <CarDetails
    id="car_card_test"
    settingsKey="home::car"
    settings={config}
    onClose={() => undefined}
  />
);
const home = (config = settings, editMode = false) => (
  <CarWidget
    id="car_card_test"
    settingsKey="home::car"
    settings={config}
    size={{ w: 2, h: 2 }}
    editMode={editMode}
  />
);
const runtime = () => ({ entities: entities(), services, conn: fakeConnection().conn });
const row = (state: string, minute: number, unit = '%', deviceClass = 'battery') => ({
  state,
  last_changed: new Date(Date.UTC(2026, 10, 11, 12, minute)).toISOString(),
  attributes: { unit_of_measurement: unit, device_class: deviceClass },
});

describe('Auto: Home e dettaglio nativi, senza operazioni automatiche', () => {
  it('Home mostra due misure native e unknown distinto da inattiva, senza comando o fetch', async () => {
    const conn = fakeConnection(),
      callService = serviceMock(),
      saveCardSetting = vi.fn(),
      openDetails = vi.fn();
    const view = renderWithRuntime(home(), {
      ...runtime(),
      conn: conn.conn,
      callService,
      saveCardSetting,
      openDetails,
    });
    await flush();
    expect(screen.getByText('74,5')).toBeInTheDocument();
    expect(screen.getByText('215')).toBeInTheDocument();
    expect(screen.getByText('mi')).toBeInTheDocument();
    expect(screen.getByText('Stato sconosciuto')).toBeInTheDocument();
    expect(screen.queryByText('Inattiva')).not.toBeInTheDocument();
    expect(view.container.querySelector('meter')).toBeNull();
    expect(view.container.querySelector('.car-widget[data-widget-type="car"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /apri i dettagli/ }));
    expect(openDetails).toHaveBeenCalledWith('car_card_test');
    expect(callService).not.toHaveBeenCalled();
    expect(conn.sendMessagePromise).not.toHaveBeenCalled();
    expect(saveCardSetting).not.toHaveBeenCalled();
  });
  it('edit, caricamento e veicolo parziale senza batteria rimangono readonly', async () => {
    const callService = serviceMock(),
      view = renderWithRuntime(home(settings, true), { ...runtime(), callService });
    await flush();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    view.unmount();
    const loading = renderWithRuntime(details(), {
      ...runtime(),
      entitiesLoaded: false,
      callService,
    });
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    loading.unmount();
    renderWithRuntime(home({ rangeId: 'sensor.range' }), { ...runtime(), callService });
    expect(screen.getByText('215')).toBeInTheDocument();
    expect(screen.queryByText(/Collega le fonti/)).not.toBeInTheDocument();
    expect(callService).not.toHaveBeenCalled();
  });
  it('assenza unità o percentuali invalide non diventano numeri plausibili', () => {
    const view = renderWithRuntime(home(), {
      ...runtime(),
      entities: {
        ...entities(),
        'sensor.battery': fixtureEntity('sensor.battery', '150', { unit_of_measurement: '%' }),
        'sensor.range': fixtureEntity('sensor.range', '215'),
      },
    });
    expect(screen.queryByText('150')).not.toBeInTheDocument();
    expect(screen.queryByText('215')).not.toBeInTheDocument();
    expect(view.container.querySelector('[role="meter"]')).toBeNull();
  });
  it('posizione offre soltanto un collegamento esplicito, senza iframe o coordinate in rete al mount', async () => {
    const callService = serviceMock();
    const view = renderWithRuntime(details(), { ...runtime(), callService });
    await flush();
    expect(view.container.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('link', { name: 'Apri la posizione sulla mappa' })).toHaveAttribute(
      'href',
      expect.stringContaining('mlat=45&mlon=7')
    );
    expect(callService).not.toHaveBeenCalled();
    view.setEntities([
      fixtureEntity('device_tracker.car', 'home', { latitude: 999, longitude: 7 }),
    ]);
    expect(screen.queryByRole('link', { name: /mappa/ })).not.toBeInTheDocument();
  });
  it('immagini non sicure non sono caricate, nessun ripiego su immagine dopo errore', () => {
    const view = renderWithRuntime(
      home({ ...settings, imageUrl: 'javascript:alert(1)' }),
      runtime()
    );
    expect(view.container.querySelector('img')).toBeNull();
    view.unmount();
    const valid = renderWithRuntime(home(), runtime());
    const image = valid.container.querySelector('img');
    expect(image).not.toBeNull();
    fireEvent.error(image!);
    expect(valid.container.querySelector('img')).toBeNull();
  });
  it('Console usa lo stesso contenuto, senza mostrare attributi sensibili grezzi', async () => {
    const view = renderWithRuntime(
      <CarConsole
        id="car_card_test"
        settingsKey="c"
        settings={settings}
        onClose={() => undefined}
      />,
      {
        ...runtime(),
        entities: {
          ...entities(),
          'sensor.battery': fixtureEntity('sensor.battery', '50', {
            unit_of_measurement: '%',
            token: 'never-shown',
          }),
        },
      }
    );
    await flush();
    expect(view.container.querySelectorAll('.widget-console-details .car-details')).toHaveLength(1);
    expect(document.body).not.toHaveTextContent('never-shown');
  });
});

describe('Auto: controlli reali, richieste e conferme', () => {
  it.each([
    { first: 'Apri', confirm: 'Conferma apertura' },
    { first: 'Sblocca', confirm: 'Conferma sblocco' },
  ])('non duplica $first prima dell’ACK', async ({ first, confirm }) => {
    const callService = serviceMock(() => new Promise(() => undefined));
    const data = entities();
    data['lock.car'] = fixtureEntity('lock.car', 'locked', { supported_features: 1 });
    renderWithRuntime(details(), { ...runtime(), entities: data, callService });
    await flush();
    fireEvent.click(screen.getByRole('button', { name: new RegExp('^' + first + '$') }));
    fireEvent.click(screen.getByRole('button', { name: confirm }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp('^' + first + '$') }));
    const again = screen.queryByRole('button', { name: confirm });
    if (again) fireEvent.click(again);
    expect(callService).toHaveBeenCalledTimes(1);
  });

  it('i canali di ricarica sono distinti; solo il target toccato riceve il comando', async () => {
    const callService = serviceMock();
    renderWithRuntime(details(), { ...runtime(), callService });
    await flush();
    expect(screen.getByText('Caricatore A')).toBeInTheDocument();
    expect(screen.getByText('Caricatore B')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Avvia ricarica: Caricatore A' }));
    await flush();
    expect(callService).toHaveBeenCalledExactlyOnceWith('switch', 'turn_on', {
      entity_id: 'switch.charge',
    });
    expect(
      screen.getByText('Richiesta inviata, in attesa dello stato osservato.')
    ).toBeInTheDocument();
  });
  it('motore richiede conferma e Annulla non impartisce azioni', async () => {
    const callService = serviceMock();
    renderWithRuntime(details(), { ...runtime(), callService });
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Avvio motore' }));
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Avvio motore' }));
    fireEvent.click(screen.getByRole('button', { name: 'Conferma avvio motore' }));
    await flush();
    expect(callService).toHaveBeenCalledWith('switch', 'turn_on', { entity_id: 'switch.ignition' });
  });
  it('sblocco e apertura preesistente richiedono conferma e codice, conservato soltanto nel campo', async () => {
    const callService = serviceMock();
    renderWithRuntime(details(), { ...runtime(), callService });
    await flush();
    fireEvent.click(screen.getByRole('button', { name: /^Apri$/ }));
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));
    fireEvent.change(screen.getByLabelText('Codice della serratura'), {
      target: { value: '1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Apri$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Conferma apertura' }));
    await flush();
    expect(callService).toHaveBeenCalledWith('lock', 'open', {
      entity_id: 'lock.car',
      code: '1234',
    });
  });
  it('senza codice la conferma non invia il comando', async () => {
    const callService = serviceMock();
    renderWithRuntime(details(), { ...runtime(), callService });
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Sblocca' }));
    fireEvent.click(screen.getByRole('button', { name: 'Conferma sblocco' }));
    expect(callService).not.toHaveBeenCalled();
    expect(screen.getByText('Inserisci il codice della serratura.')).toBeInTheDocument();
  });
  it('limite numerico usa passo relativo al minimo dichiarato e invia soltanto l’ultimo valore', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const callService = serviceMock();
    renderWithRuntime(details(), { ...runtime(), callService });
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Aumenta limite di carica' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aumenta limite di carica' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(callService).toHaveBeenCalledExactlyOnceWith('number', 'set_value', {
      entity_id: 'number.limit',
      value: 70,
    });
  });
  it.each(['nascosta', 'offline', 'cambio target', 'chiusura'])(
    'un valore in coda è abbandonato per %s',
    async (mode) => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const callService = serviceMock(),
        data = runtime();
      const wrap = (config: CardSettings, visible = true, online = true) => (
        <WidgetRuntimeProvider
          value={createFixtureRuntime({ ...data, conn: online ? data.conn : null, callService })}
        >
          <PageVisibilityContext.Provider value={visible}>
            {details(config)}
          </PageVisibilityContext.Provider>
        </WidgetRuntimeProvider>
      );
      const view = render(wrap(settings));
      await flush();
      fireEvent.click(screen.getByRole('button', { name: 'Aumenta limite di carica' }));
      if (mode === 'nascosta') view.rerender(wrap(settings, false));
      else if (mode === 'offline') view.rerender(wrap(settings, true, false));
      else if (mode === 'cambio target')
        view.rerender(wrap({ ...settings, chargeLimitNumberId: null }));
      else view.unmount();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(callService).not.toHaveBeenCalled();
    }
  );
  it('clima senza limiti reali resta leggibile senza slider con min/max inventati', async () => {
    const view = renderWithRuntime(details(), runtime());
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Accendi clima' }));
    view.setEntities([
      fixtureEntity('climate.car', 'off', {
        temperature: 21,
        temperature_unit: '°C',
        supported_features: 385,
      }),
    ]);
    expect(
      screen.queryByRole('slider', { name: 'Temperatura desiderata' })
    ).not.toBeInTheDocument();
  });
  it('permesso negato e servizi rimossi non diventano conferme o reinvii automatici', async () => {
    const callService = serviceMock(async () => {
      throw new Error('secret-reply');
    });
    const view = renderWithRuntime(details(), { ...runtime(), callService });
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Avvia ricarica: Caricatore A' }));
    await flush();
    expect(screen.getByText('Comando non riuscito. Riprova.')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('secret-reply');
    view.update({ services: {} });
    expect(screen.queryByRole('button', { name: /Avvia ricarica/ })).not.toBeInTheDocument();
    expect(callService).toHaveBeenCalledTimes(1);
  });
  it('azioni sconosciute e serratura binaria sono sola lettura', async () => {
    const callService = serviceMock();
    const data = entities();
    data['switch.charge'] = fixtureEntity('switch.charge', 'unknown');
    data['binary_sensor.lock'] = fixtureEntity('binary_sensor.lock', 'off', {
      device_class: 'lock',
    });
    renderWithRuntime(details({ ...settings, lockId: 'binary_sensor.lock' }), {
      ...runtime(),
      entities: data,
      callService,
    });
    await flush();
    expect(
      screen.queryByRole('button', { name: 'Avvia ricarica: Caricatore A' })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sblocca' })).not.toBeInTheDocument();
    expect(screen.getByText('Bloccata')).toBeInTheDocument();
    expect(callService).not.toHaveBeenCalled();
  });
  it('aggiornamento dati richiede apertura della sezione tecnica e click esplicito', async () => {
    const callService = serviceMock();
    renderWithRuntime(details(), { ...runtime(), callService });
    await flush();
    expect(screen.queryByRole('button', { name: 'Aggiorna dati' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tecnica e manutenzione' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aggiorna dati' }));
    await flush();
    expect(callService).toHaveBeenCalledWith('button', 'press', { entity_id: 'button.refresh' });
  });
});

describe('Auto: cronologia autentica per fonte numerica', () => {
  it('legge solo la fonte scelta e conserva unità reali senza stima di autonomia', async () => {
    const conn = fakeConnection(() => ({ 'sensor.battery': [row('70', 0), row('74', 1)] }));
    const callService = serviceMock();
    const view = renderWithRuntime(details(), { ...runtime(), conn: conn.conn, callService });
    await flush();
    expect(conn.sendMessagePromise).toHaveBeenCalledTimes(1);
    expect(conn.sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'history/history_during_period',
        entity_ids: ['sensor.battery'],
        no_attributes: false,
      })
    );
    expect(view.container.querySelector('.ctl-chart')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Fonte della cronologia:/ }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Fonte della cronologia' })).getByRole('button', {
        name: 'Autonomia',
      })
    );
    await flush();
    expect(conn.sendMessagePromise).toHaveBeenLastCalledWith(
      expect.objectContaining({ entity_ids: ['sensor.range'] })
    );
    expect(callService).not.toHaveBeenCalled();
  });
  it.each([
    { rows: [] },
    { rows: [row('70', 0)] },
    { rows: [row('70', 0), row('150', 1)] },
    { rows: [row('70', 0), row('74', 1, 'kWh', 'energy')] },
  ])('non inventa grafici per serie assenti, singole o incompatibili', async ({ rows }) => {
    const conn = fakeConnection(() => ({ 'sensor.battery': rows }));
    const view = renderWithRuntime(details(), { ...runtime(), conn: conn.conn });
    await flush();
    expect(view.container.querySelector('.ctl-chart')).toBeNull();
    expect(conn.sendMessagePromise).toHaveBeenCalledTimes(1);
  });
});

describe('Auto: fence dei comandi differiti', () => {
  it.each(['°C', '°F'])(
    'clima standard usa l’unità HA %s e invia il valore nativo senza conversione',
    async (unit) => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const callService = serviceMock(),
        current = unit === '°C' ? 21 : 70;
      renderWithRuntime(details({ climateId: 'climate.car' }), {
        ...runtime(),
        callService,
        haConfig: { unit_system: { temperature: unit } },
        entities: fixtureEntities([
          fixtureEntity('climate.car', 'off', {
            temperature: current,
            min_temp: unit === '°C' ? 17 : 62,
            max_temp: unit === '°C' ? 29 : 86,
            target_temp_step: 1,
            supported_features: 385,
          }),
        ]),
      });
      await flush();
      expect(screen.getByRole('slider', { name: 'Temperatura desiderata' })).toBeInTheDocument();
      expect(screen.getByText(`Temperatura desiderata: ${current} ${unit}`)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Aumenta temperatura desiderata' }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(callService).toHaveBeenCalledExactlyOnceWith('climate', 'set_temperature', {
        entity_id: 'climate.car',
        temperature: current + 1,
      });
    }
  );
  it('senza unità HA o attributo valido il clima resta leggibile ma senza regolazione', async () => {
    const data = entities();
    delete data['climate.car']!.attributes.temperature_unit;
    const callService = serviceMock();
    renderWithRuntime(details({ climateId: 'climate.car' }), {
      ...runtime(),
      entities: data,
      haConfig: null,
      callService,
    });
    await flush();
    expect(
      screen.queryByRole('slider', { name: 'Temperatura desiderata' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accendi clima' })).toBeInTheDocument();
    expect(callService).not.toHaveBeenCalled();
  });
  it('cambio unità HA abbandona la bozza clima in coda e resetta solo quel controllo', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const data = entities(),
      callService = serviceMock();
    delete data['climate.car']!.attributes.temperature_unit;
    const view = renderWithRuntime(details(), {
      ...runtime(),
      entities: data,
      callService,
      haConfig: { unit_system: { temperature: '°C' } },
    });
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Aumenta temperatura desiderata' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aumenta limite di carica' }));
    view.update({ haConfig: { unit_system: { temperature: '°F' } } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(callService).toHaveBeenCalledExactlyOnceWith('number', 'set_value', {
      entity_id: 'number.limit',
      value: 67,
    });
  });
  it('il callback clima °C non attraversa il cambio °C–°F–°C', async () => {
    const callService = serviceMock(),
      conn = fakeConnection().conn;
    const data = entities();
    // Keep the explicit legacy unit so the old scope could genuinely dispatch this callback.
    const captured: WidgetRuntime['callService'][] = [];
    function Capture() {
      captured.push(useWidgetRuntime().callService);
      return null;
    }
    const wrap = (unit: string) => (
      <WidgetRuntimeProvider
        value={createFixtureRuntime({
          entities: data,
          conn,
          callService,
          services,
          haConfig: { unit_system: { temperature: unit } },
        })}
      >
        <CarControlScope
          field="climateId"
          entityId="climate.car"
          settings={{ climateId: 'climate.car' }}
        >
          <Capture />
        </CarControlScope>
      </WidgetRuntimeProvider>
    );
    const view = render(wrap('°C')),
      old = captured[0]!;
    view.rerender(wrap('°F'));
    view.rerender(wrap('°C'));
    await act(async () => {
      await expect(
        old('climate', 'set_temperature', { entity_id: 'climate.car', temperature: 22 })
      ).rejects.toThrow();
    });
    expect(callService).not.toHaveBeenCalled();
  });
  it.each(['connessione A-B-A', 'visibilità nascosta-riaperta'])(
    'un callback vecchio non può attraversare %s',
    async (scenario) => {
      const first = fakeConnection().conn,
        second = fakeConnection().conn,
        callService = serviceMock();
      const entities = fixtureEntities([fixtureEntity('switch.charge', 'off')]);
      const captured: WidgetRuntime['callService'][] = [];
      function Capture() {
        captured.push(useWidgetRuntime().callService);
        return null;
      }
      const wrap = (conn: WidgetRuntime['conn'], visible = true) => (
        <WidgetRuntimeProvider
          value={createFixtureRuntime({
            entities,
            conn,
            callService,
            services: { switch: { turn_on: {} } },
          })}
        >
          <PageVisibilityContext.Provider value={visible}>
            <CarControlScope
              field="chargeControlId"
              entityId="switch.charge"
              settings={{ chargeControlId: 'switch.charge' }}
            >
              <Capture />
            </CarControlScope>
          </PageVisibilityContext.Provider>
        </WidgetRuntimeProvider>
      );
      const view = render(wrap(first)),
        old = captured[0]!;
      if (scenario.startsWith('connessione')) {
        view.rerender(wrap(second));
        view.rerender(wrap(first));
      } else {
        view.rerender(wrap(first, false));
        view.rerender(wrap(first));
      }
      await act(async () => {
        await expect(old('switch', 'turn_on', { entity_id: 'switch.charge' })).rejects.toThrow();
      });
      expect(callService).not.toHaveBeenCalled();
    }
  );
});
