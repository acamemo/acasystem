import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { HaForecastEntry, HaMessageConnection } from '@/@types/ha';
import { getForecast, getHistory } from '@/api';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { isUnavailableState } from '../shared/entity';
import {
  availableForecastTypes,
  resolveForecasts,
  weatherNumber,
  type ForecastType,
  type ResolvedForecasts,
  type TimePoint,
} from './weatherModel';

const WEATHER_READ_TIMEOUT_MS = 12000;
function timedRead<T>(request: Promise<T>): { promise: Promise<T>; clear: () => void } {
  let timer: ReturnType<typeof setTimeout>;
  const promise = Promise.race([
    request,
    new Promise<T>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Weather read timeout')), WEATHER_READ_TIMEOUT_MS);
    }),
  ]);
  return { promise, clear: () => clearTimeout(timer) };
}

export type WeatherDataStatus =
  'ready' | 'loading' | 'error' | 'empty' | 'unsupported' | 'inactive';
export interface ForecastResult {
  forecast: HaForecastEntry[];
  loading: boolean;
  status: WeatherDataStatus;
  error: boolean;
  retry: () => void;
  availableTypes: ForecastType[];
  source: 'ha' | 'legacy' | null;
}
/** Reads only supported forecast kinds. Requests use the existing HA adapter, never a new provider. */
export function useForecast(
  conn: HaMessageConnection | null,
  entity: HassEntity | undefined,
  type: ForecastType
): ForecastResult {
  const visible = usePageVisible();
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  const entityId = entity?.entity_id;
  const kinds = availableForecastTypes(entity);
  const availableKey = kinds.join('|');
  const availableTypes = kinds;
  const supported = availableTypes.includes(type);
  const usable = !!entity && !isUnavailableState(entity.state);
  const active = visible && usable && supported && !!conn && conn.connected !== false;
  const fallback = resolveForecasts(undefined, entity)[type];
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;
  // Object identity prevents a retained A result from appearing after A -> B -> A or hide/show.
  const token = useMemo(
    () => ({ conn, entityId, type, active, availableKey, revision }),
    [conn, entityId, type, active, availableKey, revision]
  );
  const [state, setState] = useState<{
    token: object;
    forecast: HaForecastEntry[];
    error: boolean;
    source: 'ha' | 'legacy';
  } | null>(null);
  useEffect(() => {
    if (!active || !conn || !entityId) return;
    let cancelled = false;
    let inFlight = false;
    let clearRequest = () => {};
    const load = async () => {
      if (cancelled || inFlight || conn.connected === false) return;
      inFlight = true;
      try {
        const request = timedRead(getForecast(conn, { entityId, type }));
        clearRequest = request.clear;
        const forecast = await request.promise;
        if (!cancelled) setState({ token, forecast, error: false, source: 'ha' });
      } catch {
        if (!cancelled)
          setState((previous) =>
            previous?.token === token && previous.forecast.length > 0
              ? { ...previous, error: true }
              : { token, forecast: fallbackRef.current, error: true, source: 'legacy' }
          );
      } finally {
        clearRequest();
        inFlight = false;
      }
    };
    void load();
    const timer = setInterval(() => void load(), 30 * 60 * 1000);
    return () => {
      cancelled = true;
      clearRequest();
      clearInterval(timer);
    };
  }, [token, active, conn, entityId, type]);
  if (!supported)
    return {
      forecast: [],
      loading: false,
      status: 'unsupported',
      error: false,
      retry,
      availableTypes,
      source: null,
    };
  if (!visible || !usable)
    return {
      forecast: [],
      loading: false,
      status: 'inactive',
      error: false,
      retry,
      availableTypes,
      source: null,
    };
  if (!conn || conn.connected === false)
    return {
      forecast: fallback,
      loading: false,
      status: fallback.length ? 'ready' : conn?.connected === false ? 'error' : 'inactive',
      error: conn?.connected === false,
      retry,
      availableTypes,
      source: fallback.length ? 'legacy' : null,
    };
  if (state?.token !== token)
    return {
      forecast: fallback,
      loading: true,
      status: 'loading',
      error: false,
      retry,
      availableTypes,
      source: fallback.length ? 'legacy' : null,
    };
  return {
    forecast: state.forecast,
    loading: false,
    status: state.error ? 'error' : state.forecast.length ? 'ready' : 'empty',
    error: state.error,
    retry,
    availableTypes,
    source: state.source,
  };
}

/** Retained for callers that display a statistics period; this hook no longer fabricates statistics. */
export const statisticsPeriod = (hours: number): string =>
  hours <= 12 ? '5minute' : hours <= 24 ? '15minute' : 'hour';
