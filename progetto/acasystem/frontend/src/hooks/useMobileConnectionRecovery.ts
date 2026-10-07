import { useEffect, useRef } from 'react';
import { MOBILE_BREAKPOINT } from '@/utils/config/constants';

export const CONNECTION_PROBE_TIMEOUT_MS = 3000;

/** Parte della connessione HA usata per verificarla e riaprirla. */
export interface RecoverableConnection {
  connected?: boolean;
  ping: () => Promise<unknown>;
  reconnect?: (force?: boolean) => void;
}

export type ProbeResult = 'unavailable' | 'reconnecting' | 'healthy';

export interface ProbeOptions {
  timeoutMs?: number;
  onHealthy?: () => void;
  onRecovering?: () => void;
}

export function isMobileViewport(): boolean {
  return (
    typeof globalThis.window !== 'undefined' && globalThis.window.innerWidth < MOBILE_BREAKPOINT
  );
}

export async function probeAndRecoverConnection(
  conn: RecoverableConnection | null | undefined,
  {
    timeoutMs = CONNECTION_PROBE_TIMEOUT_MS,
    onHealthy = () => {},
    onRecovering = () => {},
  }: ProbeOptions = {}
): Promise<ProbeResult> {
  if (!conn) return 'unavailable';

  if (conn.connected === false) {
    onRecovering();
    conn.reconnect?.(true);
    return 'reconnecting';
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.resolve().then(() => conn.ping()),
      new Promise((_, reject) => {
        timeoutId = globalThis.setTimeout(
          () => reject(new Error('Home Assistant connection probe timed out')),
          timeoutMs
        );
      }),
    ]);
    onHealthy();
    return 'healthy';
  } catch {
    onRecovering();
    conn.reconnect?.(true);
    return 'reconnecting';
  } finally {
    if (timeoutId) globalThis.clearTimeout(timeoutId);
  }
}

export interface MobileConnectionRecoveryOptions {
  conn: RecoverableConnection | null | undefined;
  onHealthy?: () => void;
  onRecovering?: () => void;
}

export function useMobileConnectionRecovery({
  conn,
  onHealthy,
  onRecovering,
}: MobileConnectionRecoveryOptions): void {
  const recoveryPromiseRef = useRef<Promise<ProbeResult> | null>(null);

  useEffect(() => {
    if (
      !conn ||
      typeof globalThis.window === 'undefined' ||
      typeof globalThis.document === 'undefined'
    ) {
      return undefined;
    }

    const recoverIfNeeded = () => {
      if (
        !isMobileViewport() ||
        globalThis.document.visibilityState !== 'visible' ||
        recoveryPromiseRef.current
      ) {
        return;
      }

      const recoveryPromise = probeAndRecoverConnection(conn, {
        onHealthy,
        onRecovering,
      });
      recoveryPromiseRef.current = recoveryPromise;
      recoveryPromise.finally(() => {
        if (recoveryPromiseRef.current === recoveryPromise) {
          recoveryPromiseRef.current = null;
        }
      });
    };

    globalThis.document.addEventListener('visibilitychange', recoverIfNeeded);
    globalThis.window.addEventListener('pageshow', recoverIfNeeded);
    globalThis.window.addEventListener('online', recoverIfNeeded);

    return () => {
      globalThis.document.removeEventListener('visibilitychange', recoverIfNeeded);
      globalThis.window.removeEventListener('pageshow', recoverIfNeeded);
      globalThis.window.removeEventListener('online', recoverIfNeeded);
      recoveryPromiseRef.current = null;
    };
  }, [conn, onHealthy, onRecovering]);
}
