import { useCallback, useEffect, useRef, useState } from 'react';
import type { IgnoredDeviceDto } from '@/@types/discovery';
import { listIgnored, restoreIgnored, toDeviceError } from '@/api/devicesApi';

/**
 * The discoveries the person ignored (`GET /api/dispositivi/scoperti/ignorati`), read when the
 * screen opens and again on `refresh` (after an «Ignora»). A failure leaves the list empty: the
 * section «Ignorati» is simply not shown, and the rest of the screen works without it.
 */
export function useIgnoredDevices(): {
  devices: IgnoredDeviceDto[];
  refresh: () => void;
  /** Takes the device off the ignored list; resolves with the message to show if it failed. */
  restore: (entryId: string) => Promise<string | null>;
} {
  const [devices, setDevices] = useState<IgnoredDeviceDto[]>([]);
  const [tick, setTick] = useState(0);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    listIgnored().then(
      (list) => {
        if (aliveRef.current) setDevices(list);
      },
      () => undefined
    );
  }, [tick]);

  const refresh = useCallback(() => setTick((value) => value + 1), []);

  const restore = useCallback(async (entryId: string) => {
    try {
      await restoreIgnored(entryId);
    } catch (failure) {
      return toDeviceError(failure).message;
    }
    if (aliveRef.current) {
      setDevices((previous) => previous.filter((device) => device.entryId !== entryId));
    }
    return null;
  }, []);

  return { devices, refresh, restore };
}
