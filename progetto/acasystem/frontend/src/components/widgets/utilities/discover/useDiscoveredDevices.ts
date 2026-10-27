import { useCallback, useEffect, useRef, useState } from 'react';
import type { DiscoveredDeviceDto } from '@/@types/devices';
import { listDiscovered, toDeviceError } from '@/api/devicesApi';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';

/** How often the list is read while the details are open: Home Assistant finds nothing faster. */
export const DISCOVERED_POLL_MS = 15_000;

export type DiscoveredDevicesState =
  | { status: 'loading' }
  /** The service is off or Home Assistant is down: `message` is the server's Italian sentence. */
  | { status: 'unavailable'; message: string | null }
  | { status: 'ready'; devices: DiscoveredDeviceDto[] };

/** Codes whose message tells the person something useful (the rest is a network hiccup). */
const SHOWN_CODES = new Set([
  'SERVICE_NOT_ACTIVE',
  'FEATURE_UNAVAILABLE',
  'HA_UNREACHABLE',
  'HA_NOT_READY',
  'HA_INCOMPATIBLE',
  'REQUIRES_INSTALLER',
]);

/**
 * The devices Home Assistant found on the network (`GET /api/dispositivi/scoperti`), read now and
 * every 15 seconds while the component is mounted and the page is visible. A failure is not an
 * error of the screen: the section says why (service off) or stays quiet (network), and the list
 * of the devices already in Home Assistant keeps working without it.
 */
export function useDiscoveredDevices(paused = false): DiscoveredDevicesState & {
  /** Takes a device off the list (ignored, or taken over by this tablet). */
  remove: (flowId: string) => void;
  refresh: () => void;
} {
  const visible = usePageVisible();
  const [state, setState] = useState<DiscoveredDevicesState>({ status: 'loading' });
  const busyRef = useRef(false);
  const aliveRef = useRef(true);
  const [tick, setTick] = useState(0);

  const read = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    listDiscovered()
      .then((devices) => {
        if (aliveRef.current) setState({ status: 'ready', devices });
      })
      .catch((error: unknown) => {
        if (!aliveRef.current) return;
        const info = toDeviceError(error);
        setState({
          status: 'unavailable',
          message: info.code && SHOWN_CODES.has(info.code) ? info.message : null,
        });
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
    const timer = setInterval(read, DISCOVERED_POLL_MS);
    return () => clearInterval(timer);
  }, [paused, read, tick, visible]);

  const remove = useCallback((flowId: string) => {
    setState((previous) =>
      previous.status === 'ready'
        ? {
            status: 'ready',
            devices: previous.devices.filter((device) => device.flowId !== flowId),
          }
        : previous
    );
  }, []);

  const refresh = useCallback(() => setTick((value) => value + 1), []);

  return { ...state, remove, refresh };
}
