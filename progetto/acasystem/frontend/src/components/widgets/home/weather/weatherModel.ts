/**
 * Weather entity, forecasts and temperature history read as the legacy WeatherTempCard and
 * WeatherModal did (settings `weatherId`, `tempId`, `subtitle`, `graphHistoryHours`).
 */
import type { HassEntity } from 'home-assistant-js-websocket';
import type { HaConfig, HaForecastEntry } from '@/@types/ha';
import type { ForecastsById } from '@/hooks/useWeatherForecast';
import type { TempHistoryPoint } from '@/hooks/useTempHistory';
import { parseForecastEntries } from '@/validators/haPayloads';
import { readKey, toDate } from '@/validators/guards';
import { attributeString, isUnavailableState, readAttribute } from '../shared/entity';
import { formatTime, humanizeToken, sentenceCase, toFiniteNumber } from '../shared/format';
import type { HomeIconName } from '../shared/HomeIcon';
import { unitOr } from '../shared/units';

export interface WeatherCondition {
  label: string;
  icon: HomeIconName;
}

/** HA weather conditions (https://www.home-assistant.io/integrations/weather/). */
const CONDITIONS: Record<string, WeatherCondition> = {
  'clear-night': { label: 'Sereno', icon: 'moon' },
  cloudy: { label: 'Nuvoloso', icon: 'cloud' },
  fog: { label: 'Nebbia', icon: 'cloudFog' },
  hail: { label: 'Grandine', icon: 'cloudSnow' },
  lightning: { label: 'Temporale', icon: 'cloudLightning' },
  'lightning-rainy': { label: 'Temporale con pioggia', icon: 'cloudLightning' },
  partlycloudy: { label: 'Poco nuvoloso', icon: 'weather' },
  pouring: { label: 'Pioggia forte', icon: 'cloudRain' },
  rainy: { label: 'Pioggia', icon: 'cloudRain' },
  snowy: { label: 'Neve', icon: 'cloudSnow' },
  'snowy-rainy': { label: 'Pioggia e neve', icon: 'cloudSnow' },
  sunny: { label: 'Soleggiato', icon: 'sun' },
  windy: { label: 'Vento', icon: 'wind' },
  'windy-variant': { label: 'Vento e nuvole', icon: 'wind' },
  exceptional: { label: 'Condizioni eccezionali', icon: 'warning' },
};

export function weatherCondition(condition: string | null | undefined): WeatherCondition {
  if (condition && CONDITIONS[condition]) return CONDITIONS[condition];
  if (!condition || isUnavailableState(condition))
    return { label: 'Non disponibile', icon: 'cloud' };
  return { label: humanizeToken(condition), icon: 'cloud' };
}

export type ForecastType = 'hourly' | 'daily';

/** Same fields as the legacy getForecastDate. */
export function forecastDate(entry: HaForecastEntry): Date {
  const raw =
    entry.datetime ??
    readKey(entry, 'datetime_local') ??
    readKey(entry, 'time') ??
    readKey(entry, 'start') ??
    readKey(entry, 'forecast_time');
  return toDate(raw ?? '');
}

/** Hourly when two entries are less than 12 h apart (legacy inferForecastType). */
export function inferForecastType(forecast: HaForecastEntry[] | null): ForecastType | null {
  if (!forecast || forecast.length < 2) return null;
  const first = forecastDate(forecast[0]).getTime();
  const second = forecastDate(forecast[1]).getTime();
  if (Number.isNaN(first) || Number.isNaN(second)) return null;
  return Math.abs(second - first) < 12 * 60 * 60 * 1000 ? 'hourly' : 'daily';
}

export interface ResolvedForecasts {
  hourly: HaForecastEntry[];
  daily: HaForecastEntry[];
}

/** Bucket from useWeatherForecast first, then a legacy flat list, then the entity attribute. */
export function resolveForecasts(
  bucket: ForecastsById[string] | undefined,
  entity: HassEntity | undefined
): ResolvedForecasts {
  const legacyList = Array.isArray(bucket) ? bucket : null;
  const rawAttribute = readAttribute(entity, 'forecast');
  const attributeList = Array.isArray(rawAttribute) ? parseForecastEntries(rawAttribute) : null;
  const pick = (type: ForecastType): HaForecastEntry[] =>
    (!Array.isArray(bucket) && bucket?.[type]) ||
    (inferForecastType(legacyList) === type ? legacyList : null) ||
    (inferForecastType(attributeList) === type ? attributeList : null) ||
    [];
  return { hourly: pick('hourly'), daily: pick('daily') };
}

export interface ForecastItem {
  key: string;
  date: Date;
  temperature: number | null;
  templow: number | null;
  condition: WeatherCondition;
  precipitation: number | null;
}

