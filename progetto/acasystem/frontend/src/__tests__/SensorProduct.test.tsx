import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap, HaHistoryEntry } from '@/@types/ha';
import type { ProductDeviceBinding } from '@/utils/devices/productBinding';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SensorWidget } from '@/components/widgets/controls/sensor/SensorWidget';
import { SensorDetails } from '@/components/widgets/controls/sensor/SensorDetails';
import { ProductSensorConsole } from '@/components/widgets/home/sensor/ProductSensorDetails';
import {
  finiteSensorNumber,
  productSensorView,
  sensorBattery,
  sensorBinaryLabel,
  sensorEntityName,
  sensorHistoryChartSamples,
  sensorHistoryEvents,
  sensorHistoryHours,
  sensorTimestamp,
} from '@/components/widgets/home/sensor/productSensorModel';
import { PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';

const binding: ProductDeviceBinding = {
  version: 1,
  family: 'sensor',
  deviceId: 'environment',
  primaryEntityId: 'sensor.temperature',
  channelEntityIds: ['sensor.temperature', 'sensor.humidity', 'binary_sensor.motion'],
  secondaryEntityIds: ['sensor.battery', 'button.identify'],
  technicalEntityIds: ['sensor.battery', 'button.identify'],
};
const settings: CardSettings = {
  entityId: binding.primaryEntityId,
  productDevice: binding,
  name: 'Ambiente soggiorno',
};
const temperature = (
  state = '21.500',
  id = 'sensor.temperature',
  attrs: Record<string, unknown> = {}
) =>
  fixtureEntity(id, state, {
    friendly_name: 'Temperatura ambiente',
    device_class: 'temperature',
    unit_of_measurement: '°C',
    state_class: 'measurement',
    ...attrs,
  });
const humidity = (state = '45') =>
  fixtureEntity('sensor.humidity', state, {
    friendly_name: 'Umidità ambiente',
    device_class: 'humidity',
    unit_of_measurement: '%',
  });
const binary = (state = 'off', deviceClass = 'motion', id = 'binary_sensor.motion') =>
  fixtureEntity(id, state, { friendly_name: 'Movimento ingresso', device_class: deviceClass });
const battery = (state = '83', id = 'sensor.battery', attrs: Record<string, unknown> = {}) =>
  fixtureEntity(id, state, {
    friendly_name: 'Batteria',
    device_class: 'battery',
    unit_of_measurement: '%',
    ...attrs,
  });
const initialEntities = () =>
  fixtureEntities([
    temperature(),
    humidity(),
    binary(),
    battery(),
    fixtureEntity('button.identify', 'unknown', { friendly_name: 'Identifica dispositivo' }),
  ]);
const runtime = (entities = initialEntities()) => ({
  entities,
  conn: fakeConnection().conn,
  services: {},
});
const home = (s = settings, editMode = false) => (
  <SensorWidget
    id="entity_card_sensor"
    settingsKey="home::sensor"
    settings={s}
    size={{ w: 2, h: 2 }}
    editMode={editMode}
  />
);
const details = (s = settings) => (
  <SensorDetails
    id="entity_card_sensor"
    settingsKey="home::sensor"
    settings={s}
    onClose={() => undefined}
  />
);
const NOW = '2026-11-11T12:00:00.000Z';
const row = (
  state: string,
  minute = 0,
  unit = '°C',
  deviceClass = 'temperature'
): HaHistoryEntry => ({
  state,
  last_changed: new Date(Date.parse(NOW) + minute * 60_000).toISOString(),
  attributes: { unit_of_measurement: unit, device_class: deviceClass },
});
const deferred = () => {
  let resolve!: (value: unknown) => void, reject!: (reason: Error) => void;
  const promise = new Promise<unknown>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
async function chooseChannel(name: string) {
  fireEvent.click(screen.getByRole('button', { name: /^Sensore della cronologia:/ }));
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Sensore della cronologia' })).getByRole('button', {
      name,
    })
  );
  await flush();
}
function historyList(container: HTMLElement) {
  return container.querySelector('.product-sensor-history__events') as HTMLOListElement;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Modello sensori: letture reali, nessuna conversione o soglia inventata', () => {
  it.each([
    '',
    ' ',
    '-',
    '.',
    '0x10',
    '12 °C',
    '1,5',
    'NaN',
    'Infinity',
    '-Infinity',
    '1e9999',
    'constructor',
    'toString',
    '__proto__',
  ])('rifiuta il numero non valido %j', (value) => {
    expect(finiteSensorNumber(value)).toBeNull();
  });
  it.each([
    ['0', 0],
    ['-0', -0],
    ['-12.75', -12.75],
    ['.5', 0.5],
    ['+0.125', 0.125],
    [' 21.500 ', 21.5],
    ['2e2', 200],
  ] as const)('accetta la misura finita %s', (value, expected) => {
    expect(finiteSensorNumber(value)).toBe(expected);
  });
  it('conserva precisione, segno e unità HA, senza Fahrenheit, costi o somme', () => {
    expect(productSensorView(temperature('-21.500')).value).toBe('-21,500');
    expect(productSensorView(temperature('0')).numeric).toBe(0);
    expect(
      productSensorView(temperature('21.5', undefined, { unit_of_measurement: '°F' })).unit
    ).toBe('°F');
    expect(productSensorView(temperature('.25')).value).toBe('0,25');
  });
  it.each(['unknown', 'unavailable', 'NaN', 'Infinity', '12°C', 'constructor'])(
    'non trasforma %s in zero o spento',
    (value) => {
      const item = productSensorView(temperature(value));
      expect(item.available).toBe(false);
      expect(item.numeric).toBeNull();
      expect(item.unit).toBe('');
      expect(item.value).not.toBe('0');
      expect(item.value).not.toBe('Spento');
    }
  );
  it('stati enum, date e timestamp restano letture non numeriche', () => {
    for (const device_class of ['enum', 'date', 'timestamp']) {
      const view = productSensorView(fixtureEntity('sensor.text', '2026-11-11', { device_class }));
      expect(view.value).toBe('2026-11-11');
      expect(view.numericKind).toBe(false);
    }
  });
  it.each(['constructor', 'toString', '__proto__'])(
    'classe %s non accede a Object.prototype',
    (deviceClass) => {
      expect(sensorBinaryLabel('on', deviceClass)).toBe('Attivo');
      expect(sensorBinaryLabel('off', deviceClass)).toBe('Inattivo');
      expect(productSensorView(binary('off', deviceClass)).icon).toBe('activity');
    }
  );
  it.each([
    ['door', 'Aperta', 'Chiusa'],
    ['window', 'Aperta', 'Chiusa'],
    ['opening', 'Aperto', 'Chiuso'],
    ['motion', 'Movimento rilevato', 'Nessun movimento'],
    ['presence', 'A casa', 'Fuori casa'],
    ['occupancy', 'Occupato', 'Non occupato'],
    ['moisture', 'Bagnato', 'Asciutto'],
    ['smoke', 'Fumo rilevato', 'Nessun fumo rilevato'],
    ['gas', 'Gas rilevato', 'Nessun gas rilevato'],
    ['safety', 'Segnalazione di pericolo', 'Nessuna segnalazione di pericolo'],
    ['battery', 'Batteria bassa', 'Livello non basso'],
    ['connectivity', 'Connesso', 'Disconnesso'],
    ['lock', 'Sbloccata', 'Bloccata'],
  ])('semantica binaria %s verificata su HA', (deviceClass, on, off) => {
    expect(productSensorView(binary('on', deviceClass)).value).toBe(on);
    expect(productSensorView(binary('off', deviceClass)).value).toBe(off);
    expect(productSensorView(binary('unknown', deviceClass)).value).toBe('Stato sconosciuto');
    expect(productSensorView(binary('unavailable', deviceClass)).value).toBe('Non disponibile');
  });
  it('un valore binario non valido non diventa inattivo o sicuro', () => {
    expect(productSensorView(binary('0', 'safety'))).toMatchObject({
      numeric: null,
      available: false,
      value: 'Stato non valido',
      unit: '',
    });
    expect(sensorBinaryLabel('off', 'safety')).not.toMatch(/sicuro/i);
  });
  it('la batteria Home è una sola misura esplicita %, finita e pertinente', () => {
    expect(sensorBattery(binding.secondaryEntityIds, initialEntities())).toEqual({
      entityId: 'sensor.battery',
      value: '83',
    });
    expect(sensorBattery(['sensor.battery', 'sensor.battery'], initialEntities())).not.toBeNull();
    expect(sensorBattery(['sensor.unknown'], initialEntities())).toBeNull();
    expect(
      sensorBattery(
        ['sensor.other'],
        fixtureEntities([battery('99', 'sensor.other', { device_class: 'humidity' })])
      )
    ).toBeNull();
  });
  it.each(['-1', '101', 'NaN', 'Infinity', 'unknown', 'unavailable'])(
    'non inventa il livello batteria %s',
    (value) => {
      expect(sensorBattery(['sensor.battery'], fixtureEntities([battery(value)]))).toBeNull();
    }
  );
  it('due batterie restano ambigue anche se una è indisponibile; gli altri dispositivi non contano', () => {
    const entities = fixtureEntities([
      battery('83'),
      battery('unavailable', 'sensor.battery_two'),
      battery('99', 'sensor.unrelated'),
    ]);
    expect(sensorBattery(['sensor.battery', 'sensor.battery_two'], entities)).toBeNull();
    expect(sensorBattery(['sensor.battery'], entities)?.value).toBe('83');
  });
  it('nome mancante o vuoto ha un fallback deterministico, senza nomi per dedurre capacità', () => {
    expect(sensorEntityName('sensor.missing', {})).toBe('sensor.missing');
    expect(
      sensorEntityName(
        'sensor.blank',
        fixtureEntities([fixtureEntity('sensor.blank', '3', { friendly_name: ' ' })])
      )
    ).toBe('sensor.blank');
  });
});

