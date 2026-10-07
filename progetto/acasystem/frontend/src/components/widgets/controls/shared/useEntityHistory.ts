import { useEffect, useRef, useState } from 'react';
import type { HaHistoryEntry, HaStatistic } from '@/@types/ha';
import { getHistory, getStatistics } from '@/api/haClient';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { downsampleTimeSeries, type TimePoint } from '@/utils/sensorHistory';
import { toDate } from './format';

export interface HistoryEvent {
  state: string;
  time: Date;
}

export interface EntityHistory {
  points: TimePoint[];
  events: HistoryEvent[];
  loading: boolean;
  /** The history could not be read (no connection or a failed request). */
  error: boolean;
  start: Date;
  end: Date;
}

const HOUR = 60 * 60 * 1000;

function entryTime(entry: HaHistoryEntry): Date | null {
  return toDate(
    entry.last_changed ??
      entry.last_updated ??
      entry.last_reported ??
      entry.timestamp ??
      entry.lc ??
      entry.lu ??
      entry.l
  );
}

function entryState(entry: HaHistoryEntry): string | null {
  const value = entry.state ?? entry.s;
  return typeof value === 'string' ? value : null;
}

export function historyPoints(entries: HaHistoryEntry[]): TimePoint[] {
  const points: TimePoint[] = [];
  for (const entry of entries) {
    const value = Number.parseFloat(String(entryState(entry)));
    const time = entryTime(entry);
    if (!Number.isNaN(value) && time) points.push({ value, time });
  }
  return points;
}

export function historyEvents(entries: HaHistoryEntry[]): HistoryEvent[] {
  const events: HistoryEvent[] = [];
  for (const entry of entries) {
    const state = entryState(entry);
    const time = entryTime(entry);
    if (state !== null && time) events.push({ state, time });
  }
  return events;
}

export function statisticPoints(stats: HaStatistic[]): TimePoint[] {
  const points: TimePoint[] = [];
  for (const stat of stats) {
    const value =
      typeof stat.mean === 'number' ? stat.mean : typeof stat.state === 'number' ? stat.state : stat.sum;
    const time = toDate(stat.start);
    if (typeof value === 'number' && Number.isFinite(value) && time) points.push({ value, time });
  }
  return points;
}

/** A single point becomes a flat segment of one hour, so the line is visible. */
const widen = (points: TimePoint[]): TimePoint[] => {
  const only = points[0];
  return points.length === 1 && only
    ? [{ value: only.value, time: new Date(only.time.getTime() - HOUR) }, only]
    : points;
};

/**
 * History of an entity over the last `hours` (legacy SensorCard sparkline and SensorModal):
 * recorder history first, hourly statistics when it is too sparse, then the current value.
 */
export function useEntityHistory(
  entityId: string | undefined,
  hours: number,
  { enabled = true, detailed = false }: { enabled?: boolean; detailed?: boolean } = {}
): EntityHistory {
  const { conn, entities } = useWidgetRuntime();
  const currentState = entityId ? entities[entityId]?.state : undefined;
  const stateRef = useRef(currentState);
  // The sparkline follows the state like the legacy card; the detail history does not.
  const refreshKey = detailed ? null : currentState;
  useEffect(() => {
    stateRef.current = currentState;
  }, [currentState]);
  const [result, setResult] = useState<EntityHistory>(() => {
    const end = new Date();
    return {
      points: [],
      events: [],
      loading: enabled,
      error: false,
      start: new Date(end.getTime() - hours * HOUR),
      end,
    };
  });

  useEffect(() => {
    if (!enabled || !entityId) return undefined;
    let cancelled = false;
    const end = new Date();
    const start = new Date(end.getTime() - hours * HOUR);
    const fallbackLine = (): TimePoint[] => {
      const value = Number.parseFloat(String(stateRef.current));
      return Number.isNaN(value)
        ? []
        : [
            { value, time: start },
            { value, time: end },
          ];
    };
    setResult((previous) => ({ ...previous, loading: true, error: false, start, end }));

    const load = async () => {
      if (!conn) {
        setResult({ points: fallbackLine(), events: [], loading: false, error: true, start, end });
        return;
      }
      let points: TimePoint[] = [];
      let events: HistoryEvent[] = [];
      let failed = false;
      try {
        const entries = await getHistory(conn, {
          entityId,
          start,
          end,
          minimal_response: !detailed,
          no_attributes: !detailed,
        });
        points = historyPoints(entries);
        events = historyEvents(entries);
      } catch {
        failed = true;
      }
      if (points.length < 2) {
        try {
          const stats = statisticPoints(
            await getStatistics(conn, { statisticId: entityId, start, end, period: 'hour' })
          );
          if (stats.length > points.length) points = stats;
        } catch {
          // Statistics are optional (only numeric entities with a state class have them).
        }
      }
      if (points.length === 0) points = fallbackLine();
      if (events.length === 0 && stateRef.current) {
        events = [{ state: stateRef.current, time: start }];
      }
      if (cancelled) return;
      setResult({
        points: downsampleTimeSeries(widen(points)),
        events,
        loading: false,
        error: failed,
        start,
        end,
      });
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [conn, detailed, enabled, entityId, hours, refreshKey]);

  return result;
}
