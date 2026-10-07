import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type {
  CurrentSettingsRecord,
  SettingsDeviceRecord,
  SettingsHistoryRecord,
} from '@/@types/api';
import type { SnapshotContextSetters } from '@/@types/snapshot';
import {
  fetchCurrentSettings as apiFetchCurrentSettings,
  fetchSettingsHistory as apiFetchSettingsHistory,
  deleteSettingsHistory as apiDeleteSettingsHistory,
  deleteSettingsDevice as apiDeleteSettingsDevice,
  updateSettingsDeviceLabel as apiUpdateSettingsDeviceLabel,
  saveCurrentSettings as apiSaveCurrentSettings,
  fetchCurrentDevices as apiFetchCurrentDevices,
  publishCurrentSettings as apiPublishCurrentSettings,
} from '@/api/settingsApi';
import type { BackendRequestInit } from '@/api/backendClient';
import { collectSnapshot, applySnapshot, isValidSnapshot } from '@/api/snapshot';
import { errorMessage, readKey } from '@/validators/guards';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'conflict' | 'error';

interface ApplyServerRowOptions {
  forceServerRevision?: number | null;
  localSerializedOverride?: string;
}

interface PushOptions {
  force?: boolean;
  fetchOptions?: BackendRequestInit;
}

interface QueueOptions {
  ignoreEnabled?: boolean;
  ignoreSuspended?: boolean;
}

export interface SettingsSyncOptions {
  haUserId: string | null | undefined;
  contextSettersRef: MutableRefObject<SnapshotContextSetters | null | undefined> | null | undefined;
  autoBootstrap?: boolean;
}

/** Stato HTTP di un errore del backend, così com'è. */
const statusOf = (error: unknown): unknown => readKey(error, 'status');
/** Revisione indicata dal backend in caso di conflitto (409). */
const conflictRevisionOf = (error: unknown): unknown => readKey(readKey(error, 'body'), 'revision');

const createDeviceId = (): string => {
  const webCrypto = globalThis.window?.crypto ?? globalThis.crypto;
  if (webCrypto && typeof webCrypto.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }

  if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    webCrypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
    return `device_${hex}`;
  }

  const epoch = Date.now().toString(36);
  const perfNow = Math.trunc(globalThis.performance?.now?.() || 0).toString(36);
  return `device_${epoch}_${perfNow}`;
};

const getOrCreateDeviceId = (): string => {
  const key = 'tunet_device_id';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const next = createDeviceId();
    localStorage.setItem(key, next);
    return next;
  } catch {
    return createDeviceId();
  }
};

const clampHistoryKeepLimit = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(Math.max(Math.trunc(parsed), 5), 500);
};

const getStoredDeviceLabel = (): string => {
  try {
    return (localStorage.getItem('tunet_device_label') || '').trim();
  } catch {
    return '';
  }
};

const READ_CURRENT_FAILED = Symbol('READ_CURRENT_FAILED');
const isServiceUnavailableError = (error: unknown) => Number(statusOf(error)) === 503;

