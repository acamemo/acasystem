import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import type { CardSettingsMap } from '@/@types/dashboard';
import type { HaHistoryEntry, HaMessageConnection } from '@/@types/ha';
import { getHistory, getStatistics } from '@/api';
import {
  FETCH_STAGGER_BASE,
  FETCH_STAGGER_RANDOM,
  HISTORY_REFRESH_INTERVAL,
} from '@/utils/config/constants';

/** Punto dello storico: dalle statistiche (`mean`/`state`, `start`) o dallo storico grezzo. */
export type TempHistoryPoint =
  | HaHistoryEntry
  | { state: number | null | undefined; last_updated: number | string | null | undefined };

export type TempHistoryById = Record<string, TempHistoryPoint[]>;

/**
 * Hook that fetches and refreshes temperature history data for weather cards.
 * Returns [tempHistoryById, setTempHistoryById].
 */
export default function useTempHistory(
  conn: HaMessageConnection | null | undefined,
  cardSettings: CardSettingsMap
): [TempHistoryById, Dispatch<SetStateAction<TempHistoryById>>] {
  const [tempHistoryById, setTempHistoryById] = useState<TempHistoryById>({});

  useEffect(() => {
    if (!conn) return;
    let cancelled = false;
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];
    const tempIds = Object.keys(cardSettings)
      .filter((key) => key.includes('::weather_temp_'))
      .map((key) => cardSettings[key]?.tempId)
      .filter((tempId): tempId is string => typeof tempId === 'string' && Boolean(tempId));

    const uniqueIds = Array.from(new Set(tempIds));

    const fetchHistoryFor = async (tempId: string) => {
      const end = new Date();
      const start = new Date();
      start.setHours(start.getHours() - 48);
      try {
        const stats = await getStatistics(conn, {
          start,
          end,
          statisticId: tempId,
          period: '5minute',
        });
        if (cancelled) return;
        if (!cancelled && Array.isArray(stats) && stats.length > 0) {
          const mapped = stats.map((s) => ({
            state: s.mean !== null ? s.mean : s.state,
            last_updated: s.start,
          }));
          setTempHistoryById((prev) => ({ ...prev, [tempId]: mapped }));
          return;
        }
        const historyData = await getHistory(conn, {
          start,
          end,
          entityId: tempId,
          minimal_response: false,
          no_attributes: true,
        });
        if (!cancelled && historyData) {
          setTempHistoryById((prev) => ({ ...prev, [tempId]: historyData }));
        }
      } catch (e) {
        if (!cancelled) console.error('Temp history fetch error', e);
      }
    };

    // Fetch all temperature histories immediately
    uniqueIds.forEach((tempId, index) => {
      // Stagger fetches to prevent main thread blocking
      const timeoutId = setTimeout(
        () => fetchHistoryFor(tempId),
        index * FETCH_STAGGER_BASE + Math.random() * FETCH_STAGGER_RANDOM
      );
      timeoutIds.push(timeoutId);
    });

    // Refresh every 5 minutes
    const refreshInterval = setInterval(() => {
      if (!cancelled) {
        uniqueIds.forEach((tempId) => {
          fetchHistoryFor(tempId);
        });
      }
    }, HISTORY_REFRESH_INTERVAL);

    return () => {
      cancelled = true;
      timeoutIds.forEach((id) => clearTimeout(id));
      clearInterval(refreshInterval);
    };
  }, [conn, cardSettings]);

  return [tempHistoryById, setTempHistoryById];
}