describe('Cronologia sensori: dati recorder senza fallback sintetici', () => {
  it.each([
    '0',
    '2026-02-30T00:00:00Z',
    '2026-11-11',
    '2026-11-11T24:00:00Z',
    'bad',
    'constructor',
  ])('scarta timestamp non validi %s', (value) => {
    expect(sensorTimestamp(value)).toBeNull();
  });
  it('accetta ISO con fuso, epoca secondi/millisecondi e date finite', () => {
    expect(sensorTimestamp(NOW)?.toISOString()).toBe(NOW);
    expect(sensorTimestamp('2026-11-11T13:00:00+01:00')?.toISOString()).toBe(NOW);
    expect(sensorTimestamp(Date.parse(NOW))?.toISOString()).toBe(NOW);
    expect(sensorTimestamp(Date.parse(NOW) / 1000)?.toISOString()).toBe(NOW);
    expect(sensorTimestamp(new Date('invalid'))).toBeNull();
  });
  it('mantiene zero e lacune, ordina e deduplica solo letture identiche', () => {
    const events = sensorHistoryEvents([
      row('2', 2),
      row('unknown', 1),
      row('0'),
      row('2', 2),
      { state: '3' },
      row('2', 2, '°F'),
    ]);
    expect(events.map((event) => event.state)).toEqual(['0', 'unknown', '2', '2']);
    expect(events.map((event) => event.numeric)).toEqual([0, null, 2, 2]);
    expect(events.at(-1)?.unit).toBe('°F');
  });
  it('capisce le risposte ridotte senza presumere le unità della lettura corrente', () => {
    expect(sensorHistoryEvents([{ s: '3', lc: Date.parse(NOW) / 1000 }])[0]).toMatchObject({
      state: '3',
      numeric: 3,
      unit: null,
    });
  });
  it('la validità semantica storica esclude batterie fuori scala e classi non numeriche', () => {
    expect(
      sensorHistoryEvents([row('83', 0, '%', 'battery'), row('150', 1, '%', 'battery')]).map(
        (event) => event.numeric
      )
    ).toEqual([83, null]);
    expect(
      sensorHistoryEvents([
        row('12', 0, '', 'enum'),
        row('12', 1, '', 'date'),
        row('12', 2, '', 'timestamp'),
      ]).every((event) => event.numeric === null)
    ).toBe(true);
  });
  it('accetta solo preferenze storiche pertinenti e non altera il profilo', () => {
    expect(sensorHistoryHours(168)).toBe(168);
    expect(sensorHistoryHours(6)).toBe(6);
    for (const value of [0, -1, 999, Infinity, '24', null, {}])
      expect(sensorHistoryHours(value)).toBe(24);
  });
  it('limita la geometria ai campioni reali, conservando estremi e ordine', () => {
    const events = sensorHistoryEvents(
      Array.from({ length: 1500 }, (_, i) =>
        row(String(i === 550 ? -999 : i === 551 ? 9999 : i), i)
      )
    );
    const points = sensorHistoryChartSamples(events);
    expect(points.length).toBeLessThanOrEqual(300);
    expect(points[0]!.time).toBe(events[0]!.time);
    expect(points.at(-1)!.time).toBe(events.at(-1)!.time);
    expect(points.some((point) => point.value === -999)).toBe(true);
    expect(points.some((point) => point.value === 9999)).toBe(true);
    expect(
      points.every(
        (point, index) =>
          events.some((event) => event.time === point.time && event.numeric === point.value) &&
          (index === 0 || point.time >= points[index - 1]!.time)
      )
    ).toBe(true);
  });
});

