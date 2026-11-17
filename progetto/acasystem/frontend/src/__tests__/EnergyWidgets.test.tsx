import type { CardSettings } from '@/@types/dashboard';
import { sensorHistoryEvents } from '@/components/widgets/home/sensor/productSensorModel';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CostWidget,
  costValue,
  monthValue,
} from '@/components/widgets/utilities/energy/CostWidget';
import { CostConsole, CostDetails } from '@/components/widgets/utilities/energy/CostDetails';
import { NordpoolWidget } from '@/components/widgets/utilities/energy/NordpoolWidget';
import {
  NordpoolConsole,
  NordpoolDetails,
} from '@/components/widgets/utilities/energy/NordpoolDetails';
import { PageVisibilityContext } from '@/hooks/launcher/PageVisibilityContext';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, flush, renderWithRuntime, serviceMock } from './ControlsHarness';

const settings: CardSettings = {
  powerId: 'sensor.power',
  consumptionId: 'sensor.energy',
  todayId: 'sensor.cost_today',
  monthId: 'sensor.cost_month',
  decimals: 2,
  currency: 'USD',
};
const priceSettings: CardSettings = { nordpoolId: 'sensor.price', decimals: 2, currency: 'USD' };
const measurement = (id: string, value: string, unit: string, deviceClass?: string) =>
  fixtureEntity(id, value, {
    friendly_name: id,
    unit_of_measurement: unit,
    ...(deviceClass ? { device_class: deviceClass } : {}),
  });
const entities = () =>
  fixtureEntities([
    measurement('sensor.power', '-35.5', 'W', 'power'),
    measurement('sensor.energy', '123.45', 'kWh', 'energy'),
    measurement('sensor.cost_today', '2.34', 'EUR', 'monetary'),
    measurement('sensor.cost_month', '53.21', 'EUR', 'monetary'),
    measurement('sensor.price', '-0.2', 'EUR/kWh'),
  ]);
const home = (type = 'cost', config = settings, h = 2, editMode = false) => {
  const Component = type === 'cost' ? CostWidget : NordpoolWidget;
  return (
    <Component
      id={type + '_card_test'}
      settingsKey={'home::' + type}
      settings={config}
      size={{ w: 2, h }}
      editMode={editMode}
    />
  );
};
const details = (type = 'cost', config = settings) => {
  const Component = type === 'cost' ? CostDetails : NordpoolDetails;
  return (
    <Component
      id={type + '_card_test'}
      settingsKey={'home::' + type}
      settings={config}
      onClose={() => undefined}
    />
  );
};
const historyRow = (state: string, minute = 0, unit = 'W', deviceClass = 'power') => ({
  state,
  last_changed: new Date(Date.UTC(2026, 10, 11, 12, minute)).toISOString(),
  attributes: { unit_of_measurement: unit, device_class: deviceClass },
});
const slots = (count = 2, offset = 0) =>
  Array.from({ length: count }, (_, index) => ({
    start: new Date(Date.UTC(2026, 10, 11, 0, index * 15 + offset)).toISOString(),
    end: new Date(Date.UTC(2026, 10, 11, 0, (index + 1) * 15 + offset)).toISOString(),
    value: index % 2 ? -0.2 : 0.3,
  }));
