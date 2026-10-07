// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHomeAssistantAuthMiddleware } from '../middlewares/homeAssistantAuth.ts';
import type { HomeAssistantAuthRequest } from '../middlewares/homeAssistantAuth.ts';
import type { JsonResponse } from '../middlewares/errors.ts';
import { createValidatedHomeAssistantUserResolver } from '../services/homeAssistantAuthService.ts';

const createRequest = (headers: Record<string, string> = {}): HomeAssistantAuthRequest => ({
  ip: headers.__ip,
  socket: { remoteAddress: headers.__remoteAddress },
  get(name: string) {
    return headers[name.toLowerCase()] ?? headers[name] ?? undefined;
  },
});

interface MockResponse extends JsonResponse {
  statusCode: number;
  body: unknown;
}

const createResponse = (): MockResponse => {
  const response: MockResponse = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };

  return response;
};

describe('createValidatedHomeAssistantUserResolver', () => {
  it('caches validated users by URL and token', async () => {
    const loadCurrentUser = vi.fn().mockResolvedValue({ id: 'user-1' });
    const resolveUser = createValidatedHomeAssistantUserResolver({
      cacheTtlMs: 60_000,
      loadCurrentUser,
    });

    await expect(
      resolveUser({ haUrl: 'https://ha.example', accessToken: 'token-1' })
    ).resolves.toEqual({ id: 'user-1' });
    await expect(
      resolveUser({ haUrl: 'https://ha.example', accessToken: 'token-1' })
    ).resolves.toEqual({ id: 'user-1' });

    expect(loadCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('caches invalid auth failures by URL and token to avoid repeated HA websocket attempts', async () => {
    const invalidAuthError = new Error('Invalid auth');
    const loadCurrentUser = vi.fn().mockRejectedValue(invalidAuthError);
    const resolveUser = createValidatedHomeAssistantUserResolver({
      cacheTtlMs: 60_000,
      invalidAuthCacheTtlMs: 60_000,
      loadCurrentUser,
    });

    await expect(
      resolveUser({ haUrl: 'https://ha.example', accessToken: 'bad-token' })
    ).rejects.toThrow('Invalid auth');
    await expect(
      resolveUser({ haUrl: 'https://ha.example', accessToken: 'bad-token' })
    ).rejects.toThrow('Invalid auth');

    expect(loadCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('does not cache non-auth failures', async () => {
    const loadCurrentUser = vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED'));
    const resolveUser = createValidatedHomeAssistantUserResolver({
      cacheTtlMs: 60_000,
      invalidAuthCacheTtlMs: 60_000,
      loadCurrentUser,
    });

    await expect(
      resolveUser({ haUrl: 'https://ha.example', accessToken: 'token-1' })
    ).rejects.toThrow('ECONNREFUSED');
    await expect(
      resolveUser({ haUrl: 'https://ha.example', accessToken: 'token-1' })
    ).rejects.toThrow('ECONNREFUSED');

    expect(loadCurrentUser).toHaveBeenCalledTimes(2);
  });
});

const ATTACKER_URL = 'http://attacker.example';
const ATTACKER_FALLBACK_URL = 'http://another-attacker.example';
const ATTACKER_URLS = [ATTACKER_URL, ATTACKER_FALLBACK_URL];
const VICTIM_USER = { id: 'victim-user-id', name: '', is_admin: false, is_owner: false };

const calledUrls = (validateHomeAssistantUser: ReturnType<typeof vi.fn>): unknown[] =>
  validateHomeAssistantUser.mock.calls.map(([credentials]) => credentials.haUrl);

describe('createHomeAssistantAuthMiddleware', () => {
  beforeEach(() => {
    vi.stubEnv('TUNET_INTERNAL_HA_URL', '');
    vi.stubEnv('TUNET_INTERNAL_HA_FALLBACK_URL', '');
    vi.stubEnv('TUNET_TRUST_SUPERVISOR_INGRESS', '');
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ['without server-configured HA URLs', ''],
    ['with a server-configured HA URL', 'https://ha.example'],
  ])(
    'trusts Supervisor ingress only when explicitly enabled and from its proxy, %s',
    async (_label, internalUrl) => {
      vi.stubEnv('TUNET_INTERNAL_HA_URL', internalUrl);
      vi.stubEnv('TUNET_TRUST_SUPERVISOR_INGRESS', '1');
      const validateHomeAssistantUser = vi.fn();
      const middleware = createHomeAssistantAuthMiddleware({
        validateHomeAssistantUser,
      });
      const req = createRequest({
        __ip: '::ffff:172.30.32.2',
        'x-ingress-path': '/api/hassio_ingress/abc123',
        'x-remote-user-id': 'ha-user-1',
        'x-remote-user-display-name': 'Living Room Tablet',
      });
      const res = createResponse();
      const next = vi.fn();
      await middleware(req, res, next);
      expect(validateHomeAssistantUser).not.toHaveBeenCalled();
      expect(req.authenticatedHaUser).toEqual({
        id: 'ha-user-1',
        name: 'Living Room Tablet',
        is_admin: false,
        is_owner: false,
        source: 'supervisor-ingress',
      });
      expect(req.authenticatedHaUrl).toBeNull();
      expect(next).toHaveBeenCalledOnce();
    }
  );

  describe('with server-configured HA URLs (SEC-1)', () => {
    beforeEach(() => {
      vi.stubEnv('TUNET_INTERNAL_HA_URL', 'https://ha.example');
    });

    it('does not trust ingress headers when disabled', async () => {
      const validateHomeAssistantUser = vi.fn();
      const req = createRequest({
        __ip: '172.30.32.2',
        'x-ingress-path': '/api/hassio_ingress/abc123',
        'x-remote-user-id': 'victim-user-id',
      });
      const res = createResponse();
      const next = vi.fn();
      await createHomeAssistantAuthMiddleware({ validateHomeAssistantUser })(req, res, next);
      expect(validateHomeAssistantUser).not.toHaveBeenCalled();
      expect(req.authenticatedHaUser).toBeUndefined();
      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('attaches the user from the trusted HA only and ignores both client URL headers', async () => {
      const validateHomeAssistantUser = vi.fn().mockResolvedValue({ id: 'user-123' });
      const req = createRequest({
        authorization: 'Bearer token-1',
        'x-ha-url': ATTACKER_URL,
        'x-ha-fallback-url': ATTACKER_FALLBACK_URL,
      });
      const res = createResponse();
      const next = vi.fn();
      await createHomeAssistantAuthMiddleware({ validateHomeAssistantUser })(req, res, next);
      expect(validateHomeAssistantUser).toHaveBeenCalledExactlyOnceWith({
        haUrl: 'https://ha.example',
        accessToken: 'token-1',
      });
      expect(req.authenticatedHaUser).toEqual({ id: 'user-123' });
      expect(req.authenticatedHaUrl).toBe('https://ha.example');
      expect(next).toHaveBeenCalledOnce();
    });

    it('never authenticates the user returned by a HA chosen by the client', async () => {
      // Finto HA dell'attaccante: accetta qualsiasi token e risponde con l'id della vittima.
      const validateHomeAssistantUser = vi.fn(async ({ haUrl }: { haUrl: string }) => {
        if (ATTACKER_URLS.includes(haUrl)) return VICTIM_USER;
        throw new Error('connect ECONNREFUSED');
      });
      const req = createRequest({
        authorization: 'Bearer invented',
        'x-ha-url': ATTACKER_URL,
        'x-ha-fallback-url': ATTACKER_FALLBACK_URL,
      });
      const res = createResponse();
      const next = vi.fn();
      await createHomeAssistantAuthMiddleware({ validateHomeAssistantUser })(req, res, next);
      expect(res.statusCode).toBe(503);
      expect(res.body).toHaveProperty('code', 'HA_VALIDATION_UNREACHABLE');
      expect(calledUrls(validateHomeAssistantUser)).toEqual(['https://ha.example']);
      expect(req.authenticatedHaUser).toBeUndefined();
      expect(next).not.toHaveBeenCalled();
    });

    it('does not need URL metadata from the client', async () => {
      const validateHomeAssistantUser = vi.fn().mockResolvedValue({ id: 'user-123' });
      const next = vi.fn();
      await createHomeAssistantAuthMiddleware({ validateHomeAssistantUser })(
        createRequest({ authorization: 'Bearer token-1' }),
        createResponse(),
        next
      );
      expect(next).toHaveBeenCalledOnce();
    });

    it('parses padded bearer headers without regex backtracking', async () => {
      const validateHomeAssistantUser = vi.fn().mockResolvedValue({ id: 'user-123' });
      await createHomeAssistantAuthMiddleware({ validateHomeAssistantUser })(
        createRequest({ authorization: `  Bearer ${' '.repeat(256)}token-1  ` }),
        createResponse(),
        vi.fn()
      );
      expect(validateHomeAssistantUser).toHaveBeenCalledWith({
        haUrl: 'https://ha.example',
        accessToken: 'token-1',
      });
    });

    it('never adds Docker alternatives to a configured URL, even after a network failure', async () => {
      vi.stubEnv('TUNET_INTERNAL_HA_URL', 'http://localhost:8123');
      const validateHomeAssistantUser = vi
        .fn()
        .mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:8123'))
        .mockResolvedValue({ id: 'user-789' });
      const req = createRequest({
        authorization: 'Bearer token-1',
        'x-ha-url': ATTACKER_URL,
      });
      const res = createResponse();
      const next = vi.fn();
      await createHomeAssistantAuthMiddleware({ validateHomeAssistantUser })(req, res, next);
      expect(calledUrls(validateHomeAssistantUser)).toEqual(['http://localhost:8123']);
      expect(res.statusCode).toBe(503);
      expect(req.authenticatedHaUser).toBeUndefined();
      expect(next).not.toHaveBeenCalled();
    });

    it('tries only the configured fallback after a network failure', async () => {
      vi.stubEnv('TUNET_INTERNAL_HA_URL', 'http://192.168.1.20:8123');
      vi.stubEnv('TUNET_INTERNAL_HA_FALLBACK_URL', 'http://homeassistant.lan:8123');
      const validateHomeAssistantUser = vi
        .fn()
        .mockRejectedValueOnce(1) // ERR_CANNOT_CONNECT
        .mockResolvedValueOnce({ id: 'user-456' });
      const req = createRequest({
        authorization: 'Bearer token-1',
        'x-ha-url': ATTACKER_URL,
        'x-ha-fallback-url': ATTACKER_FALLBACK_URL,
      });
      const next = vi.fn();
      await createHomeAssistantAuthMiddleware({ validateHomeAssistantUser })(
        req,
        createResponse(),
        next
      );
      expect(calledUrls(validateHomeAssistantUser)).toEqual([
        'http://192.168.1.20:8123',
        'http://homeassistant.lan:8123',
      ]);
      expect(req.authenticatedHaUser).toEqual({ id: 'user-456' });
      expect(req.authenticatedHaUrl).toBe('http://homeassistant.lan:8123');
      expect(next).toHaveBeenCalledOnce();
    });

    it('uses TUNET_INTERNAL_HA_FALLBACK_URL alone as the trusted HA', async () => {
      vi.stubEnv('TUNET_INTERNAL_HA_URL', '');
      vi.stubEnv('TUNET_INTERNAL_HA_FALLBACK_URL', 'http://host.docker.internal:8123');
      const validateHomeAssistantUser = vi.fn(async ({ haUrl }: { haUrl: string }) => {
        if (ATTACKER_URLS.includes(haUrl)) return VICTIM_USER;
        throw new Error('Invalid auth');
      });
      const req = createRequest({
        authorization: 'Bearer invented',
        'x-ha-url': ATTACKER_URL,
      });
      const res = createResponse();
      const next = vi.fn();
      await createHomeAssistantAuthMiddleware({ validateHomeAssistantUser })(req, res, next);
      expect(res.statusCode).toBe(401);
      expect(calledUrls(validateHomeAssistantUser)).toEqual(['http://host.docker.internal:8123']);
      expect(req.authenticatedHaUser).toBeUndefined();
      expect(next).not.toHaveBeenCalled();
    });

    it('stops at a trusted HA rejecting the token, before any alternative or fallback', async () => {
      vi.stubEnv('TUNET_INTERNAL_HA_FALLBACK_URL', 'https://fallback.example');
      const validateHomeAssistantUser = vi
        .fn()
        .mockRejectedValueOnce(new Error('Invalid auth'))
        .mockResolvedValue({ id: 'victim-user-id' });
      const req = createRequest({
        authorization: 'Bearer invented',
        'x-ha-url': ATTACKER_URL,
      });
      const res = createResponse();
      const next = vi.fn();
      await createHomeAssistantAuthMiddleware({ validateHomeAssistantUser })(req, res, next);
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('code', 'HA_AUTH_INVALID');
      expect(validateHomeAssistantUser).toHaveBeenCalledTimes(1);
      expect(req.authenticatedHaUser).toBeUndefined();
      expect(next).not.toHaveBeenCalled();
    });

    it('keeps answering 401 while the trusted rejection is cached', async () => {
      vi.stubEnv('TUNET_INTERNAL_HA_FALLBACK_URL', 'https://fallback.example');
      const loadCurrentUser = vi.fn(async ({ haUrl }: { haUrl: string }) => {
        if (haUrl === 'https://ha.example') throw 2; // ERR_INVALID_AUTH
        return VICTIM_USER;
      });
      const middleware = createHomeAssistantAuthMiddleware({
        validateHomeAssistantUser: createValidatedHomeAssistantUserResolver({ loadCurrentUser }),
      });

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const req = createRequest({ authorization: 'Bearer revoked', 'x-ha-url': ATTACKER_URL });
        const res = createResponse();
        const next = vi.fn();
        await middleware(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('code', 'HA_AUTH_INVALID');
        expect(req.authenticatedHaUser).toBeUndefined();
        expect(next).not.toHaveBeenCalled();
      }
      expect(calledUrls(loadCurrentUser)).toEqual(['https://ha.example']);
    });

    it('stops at a token rejection after a network failure on a previous candidate', async () => {
      vi.stubEnv('TUNET_INTERNAL_HA_FALLBACK_URL', 'https://ha-backup.example');
      const validateHomeAssistantUser = vi
        .fn()
        .mockRejectedValueOnce(new Error('connect ECONNREFUSED'))
        .mockRejectedValueOnce(2) // ERR_INVALID_AUTH
        .mockResolvedValue({ id: 'victim-user-id' });
      const req = createRequest({
        authorization: 'Bearer invented',
        'x-ha-url': ATTACKER_URL,
      });
      const res = createResponse();
      const next = vi.fn();
      await createHomeAssistantAuthMiddleware({ validateHomeAssistantUser })(req, res, next);
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('code', 'HA_AUTH_INVALID');
      expect(calledUrls(validateHomeAssistantUser)).toEqual([
        'https://ha.example',
        'https://ha-backup.example',
      ]);
      expect(next).not.toHaveBeenCalled();
    });

    it('never falls back to client URLs when the configured URLs are not valid', async () => {
      vi.stubEnv('TUNET_INTERNAL_HA_URL', 'homeassistant.lan:8123');
      const validateHomeAssistantUser = vi.fn().mockResolvedValue({ id: 'victim-user-id' });
      const req = createRequest({
        authorization: 'Bearer invented',
        'x-ha-url': ATTACKER_URL,
      });
      const res = createResponse();
      const next = vi.fn();
      await createHomeAssistantAuthMiddleware({ validateHomeAssistantUser })(req, res, next);
      expect(res.statusCode).toBe(503);
      expect(res.body).toHaveProperty('code', 'HA_URL_NOT_CONFIGURED');
      expect(validateHomeAssistantUser).not.toHaveBeenCalled();
      expect(req.authenticatedHaUser).toBeUndefined();
      expect(next).not.toHaveBeenCalled();
    });
  });

  // SEC-1, decisione dell'utente del 2026-10-07: senza URL interni il server rifiuta sempre,
  // qualunque HA indichi il client.
  describe('without server-configured HA URLs (fails closed)', () => {
    it.each([
      ['no client metadata', { authorization: 'Bearer token-1' }],
      ['a client HA URL', { authorization: 'Bearer token-1', 'x-ha-url': ATTACKER_URL }],
      [
        'client primary and fallback URLs',
        {
          authorization: 'Bearer token-1',
          'x-ha-url': 'http://localhost:8123',
          'x-ha-fallback-url': ATTACKER_URL,
        },
      ],
    ])('answers 503 HA_URL_NOT_CONFIGURED with %s, without asking any HA', async (_label, headers) => {
      const validateHomeAssistantUser = vi.fn().mockResolvedValue({ id: 'victim-user-id' });
      const req = createRequest(headers);
      const res = createResponse();
      const next = vi.fn();

      await createHomeAssistantAuthMiddleware({ validateHomeAssistantUser })(req, res, next);

      expect(validateHomeAssistantUser).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(503);
      expect(res.body).toEqual({
        error: 'Acasystem backend has no Home Assistant URL configured (TUNET_INTERNAL_HA_URL).',
        code: 'HA_URL_NOT_CONFIGURED',
      });
      expect(req.authenticatedHaUser).toBeUndefined();
      expect(next).not.toHaveBeenCalled();
    });

    it('does not trust ingress headers unless explicitly enabled', async () => {
      const validateHomeAssistantUser = vi.fn();
      const req = createRequest({
        __ip: '::ffff:172.30.32.2',
        __remoteAddress: '::ffff:172.30.32.2',
        'x-ingress-path': '/api/hassio_ingress/abc123',
        'x-remote-user-id': 'ha-user-1',
        'x-remote-user-display-name': 'Living Room Tablet',
      });
      const res = createResponse();
      const next = vi.fn();

      await createHomeAssistantAuthMiddleware({ validateHomeAssistantUser })(req, res, next);

      expect(validateHomeAssistantUser).not.toHaveBeenCalled();
      expect(req.authenticatedHaUser).toBeUndefined();
      expect(res.statusCode).toBe(503);
      expect(res.body).toHaveProperty('code', 'HA_URL_NOT_CONFIGURED');
      expect(next).not.toHaveBeenCalled();
    });
  });
});
