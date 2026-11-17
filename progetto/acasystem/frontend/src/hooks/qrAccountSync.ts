import { useEffect, useRef, useState } from 'react';
import {
  applyQrConfiguration, collectQrConfiguration, readAccountSettings,
  readQrPreferences, QR_PREFERENCES_EVENT, watchAccountSettings, writeAccountSettings,
  type QrConfiguration,
} from '@/api/qrPairing';
import type { LauncherContextSetters } from './launcher/useSnapshotSetters';
import { isObject } from '@/validators/guards';

import { drainQrHandoffs } from '@/api/qrHandoff';
export { drainQrHandoffs } from '@/api/qrHandoff';

/** Account sync is keyed by the authenticated HA user; CONFIG remains a local copy. */
export function useQrAccountSync(userId: string | undefined, setters: LauncherContextSetters): void {
  const settersRef = useRef(setters);
  settersRef.current = setters;
  const [handoffReady, setHandoffReady] = useState(false);
  const [preferences, setPreferences] = useState(readQrPreferences);
  useEffect(() => {
    const changed = () => setPreferences(readQrPreferences());
    window.addEventListener(QR_PREFERENCES_EVENT, changed);
    const controller = new AbortController();
    void drainQrHandoffs(settersRef.current, controller.signal).catch(() => undefined).finally(() => {
      if (!controller.signal.aborted) { changed(); setHandoffReady(true); }
    });
    return () => { controller.abort(); window.removeEventListener(QR_PREFERENCES_EVENT, changed); };
  }, []);

  useEffect(() => {
    if (!handoffReady || !userId || preferences?.mode === 'configuration'
      || (preferences?.accountUserId && preferences.accountUserId !== userId)) return;
    const controller = new AbortController();
    const { signal } = controller;
    let revision = 0;
    let baseline = '';
    let preservedAppearance: QrConfiguration['appearance'] | null = null;
    let ready = false;
    let queued = Promise.resolve();
    let localPending = false;
    let remotePending = false;
    let notifiedRevision = 0;
    const enqueue = (action: () => Promise<void>) => {
      queued = queued.then(async () => { if (!signal.aborted) await action(); }).catch(() => undefined);
    };
    const applyLatest = async () => {
      const current = await readAccountSettings(signal);
      if (!current || current.revision <= revision || signal.aborted) return;
      preservedAppearance = current.configuration.appearance;
      applyQrConfiguration(current.configuration, settersRef.current);
      revision = current.revision;
      baseline = JSON.stringify(collectQrConfiguration());
    };
    const publish = async () => {
      const configuration = collectQrConfiguration();
      const serialized = JSON.stringify(configuration);
      if (ready && serialized === baseline) return;
      try {
        // Layout edits keep historical server metadata; only the effective palette is fixed.
        const saved = await writeAccountSettings(revision, preservedAppearance
          ? { ...configuration, appearance: preservedAppearance } : configuration, signal);
        preservedAppearance = saved.configuration.appearance;
        revision = saved.revision;
        baseline = serialized;
        ready = true;
      } catch (error) {
        if (isObject(error) && error.status === 409) {
          // Keep this local edit; retry against the newest revision on the next tick.
          const latest = await readAccountSettings(signal);
          if (latest) {
            revision = latest.revision;
            preservedAppearance = latest.configuration.appearance;
          }
        }
        throw error;
      }
    };
    const initialize = async () => {
      const current = await readAccountSettings(signal);
      if (signal.aborted) return;
      if (current) {
        preservedAppearance = current.configuration.appearance;
        applyQrConfiguration(current.configuration, settersRef.current);
        revision = current.revision;
        baseline = JSON.stringify(collectQrConfiguration());
        ready = true;
      } else await publish();
    };
    const tick = () => {
      if (localPending) return;
      localPending = true;
      enqueue(async () => {
        try {
          if (!ready) await initialize();
          else if (notifiedRevision > revision && JSON.stringify(collectQrConfiguration()) === baseline) await applyLatest();
          else await publish();
        }
        finally { localPending = false; }
      });
    };
    tick();
    const interval = setInterval(tick, 500);
    // Notifications are pushed by the server; the tick also retries a revision already notified.
    const stream = async () => {
      while (!signal.aborted) {
        try {
          await watchAccountSettings(signal, (next) => {
            notifiedRevision = Math.max(notifiedRevision, next);
            if (next <= revision || remotePending) return;
            remotePending = true;
            enqueue(async () => {
              try {
                if (!ready) await initialize();
                else if (JSON.stringify(collectQrConfiguration()) === baseline) await applyLatest();
                else await publish();
              } finally { remotePending = false; }
            });
          });
        } catch { /* A reconnect's first event carries the current revision. */ }
        if (!signal.aborted) await new Promise<void>((resolve) => {
          const aborted = () => { clearTimeout(timeout); resolve(); };
          const timeout = setTimeout(() => { signal.removeEventListener('abort', aborted); resolve(); }, 2000);
          signal.addEventListener('abort', aborted, { once: true });
        });
      }
    };
    void stream();
    return () => { clearInterval(interval); controller.abort(); };
  }, [handoffReady, userId, preferences?.mode, preferences?.accountUserId]);
}
