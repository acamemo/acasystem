import { useCallback, useEffect, useRef, useState } from 'react';
import type { TvInReteDto } from '@/@types/devices';
import { listTvs } from '@/api/devicesApi';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';

/** How often the list is read while the details are open: the server keeps it for 30 seconds. */
export const TVS_POLL_MS = 30_000;

export type TvsOnNetworkState =
  | { status: 'loading' }
  /** The service is off, Home Assistant is down or has no such list: the section stays away. */
  | { status: 'unavailable' }
  | { status: 'ready'; tvs: TvInReteDto[] };

/**
 * The televisions Home Assistant saw on the network (`GET /api/dispositivi/tv-in-rete`, F5), read
 * now and every 30 seconds while mounted and visible. A failure is not an error of the screen:
 * «Trovati in rete» already tells the person why the service is off, so this section just hides.
 */
export function useTvsOnNetwork(paused = false): TvsOnNetworkState & { refresh: () => void } {
  const visible = usePageVisible();
  const [state, setState] = useState<TvsOnNetworkState>({ status: 'loading' });
  const busyRef = useRef(false);
  const aliveRef = useRef(true);
  const [tick, setTick] = useState(0);

  const read = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    listTvs()
      .then((tvs) => {
        if (aliveRef.current) setState({ status: 'ready', tvs });
      })
      .catch(() => {
        if (aliveRef.current) setState({ status: 'unavailable' });
      })
      .finally(() => {
        busyRef.current = false;
      });
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!visible || paused) return undefined;
    read();
    const timer = setInterval(read, TVS_POLL_MS);
    return () => clearInterval(timer);
  }, [paused, read, tick, visible]);

  const refresh = useCallback(() => setTick((value) => value + 1), []);

  return { ...state, refresh };
}
