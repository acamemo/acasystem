import { useEffect, useMemo, useRef, useState } from 'react';
import type { CardSettingsMap } from '@/@types/dashboard';
import type { HaForecastEntry, HaMessageConnection } from '@/@types/ha';
import { getForecast, getHistory, getStatistics } from '@/api';
import useTempHistory from '@/hooks/useTempHistory';
import useWeatherForecast from '@/hooks/useWeatherForecast';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { toDate } from '@/validators/guards';
import { toFiniteNumber } from '../shared/format';
import {
  historyPoints,
  resolveForecasts,
  type ForecastType,
  type ResolvedForecasts,
  type TimePoint,
} from './weatherModel';
import type { HassEntity } from 'home-assistant-js-websocket';

/**
 * Forecasts and temperature history of one weather card, through the same hooks the legacy
 * dashboard ran for every card (useWeatherForecast, useTempHistory). They select the cards by
 * a `::weather_temp_` settings key, so the widget passes a one-card map with such a key.
 */
export function useCardWeather(
  conn: HaMessageConnection | null,
  widgetId: string,
  weatherId: string | undefined,
  tempId: string | undefined,
  weatherEntity: HassEntity | undefined
): { forecasts: ResolvedForecasts; history: TimePoint[] } {
  const visible = usePageVisible();
  const cardMap = useMemo<CardSettingsMap>(
    () => (weatherId ? { [`widget::weather_temp_${widgetId}`]: { weatherId, tempId } } : {}),
    [widgetId, weatherId, tempId]
  );
  const [forecastsById] = useWeatherForecast(visible ? conn : null, cardMap);
  const [historyById] = useTempHistory(visible ? conn : null, cardMap);
  const bucket = weatherId ? forecastsById[weatherId] : undefined;
  const forecasts = useMemo(() => resolveForecasts(bucket, weatherEntity), [bucket, weatherEntity]);
  const rawHistory = tempId ? historyById[tempId] : undefined;
  const history = useMemo(() => historyPoints(rawHistory), [rawHistory]);
  return { forecasts, history };
}

/** Forecast of the detail sheet, fetched on open and on type change (legacy WeatherModal). */
export function useForecast(
  conn: HaMessageConnection | null,
  entity: HassEntity | undefined,
  type: ForecastType
): { forecast: HaForecastEntry[]; loading: boolean } {
  const entityId = entity?.entity_id;
  const fallback = useMemo(() => resolveForecasts(undefined, entity)[type], [entity, type]);
  // The attribute fallback follows the entity; the fetch only follows entity id and type.
  const fallbackRef = useRef(fallback);
  useEffect(() => {
    fallbackRef.current = fallback;
  }, [fallback]);
  const [state, setState] = useState<{ key: string; forecast: HaForecastEntry[] } | null>(null);
  const key = `${entityId ?? ''}|${type}`;

  useEffect(() => {
    if (!conn || !entityId) return undefined;
    let cancelled = false;
    getForecast(conn, { entityId, type })
      .then((data) => {
        if (!cancelled) setState({ key, forecast: data.length > 0 ? data : fallbackRef.current });
      })
      .catch(() => {
        if (!cancelled) setState({ key, forecast: fallbackRef.current });
      });
    return () => {
      cancelled = true;
    };
  }, [conn, entityId, type, key]);

  if (!conn || !entityId) return { forecast: fallback, loading: false };
  if (state?.key !== key) return { forecast: [], loading: true };
  return { forecast: state.forecast, loading: false };
}

/** Statistics period of the legacy modal for a window of `hours`. */
export const statisticsPeriod = (hours: number): string =>
  hours <= 12 ? '5minute' : hours <= 24 ? '15minute' : 'hour';

/** Temperature sensor history for the detail sheet: statistics first, raw history as fallback. */
export function useSensorHistory(
  conn: HaMessageConnection | null,
  sensorId: string | undefined,
  hours: number
): { points: TimePoint[]; loading: boolean } {
  const [state, setState] = useState<{ key: string; points: TimePoint[] } | null>(null);
  const key = `${sensorId ?? ''}|${hours}`;

  useEffect(() => {
    if (!conn || !sensorId) return undefined;
    let cancelled = false;
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
    const load = async (): Promise<TimePoint[]> => {
      const stats = await getStatistics(conn, {
        start,
        end,
        statisticId: sensorId,
        period: statisticsPeriod(hours),
      });
      const fromStats = stats
        .map((point) => ({
          value: toFiniteNumber(point.mean) ?? toFiniteNumber(point.state),
          time: toDate(point.start ?? point.end ?? ''),
        }))
        .filter(
          (point): point is TimePoint => point.value !== null && !Number.isNaN(point.time.getTime())
        );
      if (fromStats.length > 0) return fromStats;
      const raw = await getHistory(conn, {
        start,
        end,
        entityId: sensorId,
        minimal_response: false,
        no_attributes: true,
      });
      return historyPoints(raw);
    };
    load()
      .then((points) => {
        if (!cancelled) setState({ key, points });
      })
      .catch(() => {
        if (!cancelled) setState({ key, points: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [conn, sensorId, hours, key]);

  if (!conn || !sensorId) return { points: [], loading: false };
  if (state?.key !== key) return { points: [], loading: true };
  return { points: state.points, loading: false };
}
