import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthData } from 'home-assistant-js-websocket';
import { backendRequest } from '@/api/backendClient';
import { getClientId, getHassUrl } from '@/api/haUrl';
import {
  LEGACY_ADDRESS_KEYS,
  createSessionAuth,
  forgetLegacyConnection,
  hasSessionTokens,
  hasStoredCredentials,
  loadSessionTokens,
  persistSessionTokens,
  readAccessMethod,
  readKioskToken,
  revokeSession,
} from '@/api/haSession';
import { loadTokens, saveTokens } from '@/api/oauthStorage';

/**
 * REP-20261007-002, corsia accesso: token della sessione salvati con oauthStorage e legati al
 * proxy, rinnovo e revoca con l'Auth di HAWS sullo stesso hassUrl, pulizia degli indirizzi di
 * Home Assistant salvati da Tunet. Home Assistant è finto (fetch finto).
 */

const OAUTH_SLOT = 'tunet_auth_cache_v1';

function sessionTokens(overrides: Partial<AuthData> = {}): AuthData {
  return {
    hassUrl: getHassUrl(),
    clientId: getClientId(),
    access_token: 'accesso-1',
    refresh_token: 'rinnovo-1',
    expires_in: 1800,
    expires: Date.now() + 1_800_000,
    ...overrides,
  };
}

interface Seen {
  url: string;
  method: string;
  form: Record<string, string>;
  headers: Record<string, string>;
}

/** Fetch finto: registra le richieste e risponde come il proxy di Home Assistant. */
function stubFetch(reply: (seen: Seen) => { status?: number; body?: unknown } = () => ({})) {
  const seen: Seen[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const body = init.body;
    const form: Record<string, string> = {};
    if (body instanceof FormData) {
      body.forEach((value, key) => {
        form[key] = String(value);
      });
    } else if (typeof body === 'string' && !body.startsWith('{')) {
      new URLSearchParams(body).forEach((value, key) => {
        form[key] = value;
      });
    }
    const headers: Record<string, string> = {};
    new Headers(init.headers).forEach((value, key) => {
      headers[key] = value;
    });
    const entry = { url: String(input), method: init.method ?? 'GET', form, headers };
    seen.push(entry);
    const { status = 200, body: replyBody = {} } = reply(entry);
    return new Response(JSON.stringify(replyBody), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return seen;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sessione legata al proxy', () => {
  it('usa solo i token completi ottenuti per l’hassUrl del proxy', () => {
    expect(loadSessionTokens()).toBeNull();
    saveTokens(sessionTokens());
    expect(loadSessionTokens()).toMatchObject({ access_token: 'accesso-1', hassUrl: getHassUrl() });
    expect(hasSessionTokens()).toBe(true);

    saveTokens(sessionTokens({ hassUrl: 'http://homeassistant.local:8123' }));
    expect(loadSessionTokens()).toBeNull();
    saveTokens({ access_token: 'solo-accesso' });
    expect(loadSessionTokens()).toBeNull();
  });

  it('rinnova il token con HAWS su <hassUrl>/auth/token e salva il risultato', async () => {
    saveTokens(sessionTokens({ expires: Date.now() - 1000 }));
    const seen = stubFetch(() => ({
      body: { access_token: 'accesso-2', token_type: 'Bearer', expires_in: 1800 },
    }));
    const auth = createSessionAuth();
    expect(auth?.expired).toBe(true);
    await auth?.refreshAccessToken();

    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe(`${getHassUrl()}/auth/token`);
    expect(seen[0].method).toBe('POST');
    expect(seen[0].form).toEqual({
      client_id: getClientId(),
      grant_type: 'refresh_token',
      refresh_token: 'rinnovo-1',
    });
    expect(loadTokens()).toMatchObject({
      access_token: 'accesso-2',
      refresh_token: 'rinnovo-1',
      hassUrl: getHassUrl(),
    });
  });

  it('revoca il token di rinnovo su <hassUrl>/auth/revoke; gli errori non bloccano', async () => {
    const seen = stubFetch();
    await expect(revokeSession(sessionTokens())).resolves.toBe(true);
    expect(seen[0]).toMatchObject({
      url: `${getHassUrl()}/auth/revoke`,
      method: 'POST',
      form: { token: 'rinnovo-1' },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      })
    );
    await expect(revokeSession(sessionTokens())).resolves.toBe(false);
    await expect(revokeSession(null)).resolves.toBe(false);
  });

  it('dopo una revoca di HAWS (null) non resta nulla nello storage', () => {
    saveTokens(sessionTokens());
    persistSessionTokens(null);
    expect(localStorage.getItem(OAUTH_SLOT)).toBeNull();
    expect(sessionStorage.getItem(OAUTH_SLOT)).toBeNull();
  });
});

