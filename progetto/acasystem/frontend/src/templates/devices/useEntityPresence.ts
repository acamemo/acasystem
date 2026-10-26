import { useEffect, useState } from 'react';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';

export type EntityPresence = 'waiting' | 'present' | 'late';

/** How long a new entity is given to arrive in the live data of Home Assistant. */
export const ENTITY_WAIT_MS = 15_000;

/**
 * A device just created in Home Assistant reaches the launcher through the live connection a
 * moment later. `waiting` until the entity is in the live data; `late` when `ENTITY_WAIT_MS`
 * has passed without it (it is still saved: it shows up a few seconds after).
 */
export function useEntityPresence(entityId: string | null): EntityPresence {
  const { entities } = useWidgetRuntime();
  const present = entityId !== null && entities[entityId] !== undefined;
  const [late, setLate] = useState(false);

  useEffect(() => {
    setLate(false);
    if (!entityId || present) return undefined;
    const timer = setTimeout(() => setLate(true), ENTITY_WAIT_MS);
    return () => clearTimeout(timer);
    // Restarted only for another entity; `present` is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  if (present) return 'present';
  return late ? 'late' : 'waiting';
}
