/** Weather reads preserve HA units and separate observations, forecasts and real history. */
import type { HassEntity } from 'home-assistant-js-websocket';
import type { HaConfig, HaForecastEntry } from '@/@types/ha';
import type { ForecastsById } from '@/hooks/useWeatherForecast';
import type { TempHistoryPoint } from '@/hooks/useTempHistory';
import { parseForecastEntries } from '@/validators/haPayloads';
import { readKey } from '@/validators/guards';
import { attributeString, isUnavailableState, readAttribute } from '../shared/entity';
import { formatTime, humanizeToken, sentenceCase } from '../shared/format';
import type { HomeIconName } from '../shared/HomeIcon';

export interface WeatherCondition {
  label: string;
  icon: HomeIconName;
}
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

export function weatherNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (
    typeof value !== 'string' ||
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())
  )
    return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function weatherCondition(condition: string | null | undefined): WeatherCondition {
  if (condition && CONDITIONS[condition]) return CONDITIONS[condition];
  if (!condition || isUnavailableState(condition))
    return { label: 'Non disponibile', icon: 'cloud' };
  return { label: humanizeToken(condition), icon: 'cloud' };
}

export function weatherMeasurement(entity: HassEntity | undefined, key: string): number | null {
  return !entity || isUnavailableState(entity.state)
    ? null
    : weatherNumber(readAttribute(entity, key));
}

export type ForecastType = 'hourly' | 'daily';
/** Feature values of HA 2026.10.4: daily=1, hourly=2, twice_daily=4. */
export function availableForecastTypes(entity: HassEntity | undefined): ForecastType[] {
  if (!entity || !entity.entity_id.startsWith('weather.')) return [];
  const raw = readAttribute(entity, 'supported_features');
  if (raw === undefined || raw === null) return ['hourly', 'daily'];
  const features = weatherNumber(raw);
  if (features === null || !Number.isSafeInteger(features) || features < 0) return [];
  return [
    ...(features & 2 ? ['hourly' as const] : []),
    ...(features & 1 ? ['daily' as const] : []),
  ];
}

export function forecastDate(entry: HaForecastEntry): Date {
  const raw =
    entry.datetime ??
    readKey(entry, 'datetime_local') ??
    readKey(entry, 'time') ??
    readKey(entry, 'start') ??
    readKey(entry, 'forecast_time');
  return typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(raw) ? new Date(raw) : new Date(NaN);
}

