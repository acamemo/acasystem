import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HaMessage } from '@/@types/ha';
import { weatherWidget } from '@/components/widgets/home/weather';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { fakeConnection, renderDetails, renderWidget } from './ComfortHarness';

const NOW = new Date(2026, 9, 6, 10, 0, 0);
const ID = 'weather_temp_1';
const settings = { weatherId: 'weather.casa' };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const hour = (offset: number) => new Date(NOW.getTime() + offset * 3600 * 1000).toISOString();
const day = (offset: number) => new Date(NOW.getTime() + offset * 24 * 3600 * 1000).toISOString();

const hourly = Array.from({ length: 8 }, (_, index) => ({
  datetime: hour(index + 1),
  condition: index < 3 ? 'sunny' : 'rainy',
  temperature: 18 + index,
  precipitation: index < 3 ? 0 : 1.2,
}));

const daily = Array.from({ length: 7 }, (_, index) => ({
  datetime: day(index + 1),
  condition: 'cloudy',
  temperature: 20 - index,
  templow: 10,
}));

function weather(state = 'sunny', attributes: Record<string, unknown> = {}) {
  return fixtureEntity('weather.casa', state, {
    friendly_name: 'Casa',
    temperature: 17.4,
    temperature_unit: '°C',
    humidity: 62,
    pressure: 1013,
    pressure_unit: 'hPa',
    wind_speed: 12,
    wind_gust_speed: 20,
    wind_speed_unit: 'km/h',
    dew_point: 9.5,
    precipitation_unit: 'mm',
    ...attributes,
  });
}

/** HA answering weather.get_forecasts like the integration does. */
function forecastConnection() {
  return fakeConnection((message: HaMessage) => {
    if (message.type === 'call_service' && message.service === 'get_forecasts') {
      const type = (message.service_data as { type: string }).type;
      return { response: { 'weather.casa': { forecast: type === 'daily' ? daily : hourly } } };
    }
    return null;
  });
}