function priceEntity(state = '-0.2', extra: Record<string, unknown> = {}) {
  return fixtureEntity('sensor.price', state, {
    friendly_name: 'Prezzo pubblicato',
    unit_of_measurement: 'EUR/kWh',
    ...extra,
  });
}
function pending() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise<unknown>((yes) => {
    resolve = yes;
  });
  return { resolve, promise };
}
async function choose(label: string) {
  fireEvent.click(screen.getByRole('button', { name: /^Fonte della cronologia:/ }));
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Fonte della cronologia' })).getByRole('button', {
      name: label,
    })
  );
  await flush();
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Home energetica: fonti esplicite, native e sola lettura', () => {
  it('mostra al massimo due letture distinte e riepiloga i costi, senza somme o fetch', async () => {
    const conn = fakeConnection(),
      callService = serviceMock(),
      saveCardSetting = vi.fn(),
      openDetails = vi.fn();
    const view = renderWithRuntime(home(), {
      entities: entities(),
      conn: conn.conn,
      callService,
      saveCardSetting,
      openDetails,
    });
    await flush();
    expect(screen.getByText('-35,50 W')).toBeInTheDocument();
    expect(screen.getByText('123,45 kWh')).toBeInTheDocument();
    expect(view.container.querySelectorAll('.energy-widget__readings > div')).toHaveLength(2);
    expect(screen.getByText('Oggi · Questo mese')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Energia e consumi, apri letture e cronologia' })
    );
    expect(openDetails).toHaveBeenCalledWith('cost_card_test');
    expect(conn.sendMessagePromise).not.toHaveBeenCalled();
    expect(callService).not.toHaveBeenCalled();
    expect(saveCardSetting).not.toHaveBeenCalled();
  });
  it('cost e nordpool espongono i marker del catalogo sul contenitore reale', () => {
    const a = renderWithRuntime(home(), { entities: entities() });
    expect(
      a.container.querySelector('article.energy-widget[data-widget-type="cost"]')
    ).not.toBeNull();
    a.unmount();
    const b = renderWithRuntime(home('nordpool', priceSettings), { entities: entities() });
    expect(
      b.container.querySelector('article.energy-widget[data-widget-type="nordpool"]')
    ).not.toBeNull();
  });
  it('la taglia compatta conserva una sola lettura; edit e override non generano comandi', () => {
    const override = vi.fn(),
      openDetails = vi.fn(),
      callService = serviceMock();
    const view = renderWithRuntime(
      <CostWidget
        id="cost_card_test"
        settingsKey="k"
        settings={settings}
        size={{ w: 2, h: 1 }}
        editMode={false}
        openDetails={override}
      />,
      { entities: entities(), openDetails, callService }
    );
    expect(view.container.querySelectorAll('.energy-widget__readings > div')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /apri letture/ }));
    expect(override).toHaveBeenCalledOnce();
    expect(openDetails).not.toHaveBeenCalled();
    view.unmount();
    renderWithRuntime(home('cost', settings, 2, true), { entities: entities(), callService });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(callService).not.toHaveBeenCalled();
  });
  it('costi nativi: valuta HA o impostata non cambia le cifre, il mese non viene arrotondato a intero', () => {
    renderWithRuntime(home('cost', { ...settings, powerId: null, consumptionId: null }), {
      entities: entities(),
      haConfig: null,
    });
    expect(screen.getByText('2,34 EUR')).toBeInTheDocument();
    expect(screen.getByText('53,21 EUR')).toBeInTheDocument();
    expect(screen.queryByText('$')).not.toBeInTheDocument();
  });
  it.each(['unknown', 'unavailable', 'NaN', 'Infinity', '12W'])(
    'la potenza %s non diventa zero',
    (value) => {
      renderWithRuntime(home(), {
        entities: {
          ...entities(),
          'sensor.power': measurement('sensor.power', value, 'W', 'power'),
        },
      });
      expect(screen.queryByText('0,00 W')).not.toBeInTheDocument();
      expect(screen.getByText('123,45 kWh')).toBeInTheDocument();
    }
  );
  it('zero è una misura valida; potenza e corrente non sono intercambiabili', () => {
    const view = renderWithRuntime(home(), {
      entities: { ...entities(), 'sensor.power': measurement('sensor.power', '0', 'W', 'power') },
    });
    expect(screen.getByText('0,00 W')).toBeInTheDocument();
    view.setEntities([measurement('sensor.power', '3', 'A', 'current')]);
    expect(screen.getByText('Misura non valida')).toBeInTheDocument();
    expect(screen.queryByText('3,00 W')).not.toBeInTheDocument();
  });
  it.each(['bad-id', 'switch.light', 8])(
    'riferimento storico incompatibile %s rimane visibile senza essere cancellato',
    (value) => {
      const saveCardSetting = vi.fn();
      renderWithRuntime(home('cost', { powerId: value }), {
        entities: entities(),
        saveCardSetting,
      });
      expect(screen.getByText('Potenza')).toBeInTheDocument();
      expect(screen.getByText('Fonte incompatibile')).toBeInTheDocument();
      expect(screen.queryByText('Scegli le fonti energetiche')).not.toBeInTheDocument();
      expect(saveCardSetting).not.toHaveBeenCalled();
    }
  );
  it('assenza configurazione, entità assente e caricamento rimangono distinguibili', () => {
    const a = renderWithRuntime(home('cost', {}));
    expect(screen.getByText('Scegli le fonti energetiche')).toBeInTheDocument();
    a.unmount();
    const b = renderWithRuntime(home('cost', { powerId: 'sensor.missing' }));
    expect(screen.getByText('Fonte non presente')).toBeInTheDocument();
    b.unmount();
    renderWithRuntime(home(), { entitiesLoaded: false });
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento');
    expect(screen.queryByText('Fonte non presente')).not.toBeInTheDocument();
  });
  it('mantiene gli helper esportati per il modello storico senza usarli nella nuova UI', () => {
    expect(costValue(measurement('sensor.x', '3.456', 'EUR'), 2)).toBe('3,46');
    expect(monthValue(measurement('sensor.x', '53.21', 'EUR'))).toBe('53');
  });
});

