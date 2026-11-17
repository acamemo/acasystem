import { useEffect, useRef, useState } from 'react';
import { getHistory } from '@/api/haClient';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { sensorHistoryEvents, type ProductSensorEvent } from './productSensorModel';

export function useProductSensorHistory(entityId: string, hours: number) {
  const runtime = useWidgetRuntime(),
    conn = runtime.conn,
    visible = usePageVisible();
  const enabled =
    visible && Boolean(runtime.entities[entityId]) && Boolean(conn) && conn?.connected !== false;
  const visibility = useRef({ enabled, epoch: 0 });
  if (visibility.current.enabled !== enabled)
    visibility.current = { enabled, epoch: visibility.current.epoch + 1 };
  const epoch = visibility.current.epoch;
  const [result, setResult] = useState<{
    conn: typeof conn;
    entityId: string;
    hours: number;
    epoch: number;
    events: ProductSensorEvent[];
    loading: boolean;
    error: boolean;
  } | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    const token = ++generation.current;
    if (!enabled || !conn) return undefined;
    let active = true;
    const end = new Date(),
      start = new Date(end.getTime() - hours * 3600000);
    setResult({ conn, entityId, hours, epoch, events: [], loading: true, error: false });
    void getHistory(conn, {
      entityId,
      start,
      end,
      minimal_response: false,
      no_attributes: false,
    }).then(
      (entries) => {
        if (active && generation.current === token)
          setResult({
            conn,
            entityId,
            hours,
            epoch,
            events: sensorHistoryEvents(entries),
            loading: false,
            error: false,
          });
      },
      () => {
        if (active && generation.current === token)
          setResult({ conn, entityId, hours, epoch, events: [], loading: false, error: true });
      }
    );
    return () => {
      active = false;
    };
  }, [conn, enabled, entityId, hours, epoch]);
  if (!enabled)
    return {
      events: [],
      loading: false,
      error: !conn || conn.connected === false,
      inactive: !visible,
    };
  if (
    !result ||
    result.conn !== conn ||
    result.entityId !== entityId ||
    result.hours !== hours ||
    result.epoch !== epoch
  )
    return { events: [], loading: true, error: false, inactive: false };
  return { events: result.events, loading: result.loading, error: result.error, inactive: false };
}