describe('Widget meteo: rendering per taglia e stati', () => {
  it('2×1: condizione e temperatura, senza grafico né previsioni', () => {
    renderWidget(weatherWidget, {
      id: ID,
      settings,
      size: { w: 2, h: 1 },
      runtime: { entities: fixtureEntities([weather()]) },
    });
    const card = screen.getByRole('group', { name: 'Casa' });
    expect(within(card).getByText('17,4 °C')).toBeInTheDocument();
    expect(within(card).getByText('Soleggiato')).toBeInTheDocument();
    expect(within(card).queryByRole('img')).not.toBeInTheDocument();
    expect(within(card).queryByRole('list')).not.toBeInTheDocument();
  });

  it('temperatura dal sensore `tempId` quando configurato, sottotitolo come nome', () => {
    renderWidget(weatherWidget, {
      id: ID,
      settings: { ...settings, tempId: 'sensor.esterno', subtitle: 'Giardino' },
      size: { w: 2, h: 1 },
      runtime: {
        entities: fixtureEntities([
          weather(),
          fixtureEntity('sensor.esterno', '15.2', { unit_of_measurement: '°C' }),
        ]),
      },
    });
    const card = screen.getByRole('group', { name: 'Giardino' });
    expect(within(card).getByText('15,2 °C')).toBeInTheDocument();
    expect(within(card).getByText('Giardino')).toBeInTheDocument();
  });

  it('2×2: grafico dalla previsione quando manca lo storico (come il legacy)', () => {
    renderWidget(weatherWidget, {
      id: ID,
      settings,
      size: { w: 2, h: 2 },
      runtime: { entities: fixtureEntities([weather('sunny', { forecast: hourly })]) },
    });
    expect(
      screen.getByRole('img', { name: /Temperatura prevista, da 17,4 °C a 25 °C/ })
    ).toBeInTheDocument();
  });

  it('4×2: grafico e sei previsioni orarie da weather.get_forecasts', async () => {
    const { conn, sendMessagePromise } = forecastConnection();
    renderWidget(weatherWidget, {
      id: ID,
      settings,
      size: { w: 4, h: 2 },
      runtime: { entities: fixtureEntities([weather()]), conn },
    });
    const list = await screen.findByRole('list', { name: 'Previsioni orarie' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(6);
    expect(within(list).getAllByText('Soleggiato')).toHaveLength(3);
    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'call_service',
      domain: 'weather',
      service: 'get_forecasts',
      target: { entity_id: 'weather.casa' },
      service_data: { type: 'hourly' },
      return_response: true,
    });
  });

  it('4×1: previsioni accanto al valore attuale', () => {
    renderWidget(weatherWidget, {
      id: ID,
      settings,
      size: { w: 4, h: 1 },
      runtime: { entities: fixtureEntities([weather('sunny', { forecast: hourly })]) },
    });
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(4);
  });

  it('fonte non configurata, mancante e non disponibile', () => {
    const { update } = renderWidget(weatherWidget, { id: ID, settings: {}, runtime: {} });
    expect(
      screen.getByText('Scegli una fonte meteo nelle impostazioni del widget.')
    ).toBeInTheDocument();
    update({ id: ID, settings, runtime: { entities: {} } });
    expect(
      screen.getByText('La fonte meteo non è più presente in Home Assistant.')
    ).toBeInTheDocument();
    update({ id: ID, settings, runtime: { entities: fixtureEntities([weather('unavailable')]) } });
    expect(screen.getByText('Non disponibile')).toBeInTheDocument();
    update({ id: ID, settings, runtime: { entitiesLoaded: false } });
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento del meteo…');
  });

  it('il tocco apre i dettagli; in modifica no', () => {
    const openDetails = vi.fn();
    const { update } = renderWidget(weatherWidget, {
      id: ID,
      settings,
      runtime: { entities: fixtureEntities([weather()]), openDetails },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apri il meteo di Casa' }));
    expect(openDetails).toHaveBeenCalledWith(ID);
    update({
      id: ID,
      settings,
      editMode: true,
      runtime: { entities: fixtureEntities([weather()]), openDetails },
    });
    expect(screen.queryByRole('button', { name: 'Apri il meteo di Casa' })).not.toBeInTheDocument();
  });
});

describe('Dettagli meteo', () => {
  it('dati attuali con le unità di HA e previsioni orarie e giornaliere', async () => {
    const { conn, sendMessagePromise } = forecastConnection();
    renderDetails(weatherWidget, {
      id: ID,
      settings,
      runtime: { entities: fixtureEntities([weather()]), conn },
    });
    expect(screen.getByText('62%')).toBeInTheDocument();
    expect(screen.getByText('1013 hPa')).toBeInTheDocument();
    expect(screen.getByText('12 km/h')).toBeInTheDocument();
    expect(screen.getByText('raffiche 20 km/h')).toBeInTheDocument();
    expect(screen.getByText('9,5 °C')).toBeInTheDocument();

    const hourlyList = await screen.findByRole('list', { name: 'Previsioni orarie' });
    expect(within(hourlyList).getAllByRole('listitem')).toHaveLength(8);
    expect(within(hourlyList).getAllByText('1,2 mm')).toHaveLength(5);

    fireEvent.click(screen.getByRole('button', { name: 'Giornaliera' }));
    const dailyList = await screen.findByRole('list', { name: 'Previsioni giornaliere' });
    expect(within(dailyList).getAllByRole('listitem')).toHaveLength(7);
    expect(sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({ service: 'get_forecasts', service_data: { type: 'daily' } })
    );
  });

  it('con il sensore mostra lo storico per periodo (statistiche come il legacy)', async () => {
    const statistics = Array.from({ length: 5 }, (_, index) => ({
      start: NOW.getTime() - (5 - index) * 3600 * 1000,
      mean: 14 + index,
    }));
    const { conn, sendMessagePromise } = fakeConnection((message: HaMessage) => {
      if (message.type === 'recorder/statistics_during_period')
        return { 'sensor.esterno': statistics };
      if (message.service === 'get_forecasts')
        return { response: { 'weather.casa': { forecast: hourly } } };
      return null;
    });
    renderDetails(weatherWidget, {
      id: ID,
      settings: { ...settings, tempId: 'sensor.esterno' },
      runtime: {
        entities: fixtureEntities([
          weather(),
          fixtureEntity('sensor.esterno', '18', { unit_of_measurement: '°C' }),
        ]),
        conn,
      },
    });
    expect(
      await screen.findByRole('img', { name: 'Ultime 12 ore, da 14 °C a 18 °C' })
    ).toBeInTheDocument();
    expect(sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'recorder/statistics_during_period',
        statistic_ids: ['sensor.esterno'],
        period: '5minute',
      })
    );
    fireEvent.click(screen.getByRole('button', { name: '24 ore' }));
    await waitFor(() =>
      expect(sendMessagePromise).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'recorder/statistics_during_period', period: '15minute' })
      )
    );
  });
});
