import { createHash } from 'node:crypto';
import { createConnection, createLongLivedTokenAuth } from 'home-assistant-js-websocket';
import { WebSocket as NodeWebSocket } from 'ws';
import type {
  HomeAssistantCredentials,
  HomeAssistantUser,
  HomeAssistantUserLoader,
} from '../@types/homeAssistant.ts';
import {
  readHomeAssistantAuthCacheTtlMs,
  readHomeAssistantInvalidAuthCacheTtlMs,
} from '../config/env.ts';
import { createCachedAuthError, isInvalidAuthError } from '../helpers/homeAssistantErrors.ts';
import { readProperty } from '../helpers/objects.ts';

/**
 * Verifica di un token presso Home Assistant via WebSocket (`auth/current_user`),
 * con cache per URL e hash del token: utenti validi per HA_AUTH_CACHE_TTL_MS, token
 * rifiutati per HA_INVALID_AUTH_CACHE_TTL_MS, errori di rete mai in cache.
 */

const DEFAULT_CACHE_TTL_MS = readHomeAssistantAuthCacheTtlMs();
const DEFAULT_INVALID_AUTH_CACHE_TTL_MS = readHomeAssistantInvalidAuthCacheTtlMs();
const MAX_CACHE_ENTRIES = 200;

// home-assistant-js-websocket uses the global WebSocket (native from Node 22).
if (typeof globalThis.WebSocket === 'undefined') {
  Reflect.set(globalThis, 'WebSocket', NodeWebSocket);
}

type CacheEntry =
  | { kind: 'user'; user: HomeAssistantUser; expiresAt: number }
  | { kind: 'error'; error: Error; expiresAt: number }
  | { kind: 'pending'; pendingPromise: Promise<HomeAssistantUser>; expiresAt: number };

const pruneCache = (cache: Map<string, CacheEntry>, now: number): void => {
  for (const [cacheKey, entry] of cache.entries()) {
    if (entry.expiresAt <= now && entry.kind !== 'pending') {
      cache.delete(cacheKey);
    }
  }

  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
};

export const loadCurrentUserFromHomeAssistant: HomeAssistantUserLoader = async ({
  haUrl,
  accessToken,
}) => {
  const auth = createLongLivedTokenAuth(haUrl, accessToken);
  const connection = await createConnection({ auth });

  try {
    const user = await connection.sendMessagePromise<unknown>({ type: 'auth/current_user' });
    const id = readProperty(user, 'id');
    if (!id || typeof id !== 'string') {
      throw new Error('Home Assistant did not return an authenticated user');
    }

    const name = readProperty(user, 'name');
    return {
      id,
      name: typeof name === 'string' ? name : '',
      is_admin: Boolean(readProperty(user, 'is_admin')),
      is_owner: Boolean(readProperty(user, 'is_owner')),
    };
  } finally {
    try {
      connection.close();
    } catch {
      // ignore close errors
    }
  }
};

export interface UserResolverOptions {
  cacheTtlMs?: number;
  invalidAuthCacheTtlMs?: number;
  loadCurrentUser?: HomeAssistantUserLoader;
}

export type HomeAssistantUserResolver = HomeAssistantUserLoader;

export const createValidatedHomeAssistantUserResolver = ({
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  invalidAuthCacheTtlMs = DEFAULT_INVALID_AUTH_CACHE_TTL_MS,
  loadCurrentUser = loadCurrentUserFromHomeAssistant,
}: UserResolverOptions = {}): HomeAssistantUserResolver => {
  const cache = new Map<string, CacheEntry>();

  return async ({ haUrl, accessToken }: HomeAssistantCredentials) => {
    const tokenHash = createHash('sha256').update(accessToken).digest('hex');
    const cacheKey = `${haUrl}::${tokenHash}`;
    const now = Date.now();
    const cached = cache.get(cacheKey);

    if (cached?.kind === 'user' && cached.expiresAt > now) {
      return cached.user;
    }

    if (cached?.kind === 'error' && cached.expiresAt > now) {
      throw cached.error;
    }

    if (cached?.kind === 'pending') {
      return cached.pendingPromise;
    }

    const pendingPromise = loadCurrentUser({ haUrl, accessToken })
      .then((user) => {
        const resolvedAt = Date.now();
        cache.set(cacheKey, {
          kind: 'user',
          user,
          expiresAt: resolvedAt + cacheTtlMs,
        });
        pruneCache(cache, resolvedAt);
        return user;
      })
      .catch((error: unknown) => {
        if (isInvalidAuthError(error)) {
          cache.set(cacheKey, {
            kind: 'error',
            error: createCachedAuthError(error),
            expiresAt: Date.now() + invalidAuthCacheTtlMs,
          });
        } else {
          cache.delete(cacheKey);
        }
        throw error;
      });

    cache.set(cacheKey, {
      kind: 'pending',
      pendingPromise,
      expiresAt: now + cacheTtlMs,
    });

    return pendingPromise;
  };
};

/** Resolver del processo: la cache è condivisa da tutte le app create con createApp. */
export const resolveValidatedHomeAssistantUser = createValidatedHomeAssistantUserResolver();