describe('Cronologia energetica: fonte scelta, reset e dati reali', () => {
  it('conserva solo la valuta storica esplicita e distingue valute diverse nello stesso istante', () => {
    const a = historyRow('3', 0, 'EUR', 'monetary'),
      b = historyRow('3', 0, 'EUR', 'monetary');
    Object.assign(a.attributes, { currency: 'EUR', password: 'not-copied' });
    Object.assign(b.attributes, { currency: 'USD' });
    const events = sensorHistoryEvents([a, b]);
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.currency)).toEqual(['EUR', 'USD']);
    expect(events[0]).not.toHaveProperty('password');
    expect(events[0]).not.toHaveProperty('attributes');
    const inherited = Object.assign(
      Object.create({ currency: 'USD' }) as Record<string, unknown>,
      a.attributes
    );
    delete inherited.currency;
    expect(sensorHistoryEvents([{ ...a, attributes: inherited }])[0]).not.toHaveProperty(
      'currency'
    );
  });
  it.each(['classe', 'valuta'])(
    'scarta il campione storico con %s incompatibile senza disegnare una falsa linea di costo',
    async (mismatch) => {
      const invalid = historyRow('3', 0, 'EUR', mismatch === 'classe' ? 'power' : 'monetary');
      Object.assign(invalid.attributes, { currency: mismatch === 'valuta' ? 'USD' : 'EUR' });
      const valid = historyRow('4', 1, 'EUR', 'monetary');
      Object.assign(valid.attributes, { currency: 'EUR' });
      const conn = fakeConnection(() => ({ 'sensor.cost_today': [invalid, valid] }));
      const view = renderWithRuntime(
        details('cost', { todayId: 'sensor.cost_today', decimals: 2 }),
        { entities: entities(), conn: conn.conn }
      );
      await flush();
      expect(view.container.querySelector('.ctl-chart')).toBeNull();
      const list = view.container.querySelector('.product-sensor-history__events');
      expect(list).toHaveTextContent('Misura non valida');
      expect(list).not.toHaveTextContent('3 EUR');
    }
  );
  it('mostra tutte le quattro fonti, recuperando solo la cronologia selezionata senza statistiche', async () => {
    const conn = fakeConnection(() => ({
        'sensor.power': [historyRow('0'), historyRow('-35.5', 1)],
      })),
      saveCardSetting = vi.fn(),
      callService = serviceMock();
    const view = renderWithRuntime(details(), {
      entities: entities(),
      conn: conn.conn,
      saveCardSetting,
      callService,
    });
    await flush();
    const readings = screen.getByRole('region', { name: 'Letture' });
    expect(readings).toHaveTextContent('-35,50 W');
    expect(readings).toHaveTextContent('123,45 kWh');
    expect(readings).toHaveTextContent('2,34 EUR');
    expect(readings).toHaveTextContent('53,21 EUR');
    expect(conn.sendMessagePromise).toHaveBeenCalledTimes(1);
    expect(conn.sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'history/history_during_period',
        entity_ids: ['sensor.power'],
        no_attributes: false,
        minimal_response: false,
      })
    );
    expect(view.container.querySelector('.ctl-chart')).not.toBeNull();
    await choose('Energia');
    expect(conn.sendMessagePromise).toHaveBeenLastCalledWith(
      expect.objectContaining({ entity_ids: ['sensor.energy'] })
    );
    expect(saveCardSetting).not.toHaveBeenCalled();
    expect(callService).not.toHaveBeenCalled();
  });
  it.each([{ rows: [] }, { rows: [historyRow('2')] }])(
    'non crea una linea finta da cronologia assente o singola',
    async ({ rows }) => {
      const conn = fakeConnection(() => ({ 'sensor.power': rows }));
      const view = renderWithRuntime(details(), { entities: entities(), conn: conn.conn });
      await flush();
      expect(view.container.querySelector('.ctl-chart')).toBeNull();
      expect(conn.sendMessagePromise).toHaveBeenCalledTimes(1);
      if (rows.length)
        expect(view.container.querySelectorAll('.product-sensor-history__events li')).toHaveLength(
          1
        );
      else expect(screen.getByText('Nessun dato nella cronologia.')).toBeInTheDocument();
    }
  );
  it('conserva i reset e valori negativi registrati senza differenze o consumo del periodo derivato', async () => {
    const conn = fakeConnection(() => ({
      'sensor.cost_today': [
        historyRow('8', 0, 'EUR', 'monetary'),
        historyRow('0', 1, 'EUR', 'monetary'),
        historyRow('-2', 2, 'EUR', 'monetary'),
      ],
    }));
    const view = renderWithRuntime(details('cost', { todayId: 'sensor.cost_today' }), {
      entities: entities(),
      conn: conn.conn,
    });
    await flush();
    expect(view.container.querySelector('.product-sensor-history__events')).toHaveTextContent(
      '8,00 EUR'
    );
    expect(view.container.querySelector('.product-sensor-history__events')).toHaveTextContent(
      '0,00 EUR'
    );
    expect(view.container.querySelector('.product-sensor-history__events')).toHaveTextContent(
      '-2,00 EUR'
    );
    expect(screen.queryByText('Per periodo')).not.toBeInTheDocument();
    expect(screen.queryByText('Media')).not.toBeInTheDocument();
    expect(conn.sendMessagePromise).toHaveBeenCalledTimes(1);
  });
  it('un prezzo assegnato al costo rimane incompatibile e non carica una cronologia di costo fasulla', async () => {
    const conn = fakeConnection();
    renderWithRuntime(details('cost', { todayId: 'sensor.price' }), {
      entities: entities(),
      conn: conn.conn,
    });
    await flush();
    expect(screen.getByText('Misura non valida')).toBeInTheDocument();
    expect(conn.sendMessagePromise).not.toHaveBeenCalled();
  });
  it('lettura corrente indisponibile non impedisce di leggere la cronologia reale valida', async () => {
    const conn = fakeConnection(() => ({ 'sensor.power': [historyRow('4')] }));
    const view = renderWithRuntime(details('cost', { powerId: 'sensor.power' }), {
      entities: {
        ...entities(),
        'sensor.power': measurement('sensor.power', 'unavailable', 'W', 'power'),
      },
      conn: conn.conn,
    });
    await flush();
    expect(screen.getByText('Non disponibile')).toBeInTheDocument();
    expect(view.container.querySelector('.product-sensor-history__events')).toHaveTextContent(
      '4,00 W'
    );
  });
  it('lascia consultabili le letture correnti durante attesa o errore recorder senza mostrare segreti', async () => {
    const wait = pending(),
      conn = fakeConnection(() => wait.promise);
    renderWithRuntime(details(), { entities: entities(), conn: conn.conn });
    await flush();
    expect(screen.getByText('2,34 EUR')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento della cronologia');
    await act(async () => {
      wait.resolve({});
    });
    await flush();
    expect(screen.getByText('Nessun dato nella cronologia.')).toBeInTheDocument();
  });
  it('risposta tardiva della fonte precedente non riempie quella nuova', async () => {
    const old = pending(),
      fresh = pending();
    const conn = fakeConnection((message) =>
      (message as unknown as { entity_ids: string[] }).entity_ids[0] === 'sensor.power'
        ? old.promise
        : fresh.promise
    );
    const view = renderWithRuntime(details(), { entities: entities(), conn: conn.conn });
    await choose('Energia');
    await act(async () => {
      old.resolve({ 'sensor.power': [historyRow('999')] });
    });
    await flush();
    expect(view.container.querySelector('.product-sensor-history__events')).toBeNull();
    await act(async () => {
      fresh.resolve({ 'sensor.energy': [historyRow('42', 0, 'kWh', 'energy')] });
    });
    await flush();
    expect(view.container.querySelector('.product-sensor-history__events')).toHaveTextContent(
      '42,00 kWh'
    );
    expect(view.container.querySelector('.product-sensor-history__events')).not.toHaveTextContent(
      '999'
    );
  });
  it('nascosto, offline e unmount non lasciano richieste o risposte attive', async () => {
    const wait = pending(),
      conn = fakeConnection(() => wait.promise);
    const value = createFixtureRuntime({ entities: entities(), conn: conn.conn });
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
      wait.resolve({ 'sensor.power': [historyRow('999')] });
    });
    await flush();
    expect(view.container.querySelector('.product-sensor-history__events')).toBeNull();
    view.unmount();
    const offline = fakeConnection();
    Object.defineProperty(offline.conn, 'connected', { value: false });
    renderWithRuntime(details(), { entities: entities(), conn: offline.conn });
    await flush();
    expect(offline.sendMessagePromise).not.toHaveBeenCalled();
  });
});