export interface SensorHistoryResult {
  points: TimePoint[];
  loading: boolean;
  status: WeatherDataStatus;
  error: boolean;
  retry: () => void;
}
/** Raw history retains each sample's unit. Missing or mismatched units are never relabelled. */
export function useSensorHistory(
  conn: HaMessageConnection | null,
  sensorId: string | undefined,
  hours: number,
  expectedUnit?: string
): SensorHistoryResult {
  const visible = usePageVisible();
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  const valid =
    !!sensorId?.startsWith('sensor.') &&
    Number.isFinite(hours) &&
    hours >= 1 &&
    hours <= 168 &&
    !!expectedUnit;
  const active = visible && valid && !!conn && conn.connected !== false;
  const token = useMemo(
    () => ({ conn, sensorId, hours, expectedUnit, active, revision }),
    [conn, sensorId, hours, expectedUnit, active, revision]
  );
  const [state, setState] = useState<{ token: object; points: TimePoint[]; error: boolean } | null>(
    null
  );
  useEffect(() => {
    if (!active || !conn || !sensorId) return;
    let cancelled = false;
    const end = new Date();
    const start = new Date(end.getTime() - hours * 3600000);
    const request = timedRead(
      getHistory(conn, {
        start,
        end,
        entityId: sensorId,
        minimal_response: false,
        no_attributes: false,
      })
    );
    request.promise
      .then((rows) => {
        const points = rows
          .map((row) => {
            const rawTime = row.last_updated ?? row.last_changed;
            const time = new Date(typeof rawTime === 'string' ? rawTime : NaN);
            const value = weatherNumber(row.state);
            const unit =
              typeof row.attributes?.unit_of_measurement === 'string'
                ? row.attributes.unit_of_measurement.trim()
                : '';
            return { time, value, unit };
          })
          .filter(
            (point): point is TimePoint & { unit: string } =>
              point.value !== null &&
              Number.isFinite(point.time.getTime()) &&
              point.time >= start &&
              point.time <= end &&
              point.unit === expectedUnit
          )
          .sort((a, b) => a.time.getTime() - b.time.getTime())
          .map(({ time, value }) => ({ time, value }));
        if (!cancelled) setState({ token, points, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ token, points: [], error: true });
      })
      .finally(request.clear);
    return () => {
      cancelled = true;
      request.clear();
    };
  }, [token, active, conn, sensorId, hours, expectedUnit]);
  if (!active)
    return {
      points: [],
      loading: false,
      status: conn?.connected === false && visible && valid ? 'error' : 'inactive',
      error: conn?.connected === false && visible && valid,
      retry,
    };
  if (state?.token !== token)
    return { points: [], loading: true, status: 'loading', error: false, retry };
  return {
    points: state.points,
    loading: false,
    status: state.error ? 'error' : state.points.length ? 'ready' : 'empty',
    error: state.error,
    retry,
  };
}

/** Home card reads share the same scoped forecast/history contracts as details. */
export function useCardWeather(
  conn: HaMessageConnection | null,
  _widgetId: string,
  weatherId: string | undefined,
  tempId: string | undefined,
  weatherEntity: HassEntity | undefined,
  expectedTemperatureUnit?: string,
  historyHours = 12
): {
  forecasts: ResolvedForecasts;
  history: TimePoint[];
  forecastStatus: Record<ForecastType, WeatherDataStatus>;
  forecastError: boolean;
  retryForecast: () => void;
  historyStatus: WeatherDataStatus;
  forecastSource: Record<ForecastType, 'ha' | 'legacy' | null>;
} {
  const entity = weatherEntity?.entity_id === weatherId ? weatherEntity : undefined;
  const hourly = useForecast(conn, entity, 'hourly');
  const daily = useForecast(conn, entity, 'daily');
  const sensor = useSensorHistory(conn, tempId, historyHours, expectedTemperatureUnit);
  const retryHourly = hourly.retry;
  const retryDaily = daily.retry;
  const retryForecast = useCallback(() => {
    retryHourly();
    retryDaily();
  }, [retryHourly, retryDaily]);
  const forecasts = useMemo(
    () => ({ hourly: hourly.forecast, daily: daily.forecast }),
    [hourly.forecast, daily.forecast]
  );
  return {
    forecasts,
    history: sensor.points,
    forecastStatus: { hourly: hourly.status, daily: daily.status },
    forecastError: hourly.error || daily.error,
    retryForecast,
    historyStatus: sensor.status,
    forecastSource: { hourly: hourly.source, daily: daily.source },
  };
}