export function forecastItems(
  list: HaForecastEntry[],
  fallbackCondition: string | undefined,
  limit: number
): ForecastItem[] {
  const items: ForecastItem[] = [];
  for (const [index, entry] of list.entries()) {
    if (items.length >= limit) break;
    const date = forecastDate(entry);
    const temperature = toFiniteNumber(entry.temperature);
    if (Number.isNaN(date.getTime()) || temperature === null) continue;
    items.push({
      key: `${date.toISOString()}-${index}`,
      date,
      temperature,
      templow: toFiniteNumber(entry.templow),
      condition: weatherCondition(entry.condition ?? fallbackCondition),
      precipitation:
        toFiniteNumber(entry.precipitation) ??
        toFiniteNumber(entry.precipitation_probability) ??
        toFiniteNumber(readKey(entry, 'precipitation_amount')),
    });
  }
  return items;
}

/** «14:00» for hourly entries, «Lun» for daily ones. */
export function forecastLabel(item: ForecastItem, type: ForecastType, locale: string): string {
  return type === 'hourly'
    ? formatTime(item.date, locale)
    : sentenceCase(
        item.date.toLocaleDateString(locale, { weekday: 'short' }).replace('.', ''),
        locale
      );
}

export interface TimePoint {
  time: Date;
  value: number;
}

/** History points (statistics or raw history) → sorted time points. */
export function historyPoints(history: readonly TempHistoryPoint[] | undefined): TimePoint[] {
  if (!history) return [];
  const points: TimePoint[] = [];
  for (const point of history) {
    const value = toFiniteNumber(point.state);
    const time = toDate(point.last_updated ?? readKey(point, 'last_changed') ?? '');
    if (value !== null && !Number.isNaN(time.getTime())) points.push({ time, value });
  }
  return points.sort((a, b) => a.time.getTime() - b.time.getTime());
}

/**
 * Series of the card graph (legacy WeatherGraph): the last `hours` of history plus the
 * current value; without history, the forecast from now on.
 */
export function graphSeries(
  history: TimePoint[],
  forecast: HaForecastEntry[],
  current: number | null,
  hours: number,
  now: Date = new Date()
): TimePoint[] {
  const base =
    history.length >= 2
      ? history
      : forecast
          .map((entry) => ({ time: forecastDate(entry), value: toFiniteNumber(entry.temperature) }))
          .filter(
            (point): point is TimePoint =>
              point.value !== null && !Number.isNaN(point.time.getTime())
          );
  const since = now.getTime() - hours * 60 * 60 * 1000;
  const points = base.filter((point) => point.time.getTime() >= since);
  if (
    current !== null &&
    !points.some((point) => Math.abs(point.time.getTime() - now.getTime()) < 60000)
  ) {
    points.push({ time: now, value: current });
  }
  return points.sort((a, b) => a.time.getTime() - b.time.getTime());
}

export interface WeatherView {
  condition: WeatherCondition;
  state: string;
  unavailable: boolean;
  temperature: number | null;
  /** Unit of `temperature` (the sensor's when it comes from `tempId`). */
  unit: string;
  /** Units of the weather entity: its forecasts and attributes use them. */
  weatherUnit: string;
  pressureUnit: string;
  windUnit: string;
  precipitationUnit: string;
}

/**
 * Temperature from the optional sensor, else from the weather entity (legacy order). Units:
 * the ones the entities report, else the unit system of HA (runtime.haConfig).
 */
export function readWeather(
  weather: HassEntity,
  tempSensor: HassEntity | undefined,
  haConfig: HaConfig | null
): WeatherView {
  const sensorValue =
    tempSensor && !isUnavailableState(tempSensor.state) ? tempSensor.state : undefined;
  const weatherReported = attributeString(weather, 'temperature_unit');
  const weatherUnit = unitOr([weatherReported], haConfig, 'temperature');
  return {
    condition: weatherCondition(weather.state),
    state: weather.state,
    unavailable: isUnavailableState(weather.state),
    temperature: toFiniteNumber(sensorValue ?? readAttribute(weather, 'temperature')),
    unit: sensorValue
      ? unitOr(
          [attributeString(tempSensor, 'unit_of_measurement'), weatherReported],
          haConfig,
          'temperature'
        )
      : weatherUnit,
    weatherUnit,
    pressureUnit: unitOr([attributeString(weather, 'pressure_unit')], haConfig, 'pressure'),
    windUnit: unitOr([attributeString(weather, 'wind_speed_unit')], haConfig, 'wind_speed'),
    precipitationUnit: unitOr(
      [attributeString(weather, 'precipitation_unit')],
      haConfig,
      'accumulated_precipitation'
    ),
  };
}

/** Graph window of the card: `graphHistoryHours`, 12 h by default. */
export function graphHours(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 12;
}
