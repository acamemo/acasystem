import { useEffect, useState } from 'react';
import type { TvApp } from '../model/tvApps';
import type { TvKeyCall } from '../model/tvRemote';
import { sendSafely } from './commands';

/** How long a TV switched on for an app may take to report that it is on. */
export const TV_WAKE_TIMEOUT_MS = 30000;
/** Pause between «on» and the app: the TV accepts the app only once its interface is up. */
export const TV_APP_SETTLE_MS = 2000;

/**
 * Opens an app of the TV; with the TV off it switches it on first and opens the app once Home
 * Assistant reports it on (REQ-18, 2026-10-27). Not reported on in time, or a failed call:
 * `failed`.
 */
export function useTvAppLaunch(
  isOn: boolean,
  callService: (domain: string, service: string, data: Record<string, unknown>) => unknown,
  turnOn: () => unknown
) {
  const [waiting, setWaiting] = useState<TvApp | null>(null);
  const [failed, setFailed] = useState(false);

  const send = (call: TvKeyCall) => callService(call.domain, call.service, call.data);

  useEffect(() => {
    if (!waiting) return undefined;
    const timer = setTimeout(
      () => {
        setWaiting(null);
        if (isOn)
          sendSafely(
            () => send(waiting.call),
            () => setFailed(true)
          );
        else setFailed(true);
      },
      isOn ? TV_APP_SETTLE_MS : TV_WAKE_TIMEOUT_MS
    );
    return () => clearTimeout(timer);
    // `send` reads the current runtime; the timer follows only the app and the power state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting, isOn]);

  /** The call to run now: the app itself, or the power-on when the TV is off. */
  const open = (app: TvApp): unknown => {
    setFailed(false);
    if (isOn) return send(app.call);
    setWaiting(app);
    return Promise.resolve(turnOn()).catch((error: unknown) => {
      setWaiting(null);
      throw error;
    });
  };

  return { open, waiting: waiting?.name ?? null, failed };
}
