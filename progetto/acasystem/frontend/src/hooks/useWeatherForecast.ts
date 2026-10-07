import { useState, useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import type { CardSettingsMap } from '@/@types/dashboard';
import type { HaForecastEntry, HaMessageConnection } from '@/@types/ha';
import { getForecast } from '@/api';

export interface WeatherForecastBucket {
  hourly?: HaForecastEntry[];
  daily?: HaForecastEntry[];
}

/** Previsioni per entità meteo; le liste semplici sono il formato legacy (solo orarie). */
export type ForecastsById = Record<string, WeatherForecastBucket | HaForecastEntry[]>;

/**
 * Hook to map multiple weather entities to forecast data
 * Returns [forecastsById, setForecastsById]
 */
export default function useWeatherForecast(
  conn: HaMessageConnection | null | undefined,
  cardSettings: CardSettingsMap
): [ForecastsById, Dispatch<SetStateAction<ForecastsById>>] {
  const [forecastsById, setForecastsById] = useState<ForecastsById>({});

  // Derive a stable list of weather entity IDs used across cards
  const weatherIds = useMemo(() => {
    const ids = Object.keys(cardSettings)
      .map((section) => {
        const settings = cardSettings[section];
        if (section.includes('::weather_temp_')) return settings.weatherId;
        if (settings.type === 'weather') return settings.weatherId;
        return null;
      })
      .filter((id): id is string => typeof id === 'string' && Boolean(id));
    return Array.from(new Set(ids));
  }, [cardSettings]);

  useEffect(() => {
    if (!conn) return undefined;
    if (weatherIds.length === 0) {
      setForecastsById({});
      return undefined;
    }

    let cancelled = false;

    const fetchForecasts = async () => {
      const newForecasts: Record<string, WeatherForecastBucket> = {};

      await Promise.all(
        weatherIds.map(async (entityId) => {
          if (cancelled) return;
          const [hourlyResult, dailyResult] = await Promise.allSettled([
            getForecast(conn, { entityId, type: 'hourly' }),
            getForecast(conn, { entityId, type: 'daily' }),
          ]);

          if (cancelled) return;

          const hourly = hourlyResult.status === 'fulfilled' ? hourlyResult.value : [];
          const daily = dailyResult.status === 'fulfilled' ? dailyResult.value : [];
          const next: WeatherForecastBucket = {};

          if (Array.isArray(hourly) && hourly.length > 0) next.hourly = hourly;
          if (Array.isArray(daily) && daily.length > 0) next.daily = daily;

          if (Object.keys(next).length > 0) {
            newForecasts[entityId] = next;
          }
        })
      );

      if (cancelled) return;
      setForecastsById((prev) => {
        // Drop stale entries for weather cards that were removed
        const next = weatherIds.reduce<ForecastsById>((acc, id) => {
          const prevEntry = prev[id];
          const previous: WeatherForecastBucket | undefined = Array.isArray(prevEntry)
            ? { hourly: prevEntry }
            : prevEntry;
          const incoming = newForecasts[id];
          if (previous || incoming) acc[id] = { ...previous, ...incoming };
          return acc;
        }, {});
        return next;
      });
    };

    fetchForecasts();
    const interval = setInterval(fetchForecasts, 30 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [conn, weatherIds]);

  return [forecastsById, setForecastsById];
}