/** Legacy attributes have no declared type; ambiguous twice-daily lists stay unclassified. */
export function inferForecastType(forecast: HaForecastEntry[] | null): ForecastType | null {
  if (!forecast || forecast.length < 2) return null;
  const dates = forecast
    .map(forecastDate)
    .map((date) => date.getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (dates.length < 2) return null;
  const interval = dates[1] - dates[0];
  return interval > 0 && interval < 12 * 3600000
    ? 'hourly'
    : interval >= 20 * 3600000
      ? 'daily'
      : null;
}

export interface ResolvedForecasts {
  hourly: HaForecastEntry[];
  daily: HaForecastEntry[];
}
export function resolveForecasts(
  bucket: ForecastsById[string] | undefined,
  entity: HassEntity | undefined
): ResolvedForecasts {
  const legacy = Array.isArray(bucket) ? bucket : null;
  const raw = readAttribute(entity, 'forecast');
  const attribute = Array.isArray(raw) ? parseForecastEntries(raw) : null;
  const pick = (type: ForecastType): HaForecastEntry[] => {
    // An explicit successful empty response must not revive an old attribute forecast.
    if (bucket && !Array.isArray(bucket) && bucket[type] !== undefined) return bucket[type] ?? [];
    if (inferForecastType(legacy) === type) return legacy ?? [];
    return inferForecastType(attribute) === type ? (attribute ?? []) : [];
  };
  return { hourly: pick('hourly'), daily: pick('daily') };
}

export interface ForecastItem {
  key: string;
  date: Date;
  temperature: number | null;
  templow: number | null;
  condition: WeatherCondition;
  precipitation: number | null;
  precipitationProbability: number | null;
}
export function forecastItems(
  list: HaForecastEntry[],
  _fallbackCondition: string | undefined,
  limit: number
): ForecastItem[] {
  const items = list
    .map((entry, index): ForecastItem | null => {
      const date = forecastDate(entry);
      if (!Number.isFinite(date.getTime())) return null;
      const amount = weatherNumber(entry.precipitation);
      const probability = weatherNumber(entry.precipitation_probability);
      return {
        key: `${date.toISOString()}-${index}`,
        date,
        temperature: weatherNumber(entry.temperature),
        templow: weatherNumber(entry.templow),
        condition: weatherCondition(entry.condition),
        precipitation: amount !== null && amount >= 0 ? amount : null,
        precipitationProbability:
          probability !== null && probability >= 0 && probability <= 100 ? probability : null,
      };
    })
    .filter((item): item is ForecastItem => item !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  return items.slice(0, Math.max(0, limit));
}
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
export function historyPoints(history: readonly TempHistoryPoint[] | undefined): TimePoint[] {
  return (history ?? [])
    .map((point) => ({
      time: new Date(point.last_updated ?? String(readKey(point, 'last_changed') ?? '')),
      value: weatherNumber(point.state),
    }))
    .filter(
      (point): point is TimePoint => point.value !== null && Number.isFinite(point.time.getTime())
    )
    .sort((a, b) => a.time.getTime() - b.time.getTime());
}
/** Never append current observations to history or a future prediction. */
export function graphSeries(
  history: TimePoint[],
  forecast: HaForecastEntry[],
  _current: number | null,
  hours: number,
  now: Date = new Date()
): TimePoint[] {
  if (history.length >= 2)
    return history
      .filter(
        (p) =>
          p.time.getTime() >= now.getTime() - hours * 3600000 && p.time.getTime() <= now.getTime()
      )
      .slice()
      .sort((a, b) => a.time.getTime() - b.time.getTime());
  return forecast
    .map((entry) => ({ time: forecastDate(entry), value: weatherNumber(entry.temperature) }))
    .filter(
      (point): point is TimePoint =>
        point.value !== null &&
        Number.isFinite(point.time.getTime()) &&
        point.time.getTime() >= now.getTime()
    )
    .sort((a, b) => a.time.getTime() - b.time.getTime());
}

export interface WeatherView {
  condition: WeatherCondition;
  state: string;
  unavailable: boolean;
  temperature: number | null;
  temperatureSource: 'sensor' | 'weather' | null;
  unit: string;
  weatherUnit: string;
  pressureUnit: string;
  windUnit: string;
  precipitationUnit: string;
}
function reportedUnit(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
function unit(
  entity: HassEntity,
  attribute: string,
  config: HaConfig | null,
  key: 'temperature' | 'pressure' | 'wind_speed' | 'accumulated_precipitation'
): string {
  return (
    reportedUnit(readAttribute(entity, attribute)) ||
    reportedUnit(config?.unit_system?.[key]) ||
    (key === 'temperature' ? reportedUnit(config?.temperature_unit) : '')
  );
}
export function temperatureSourceEligible(entity: HassEntity | undefined): boolean {
  if (!entity || !entity.entity_id.startsWith('sensor.')) return false;
  const deviceClass = attributeString(entity, 'device_class');
  const nativeUnit = attributeString(entity, 'unit_of_measurement');
  if (nativeUnit && !['°C', '°F', 'K'].includes(nativeUnit)) return false;
  return deviceClass === 'temperature' || (!deviceClass && !!nativeUnit);
}
export function weatherSourceEligible(entity: HassEntity | undefined): boolean {
  return !!entity?.entity_id.startsWith('weather.');
}
export function readWeather(
  weather: HassEntity,
  tempSensor: HassEntity | undefined,
  haConfig: HaConfig | null
): WeatherView {
  const sensorValue =
    tempSensor && temperatureSourceEligible(tempSensor) && !isUnavailableState(tempSensor.state)
      ? weatherNumber(tempSensor.state)
      : null;
  const observed = weatherMeasurement(weather, 'temperature');
  const weatherUnit = unit(weather, 'temperature_unit', haConfig, 'temperature');
  const sensorSelected = sensorValue !== null;
  return {
    condition: weatherCondition(weather.state),
    state: weather.state,
    unavailable: isUnavailableState(weather.state),
    temperature: sensorSelected ? sensorValue : observed,
    temperatureSource: sensorSelected ? 'sensor' : observed !== null ? 'weather' : null,
    unit: sensorSelected ? reportedUnit(tempSensor?.attributes.unit_of_measurement) : weatherUnit,
    weatherUnit,
    pressureUnit: unit(weather, 'pressure_unit', haConfig, 'pressure'),
    windUnit: unit(weather, 'wind_speed_unit', haConfig, 'wind_speed'),
    precipitationUnit: unit(weather, 'precipitation_unit', haConfig, 'accumulated_precipitation'),
  };
}
export function graphHours(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 168
    ? value
    : 12;
}