describe('Tessera prodotto Sensor: readonly, anteprima inerte e compatibilità', () => {
  it('mostra due letture e un riepilogo; nessun comando o fetch storico su mount, click o edit', async () => {
    const callService = serviceMock(),
      conn = fakeConnection(),
      openDetails = vi.fn(),
      saveCardSetting = vi.fn();
    const view = renderWithRuntime(
      home({ ...settings, action: 'service', service: 'switch.turn_on', tapAction: 'toggle' }),
      {
        ...runtime(),
        conn: conn.conn,
        callService,
        openDetails,
        saveCardSetting,
      }
    );
    await flush();
    expect(screen.getByText('21,500 °C')).toBeInTheDocument();
    expect(screen.getByText('45 %')).toBeInTheDocument();
    expect(screen.getByText('Altre 1 misure · Batteria 83%')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dettagli: Ambiente soggiorno' }));
    expect(openDetails).toHaveBeenCalledWith('entity_card_sensor');
    expect(callService).not.toHaveBeenCalled();
    expect(conn.sendMessagePromise).not.toHaveBeenCalled();
    expect(saveCardSetting).not.toHaveBeenCalled();
    view.unmount();
    renderWithRuntime(home(settings, true), { ...runtime(), callService, openDetails });
    expect(screen.getByRole('button', { name: /^Dettagli:/ })).toBeDisabled();
    expect(callService).not.toHaveBeenCalled();
  });
  it('lettura mancante, unknown, indisponibile e zero restano distinguibili', () => {
    const view = renderWithRuntime(
      home(),
      runtime(fixtureEntities([temperature('unknown'), humidity('unavailable')]))
    );
    expect(screen.getByText('Stato sconosciuto')).toBeInTheDocument();
    expect(screen.getByText('Non disponibile')).toBeInTheDocument();
    view.setEntities([temperature('0'), humidity('0')]);
    expect(screen.getByText('0 °C')).toBeInTheDocument();
    expect(screen.getByText('0 %')).toBeInTheDocument();
  });
  it('caricamento HA non mostra una falsa lettura', () => {
    renderWithRuntime(home(), { ...runtime(), entitiesLoaded: false });
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento del dispositivo');
    expect(screen.queryByText('21,500 °C')).not.toBeInTheDocument();
  });
  it('un solo canale usa il nome leggibile e la batteria diagnostica senza copiarla fra dispositivi', () => {
    const single = { ...binding, channelEntityIds: [binding.primaryEntityId] };
    renderWithRuntime(home({ ...settings, productDevice: single }), {
      ...runtime(),
      customNames: { entity_card_sensor: 'Sonda soggiorno' },
    });
    expect(screen.getByText('Sonda soggiorno')).toBeInTheDocument();
    expect(screen.getByText('Batteria 83%')).toBeInTheDocument();
  });
  it('helper esplicito e metadati incompatibili restano nel ramo legacy senza cambiare numero di hook', async () => {
    const view = renderWithRuntime(home(), runtime());
    view.rerender(
      <WidgetRuntimeProvider value={createFixtureRuntime(runtime())}>
        {home({ ...settings, sensorBindingMode: 'helper' })}
      </WidgetRuntimeProvider>
    );
    await flush();
    expect(view.container.querySelector('.product-sensor')).toBeNull();
    view.rerender(
      <WidgetRuntimeProvider value={createFixtureRuntime(runtime())}>
        {home({ ...settings, entityId: 'sensor.humidity' })}
      </WidgetRuntimeProvider>
    );
    await flush();
    expect(view.container.querySelector('.product-sensor')).toBeNull();
  });
});

describe('Dettagli Sensor: selezione, visibilità e risposte asincrone', () => {
  it('legge soltanto il canale visibile tramite la API esistente, con attributi e intervallo reale', async () => {
    const conn = fakeConnection(() => ({ [binding.primaryEntityId]: [row('20'), row('21', 1)] })),
      callService = serviceMock(),
      saveCardSetting = vi.fn();
    const view = renderWithRuntime(details({ ...settings, adaptiveHistoryHours: 168 }), {
      ...runtime(),
      conn: conn.conn,
      callService,
      saveCardSetting,
    });
    await flush();
    expect(conn.sendMessagePromise).toHaveBeenCalledTimes(1);
    const message = conn.sendMessagePromise.mock.calls[0]![0] as Record<string, unknown>;
    expect(message).toMatchObject({
      type: 'history/history_during_period',
      entity_ids: [binding.primaryEntityId],
      minimal_response: false,
      no_attributes: false,
    });
    expect(Date.parse(String(message.end_time)) - Date.parse(String(message.start_time))).toBe(
      168 * 3600_000
    );
    expect(view.container.querySelector('.ctl-chart')).not.toBeNull();
    expect(historyList(view.container).children).toHaveLength(2);
    expect(callService).not.toHaveBeenCalled();
    expect(saveCardSetting).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '6 h' }));
    await flush();
    expect(conn.sendMessagePromise).toHaveBeenCalledTimes(2);
    expect(saveCardSetting).not.toHaveBeenCalled();
  });
  it.each([
    ['vuoto', []],
    ['singolo', [row('21')]],
    ['lacuna', [row('20'), row('unknown', 1), row('21', 2)]],
    ['unità diverse', [row('20'), row('70', 1, '°F')]],
    [
      'unità assenti',
      [
        { s: '20', lc: Date.parse(NOW) / 1000 },
        { s: '21', lc: Date.parse(NOW) / 1000 + 60 },
      ],
    ],
  ] as const)('cronologia %s non crea grafici o fallback fittizi', async (_name, entries) => {
    const conn = fakeConnection(() => ({ [binding.primaryEntityId]: entries }));
    const view = renderWithRuntime(details(), { ...runtime(), conn: conn.conn });
    await flush();
    expect(view.container.querySelector('.ctl-chart')).toBeNull();
    expect(conn.sendMessagePromise).toHaveBeenCalledTimes(1);
    if (!entries.length)
      expect(screen.getByText('Nessun dato nella cronologia.')).toBeInTheDocument();
    else expect(historyList(view.container).children).toHaveLength(entries.length);
  });
  it('mantiene il registro binario testuale senza numerizzare on/off', async () => {
    const binaryBinding = {
      ...binding,
      primaryEntityId: 'binary_sensor.motion',
      channelEntityIds: ['binary_sensor.motion'],
    };
    const conn = fakeConnection(() => ({
      'binary_sensor.motion': [
        row('on', 0, '', 'motion'),
        row('off', 1, '', 'motion'),
        row('unavailable', 2, '', 'motion'),
      ],
    }));
    const view = renderWithRuntime(
      details({ ...settings, entityId: 'binary_sensor.motion', productDevice: binaryBinding }),
      { ...runtime(), conn: conn.conn }
    );
    await flush();
    const list = within(historyList(view.container));
    expect(list.getByText('Movimento rilevato')).toBeInTheDocument();
    expect(list.getByText('Nessun movimento')).toBeInTheDocument();
    expect(list.getByText('Non disponibile')).toBeInTheDocument();
    expect(view.container.querySelector('.ctl-chart')).toBeNull();
  });
  it('batteria storica fuori scala non crea una falsa linea valida', async () => {
    const own = {
      ...binding,
      primaryEntityId: 'sensor.battery',
      channelEntityIds: ['sensor.battery'],
      secondaryEntityIds: [],
      technicalEntityIds: [],
    };
    const conn = fakeConnection(() => ({
      'sensor.battery': [row('83', 0, '%', 'battery'), row('150', 1, '%', 'battery')],
    }));
    const view = renderWithRuntime(
      details({ ...settings, entityId: 'sensor.battery', productDevice: own }),
      { ...runtime(), conn: conn.conn }
    );
    await flush();
    expect(historyList(view.container)).toHaveTextContent('Valore non valido');
    expect(view.container.querySelector('.ctl-chart')).toBeNull();
  });
  it('nessun recupero globale quando la lettura corrente è sconosciuta', async () => {
    const conn = fakeConnection(() => ({ [binding.primaryEntityId]: [row('19'), row('20', 1)] }));
    const view = renderWithRuntime(details(), {
      ...runtime(fixtureEntities([temperature('unknown'), humidity(), binary()])),
      conn: conn.conn,
    });
    await flush();
    expect(screen.getByText('Stato sconosciuto')).toBeInTheDocument();
    expect(historyList(view.container).children).toHaveLength(2);
    expect(conn.sendMessagePromise).toHaveBeenCalledTimes(1);
  });
  it('un errore recorder non nasconde le letture attuali né divulga la risposta del server', async () => {
    const conn = fakeConnection(() => {
      throw new Error('TOKEN=non-mostra-reply');
    });
    renderWithRuntime(details(), { ...runtime(), conn: conn.conn });
    await flush();
    expect(
      screen.getByText('Cronologia non disponibile. Le letture attuali restano visibili.')
    ).toBeInTheDocument();
    expect(screen.getByText('21,500 °C')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('TOKEN=');
  });
  it('scegliendo un canale non applica la risposta tardiva di quello precedente', async () => {
    const first = deferred(),
      second = deferred();
    const conn = fakeConnection((message) =>
      (message as unknown as { entity_ids: string[] }).entity_ids[0] === binding.primaryEntityId
        ? first.promise
        : second.promise
    );
    const view = renderWithRuntime(details(), { ...runtime(), conn: conn.conn });
    await chooseChannel('Umidità ambiente');
    await act(async () => {
      first.resolve({ [binding.primaryEntityId]: [row('999')] });
    });
    await flush();
    expect(view.container.querySelector('.product-sensor-history__events')).toBeNull();
    await act(async () => {
      second.resolve({ 'sensor.humidity': [row('48', 0, '%', 'humidity')] });
    });
    await flush();
    expect(historyList(view.container)).toHaveTextContent('48 %');
    expect(historyList(view.container)).not.toHaveTextContent('999');
    expect(conn.sendMessagePromise).toHaveBeenCalledTimes(2);
  });
  it('risposta di una connessione sostituita non si applica alla nuova sessione', async () => {
    const pending = deferred(),
      old = fakeConnection(() => pending.promise),
      fresh = fakeConnection(() => ({ [binding.primaryEntityId]: [row('22')] }));
    const view = renderWithRuntime(details(), { ...runtime(), conn: old.conn });
    view.update({ conn: fresh.conn });
    await flush();
    await act(async () => {
      pending.resolve({ [binding.primaryEntityId]: [row('999')] });
    });
    await flush();
    expect(historyList(view.container)).toHaveTextContent('22 °C');
    expect(historyList(view.container)).not.toHaveTextContent('999');
  });
  it('pagina nascosta non legge né accetta risposte; alla ricomparsa legge di nuovo', async () => {
    const pending = deferred(),
      conn = fakeConnection(() => pending.promise);
    const value = createFixtureRuntime({ ...runtime(), conn: conn.conn });
    const wrap = (visible: boolean) => (
      <WidgetRuntimeProvider value={value}>
        <PageVisibilityContext.Provider value={visible}>{details()}</PageVisibilityContext.Provider>
      </WidgetRuntimeProvider>
    );
    const view = render(wrap(false));
    await flush();
    expect(conn.sendMessagePromise).not.toHaveBeenCalled();
    view.rerender(wrap(true));
    await flush();
    expect(conn.sendMessagePromise).toHaveBeenCalledTimes(1);
    view.rerender(wrap(false));
    await act(async () => {
      pending.resolve({ [binding.primaryEntityId]: [row('999')] });
    });
    await flush();
    expect(view.container.querySelector('.product-sensor-history__events')).toBeNull();
    view.rerender(wrap(true));
    await flush();
    expect(conn.sendMessagePromise).toHaveBeenCalledTimes(2);
  });
  it('offline non invia letture; cambio connessione riavvia una sola richiesta', async () => {
    const conn = fakeConnection();
    Object.defineProperty(conn.conn, 'connected', { value: false, configurable: true });
    const view = renderWithRuntime(details(), { ...runtime(), conn: conn.conn });
    await flush();
    expect(conn.sendMessagePromise).not.toHaveBeenCalled();
    expect(
      screen.getByText('Cronologia non disponibile. Le letture attuali restano visibili.')
    ).toBeInTheDocument();
    const fresh = fakeConnection();
    view.update({ conn: fresh.conn });
    await flush();
    expect(fresh.sendMessagePromise).toHaveBeenCalledTimes(1);
  });
  it('unmount invalida una risposta ancora pendente senza ulteriori richieste', async () => {
    const pending = deferred(),
      conn = fakeConnection(() => pending.promise),
      callService = serviceMock();
    const view = renderWithRuntime(details(), { ...runtime(), conn: conn.conn, callService });
    view.unmount();
    await act(async () => {
      pending.resolve({ [binding.primaryEntityId]: [row('999')] });
    });
    await flush();
    expect(conn.sendMessagePromise).toHaveBeenCalledTimes(1);
    expect(callService).not.toHaveBeenCalled();
  });
  it('registro lungo mostra trenta righe e carica il resto localmente senza nuove scritture o fetch', async () => {
    const conn = fakeConnection(() => ({
      [binding.primaryEntityId]: Array.from({ length: 61 }, (_, i) => row(String(i), i)),
    }));
    const view = renderWithRuntime(details(), { ...runtime(), conn: conn.conn });
    await flush();
    expect(historyList(view.container).children).toHaveLength(30);
    fireEvent.click(screen.getByRole('button', { name: 'Mostra altre letture' }));
    expect(historyList(view.container).children).toHaveLength(60);
    fireEvent.click(screen.getByRole('button', { name: 'Mostra altre letture' }));
    expect(historyList(view.container).children).toHaveLength(61);
    expect(screen.queryByRole('button', { name: 'Mostra altre letture' })).not.toBeInTheDocument();
    expect(conn.sendMessagePromise).toHaveBeenCalledTimes(1);
  });
  it('Console e dettagli riusano il medesimo contenuto senza superfici/blur nuovi', async () => {
    const view = renderWithRuntime(
      <ProductSensorConsole
        id="entity_card_sensor"
        settingsKey="home::sensor"
        settings={settings}
        onClose={() => undefined}
      />,
      runtime()
    );
    await flush();
    expect(
      view.container.querySelector('.widget-console-details .product-sensor-details')
    ).not.toBeNull();
    expect(view.container.querySelectorAll('.product-sensor-details')).toHaveLength(1);
  });
});

