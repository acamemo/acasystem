import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  ERR_INVALID_AUTH,
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  type Auth,
  type Connection,
  type HassEntities,
} from 'home-assistant-js-websocket';
import type {
  EntityMap,
  HomeAssistantContextValue,
  HomeAssistantMetaValue,
  HomeAssistantProviderProps,
} from '@/@types/dashboard';
import type { HaConfig, HaUser } from '@/@types/ha';
import { clearOAuthTokens } from '@/api/oauthStorage';
import { HOME_ASSISTANT_API_UNAUTHORIZED_EVENT, setOAuthAuthProvider } from '@/api/apiAuth';
import { getDeviceRegistry, getEntityRegistry } from '@/api/haClient';
import { createSessionAuth } from '@/api/haSession';
import { getHassUrl } from '@/api/haUrl';
import { useMobileConnectionRecovery } from '@/hooks/useMobileConnectionRecovery';
import {
  buildRegistryLookupMap,
  enrichEntitiesWithRegistryMetadata,
  getConnectionWarningDelayMs,
  isEntityDataStale,
} from '@/utils';
import type { RegistryLookupMap } from '@/utils/entityRegistryMetadata';
import { errorMessage as readErrorMessage, isObject, readKey } from '@/validators/guards';
import { sanitizeEntityMap, toHaConfig, toHaUser } from '@/validators/haEntities';

export type { HomeAssistantContextValue, HomeAssistantMetaValue, HomeAssistantProviderProps };

const ENTITY_CACHE_KEY = 'tunet_entity_snapshot';
const ENTITY_CACHE_MAX_AGE_MS = 5 * 60_000; // 5 minutes — stale snapshots are discarded

/** Read cached entity snapshot from sessionStorage (returns {} if absent/expired). */
function loadCachedEntities(): EntityMap {
  try {
    const raw = globalThis.sessionStorage.getItem(ENTITY_CACHE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed)) return {};
    const { ts, data } = parsed;
    if (Date.now() - Number(ts) > ENTITY_CACHE_MAX_AGE_MS) {
      globalThis.sessionStorage.removeItem(ENTITY_CACHE_KEY);
      return {};
    }
    return sanitizeEntityMap(data);
  } catch {
    return {};
  }
}

/** Persist entity snapshot to sessionStorage (best-effort, never throws). */
function saveCachedEntities(entities: EntityMap) {
  try {
    globalThis.sessionStorage.setItem(
      ENTITY_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), data: entities })
    );
  } catch {
    // Storage full / private mode — ignore silently
  }
}

const HomeAssistantEntitiesContext = createContext<EntityMap | null>(null);
const HomeAssistantMetaContext = createContext<HomeAssistantMetaValue | null>(null);

export const useHomeAssistantEntities = (): EntityMap => {
  const context = useContext(HomeAssistantEntitiesContext);
  if (!context) {
    throw new Error('useHomeAssistantEntities must be used within HomeAssistantProvider');
  }
  return context;
};

export const useHomeAssistantMeta = (): HomeAssistantMetaValue => {
  const context = useContext(HomeAssistantMetaContext);
  if (!context) {
    throw new Error('useHomeAssistantMeta must be used within HomeAssistantProvider');
  }
  return context;
};

export const useHomeAssistant = (): HomeAssistantContextValue => {
  const entities = useHomeAssistantEntities();
  const meta = useHomeAssistantMeta();
  return useMemo(() => ({ entities, ...meta }), [entities, meta]);
};

/**
 * Throttled state setter — batches rapid HA entity updates into a single
 * React render per animation frame, preventing full-tree re-renders on
 * every WebSocket message.
 */
