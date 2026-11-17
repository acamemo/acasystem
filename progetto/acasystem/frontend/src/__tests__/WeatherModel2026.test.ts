import { describe, expect, it } from 'vitest';
import { fixtureEntity } from '@/utils/fixtures/runtime';
import {
  availableForecastTypes,
  forecastDate,
  forecastItems,
  graphSeries,
  graphHours,
  historyPoints,
  inferForecastType,
  readWeather,
  resolveForecasts,
  temperatureSourceEligible,
  weatherMeasurement,
  weatherNumber,
} from '@/components/widgets/home/weather/weatherModel';
const now = new Date('2026-11-12T12:00:00Z');
const at = (hours: number) => new Date(now.getTime() + hours * 3600000).toISOString();
const weather = (attrs: Record<string, unknown> = {}, state = 'sunny') =>
  fixtureEntity('weather.home', state, { temperature: 18, temperature_unit: '°C', ...attrs });
describe('Weather native model .69', () => {
  it.each([true, false, null, undefined, '', ' ', '12oops', '0x10', 'Infinity', Infinity, NaN])(
    'rejects invalid numeric value %s',
    (value) => {
      expect(weatherNumber(value)).toBeNull();
    }
  );
  it.each([0, -5.2, '0', '-12.5', '1.2e2'])('accepts finite observed number %s', (value) => {
    expect(weatherNumber(value)).toBe(Number(value));
  });
  it('keeps actual weather and sensor units separate without conversion', () => {
    const view = readWeather(
      weather(),
      fixtureEntity('sensor.outside', '68', {
        device_class: 'temperature',
        unit_of_measurement: '°F',
      }),
      null
    );
    expect(view.temperature).toBe(68);
    expect(view.unit).toBe('°F');
    expect(view.weatherUnit).toBe('°C');
    expect(view.temperatureSource).toBe('sensor');
  });
  it('does not invent metric units when metadata and HA config are missing', () => {
    const view = readWeather(
      fixtureEntity('weather.home', 'sunny', { temperature: 18 }),
      undefined,
      null
    );
    expect([
      view.unit,
      view.weatherUnit,
      view.pressureUnit,
      view.windUnit,
      view.precipitationUnit,
    ]).toEqual(['', '', '', '', '']);
  });
  it('uses explicit HA unit metadata only when entity does not report it', () => {
    const view = readWeather(
      fixtureEntity('weather.home', 'sunny', { temperature: 68 }),
      undefined,
      {
        unit_system: {
          temperature: '°F',
          pressure: 'inHg',
          wind_speed: 'mph',
          accumulated_precipitation: 'in',
        },
      }
    );
    expect(view.unit).toBe('°F');
    expect(view.windUnit).toBe('mph');
    expect(view.pressureUnit).toBe('inHg');
  });
  it.each(['unknown', 'unavailable'])('does not display stale attributes for %s', (state) => {
    expect(readWeather(weather({}, state), undefined, null).temperature).toBeNull();
    expect(weatherMeasurement(weather({ humidity: 60 }, state), 'humidity')).toBeNull();
  });
  it('does not treat an arbitrary numeric sensor as outside temperature', () => {
    const sensor = fixtureEntity('sensor.power', '123', {
      device_class: 'power',
      unit_of_measurement: 'W',
    });
    expect(temperatureSourceEligible(sensor)).toBe(false);
    expect(readWeather(weather(), sensor, null).temperature).toBe(18);
  });
  it.each(['%', 'W', 'banana'])('rejects contradictory temperature sensor unit %s', (unit) => {
    expect(
      temperatureSourceEligible(
        fixtureEntity('sensor.temp', '20', {
          device_class: 'temperature',
          unit_of_measurement: unit,
        })
      )
    ).toBe(false);
  });
  it.each(['°C', '°F', 'K'])('retains native temperature sensor unit %s', (unit) => {
    expect(
      temperatureSourceEligible(
        fixtureEntity('sensor.temp', '20', {
          device_class: 'temperature',
          unit_of_measurement: unit,
        })
      )
    ).toBe(true);
  });
  it('retains missing-unit temperature metadata without inventing a unit', () => {
    const sensor = fixtureEntity('sensor.temp', '20', { device_class: 'temperature' });
    expect(temperatureSourceEligible(sensor)).toBe(true);
    expect(readWeather(weather(), sensor, null).unit).toBe('');
  });
  it('supports unavailable legacy temperature sources by metadata', () => {
    expect(
      temperatureSourceEligible(
        fixtureEntity('sensor.temp', 'unavailable', { unit_of_measurement: '°C' })
      )
    ).toBe(true);
  });
  it('falls back from an invalid sensor to the explicit weather observation with provenance', () => {
    const view = readWeather(
      weather(),
      fixtureEntity('sensor.temp', '12oops', {
        device_class: 'temperature',
        unit_of_measurement: '°C',
      }),
      null
    );
    expect(view.temperature).toBe(18);
    expect(view.temperatureSource).toBe('weather');
  });
  it.each([
    [0, []],
    [1, ['daily']],
    [2, ['hourly']],
    [3, ['hourly', 'daily']],
    [4, []],
    [7, ['hourly', 'daily']],
    [-1, []],
    ['oops', []],
  ])('respects capabilities %s', (features, kinds) => {
    expect(availableForecastTypes(weather({ supported_features: features }))).toEqual(kinds);
  });
  it('retains absent feature metadata compatibility but never equates twice_daily to daily', () => {
    expect(availableForecastTypes(weather())).toEqual(['hourly', 'daily']);
    expect(inferForecastType([{ datetime: at(0) }, { datetime: at(12) }])).toBeNull();
  });
  it('keeps rain probability separate from amount and never borrows current condition', () => {
    const [item] = forecastItems(
      [{ datetime: at(1), temperature: 10, precipitation_probability: 80 }],
      'sunny',
      5
    );
    expect(item.precipitation).toBeNull();
    expect(item.precipitationProbability).toBe(80);
    expect(item.condition.label).toBe('Non disponibile');
  });
  it('keeps a valid forecast with no temperature and rejects invalid rain ranges', () => {
    const [item] = forecastItems(
      [{ datetime: at(1), condition: 'rainy', precipitation: -1, precipitation_probability: 101 }],
      undefined,
      5
    );
    expect(item.temperature).toBeNull();
    expect(item.precipitation).toBeNull();
    expect(item.precipitationProbability).toBeNull();
    expect(item.condition.label).toBe('Pioggia');
  });
  it('preserves zero temperature and zero precipitation', () => {
    const [item] = forecastItems(
      [{ datetime: at(1), temperature: 0, precipitation: 0, precipitation_probability: 0 }],
      undefined,
      1
    );
    expect([item.temperature, item.precipitation, item.precipitationProbability]).toEqual([
      0, 0, 0,
    ]);
  });
  it('sorts dated forecasts and drops malformed timestamps', () => {
    const list = forecastItems(
      [
        { datetime: at(3), temperature: 3 },
        { datetime: 'tomorrow', temperature: 4 },
        { datetime: at(1), temperature: 1 },
      ],
      undefined,
      2
    );
    expect(list.map((x) => x.temperature)).toEqual([1, 3]);
    expect(Number.isNaN(forecastDate({ datetime: '1' }).getTime())).toBe(true);
  });
  it('a successful empty forecast overrides stale legacy attributes', () => {
    const entity = weather({
      forecast: [
        { datetime: at(1), temperature: 1 },
        { datetime: at(2), temperature: 2 },
      ],
    });
    expect(resolveForecasts({ hourly: [] }, entity).hourly).toEqual([]);
    expect(resolveForecasts(undefined, entity).hourly).toHaveLength(2);
  });
  it('bounds the history window to the existing settings range without changing saved data', () => {
    expect([
      graphHours(1),
      graphHours(168),
      graphHours(0),
      graphHours(169),
      graphHours(Infinity),
    ]).toEqual([1, 168, 12, 12, 12]);
  });
  it('does not append a current observation to future predictions', () => {
    expect(
      graphSeries(
        [],
        [
          { datetime: at(1), temperature: 10 },
          { datetime: at(2), temperature: 11 },
        ],
        999,
        12,
        now
      ).map((x) => x.value)
    ).toEqual([10, 11]);
  });
  it('does not append or extend history and limits it to the requested real window', () => {
    const points = [
      { time: new Date(at(-20)), value: 1 },
      { time: new Date(at(-2)), value: 2 },
      { time: new Date(at(-1)), value: 3 },
      { time: new Date(at(1)), value: 4 },
    ];
    expect(graphSeries(points, [], 999, 12, now).map((x) => x.value)).toEqual([2, 3]);
    expect(
      historyPoints([
        { state: '2x', last_updated: at(-2) },
        { state: '0', last_updated: at(-1) },
      ]).map((x) => x.value)
    ).toEqual([0]);
  });
});