describe('Tecnica Sensor: apertura esplicita, ruoli e permessi', () => {
  const services = {
    button: { press: {} },
    switch: { turn_on: {}, turn_off: {} },
    number: { set_value: {} },
    select: { select_option: {} },
  };
  const technicalRuntime = (extras: EntityMap = {}, callService = serviceMock()) => ({
    ...runtime({ ...initialEntities(), ...extras }),
    services,
    callService,
  });
  it('non espone attributi raw o un comando in Home; richiede l’apertura della sezione tecnica', async () => {
    const callService = serviceMock();
    renderWithRuntime(
      details(),
      technicalRuntime(
        fixtureEntities([
          temperature('21', undefined, { token: 'secret-placeholder', pin: 'secret-pin' }),
        ]),
        callService
      )
    );
    await flush();
    expect(screen.getByRole('button', { name: 'Tecnica e manutenzione' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(document.body).not.toHaveTextContent('secret-placeholder');
    expect(document.body).not.toHaveTextContent('secret-pin');
    expect(
      screen.queryByRole('button', { name: 'Identifica dispositivo' })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tecnica e manutenzione' }));
    await flush();
    expect(callService).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Identifica dispositivo' })).toBeInTheDocument();
  });
  it('un’azione tecnica passa al callService dell’utente e un rifiuto non è una conferma', async () => {
    const callService = serviceMock(async () => {
      throw new Error('Non autorizzato');
    });
    renderWithRuntime(details(), technicalRuntime({}, callService));
    fireEvent.click(screen.getByRole('button', { name: 'Tecnica e manutenzione' }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Identifica dispositivo' }));
    await flush();
    expect(callService).toHaveBeenCalledWith('button', 'press', { entity_id: 'button.identify' });
    expect(screen.getAllByText(/non riuscit|rifiutat|errore/i).length).toBeGreaterThan(0);
  });
  it('un’entità secondaria ordinaria non diventa un interruttore tecnico', async () => {
    const item = {
      ...binding,
      secondaryEntityIds: [...binding.secondaryEntityIds, 'switch.accessory'],
    };
    const callService = serviceMock();
    renderWithRuntime(
      details({ ...settings, productDevice: item }),
      technicalRuntime(
        fixtureEntities([
          fixtureEntity('switch.accessory', 'off', { friendly_name: 'Accessorio' }),
        ]),
        callService
      )
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tecnica e manutenzione' }));
    await flush();
    expect(screen.queryByRole('switch', { name: /Accessorio/ })).not.toBeInTheDocument();
    expect(screen.getByText('Accessorio')).toBeInTheDocument();
    expect(callService).not.toHaveBeenCalled();
  });
  it('servizi non disponibili e numeri tecnici invalidi restano letture senza controlli inventati', async () => {
    const item = {
      ...binding,
      secondaryEntityIds: ['number.offset', 'button.identify'],
      technicalEntityIds: ['number.offset', 'button.identify'],
    };
    renderWithRuntime(details({ ...settings, productDevice: item }), {
      ...technicalRuntime(
        fixtureEntities([
          fixtureEntity('number.offset', 'NaN', {
            min: 0,
            max: 10,
            step: 1,
            friendly_name: 'Offset',
          }),
        ])
      ),
      services: {},
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tecnica e manutenzione' }));
    await flush();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Identifica dispositivo' })
    ).not.toBeInTheDocument();
  });
  it('la sezione tecnica non invia comandi quando la pagina è nascosta o offline', async () => {
    const callService = serviceMock(),
      value = createFixtureRuntime(technicalRuntime({}, callService));
    const wrap = (visible: boolean) => (
      <WidgetRuntimeProvider value={value}>
        <PageVisibilityContext.Provider value={visible}>{details()}</PageVisibilityContext.Provider>
      </WidgetRuntimeProvider>
    );
    const view = render(wrap(true));
    fireEvent.click(screen.getByRole('button', { name: 'Tecnica e manutenzione' }));
    await flush();
    view.rerender(wrap(false));
    fireEvent.click(screen.getByRole('button', { name: 'Identifica dispositivo' }));
    await flush();
    expect(callService).not.toHaveBeenCalled();
    view.rerender(wrap(true));
    Object.defineProperty(value.conn!, 'connected', { value: false, configurable: true });
    fireEvent.click(screen.getByRole('button', { name: 'Identifica dispositivo' }));
    await flush();
    expect(callService).not.toHaveBeenCalled();
  });
});