function useThrottledEntities(): [EntityMap, (updatedEntities: EntityMap) => void] {
  const [entities, setEntities] = useState<EntityMap>(loadCachedEntities);
  const pendingRef = useRef<EntityMap | null>(null);
  const rafRef = useRef<number | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setEntitiesThrottled = useCallback((updatedEntities: EntityMap) => {
    pendingRef.current = updatedEntities;
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (pendingRef.current) {
          setEntities(pendingRef.current);
          // Debounce sessionStorage writes to once per 10 s
          if (saveTimerRef.current == null) {
            saveTimerRef.current = setTimeout(() => {
              saveTimerRef.current = null;
              if (pendingRef.current) saveCachedEntities(pendingRef.current);
            }, 10_000);
          }
        }
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (saveTimerRef.current != null) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return [entities, setEntitiesThrottled];
}

/** Classifica gli errori di comando HA attesi (comando assente o non autorizzato). */
const readCommandError = (err: unknown) => {
  const resultError = readKey(err, 'error') || err;
  return {
    code: readKey(resultError, 'code'),
    message: String(readKey(resultError, 'message') || '').toLowerCase(),
  };
};

export const HomeAssistantProvider = ({ children, config }: HomeAssistantProviderProps) => {
  const [entities, setEntities] = useThrottledEntities();
  const [entitiesLoaded, setEntitiesLoaded] = useState(false);
  const [connected, setConnected] = useState(false);
  const [haUnavailable, setHaUnavailable] = useState(false);
  const [haUnavailableVisible, setHaUnavailableVisible] = useState(false);
  const [oauthExpired, setOauthExpired] = useState(false);
  const [conn, setConn] = useState<Connection | null>(null);
  // Home Assistant is always reached through the Acasystem proxy (ADR-0009): images, camera
  // streams and history use this address too, through getEntityImageUrl.
  const [activeUrl] = useState(getHassUrl);
  const [haUser, setHaUser] = useState<HaUser | null>(null);
  const [haConfig, setHaConfig] = useState<HaConfig | null>(null);
  const [entityDataStale, setEntityDataStale] = useState(false);
  const [lastEntityUpdateAt, setLastEntityUpdateAt] = useState(0);
  const [disconnectedSince, setDisconnectedSince] = useState<number | null>(null);
  const authRef = useRef<Auth | null>(null);
  const connectionRef = useRef<Connection | null>(null);
  const unsubscribeEntitiesRef = useRef<(() => void) | null>(null);
  const connectAttemptRef = useRef(0);
  const rawEntitiesRef = useRef<EntityMap>(entities);
  const entityRegistryByIdRef = useRef<RegistryLookupMap>(new Map());
  const deviceRegistryByIdRef = useRef<RegistryLookupMap>(new Map());

  const markConnectionHealthy = useCallback(() => {
    setConnected(true);
    setHaUnavailable(false);
    setDisconnectedSince(null);
  }, []);

  const markConnectionRecovering = useCallback(() => {
    setConnected(false);
    setHaUnavailable(true);
    setDisconnectedSince((current) => current ?? Date.now());
  }, []);

  useMobileConnectionRecovery({
    conn,
    onHealthy: markConnectionHealthy,
    onRecovering: markConnectionRecovering,
  });

  const applyRegistryMetadata = useCallback(
    (nextEntities: EntityMap): EntityMap =>
      enrichEntitiesWithRegistryMetadata(
        nextEntities,
        entityRegistryByIdRef.current,
        deviceRegistryByIdRef.current
      ),
    []
  );

  const pushEntitySnapshot = useCallback(
    (nextEntities: EntityMap) => {
      rawEntitiesRef.current = nextEntities;
      setEntities(applyRegistryMetadata(nextEntities));
    },
    [applyRegistryMetadata, setEntities]
  );

  useEffect(() => {
    setOAuthAuthProvider(authRef);
    return () => {
      setOAuthAuthProvider(null);
    };
  }, [authRef]);

  const cleanupConnection = useCallback((closeConnection = true) => {
    if (typeof unsubscribeEntitiesRef.current === 'function') {
      try {
        unsubscribeEntitiesRef.current();
      } catch (err) {
        console.warn('[HA] Failed to unsubscribe entities:', err);
      }
      unsubscribeEntitiesRef.current = null;
    }

    if (closeConnection && connectionRef.current) {
      try {
        connectionRef.current.close();
      } catch (err) {
        console.warn('[HA] Failed to close connection:', err);
      }
      connectionRef.current = null;
    }
    setConn(null);
    entityRegistryByIdRef.current = new Map();
    deviceRegistryByIdRef.current = new Map();
  }, []);

  useEffect(() => {
    rawEntitiesRef.current = entities;
  }, [entities]);

  // Connect to Home Assistant through the Acasystem proxy, with the session of the Acasystem
  // login or the long-lived token. Without credentials nothing connects: the login page shows.
  useEffect(() => {
    const isToken = config.authMethod === 'token';
    const auth: Auth | null = isToken
      ? config.token
        ? createLongLivedTokenAuth(activeUrl, config.token)
        : null
      : createSessionAuth(activeUrl);

    if (!auth) {
      cleanupConnection();
      setConnected(false);
      setEntityDataStale(false);
      setDisconnectedSince(null);
      setLastEntityUpdateAt(0);
      return;
    }

    const attemptId = connectAttemptRef.current + 1;
    connectAttemptRef.current = attemptId;

    let connection: Connection | undefined;
    let cancelled = false;
    const isCurrentAttempt = () => !cancelled && connectAttemptRef.current === attemptId;

    setConnected(false);
    setEntitiesLoaded(false);
    cleanupConnection();
    setOauthExpired(false);
    setEntityDataStale(false);
    setDisconnectedSince(null);
    setLastEntityUpdateAt(0);

    /** Fetch the authenticated HA user after connecting */
    async function fetchCurrentUser(connInstance: Connection) {
      try {
        const user = await connInstance.sendMessagePromise<unknown>({ type: 'auth/current_user' });
        if (isCurrentAttempt() && user) {
          setHaUser(toHaUser(user));
        }
      } catch (err) {
        const { code: errorCode, message: errorMessage } = readCommandError(err);
        const isUnsupportedCommand =
          errorCode === 'unknown_command' ||
          errorCode === 'not_found' ||
          errorMessage.includes('unknown command') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('auth/current_user');

        if (isCurrentAttempt()) {
          setHaUser(null);
        }

        if (!isUnsupportedCommand) return;
      }
    }

    /** Fetch the HA system config (currency, units, etc.) */
    async function fetchHaConfig(connInstance: Connection) {
      try {
        const conf = await connInstance.sendMessagePromise<unknown>({ type: 'get_config' });
        if (isCurrentAttempt() && conf) {
          setHaConfig(toHaConfig(conf));
        }
      } catch (err) {
        const { code: errorCode, message: errorMessage } = readCommandError(err);
        const isUnsupportedCommand =
          errorCode === 'unknown_command' ||
          errorCode === 'not_found' ||
          errorCode === 'unauthorized' ||
          errorCode === 'forbidden' ||
          errorMessage.includes('unknown command') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('unauthorized') ||
          errorMessage.includes('forbidden') ||
          errorMessage.includes('get_config');

        if (isCurrentAttempt()) {
          setHaConfig(null);
        }

        if (!isUnsupportedCommand) return;
      }
    }

    async function fetchRegistryMetadata(connInstance: Connection) {
      try {
        const [deviceRegistry, entityRegistry] = await Promise.all([
          getDeviceRegistry(connInstance),
          getEntityRegistry(connInstance),
        ]);

        if (!isCurrentAttempt()) return;

        entityRegistryByIdRef.current = buildRegistryLookupMap(entityRegistry, 'entity_id');
        deviceRegistryByIdRef.current = buildRegistryLookupMap(deviceRegistry, 'id');

        if (rawEntitiesRef.current && Object.keys(rawEntitiesRef.current).length > 0) {
          setEntities(applyRegistryMetadata(rawEntitiesRef.current));
        }
      } catch (err) {
        const { code: errorCode, message: errorMessage } = readCommandError(err);
        const isExpectedRegistryError =
          errorCode === 'unknown_command' ||
          errorCode === 'not_found' ||
          errorCode === 'unauthorized' ||
          errorCode === 'forbidden' ||
          errorMessage.includes('unknown command') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('unauthorized') ||
          errorMessage.includes('forbidden') ||
          errorMessage.includes('entity_registry') ||
          errorMessage.includes('device_registry');

        if (!isExpectedRegistryError) {
          console.warn('[HA] Failed to load registry metadata:', err);
        }
      }
    }

    async function connect(sessionAuth: Auth) {
      try {
        const connInstance = await createConnection({ auth: sessionAuth });
        if (!isCurrentAttempt()) {
          connInstance.close();
          return;
        }
        connection = connInstance;
        connectionRef.current = connInstance;
        authRef.current = sessionAuth;
        setConn(connInstance);
        setConnected(true);
        setHaUnavailable(false);
        setDisconnectedSince(null);
        fetchHaConfig(connInstance);
        fetchCurrentUser(connInstance);
        fetchRegistryMetadata(connInstance);
        const unsub = subscribeEntities(connInstance, (updatedEntities: HassEntities) => {
          if (isCurrentAttempt()) {
            pushEntitySnapshot(updatedEntities);
            setEntitiesLoaded(true);
            setLastEntityUpdateAt(Date.now());
            setEntityDataStale(false);
          }
        });
        unsubscribeEntitiesRef.current = typeof unsub === 'function' ? unsub : null;
      } catch (err) {
        console.error('[HA] Connection failed:', err);
        if (!isCurrentAttempt()) return;

        // The session was refused (revoked or expired refresh token): forget it and ask to
        // sign in again. A refused long-lived token stays: the kiosk shows it is unreachable.
        const invalidAuth =
          err === ERR_INVALID_AUTH || Boolean(readErrorMessage(err)?.includes('INVALID_AUTH'));
        if (!isToken && invalidAuth) {
          clearOAuthTokens();
          setOauthExpired(true);
        }
        setConnected(false);
        setHaUnavailable(true);
        setDisconnectedSince(Date.now());
      }
    }

    void connect(auth);
    return () => {
      cancelled = true;
      if (connection) {
        try {
          connection.close();
        } catch {}
      }
      cleanupConnection();
    };
  }, [
    activeUrl,
    config.token,
    config.authMethod,
    cleanupConnection,
    setEntities,
    applyRegistryMetadata,
    pushEntitySnapshot,
  ]);

  // Handle connection events
  useEffect(() => {
    if (!conn) return;
    let cancelled = false;

    const handleReady = () => {
      if (!cancelled) markConnectionHealthy();
    };
    const handleDisconnected = () => {
      if (!cancelled) markConnectionRecovering();
    };

    conn.addEventListener?.('ready', handleReady);
    conn.addEventListener?.('disconnected', handleDisconnected);

    return () => {
      cancelled = true;
      conn.removeEventListener?.('ready', handleReady);
      conn.removeEventListener?.('disconnected', handleDisconnected);
    };
  }, [conn, markConnectionHealthy, markConnectionRecovering]);

  useEffect(() => {
    const updateStaleState = () => {
      setEntityDataStale(
        isEntityDataStale({
          entitiesLoaded,
          connected,
          disconnectedSince,
          lastEntityUpdateAt,
        })
      );
    };

    updateStaleState();
    const timer = setInterval(updateStaleState, 5_000);
    return () => clearInterval(timer);
  }, [entitiesLoaded, connected, disconnectedSince, lastEntityUpdateAt]);

  // Delay connection warnings, and restart the grace period when a mobile app resumes.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleWarning = () => {
      if (timer) clearTimeout(timer);

      if (!haUnavailable) {
        setHaUnavailableVisible(false);
        return;
      }

      if (oauthExpired) {
        setHaUnavailableVisible(true);
        return;
      }

      setHaUnavailableVisible(false);
      const viewportWidth = globalThis.window?.innerWidth ?? Number.POSITIVE_INFINITY;
      timer = setTimeout(
        () => setHaUnavailableVisible(true),
        getConnectionWarningDelayMs(viewportWidth)
      );
    };

    scheduleWarning();

    const handleVisibilityChange = () => {
      if (globalThis.document?.visibilityState === 'visible') scheduleWarning();
    };
    globalThis.document?.addEventListener('visibilitychange', handleVisibilityChange);
    globalThis.window?.addEventListener('pageshow', handleVisibilityChange);

    return () => {
      if (timer) clearTimeout(timer);
      globalThis.document?.removeEventListener('visibilitychange', handleVisibilityChange);
      globalThis.window?.removeEventListener('pageshow', handleVisibilityChange);
    };
  }, [haUnavailable, oauthExpired]);

  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return undefined;

    const handleUnauthorized = (event: Event) => {
      const authMethod = readKey(readKey(event, 'detail'), 'authMethod') || 'oauth';
      setHaUnavailable(true);
      setDisconnectedSince(Date.now());
      if (authMethod === 'oauth') {
        setOauthExpired(true);
      }
    };

    globalThis.window.addEventListener(HOME_ASSISTANT_API_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => {
      globalThis.window.removeEventListener(
        HOME_ASSISTANT_API_UNAUTHORIZED_EVENT,
        handleUnauthorized
      );
    };
  }, []);

  const metaValue = useMemo<HomeAssistantMetaValue>(
    () => ({
      entitiesLoaded,
      connected,
      haUnavailable,
      haUnavailableVisible,
      oauthExpired,
      conn,
      activeUrl,
      haConfig,
      entityDataStale,
      lastEntityUpdateAt,
      disconnectedSince,
      authRef,
      haUser,
    }),
    [
      entitiesLoaded,
      connected,
      haUnavailable,
      haUnavailableVisible,
      oauthExpired,
      conn,
      activeUrl,
      haConfig,
      entityDataStale,
      lastEntityUpdateAt,
      disconnectedSince,
      haUser,
    ]
  );

  return (
    <HomeAssistantMetaContext.Provider value={metaValue}>
      <HomeAssistantEntitiesContext.Provider value={entities}>
        {children}
      </HomeAssistantEntitiesContext.Provider>
    </HomeAssistantMetaContext.Provider>
  );
};