describe('Prezzi: valore osservato, fasce pubblicate e storico distinti', () => {
  it('non sostituisce prezzo osservato sconosciuto con una previsione pubblicata', () => {
    renderWithRuntime(home('nordpool', priceSettings), {
      entities: fixtureEntities([priceEntity('unknown', { raw_today: slots() })]),
    });
    expect(screen.getByText('Stato sconosciuto')).toBeInTheDocument();
    expect(screen.getByText('2 fasce pubblicate')).toBeInTheDocument();
    expect(screen.queryByText('0,30 EUR/kWh')).not.toBeInTheDocument();
  });
  it('supporta l’integrazione ufficiale senza array HACS, con valuta/unità della fonte', async () => {
    const conn = fakeConnection(),
      callService = serviceMock(),
      saveCardSetting = vi.fn();
    renderWithRuntime(details('nordpool', priceSettings), {
      entities: fixtureEntities([priceEntity()]),
      conn: conn.conn,
      callService,
      saveCardSetting,
      haConfig: null,
    });
    await flush();
    expect(screen.getByText('-0,20 EUR/kWh')).toBeInTheDocument();
    expect(screen.getByText('Nessuna fascia prezzo pubblicata')).toBeInTheDocument();
    expect(conn.sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'history/history_during_period',
        entity_ids: ['sensor.price'],
      })
    );
    expect(callService).not.toHaveBeenCalled();
    expect(saveCardSetting).not.toHaveBeenCalled();
  });
  it('pubblica soltanto intervalli timestampati e prezzi negativi reali senza classifiche arbitrarie', async () => {
    const saveCardSetting = vi.fn();
    const view = renderWithRuntime(
      details('nordpool', { ...priceSettings, showWithSupport: true, graphStyle: 'bar' }),
      { entities: fixtureEntities([priceEntity('-0.2', { raw_today: slots() })]), saveCardSetting }
    );
    await flush();
    expect(view.container.querySelectorAll('.energy-price-slots li')).toHaveLength(2);
    expect(view.container.querySelectorAll('.energy-price-slots time')).toHaveLength(4);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByText('Prezzo basso')).not.toBeInTheDocument();
    expect(screen.queryByText('Media')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Informazioni sulla fonte' }));
    expect(screen.getByText('La formula norvegese storica non è applicata.')).toBeInTheDocument();
    expect(saveCardSetting).not.toHaveBeenCalled();
  });
  it('un array semplice non genera durate o slot finti; una valuta mancante non è sostituita da HA', async () => {
    const view = renderWithRuntime(details('nordpool', priceSettings), {
      entities: fixtureEntities([priceEntity('-0.2', { today: [0.2, 0.3], raw_today: undefined })]),
    });
    await flush();
    expect(view.container.querySelector('.energy-price-slots')).toBeNull();
    view.setEntities([priceEntity('-0.2', { unit_of_measurement: '' })]);
    await flush();
    expect(screen.getByText('Misura non valida')).toBeInTheDocument();
    expect(screen.queryByText('-0,20 USD')).not.toBeInTheDocument();
  });
  it('intervalli sovrapposti non diventano un grafico o una lista parzialmente affidabile', async () => {
    const a = slots(1)[0]!;
    const view = renderWithRuntime(details('nordpool', priceSettings), {
      entities: fixtureEntities([priceEntity('-0.2', { raw_today: [a, a] })]),
    });
    await flush();
    expect(view.container.querySelector('.energy-price-slots')).toBeNull();
    expect(screen.getByText('Fasce prezzo duplicate o sovrapposte')).toBeInTheDocument();
  });
  it('preserva intervalli UTC e rende il fuso della casa con offset anche nei giorni DST', async () => {
    const actual = {
      start: '2026-10-25T02:00:00+02:00',
      end: '2026-10-25T02:30:00+02:00',
      value: 1,
    };
    const view = renderWithRuntime(details('nordpool', priceSettings), {
      entities: fixtureEntities([priceEntity('1', { raw_today: [actual] })]),
    });
    await flush();
    expect(view.container.querySelector('time')).toHaveAttribute(
      'dateTime',
      '2026-10-25T00:00:00.000Z'
    );
    expect(screen.getByText('Orari: Europe/Rome')).toBeInTheDocument();
    expect(view.container.querySelector('.energy-price-slots')).toHaveTextContent('GMT+2');
  });
  it('paginazione fasce solo locale, resettata al cambio fonte senza portare vecchie righe', async () => {
    const conn = fakeConnection(),
      saveCardSetting = vi.fn();
    const value = createFixtureRuntime({
      conn: conn.conn,
      entities: fixtureEntities([
        priceEntity('-0.2', { raw_today: slots(61) }),
        fixtureEntity('sensor.other_price', '7', {
          unit_of_measurement: 'EUR/MWh',
          raw_today: slots(61, 200),
        }),
      ]),
      saveCardSetting,
    });
    const wrap = (config: CardSettings) => (
      <WidgetRuntimeProvider value={value}>{details('nordpool', config)}</WidgetRuntimeProvider>
    );
    const view = render(wrap(priceSettings));
    await flush();
    expect(view.container.querySelectorAll('.energy-price-slots li')).toHaveLength(30);
    fireEvent.click(screen.getByRole('button', { name: 'Mostra altre fasce' }));
    expect(view.container.querySelectorAll('.energy-price-slots li')).toHaveLength(60);
    view.rerender(wrap({ ...priceSettings, nordpoolId: 'sensor.other_price' }));
    await flush();
    expect(view.container.querySelectorAll('.energy-price-slots li')).toHaveLength(30);
    expect(saveCardSetting).not.toHaveBeenCalled();
    expect(conn.sendMessagePromise).toHaveBeenCalledTimes(2);
  });
  it('Console riusano un solo contenuto e i gruppi tecnici hanno identità indipendenti', async () => {
    const view = renderWithRuntime(
      <>
        <CostConsole
          id="cost_card_test"
          settingsKey="c"
          settings={settings}
          onClose={() => undefined}
        />
        <NordpoolConsole
          id="nordpool_card_test"
          settingsKey="n"
          settings={priceSettings}
          onClose={() => undefined}
        />
      </>,
      { entities: entities() }
    );
    await flush();
    expect(view.container.querySelectorAll('.widget-console-details .energy-details')).toHaveLength(
      2
    );
    const cost = screen.getByRole('button', { name: 'Informazioni sulle fonti' }),
      price = screen.getByRole('button', { name: 'Informazioni sulla fonte' });
    expect(cost.getAttribute('aria-controls')).not.toBe(price.getAttribute('aria-controls'));
    fireEvent.click(cost);
    expect(cost).toHaveAttribute('aria-expanded', 'true');
    expect(price).toHaveAttribute('aria-expanded', 'false');
  });
});