export function useSettingsSync({
  haUserId,
  contextSettersRef,
  autoBootstrap = true,
}: SettingsSyncOptions) {
  const deviceIdRef = useRef(getOrCreateDeviceId());
  const deviceLabelRef = useRef(getStoredDeviceLabel());
  const [enabled, setEnabled] = useState(() => {
    try {
      const raw = localStorage.getItem('tunet_auto_sync_enabled');
      return raw == null ? true : raw !== '0';
    } catch {
      return true;
    }
  });
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [error, setError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [currentRevision, setCurrentRevisionState] = useState<number | null>(null);
  const [knownDevices, setKnownDevices] = useState<SettingsDeviceRecord[]>([]);
  const [history, setHistory] = useState<SettingsHistoryRecord[]>([]);
  const [backgroundSyncSuspended, setBackgroundSyncSuspendedState] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [removingDeviceId, setRemovingDeviceId] = useState('');
  const [updatingDeviceId, setUpdatingDeviceId] = useState('');
  const [historyKeepLimit, setHistoryKeepLimit] = useState(() => {
    try {
      const raw = localStorage.getItem('tunet_history_keep_limit');
      return clampHistoryKeepLimit(raw ?? 50);
    } catch {
      return 50;
    }
  });

  const autoSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncInFlightRef = useRef(false);
  const lastObservedHashRef = useRef('');
  const lastUploadedHashRef = useRef('');
  const pushCurrentToServerRef = useRef<
    ((options?: PushOptions) => Promise<CurrentSettingsRecord | null>) | null
  >(null);
  const backgroundSyncSuspendedRef = useRef(false);
  const currentRevisionRef = useRef<number | null>(null);

  const setCurrentRevision = useCallback((nextRevision: unknown) => {
    const normalized = Number.isFinite(Number(nextRevision)) ? Number(nextRevision) : null;
    currentRevisionRef.current = normalized;
    setCurrentRevisionState(normalized);
    return normalized;
  }, []);

  const setBackgroundSyncSuspended = useCallback((next: boolean) => {
    backgroundSyncSuspendedRef.current = next;
    setBackgroundSyncSuspendedState(next);
    if (next && autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current);
      autoSyncTimerRef.current = null;
    }
  }, []);

  const updateBackgroundSyncAvailability = useCallback(
    (isAvailable: boolean, error: unknown = null) => {
      if (isAvailable) {
        if (backgroundSyncSuspendedRef.current) {
          setBackgroundSyncSuspended(false);
        }
        return;
      }

      if (isServiceUnavailableError(error)) {
        setBackgroundSyncSuspended(true);
      }
    },
    [setBackgroundSyncSuspended]
  );

  useEffect(() => {
    try {
      localStorage.setItem('tunet_auto_sync_enabled', enabled ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  }, [enabled]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'tunet_history_keep_limit',
        String(clampHistoryKeepLimit(historyKeepLimit))
      );
    } catch {
      // ignore storage errors
    }
  }, [historyKeepLimit]);

  const refreshKnownDevices = useCallback(async () => {
    if (!haUserId) return;
    try {
      const rows = await apiFetchCurrentDevices(haUserId);
      updateBackgroundSyncAvailability(true);
      setKnownDevices(Array.isArray(rows) ? rows : []);
    } catch (error) {
      updateBackgroundSyncAvailability(false, error);
      // ignore device list errors
    }
  }, [haUserId, updateBackgroundSyncAvailability]);

  const refreshHistory = useCallback(async () => {
    if (!haUserId) return;
    try {
      const rows = await apiFetchSettingsHistory(haUserId, deviceIdRef.current, 30);
      updateBackgroundSyncAvailability(true);
      setHistory(Array.isArray(rows) ? rows : []);
    } catch (error) {
      updateBackgroundSyncAvailability(false, error);
      setHistory([]);
    }
  }, [haUserId, updateBackgroundSyncAvailability]);

  const readCurrentFromServer = useCallback(async (): Promise<
    CurrentSettingsRecord | null | typeof READ_CURRENT_FAILED
  > => {
    if (!haUserId) return null;
    try {
      const row = await apiFetchCurrentSettings(haUserId, deviceIdRef.current);
      updateBackgroundSyncAvailability(true);
      if (row && typeof row === 'object') {
        setCurrentRevision(Number.isFinite(Number(row.revision)) ? Number(row.revision) : null);
        if (typeof row.device_label === 'string') {
          deviceLabelRef.current = row.device_label.trim();
          try {
            localStorage.setItem('tunet_device_label', deviceLabelRef.current);
          } catch {
            // ignore storage errors
          }
        }
        const serialized = JSON.stringify(row.data || {});
        lastUploadedHashRef.current = serialized;
        lastObservedHashRef.current = serialized;
        setLastSyncedAt(row.updated_at || null);
        setStatus('synced');
      }
      return row;
    } catch (fetchError) {
      updateBackgroundSyncAvailability(false, fetchError);
      setStatus('error');
      setError(errorMessage(fetchError) || 'Failed to fetch current settings');
      return READ_CURRENT_FAILED;
    }
  }, [haUserId, setCurrentRevision, updateBackgroundSyncAvailability]);

  const applyServerRow = useCallback(
    async (row: CurrentSettingsRecord | null, options: ApplyServerRowOptions = {}) => {
      if (!row || typeof row !== 'object' || !Number.isFinite(Number(row.revision))) return false;

      const forcedServerRevision = Number.isFinite(Number(options.forceServerRevision))
        ? Number(options.forceServerRevision)
        : null;
      const serverRevision = Number(row.revision);
      const localRevision = Number.isFinite(Number(currentRevisionRef.current))
        ? Number(currentRevisionRef.current)
        : 0;
      if (forcedServerRevision !== null && serverRevision < forcedServerRevision) return false;
      if (forcedServerRevision === null && serverRevision <= localRevision) return false;

      let localSerialized =
        typeof options.localSerializedOverride === 'string' ? options.localSerializedOverride : '';
      if (!localSerialized) {
        try {
          const snapshot = collectSnapshot();
          if (isValidSnapshot(snapshot)) {
            localSerialized = JSON.stringify(snapshot);
          }
        } catch {
          localSerialized = '';
        }
      }

      const hasKnownBaseline = Boolean(lastUploadedHashRef.current);
      if (hasKnownBaseline && localSerialized && localSerialized !== lastUploadedHashRef.current) {
        return false;
      }

      if (!row.data || typeof row.data !== 'object') return false;
      applySnapshot(row.data, contextSettersRef?.current || {});

      const serialized = JSON.stringify(row.data || {});
      lastUploadedHashRef.current = serialized;
      lastObservedHashRef.current = serialized;
      setCurrentRevision(serverRevision);
      setLastSyncedAt(row.updated_at || null);
      setStatus('synced');
      setError('');
      await refreshHistory();
      return true;
    },
    [contextSettersRef, refreshHistory, setCurrentRevision]
  );

  const reconcileFromServer = useCallback(
    async (options: ApplyServerRowOptions = {}) => {
      if (!haUserId) return false;

      const forcedServerRevision = Number.isFinite(Number(options.forceServerRevision))
        ? Number(options.forceServerRevision)
        : null;

      try {
        const row = await apiFetchCurrentSettings(haUserId, deviceIdRef.current);
        updateBackgroundSyncAvailability(true);
        return applyServerRow(row, { ...options, forceServerRevision: forcedServerRevision });
      } catch (error) {
        updateBackgroundSyncAvailability(false, error);
        // ignore reconciliation errors
        return false;
      }
    },
    [haUserId, applyServerRow, updateBackgroundSyncAvailability]
  );

  const pushCurrentToServer = useCallback(
    async (options: PushOptions = {}): Promise<CurrentSettingsRecord | null> => {
      if (!haUserId) return null;

      const snapshot = collectSnapshot();
      if (!isValidSnapshot(snapshot)) {
        const validationError = new Error('Invalid snapshot data');
        setStatus('error');
        setError(validationError.message);
        throw validationError;
      }

      const serialized = JSON.stringify(snapshot);
      if (!options.force && serialized === lastUploadedHashRef.current) {
        return null;
      }

      setStatus('syncing');
      setError('');

      const saveSnapshot = (baseRevision: number | null) =>
        apiSaveCurrentSettings(
          {
            ha_user_id: haUserId,
            device_id: deviceIdRef.current,
            data: snapshot,
            base_revision: baseRevision,
            history_keep_limit: clampHistoryKeepLimit(historyKeepLimit),
            device_label: deviceLabelRef.current || undefined,
          },
          options.fetchOptions || {}
        );

      const markSaveSynced = async (response: CurrentSettingsRecord | null) => {
        const resolvedRevision = Number.isFinite(Number(response?.revision))
          ? Number(response?.revision)
          : currentRevisionRef.current;
        setCurrentRevision(resolvedRevision);
        setLastSyncedAt(response?.updated_at || new Date().toISOString());
        setStatus('synced');
        setError('');
        lastUploadedHashRef.current = serialized;
        lastObservedHashRef.current = serialized;
        await refreshKnownDevices();
        await refreshHistory();
        return response;
      };

      try {
        const response = await saveSnapshot(currentRevisionRef.current);

        updateBackgroundSyncAvailability(true);
        return markSaveSynced(response);
      } catch (saveError) {
        if (statusOf(saveError) === 409 && Number.isFinite(Number(conflictRevisionOf(saveError)))) {
          const conflictRevision = Number(conflictRevisionOf(saveError));
          setCurrentRevision(conflictRevision);
          setStatus('conflict');
          setError('Revision conflict');
          const hasLocalChanges =
            !lastUploadedHashRef.current || serialized !== lastUploadedHashRef.current;

          if (!hasLocalChanges) {
            const appliedServer = await reconcileFromServer({
              forceServerRevision: conflictRevision,
              localSerializedOverride: serialized,
            });
            if (appliedServer) return null;
          }

          try {
            const response = await saveSnapshot(conflictRevision);
            updateBackgroundSyncAvailability(true);
            return markSaveSynced(response);
          } catch (retryError) {
            if (
              statusOf(retryError) === 409 &&
              Number.isFinite(Number(conflictRevisionOf(retryError)))
            ) {
              setCurrentRevision(Number(conflictRevisionOf(retryError)));
              setStatus('conflict');
              setError('Revision conflict');
            } else {
              setStatus('error');
              setError(errorMessage(retryError) || 'Failed to sync settings');
            }
            updateBackgroundSyncAvailability(false, retryError);
            throw retryError;
          }
        } else {
          setStatus('error');
          setError(errorMessage(saveError) || 'Failed to sync settings');
        }
        updateBackgroundSyncAvailability(false, saveError);
        throw saveError;
      }
    },
    [
      haUserId,
      historyKeepLimit,
      reconcileFromServer,
      refreshKnownDevices,
      refreshHistory,
      setCurrentRevision,
      updateBackgroundSyncAvailability,
    ]
  );

  pushCurrentToServerRef.current = pushCurrentToServer;

  const queueAutoSync = useCallback(
    (force = false, { ignoreEnabled = false, ignoreSuspended = false }: QueueOptions = {}) => {
      if ((!enabled && !ignoreEnabled) || !haUserId) return;
      if (backgroundSyncSuspendedRef.current && !ignoreSuspended) return;

      const snapshot = collectSnapshot();
      if (!isValidSnapshot(snapshot)) return;
      const serialized = JSON.stringify(snapshot);

      if (!force && serialized === lastObservedHashRef.current) return;
      lastObservedHashRef.current = serialized;

      if (autoSyncTimerRef.current) clearTimeout(autoSyncTimerRef.current);
      autoSyncTimerRef.current = setTimeout(
        async () => {
          if (syncInFlightRef.current) return;
          syncInFlightRef.current = true;
          try {
            await pushCurrentToServer({ force });
          } catch {
            // state already handled
          } finally {
            syncInFlightRef.current = false;
          }
        },
        force ? 0 : 3500
      );
    },
    [enabled, haUserId, pushCurrentToServer]
  );

  useEffect(() => {
    if (!autoBootstrap || !haUserId || backgroundSyncSuspended) return;
    let disposed = false;

    const bootstrap = async () => {
      const row = await readCurrentFromServer();
      if (disposed) return;

      if (row === READ_CURRENT_FAILED) {
        if (!backgroundSyncSuspendedRef.current) {
          await refreshKnownDevices();
          await refreshHistory();
        }
        return;
      }

      if (!row) {
        try {
          await pushCurrentToServerRef.current?.({ force: true });
        } catch {
          // ignore bootstrap errors
        }
      }

      if (disposed || backgroundSyncSuspendedRef.current) return;
      await refreshKnownDevices();
      await refreshHistory();
    };

    bootstrap();
    return () => {
      disposed = true;
    };
  }, [
    autoBootstrap,
    haUserId,
    backgroundSyncSuspended,
    readCurrentFromServer,
    refreshKnownDevices,
    refreshHistory,
  ]);

  useEffect(() => {
    if (!autoBootstrap || !haUserId || backgroundSyncSuspended) return;
    const id = setInterval(() => {
      reconcileFromServer();
    }, 4000);
    return () => clearInterval(id);
  }, [autoBootstrap, haUserId, reconcileFromServer, backgroundSyncSuspended]);

  useEffect(() => {
    if (!haUserId || typeof globalThis.window === 'undefined') return undefined;

    const handleEditDone = () => {
      queueAutoSync(true, { ignoreEnabled: true });
    };

    globalThis.window.addEventListener('tunet:edit-done', handleEditDone);
    return () => {
      globalThis.window.removeEventListener('tunet:edit-done', handleEditDone);
    };
  }, [haUserId, queueAutoSync]);

  const loadCurrentFromServer = useCallback(
    async (revision?: unknown) => {
      const row = Number.isFinite(Number(revision))
        ? await apiFetchCurrentSettings(String(haUserId), deviceIdRef.current, Number(revision))
        : await readCurrentFromServer();
      if (row === READ_CURRENT_FAILED) return;
      if (!row?.data || typeof row.data !== 'object') return;

      if (Number.isFinite(Number(row.revision))) {
        setCurrentRevision(Number(row.revision));
      }
      if (row.updated_at) {
        setLastSyncedAt(row.updated_at);
      }

      applySnapshot(row.data, contextSettersRef?.current || {});
    },
    [haUserId, readCurrentFromServer, contextSettersRef, setCurrentRevision]
  );

  const publishCurrentToDevices = useCallback(
    async (targetDeviceIds?: unknown) => {
      if (!haUserId) return;
      setPublishing(true);
      setError('');
      try {
        await pushCurrentToServer({ force: true });

        const normalizedTargets = Array.isArray(targetDeviceIds)
          ? [
              ...new Set(
                targetDeviceIds
                  .filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
                  .map((id) => id.trim())
              ),
            ]
          : [];

        if (normalizedTargets.length === 0) {
          await apiPublishCurrentSettings({
            ha_user_id: haUserId,
            source_device_id: deviceIdRef.current,
            target_device_id: undefined,
            history_keep_limit: clampHistoryKeepLimit(historyKeepLimit),
          });
        } else {
          await Promise.all(
            normalizedTargets.map((targetDeviceId) =>
              apiPublishCurrentSettings({
                ha_user_id: haUserId,
                source_device_id: deviceIdRef.current,
                target_device_id: targetDeviceId,
                history_keep_limit: clampHistoryKeepLimit(historyKeepLimit),
              })
            )
          );
        }
        await refreshKnownDevices();
        await refreshHistory();
      } catch (publishError) {
        setStatus('error');
        setError(errorMessage(publishError) || 'Failed to publish settings');
        throw publishError;
      } finally {
        setPublishing(false);
      }
    },
    [haUserId, historyKeepLimit, pushCurrentToServer, refreshKnownDevices, refreshHistory]
  );

  const clearHistory = useCallback(async () => {
    if (!haUserId) return;
    setClearingHistory(true);
    setError('');
    try {
      await apiDeleteSettingsHistory(haUserId, deviceIdRef.current, true);
      await refreshHistory();
    } catch (historyError) {
      setStatus('error');
      setError(errorMessage(historyError) || 'Failed to clear revision history');
      throw historyError;
    } finally {
      setClearingHistory(false);
    }
  }, [haUserId, refreshHistory]);

  const removeKnownDevice = useCallback(
    async (targetDeviceId: string) => {
      if (!haUserId || !targetDeviceId) return;
      if (targetDeviceId === deviceIdRef.current) {
        const removeCurrentError = new Error('Cannot remove current device');
        setStatus('error');
        setError(removeCurrentError.message);
        throw removeCurrentError;
      }

      setRemovingDeviceId(targetDeviceId);
      setError('');
      try {
        await apiDeleteSettingsDevice(haUserId, targetDeviceId);
        await refreshKnownDevices();
      } catch (removeError) {
        setStatus('error');
        setError(errorMessage(removeError) || 'Failed to remove device');
        throw removeError;
      } finally {
        setRemovingDeviceId('');
      }
    },
    [haUserId, refreshKnownDevices]
  );

  const renameKnownDevice = useCallback(
    async (targetDeviceId: string, nextLabel: string) => {
      if (!haUserId || !targetDeviceId) return;

      setUpdatingDeviceId(targetDeviceId);
      setError('');
      try {
        await apiUpdateSettingsDeviceLabel(haUserId, targetDeviceId, nextLabel);
        if (targetDeviceId === deviceIdRef.current) {
          const normalized = typeof nextLabel === 'string' ? nextLabel.trim() : '';
          deviceLabelRef.current = normalized;
          try {
            localStorage.setItem('tunet_device_label', normalized);
          } catch {
            // ignore storage errors
          }
        }
        await refreshKnownDevices();
      } catch (renameError) {
        setStatus('error');
        setError(errorMessage(renameError) || 'Failed to rename device');
        throw renameError;
      } finally {
        setUpdatingDeviceId('');
      }
    },
    [haUserId, refreshKnownDevices]
  );

  return {
    enabled,
    setEnabled,
    status,
    error,
    backgroundSyncSuspended,
    lastSyncedAt,
    deviceId: deviceIdRef.current,
    currentRevision,
    knownDevices,
    history,
    publishing,
    clearingHistory,
    removingDeviceId,
    updatingDeviceId,
    historyKeepLimit,
    setHistoryKeepLimit,
    syncNow: () => queueAutoSync(true, { ignoreEnabled: true, ignoreSuspended: true }),
    loadCurrentFromServer,
    publishCurrentToDevices,
    clearHistory,
    removeKnownDevice,
    renameKnownDevice,
    refreshKnownDevices,
  };
}
