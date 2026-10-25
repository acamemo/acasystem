import { useEffect, useState } from 'react';
import { getHistory, getStatistics } from '@/api/haClient';
import { useOptionalWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { downsampleTimeSeries, type TimePoint } from '@/utils/sensorHistory';
import { statisticPoints } from '../controls/shared/useEntityHistory';
import type { HistorySource } from './operationalProfile';
import type { HaHistoryEntry } from '@/@types/ha';

export function operationalHistoryPoints(
  entries: readonly HaHistoryEntry[],
  source: HistorySource
): TimePoint[] {
  return entries.flatMap((entry) => {
    const raw = source.attribute
      ? (entry.attributes ?? entry.a)?.[source.attribute]
      : (entry.state ?? entry.s);
    const value = source.states
      ? source.states[String(raw)]
      : raw === null || raw === undefined || raw === ''
        ? NaN
        : Number(raw) * (source.factor ?? 1);
    const stamp = entry.last_updated ?? entry.last_changed ?? entry.lu ?? entry.lc;
    const time = new Date(typeof stamp === 'number' ? stamp * 1000 : String(stamp));
    return typeof value === 'number' && Number.isFinite(value) && Number.isFinite(time.getTime())
      ? [{ value, time }]
      : [];
  });
}

export function useOperationalHistory(
  source: HistorySource | undefined,
  enabled: boolean,
  hours = 24
) {
  const conn = useOptionalWidgetRuntime()?.conn;
  const key = JSON.stringify(source ?? null) + '|' + hours;
  const [result, setResult] = useState<{
    key: string;
    points: TimePoint[];
    loading: boolean;
    error: boolean;
  }>({ key, points: [], loading: false, error: false });
  useEffect(() => {
    if (!enabled || !source || !conn) return;
    let active = true;
    const load = async () => {
      setResult((old) => ({
        key,
        points: old.key === key ? old.points : [],
        loading: true,
        error: false,
      }));
      const end = new Date();
      const start = new Date(end.getTime() - hours * 3600000);
      let points: TimePoint[] = [];
      let error = false;
      try {
        points = operationalHistoryPoints(
          await getHistory(conn, {
            entityId: source.entityId,
            start,
            end,
            no_attributes: !source.attribute,
            minimal_response: !source.attribute,
          }),
          source
        );
        if (!source.attribute && !source.states && points.length < 2) {
          try {
            const stats = statisticPoints(
              await getStatistics(conn, {
                statisticId: source.entityId,
                start,
                end,
                period: 'hour',
              })
            );
            if (stats.length > points.length) points = stats;
          } catch {
            /* Some numeric entities have no statistics. */
          }
        }
      } catch {
        error = true;
      }
      if (active) setResult({ key, points: downsampleTimeSeries(points), loading: false, error });
    };
    void load();
    const timer = setInterval(() => void load(), 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
    // Source is represented by its stable serialized value to avoid refetching on each HA update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conn, enabled, hours, key]);
  if (!enabled || !source) return { points: [], loading: false, error: false };
  if (!conn) return { points: [], loading: false, error: true };
  return result.key === key
    ? result
    : { points: [], loading: Boolean(enabled && conn && source), error: false };
}