describe('metodo e token a lunga durata', () => {
  it('legge il metodo salvato e deduce il token di un kiosk configurato da Tunet', () => {
    expect(readAccessMethod()).toBe('oauth');
    localStorage.setItem('ha_auth_method', 'token');
    expect(readAccessMethod()).toBe('token');
    localStorage.clear();
    sessionStorage.setItem('ha_token', 'token-kiosk');
    expect(readAccessMethod()).toBe('token');
    expect(readKioskToken()).toBe('token-kiosk');
    expect(localStorage.getItem('ha_token')).toBe('token-kiosk');
    expect(sessionStorage.getItem('ha_token')).toBeNull();
  });

  it('ha credenziali solo con il token del kiosk o una sessione valida', () => {
    expect(hasStoredCredentials()).toBe(false);
    localStorage.setItem('ha_auth_method', 'token');
    expect(hasStoredCredentials()).toBe(false);
    localStorage.setItem('ha_token', 'token-kiosk');
    expect(hasStoredCredentials()).toBe(true);
    localStorage.clear();
    saveTokens(sessionTokens());
    expect(hasStoredCredentials()).toBe(true);
  });
});

describe('nessun indirizzo di Home Assistant nel browser', () => {
  it('rimuove gli indirizzi di Tunet e i token ottenuti per un altro indirizzo', () => {
    stubFetch();
    localStorage.setItem('ha_url', 'http://homeassistant.local:8123');
    localStorage.setItem('ha_fallback_url', 'https://casa.duckdns.org');
    sessionStorage.setItem('ha_url', 'http://homeassistant.local:8123');
    saveTokens(sessionTokens({ hassUrl: 'http://homeassistant.local:8123' }));

    forgetLegacyConnection();

    for (const key of LEGACY_ADDRESS_KEYS) {
      expect(localStorage.getItem(key)).toBeNull();
      expect(sessionStorage.getItem(key)).toBeNull();
    }
    expect(localStorage.getItem(OAUTH_SLOT)).toBeNull();
    const stored = Object.keys(localStorage).map((key) => localStorage.getItem(key) ?? '');
    expect(stored.join('|')).not.toMatch(/8123|duckdns/);
  });

  it('mantiene la sessione ottenuta attraverso il proxy', () => {
    const seen = stubFetch();
    saveTokens(sessionTokens());
    forgetLegacyConnection();
    expect(loadSessionTokens()).toMatchObject({ refresh_token: 'rinnovo-1' });
    expect(seen).toEqual([]);
  });

  it('SR-6: revoca i token del vecchio collegamento sul loro hassUrl, poi li cancella', async () => {
    const seen = stubFetch();
    saveTokens(
      sessionTokens({
        hassUrl: 'http://homeassistant.local:8123',
        refresh_token: 'rinnovo-diretto',
      })
    );

    forgetLegacyConnection();

    // Cancellati subito: l'avvio non aspetta la revoca.
    expect(localStorage.getItem(OAUTH_SLOT)).toBeNull();
    expect(sessionStorage.getItem(OAUTH_SLOT)).toBeNull();
    await vi.waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0]).toMatchObject({
      url: 'http://homeassistant.local:8123/auth/revoke',
      method: 'POST',
      form: { token: 'rinnovo-diretto' },
    });
  });

  it('SR-6: una revoca fallita o senza risposta non blocca l’avvio e non mostra errori', async () => {
    const failing = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    vi.stubGlobal('fetch', failing);
    saveTokens(sessionTokens({ hassUrl: 'http://homeassistant.local:8123' }));
    expect(() => forgetLegacyConnection()).not.toThrow();
    expect(loadTokens()).toBeUndefined();
    await vi.waitFor(() => expect(failing).toHaveBeenCalledOnce());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(console.error).not.toHaveBeenCalled();

    const pending = vi.fn(() => new Promise<Response>(() => undefined));
    vi.stubGlobal('fetch', pending);
    saveTokens(sessionTokens({ hassUrl: 'http://homeassistant.local:8123' }));
    forgetLegacyConnection();
    expect(pending).toHaveBeenCalledOnce();
    expect(loadTokens()).toBeUndefined();
  });

  it('SR-6: senza token di rinnovo o senza indirizzo non tenta la revoca', () => {
    const seen = stubFetch();
    saveTokens({ access_token: 'solo-accesso', refresh_token: 'senza-indirizzo' });
    forgetLegacyConnection();
    saveTokens({ hassUrl: 'http://homeassistant.local:8123', access_token: 'senza-rinnovo' });
    forgetLegacyConnection();
    expect(seen).toEqual([]);
    expect(loadTokens()).toBeUndefined();
  });

  it('il backend riceve solo il token, senza x-ha-url né x-ha-fallback-url', async () => {
    localStorage.setItem('ha_url', 'http://homeassistant.local:8123');
    localStorage.setItem('ha_fallback_url', 'https://casa.duckdns.org');
    localStorage.setItem('ha_auth_method', 'oauth');
    saveTokens(sessionTokens());
    const seen = stubFetch(() => ({ body: [] }));

    await backendRequest('/profiles?ha_user_id=u1');

    expect(seen[0].url).toBe('./api/profiles?ha_user_id=u1');
    expect(seen[0].headers.authorization).toBe('Bearer accesso-1');
    expect(seen[0].headers).not.toHaveProperty('x-ha-url');
    expect(seen[0].headers).not.toHaveProperty('x-ha-fallback-url');
  });
});
