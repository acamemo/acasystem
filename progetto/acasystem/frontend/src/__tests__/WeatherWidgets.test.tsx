import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HaMessage } from '@/@types/ha';
import { weatherWidget } from '@/components/widgets/home/weather';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, renderDetails, renderWidget } from './ComfortHarness';

const id = 'weather_temp_test';
const settings = { weatherId: 'weather.casa' };
const stamp = '2026-11-12T12:00:00Z';
const entity = (state = 'sunny', attrs: Record<string, unknown> = {}) =>
  fixtureEntity('weather.casa', state, {
    friendly_name: 'Casa',
    temperature: 17.4,
    temperature_unit: '°C',
    precipitation_unit: 'mm',
    supported_features: 0,
    ...attrs,
  });
const forecast = [
  {
    datetime: '2026-11-12T13:00:00Z',
    temperature: 10,
    condition: 'rainy',
    precipitation: 1.2,
    precipitation_probability: 80,
  },
  { datetime: '2026-11-12T14:00:00Z', temperature: 11, precipitation_probability: 0 },
];
function connection(handler?: (message: HaMessage) => unknown) {
  return fakeConnection((message) =>
    handler
      ? handler(message)
      : message.service === 'get_forecasts'
        ? { response: { 'weather.casa': { forecast } } }
        : null
  );
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Meteo UI comune', () => {
  it.each(['home', 'details'] as const)(
    'la vista %s conserva una precedente risposta HA senza attribuirla a un attributo legacy',
    async (view) => {
      vi.useFakeTimers();
      let fail = false;
      const { conn } = connection(() => {
        if (fail) throw new Error('refresh failed');
        return { response: { 'weather.casa': { forecast } } };
      });
      const options = {
        id,
        settings,
        size: { w: 4, h: 2 },
        runtime: { entities: fixtureEntities([entity('sunny', { supported_features: 2 })]), conn },
      };
      if (view === 'home') renderWidget(weatherWidget, options);
      else renderDetails(weatherWidget, options);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByRole('list', { name: 'Previsioni orarie' })).toBeInTheDocument();
      fail = true;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
      });
      expect(
        screen.getByText('Previsioni precedenti, aggiornamento non riuscito.')
      ).toBeInTheDocument();
      expect(screen.getByRole('list', { name: 'Previsioni orarie' })).toBeInTheDocument();
      expect(screen.queryByText(/Previsioni da attributo HA/)).toBeNull();
    }
  );
  it.each([
    { w: 1, h: 1 },
    { w: 2, h: 1 },
    { w: 2, h: 2 },
    { w: 4, h: 2 },
  ])('preserva valore/unità e apertura nella taglia $w×$h', (size) => {
    const openDetails = vi.fn();
    renderWidget(weatherWidget, {
      id,
      settings,
      size,
      runtime: { entities: fixtureEntities([entity()]), openDetails },
    });
    const card = screen.getByRole('group', { name: 'Casa' });
    expect(card).toHaveAttribute('data-cols', String(size.w));
    expect(card.querySelector('.home-weather__temperature')).toHaveTextContent('17,4 °C');
    fireEvent.click(within(card).getByRole('button', { name: 'Apri il meteo di Casa' }));
    expect(openDetails).toHaveBeenCalledWith(id);
  });
  it('non apre la scheda durante la modifica', () => {
    renderWidget(weatherWidget, {
      id,
      settings,
      editMode: true,
      runtime: { entities: fixtureEntities([entity()]) },
    });
    expect(screen.queryByRole('button', { name: /Apri il meteo/ })).toBeNull();
  });
  it('attesa e fonte mancante non si sovrappongono', () => {
    const { update } = renderWidget(weatherWidget, {
      id,
      settings,
      runtime: { entitiesLoaded: false },
    });
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento del meteo');
    expect(screen.queryByText('La fonte meteo non è più disponibile.')).toBeNull();
    update({ id, settings, runtime: { entitiesLoaded: true } });
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('La fonte meteo non è più disponibile.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apri il meteo di Meteo' })).toBeInTheDocument();
  });
  it('non usa un’entità non meteo come fonte pur mantenendo il riferimento correggibile', () => {
    renderWidget(weatherWidget, {
      id,
      settings: { weatherId: 'sensor.altro' },
      runtime: { entities: fixtureEntities([fixtureEntity('sensor.altro', '26')]) },
    });
    expect(screen.getByText('La fonte meteo non è più disponibile.')).toBeInTheDocument();
    expect(screen.queryByText('26')).toBeNull();
  });
  it('non presenta attributi rimasti in memoria come misure attuali se la fonte è indisponibile', () => {
    renderDetails(weatherWidget, {
      id,
      settings,
      runtime: {
        entities: fixtureEntities([
          entity('unavailable', { humidity: 90, pressure: 1024, wind_speed: 35, precipitation: 7 }),
        ]),
      },
    });
    expect(screen.getByText('Non disponibile')).toBeInTheDocument();
    expect(screen.queryByText('90%')).toBeNull();
    expect(screen.queryByText('1024')).toBeNull();
    expect(screen.queryByText('35')).toBeNull();
    expect(screen.queryByText('17,4 °C')).toBeNull();
  });
  it('mostra soltanto misure numeriche valide nelle loro unità native', () => {
    renderDetails(weatherWidget, {
      id,
      settings,
      runtime: {
        entities: fixtureEntities([
          entity('sunny', {
            humidity: 101,
            pressure: '1000garbage',
            wind_speed: 3,
            wind_speed_unit: 'm/s',
            wind_gust_speed: 0,
            precipitation: 0,
            precipitation_unit: 'mm',
          }),
        ]),
      },
    });
    expect(screen.queryByText('101%')).toBeNull();
    expect(screen.queryByText('1000')).toBeNull();
    expect(screen.getByText('3 m/s')).toBeInTheDocument();
    expect(screen.getByText('0 m/s')).toBeInTheDocument();
    expect(screen.getByText('0 mm')).toBeInTheDocument();
  });
  it('indica il sensore configurato non disponibile e rende esplicito il ripiego meteo', () => {
    renderDetails(weatherWidget, {
      id,
      settings: { ...settings, tempId: 'sensor.esterno' },
      runtime: { entities: fixtureEntities([entity()]) },
    });
    expect(
      screen.getByText('Sensore locale non disponibile. Temperatura dalla fonte meteo.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Storico non disponibile per il sensore selezionato.')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText('Informazioni sulla fonte'));
    expect(screen.getByText('sensor.esterno')).toBeInTheDocument();
  });
  it('la fonte può non offrire previsioni senza inventare giorni o inviare richieste', () => {
    const { conn, sendMessagePromise } = connection();
    renderDetails(weatherWidget, {
      id,
      settings,
      runtime: { entities: fixtureEntities([entity()]), conn },
    });
    expect(
      screen.getByText('Nessuna previsione oraria o giornaliera disponibile.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
    expect(sendMessagePromise).not.toHaveBeenCalled();
  });
  it('separa quantità e probabilità della pioggia, compreso lo zero; non copia la condizione corrente', async () => {
    const { conn } = connection();
    renderDetails(weatherWidget, {
      id,
      settings,
      runtime: { entities: fixtureEntities([entity('sunny', { supported_features: 2 })]), conn },
    });
    const list = await screen.findByRole('list', { name: 'Previsioni orarie' });
    expect(within(list).getByText('1,2 mm')).toBeInTheDocument();
    expect(within(list).getByText('80%')).toBeInTheDocument();
    expect(within(list).getByText('0%')).toBeInTheDocument();
    expect(within(list).queryByText('80 mm')).toBeNull();
    expect(within(list).getByText('Non disponibile')).toBeInTheDocument();
    expect(within(list).queryByText('Soleggiato')).toBeNull();
  });
  it('mostra il limite inferiore giornaliero senza creare un toggle orario non supportato', async () => {
    const { conn } = connection(() => ({
      response: {
        'weather.casa': {
          forecast: [{ datetime: stamp, temperature: 14, templow: -2, condition: 'cloudy' }],
        },
      },
    }));
    renderDetails(weatherWidget, {
      id,
      settings,
      runtime: { entities: fixtureEntities([entity('cloudy', { supported_features: 1 })]), conn },
    });
    const list = await screen.findByRole('list', { name: 'Previsioni giornaliere' });
    expect(within(list).getByText('Min -2 °C')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Oraria' })).toBeNull();
  });
  it('errore e loader sono alternativi, Riprova esegue soltanto una nuova lettura', async () => {
    let fail = true;
    const { conn, sendMessagePromise } = connection(() => {
      if (fail) throw new Error('offline');
      return { response: { 'weather.casa': { forecast } } };
    });
    renderDetails(weatherWidget, {
      id,
      settings,
      runtime: { entities: fixtureEntities([entity('sunny', { supported_features: 2 })]), conn },
    });
    expect(await screen.findByText('Impossibile caricare le previsioni.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Caricamento delle previsioni…')).toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    expect(await screen.findByRole('list', { name: 'Previsioni orarie' })).toBeInTheDocument();
    expect(
      sendMessagePromise.mock.calls.every(([message]) => message.service === 'get_forecasts')
    ).toBe(true);
  });
  it('conserva le previsioni legacy consultabili dopo un errore, dichiarandone la provenienza', async () => {
    const { conn } = connection(() => {
      throw new Error('timeout');
    });
    renderDetails(weatherWidget, {
      id,
      settings,
      runtime: {
        entities: fixtureEntities([entity('sunny', { supported_features: 2, forecast })]),
        conn,
      },
    });
    expect(await screen.findByText('Impossibile caricare le previsioni.')).toBeInTheDocument();
    expect(
      screen.getByText('Previsioni da attributo HA, aggiornamento non riuscito.')
    ).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Previsioni orarie' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Riprova' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Caricamento delle previsioni…')).toBeNull();
  });
  it('il titolo lungo resta intero nei dettagli e i riferimenti tecnici rimangono secondari', () => {
    const name = 'Fonte meteo della casa in montagna con denominazione molto lunga';
    const { container } = renderDetails(weatherWidget, {
      id,
      settings,
      runtime: { entities: fixtureEntities([entity('sunny', { friendly_name: name })]) },
    });
    expect(container.querySelector('.home-weather-details')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    const details = container.querySelector('details');
    expect(details).not.toHaveAttribute('open');
    expect(within(details!).getByText('weather.casa')).toBeInTheDocument();
  });
  it('il cambio fonte non mantiene il titolo precedente', async () => {
    const { update } = renderDetails(weatherWidget, {
      id,
      settings,
      runtime: { entities: fixtureEntities([entity()]) },
    });
    const next = fixtureEntity('weather.mare', 'windy', {
      friendly_name: 'Mare',
      temperature: 8,
      temperature_unit: '°F',
      supported_features: 0,
    });
    update({
      id,
      settings: { weatherId: 'weather.mare' },
      runtime: { entities: fixtureEntities([next]) },
    });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Mare' })).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'Casa' })).toBeNull();
    expect(screen.getByText('8 °F')).toBeInTheDocument();
  });
});
