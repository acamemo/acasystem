// @vitest-environment node

import { once } from 'node:events';
import http from 'node:http';
import type { IncomingHttpHeaders, Server } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import type { Socket } from 'node:net';
import type { Duplex } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import type { RawData } from 'ws';
import {
  CONTENT_SECURITY_POLICY,
  HOME_ASSISTANT_PROXY_CONTENT_SECURITY_POLICY,
} from '../config/security.ts';
import { openDatabase } from '../models/database.ts';
import type { SqliteDatabase } from '../models/database.ts';
import { attachHomeAssistantWebSocketProxy } from '../routes/homeAssistantProxy.ts';
import { createApp } from '../server.ts';

/**
 * Proxy /ha (ADR-0009) contro un finto Home Assistant locale (HTTP + WebSocket): nessuna
 * richiesta raggiunge l'Home Assistant reale e non si usano credenziali reali.
 */

interface RecordedRequest {
  method: string;
  url: string;
  headers: IncomingHttpHeaders;
  body: string;
}

interface FakeHomeAssistant {
  url: string;
  host: string;
  requests: RecordedRequest[];
  handshakes: IncomingHttpHeaders[];
  wsMessages: string[];
  wsServer: WebSocketServer;
  /** Risolta quando HA vede chiudersi la richiesta del flusso infinito. */
  streamClosed: Promise<void>;
  rejectUpgrade: boolean;
  /** HA bloccato: riceve richieste e upgrade ma non risponde mai. */
  hang: boolean;
  /** Richieste e upgrade bloccati di cui HA ha visto chiudersi la connessione. */
  hungClosed: number;
  close(): Promise<void>;
}

const openServers: Server[] = [];
const openRawServers: ReturnType<typeof createNetServer>[] = [];
const openDatabases: SqliteDatabase[] = [];
const openFakes: FakeHomeAssistant[] = [];
const openClients: WebSocket[] = [];

const closeHttpServer = (server: Server): Promise<void> =>
  new Promise((resolve) => {
    server.closeAllConnections();
    server.close(() => resolve());
  });

const portOf = (server: Server): number => {
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('Server has no TCP address');
  return address.port;
};

const startFakeHomeAssistant = async (): Promise<FakeHomeAssistant> => {
  let resolveStreamClosed: () => void = () => {};
  const streamClosed = new Promise<void>((resolve) => {
    resolveStreamClosed = resolve;
  });

  const hungSockets = new Set<Duplex>();

  const server = http.createServer((req, res) => {
    const url = req.url ?? '';

    if (fake.hang) {
      fake.requests.push({ method: req.method ?? '', url, headers: req.headers, body: '' });
      hungSockets.add(req.socket);
      res.on('close', () => {
        fake.hungClosed += 1;
      });
      return;
    }

    if (url.startsWith('/api/image_proxy/')) {
      fake.requests.push({ method: req.method ?? '', url, headers: req.headers, body: '' });
      res.writeHead(200, { 'content-type': 'image/png', 'content-length': '4' });
      res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      return;
    }

    if (url.startsWith('/api/camera_proxy_stream/')) {
      res.writeHead(200, { 'content-type': 'multipart/x-mixed-replace;boundary=frame' });
      let frame = 0;
      const timer = setInterval(() => {
        frame += 1;
        res.write(`--frame\r\nContent-Type: text/plain\r\n\r\nfotogramma ${frame}\r\n`);
      }, 20);
      res.on('close', () => {
        clearInterval(timer);
        resolveStreamClosed();
      });
      return;
    }

    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      fake.requests.push({ method: req.method ?? '', url, headers: req.headers, body });

      if (url.endsWith('/auth/token') && !body.includes('code=')) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid_request' }));
        return;
      }

      res.writeHead(200, {
        'content-type': 'application/json',
        'x-ha-echo': '1',
        'set-cookie': 'ha_session=1; Path=/',
        'content-security-policy': 'default-src *',
      });
      res.end(JSON.stringify({ method: req.method, url, body }));
    });
  });

  const wsServer = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket: Duplex, head) => {
    fake.handshakes.push(req.headers);
    if (fake.hang) {
      hungSockets.add(socket);
      // Il socket di un upgrade è half-open: la chiusura del proxy arriva come 'end'.
      let seenClosed = false;
      const markClosed = (): void => {
        if (seenClosed) return;
        seenClosed = true;
        fake.hungClosed += 1;
      };
      socket.on('end', markClosed);
      socket.on('close', markClosed);
      return;
    }
    if (fake.rejectUpgrade || req.url !== '/api/websocket') {
      socket.end('HTTP/1.1 403 Forbidden\r\nContent-Length: 7\r\nConnection: close\r\n\r\nvietato');
      return;
    }
    wsServer.handleUpgrade(req, socket, head, (client) => wsServer.emit('connection', client, req));
  });
  wsServer.on('connection', (client: WebSocket) => {
    client.send(JSON.stringify({ type: 'auth_required', ha_version: '2026.10.0' }));
    client.on('message', (raw: RawData) => {
      const text = String(raw);
      fake.wsMessages.push(text);
      if (text === 'chiudi') {
        client.close(4000, 'chiusura da HA');
        return;
      }
      client.send(JSON.stringify({ type: 'eco', data: text }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = portOf(server);

  const fake: FakeHomeAssistant = {
    url: `http://127.0.0.1:${port}`,
    host: `127.0.0.1:${port}`,
    requests: [],
    handshakes: [],
    wsMessages: [],
    wsServer,
    streamClosed,
    rejectUpgrade: false,
    hang: false,
    hungClosed: 0,
    close: async () => {
      hungSockets.forEach((socket) => socket.destroy());
      wsServer.clients.forEach((client) => client.terminate());
      wsServer.close();
      await closeHttpServer(server);
    },
  };
  openFakes.push(fake);
  return fake;
};

/** Porta TCP locale libera e chiusa: un HA configurato ma spento. */
const findClosedLocalPort = async (): Promise<number> => {
  const probe = createNetServer();
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', () => resolve()));
  const address = probe.address();
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  if (address === null || typeof address === 'string') throw new Error('No TCP port');
  return address.port;
};

/**
 * Finto HA su socket grezzo: a ogni connessione legge la richiesta fino alla riga vuota e
 * risponde con `rawResponse` così com'è (byte latin1), anche se non è HTTP valido.
 */
const startRawHomeAssistant = async (rawResponse: string): Promise<string> => {
  const server = createNetServer((socket: Socket) => {
    let received = '';
    socket.on('error', () => {});
    socket.on('data', (chunk: Buffer) => {
      received += chunk.toString('latin1');
      if (received.includes('\r\n\r\n')) socket.end(Buffer.from(rawResponse, 'latin1'));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  openRawServers.push(server);
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('No TCP port');
  return `http://127.0.0.1:${address.port}`;
};

/** Acasystem su una porta libera; con `serverOptions` usa un server HTTP con quei timeout. */
const startAcasystem = async (serverOptions?: http.ServerOptions) => {
  const database = openDatabase(':memory:');
  openDatabases.push(database);
  const app = createApp({ database, isProduction: false });
  const server = await new Promise<Server>((resolve) => {
    if (serverOptions) {
      const instance = http.createServer(serverOptions, app);
      instance.listen(0, '127.0.0.1', () => resolve(instance));
      return;
    }
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  attachHomeAssistantWebSocketProxy(server);
  openServers.push(server);
  const port = portOf(server);

  return {
    port,
    request: (path: string, init?: RequestInit) => fetch(`http://127.0.0.1:${port}${path}`, init),
    /** Richiesta con il percorso esattamente come scritto (fetch normalizzerebbe `..`). */
    rawRequest: (path: string, method = 'GET', headers: Record<string, string> = {}) =>
      new Promise<{ status: number; body: string }>((resolve, reject) => {
        const req = http.request({ host: '127.0.0.1', port, path, method, headers }, (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () =>
            resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') })
          );
        });
        req.on('error', reject);
        req.end();
      }),
    /** POST scritto a blocchi (Transfer-Encoding: chunked), senza Content-Length. */
    postChunked: (path: string, chunks: readonly string[], headers: Record<string, string> = {}) =>
      new Promise<{ status: number; body: string }>((resolve, reject) => {
        const req = http.request({ host: '127.0.0.1', port, path, method: 'POST', headers }, (res) => {
          const received: Buffer[] = [];
          res.on('data', (chunk: Buffer) => received.push(chunk));
          res.on('end', () =>
            resolve({ status: res.statusCode ?? 0, body: Buffer.concat(received).toString('utf8') })
          );
        });
        req.on('error', reject);
        for (const chunk of chunks) req.write(chunk);
        req.end();
      }),
    openWebSocket: (path: string, options: { headers?: Record<string, string> } = {}) => {
      const client = new WebSocket(`ws://127.0.0.1:${port}${path}`, options);
      openClients.push(client);
      return client;
    },
  };
};

/** Esito di un upgrade rifiutato: stato, intestazioni e corpo della risposta HTTP. */
const expectRejectedUpgrade = (
  client: WebSocket
): Promise<{ status: number; body: string; headers: IncomingHttpHeaders }> =>
  new Promise((resolve, reject) => {
    client.on('open', () => reject(new Error('WebSocket opened unexpectedly')));
    client.on('unexpected-response', (req, res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode ?? 0,
          body: Buffer.concat(chunks).toString('utf8'),
          headers: res.headers,
        });
        req.destroy();
      });
    });
    client.on('error', () => {});
  });

const nextMessage = async (client: WebSocket): Promise<unknown> => {
  const [raw] = (await once(client, 'message')) as [RawData];
  return JSON.parse(String(raw));
};

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.stubEnv('TUNET_INTERNAL_HA_FALLBACK_URL', '');
  vi.stubEnv('HA_LOGIN_RATE_LIMIT_MAX', '');
  vi.stubEnv('HA_LOGIN_RATE_LIMIT_WINDOW_MS', '');
  vi.stubEnv('HA_WEBSOCKET_RATE_LIMIT_MAX', '');
  vi.stubEnv('HA_WEBSOCKET_RATE_LIMIT_WINDOW_MS', '');
  vi.stubEnv('HA_PROXY_RESPONSE_TIMEOUT_MS', '');
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  vi.unstubAllEnvs();
  warnSpy.mockRestore();
  while (openClients.length > 0) openClients.pop()?.terminate();
  while (openServers.length > 0) {
    const server = openServers.pop();
    if (server) await closeHttpServer(server);
  }
  while (openFakes.length > 0) await openFakes.pop()?.close();
  while (openRawServers.length > 0) {
    const server = openRawServers.pop();
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  while (openDatabases.length > 0) openDatabases.pop()?.close();
});

const startWithFake = async () => {
  const fake = await startFakeHomeAssistant();
  vi.stubEnv('TUNET_INTERNAL_HA_URL', fake.url);
  const acasystem = await startAcasystem();
  return { fake, acasystem };
};

describe('HTTP proxy /ha', () => {
  it('forwards method, path, body and only the allowed headers to the internal HA', async () => {
    const { fake, acasystem } = await startWithFake();
    const loginBody = JSON.stringify({
      client_id: 'http://localhost:3002/',
      handler: ['homeassistant', null],
      redirect_uri: 'http://localhost:3002/',
    });

    const response = await acasystem.request('/ha/auth/login_flow', {
      method: 'POST',
      headers: {
        authorization: 'Bearer token-di-prova',
        'content-type': 'application/json',
        accept: 'application/json',
        'user-agent': 'AcasystemTest/1.0',
        cookie: 'sessione=segreta',
        origin: 'http://altro.example',
        'x-forwarded-for': '203.0.113.9',
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'altro.example',
        forwarded: 'for=203.0.113.9',
        'x-ha-url': 'http://127.0.0.1:9',
        'x-personalizzata': 'no',
      },
      body: loginBody,
    });

    expect(response.status).toBe(200);
    expect(fake.requests).toHaveLength(1);
    const [received] = fake.requests;
    expect(received).toMatchObject({ method: 'POST', url: '/auth/login_flow', body: loginBody });
    expect(received?.headers).toMatchObject({
      host: fake.host,
      authorization: 'Bearer token-di-prova',
      'content-type': 'application/json',
      accept: 'application/json',
      'user-agent': 'AcasystemTest/1.0',
      'content-length': String(Buffer.byteLength(loginBody)),
    });
    for (const header of [
      'cookie',
      'origin',
      'x-forwarded-for',
      'x-forwarded-proto',
      'x-forwarded-host',
      'forwarded',
      'x-ha-url',
      'x-personalizzata',
    ]) {
      expect(received?.headers[header], header).toBeUndefined();
    }

    // Risposta: stato, intestazioni e corpo di HA; niente cookie di HA, CSP delle risposte /ha.
    expect(response.headers.get('x-ha-echo')).toBe('1');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('content-security-policy')).toBe(
      HOME_ASSISTANT_PROXY_CONTENT_SECURITY_POLICY
    );
    await expect(response.json()).resolves.toEqual({
      method: 'POST',
      url: '/auth/login_flow',
      body: loginBody,
    });
  });

  it('forwards the query unchanged and passes HA error statuses through', async () => {
    const { fake, acasystem } = await startWithFake();
    const historyPath =
      '/api/history/period/2026-10-07T08:00:00.000Z?filter_entity_id=sensor.a,sensor.b&end_time=2026-10-07T09%3A00%3A00.000Z&minimal_response';

    const history = await acasystem.request(`/ha${historyPath}`);
    expect(history.status).toBe(200);
    expect(fake.requests.at(-1)).toMatchObject({ method: 'GET', url: historyPath });

    const tokenBody = 'grant_type=authorization_code&code=abc123&client_id=http%3A%2F%2Flocalhost%3A3002%2F';
    const token = await acasystem.request('/ha/auth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: tokenBody,
    });
    expect(token.status).toBe(200);
    expect(fake.requests.at(-1)).toMatchObject({
      method: 'POST',
      url: '/auth/token',
      body: tokenBody,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });

    const refused = await acasystem.request('/ha/auth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=authorization_code',
    });
    expect(refused.status).toBe(400);
    await expect(refused.json()).resolves.toEqual({ error: 'invalid_request' });

    const deleted = await acasystem.request('/ha/auth/login_flow/flusso123', { method: 'DELETE' });
    expect(deleted.status).toBe(200);
    expect(fake.requests.at(-1)).toMatchObject({ method: 'DELETE', url: '/auth/login_flow/flusso123' });
  });

  it('streams a chunked request body to HA without reading it first', async () => {
    const { fake, acasystem } = await startWithFake();
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('token=refresh-di-prova'));
        controller.enqueue(encoder.encode('&action=revoke'));
        controller.close();
      },
    });

    const response = await acasystem.request('/ha/auth/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      duplex: 'half',
    } as RequestInit);

    expect(response.status).toBe(200);
    const [received] = fake.requests;
    expect(received).toMatchObject({ url: '/auth/revoke', body: 'token=refresh-di-prova&action=revoke' });
    expect(received?.headers['transfer-encoding']).toBe('chunked');
    expect(received?.headers['content-length']).toBeUndefined();
  });

  it('answers 404 JSON for paths and methods outside the list, without contacting HA', async () => {
    const { fake, acasystem } = await startWithFake();

    for (const [method, path] of [
      ['GET', '/ha'],
      ['GET', '/ha/'],
      ['GET', '/ha/api/states'],
      ['POST', '/ha/api/services/lock/unlock'],
      ['GET', '/ha/api/config'],
      ['GET', '/ha/api/websocket'],
      ['GET', '/ha/auth/authorize'],
      ['GET', '/ha/auth/token'],
      ['GET', '/ha/auth/login_flow/abc'],
      ['POST', '/ha/api/camera_proxy/camera.ingresso'],
      ['GET', '/ha/api/camera_proxy/camera.ingresso/extra'],
      ['GET', '/ha/manifest.json'],
    ] as const) {
      const response = await acasystem.request(path, { method });
      expect(response.status, `${method} ${path}`).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: 'Percorso di Home Assistant non disponibile attraverso Acasystem.',
        code: 'HA_PATH_NOT_ALLOWED',
      });
    }
    expect(fake.requests).toHaveLength(0);
  });

  it('refuses traversal attempts written in the raw request line', async () => {
    const { fake, acasystem } = await startWithFake();

    for (const path of [
      '/ha/api/camera_proxy/../../api/states',
      '/ha/api/hls/abc/../../../api/config',
      '/ha/api/hls/%2e%2e/%2e%2e/api/states',
      '/ha/api/hls/%2E%2E/api/states',
      '/ha/api/camera_proxy/camera.a%2f..%2f..%2fapi%2fstates',
      '/ha/api/camera_proxy/camera.a%5c..%5capi',
      '/ha//api/camera_proxy/camera.a',
      '/ha/api/hls/abc//segment.m4s',
      '/ha/api/camera_proxy\\..\\..\\api\\states',
    ]) {
      const response = await acasystem.rawRequest(path);
      expect([400, 404], path).toContain(response.status);
      if (response.status === 404) {
        expect(JSON.parse(response.body), path).toHaveProperty('code', 'HA_PATH_NOT_ALLOWED');
      }
    }
    expect(fake.requests).toHaveLength(0);
  });

  it('streams an endless camera response and stops the HA request when the client closes', async () => {
    const { fake, acasystem } = await startWithFake();
    const controller = new AbortController();

    const response = await acasystem.request('/ha/api/camera_proxy_stream/camera.infinita?token=t', {
      signal: controller.signal,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('multipart/x-mixed-replace;boundary=frame');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');
    const decoder = new TextDecoder();
    let received = '';
    while (!received.includes('fotogramma 3')) {
      const { value, done } = await reader.read();
      if (done) throw new Error('The endless stream ended');
      received += decoder.decode(value, { stream: true });
    }
    expect(received).toContain('fotogramma 1');

    controller.abort();
    await expect(fake.streamClosed).resolves.toBeUndefined();
  });

  it('answers 503 HA_URL_NOT_CONFIGURED without an internal HA URL', async () => {
    vi.stubEnv('TUNET_INTERNAL_HA_URL', '');
    const acasystem = await startAcasystem();

    const response = await acasystem.request('/ha/auth/providers');

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'Home Assistant non è configurato sul server Acasystem (TUNET_INTERNAL_HA_URL).',
      code: 'HA_URL_NOT_CONFIGURED',
    });
  });

  it('answers 502 HA_UNREACHABLE when HA is down, without logging the query', async () => {
    vi.stubEnv('TUNET_INTERNAL_HA_URL', `http://127.0.0.1:${await findClosedLocalPort()}`);
    const acasystem = await startAcasystem();

    const response = await acasystem.request('/ha/api/camera_proxy/camera.a?token=segreto-di-prova');

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: 'Home Assistant non risponde.',
      code: 'HA_UNREACHABLE',
    });
    expect(warnSpy).toHaveBeenCalled();
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain('segreto-di-prova');
  });

  it('keeps the base path of the internal HA URL', async () => {
    const fake = await startFakeHomeAssistant();
    vi.stubEnv('TUNET_INTERNAL_HA_URL', `${fake.url}/base/`);
    const acasystem = await startAcasystem();

    const response = await acasystem.request('/ha/auth/providers');

    expect(response.status).toBe(200);
    expect(fake.requests.at(-1)).toMatchObject({ method: 'GET', url: '/base/auth/providers' });
  });

  it('honours the Supervisor ingress prefix', async () => {
    const { fake, acasystem } = await startWithFake();

    const response = await acasystem.request('/api/hassio_ingress/abc/ha/auth/providers', {
      headers: { 'x-ingress-path': '/api/hassio_ingress/abc' },
    });

    expect(response.status).toBe(200);
    expect(fake.requests.at(-1)).toMatchObject({ method: 'GET', url: '/auth/providers' });
  });

  it('gives forwarded HA responses a no-content CSP and nosniff, keeping their content type', async () => {
    const { fake, acasystem } = await startWithFake();

    const json = await acasystem.request('/ha/auth/providers');
    expect(json.status).toBe(200);
    expect(json.headers.get('content-type')).toBe('application/json');
    expect(json.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox");
    expect(json.headers.get('x-content-type-options')).toBe('nosniff');

    // Un'immagine resta un'immagine: tipo e byte di HA invariati.
    const image = await acasystem.request('/ha/api/image_proxy/image.mappa?token=t');
    expect(image.status).toBe(200);
    expect(image.headers.get('content-type')).toBe('image/png');
    expect(image.headers.get('content-security-policy')).toBe(
      HOME_ASSISTANT_PROXY_CONTENT_SECURITY_POLICY
    );
    expect(image.headers.get('x-content-type-options')).toBe('nosniff');
    expect(Buffer.from(await image.arrayBuffer())).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    // Le risposte proprie del proxy e il resto dell'app tengono la CSP generale.
    const refused = await acasystem.request('/ha/api/states');
    expect(refused.status).toBe(404);
    expect(refused.headers.get('content-security-policy')).toBe(CONTENT_SECURITY_POLICY);
    const health = await acasystem.request('/api/health');
    expect(health.headers.get('content-security-policy')).toBe(CONTENT_SECURITY_POLICY);
    expect(fake.requests).toHaveLength(2);
  });

  it('forwards media browser thumbnails (browse_media) unchanged', async () => {
    const { fake, acasystem } = await startWithFake();
    const thumbnailPath =
      '/api/media_player_proxy/media_player.sala/browse_media/album/A:ALBUM/Artista/123?token=abc';

    const response = await acasystem.request(`/ha${thumbnailPath}`);

    expect(response.status).toBe(200);
    expect(fake.requests.at(-1)).toMatchObject({ method: 'GET', url: thumbnailPath });

    for (const path of [
      '/ha/api/media_player_proxy/media_player.sala/browse_media',
      '/ha/api/media_player_proxy/media_player.sala/browse_media/../../../api/states',
      '/ha/api/media_player_proxy/media_player.sala/browse_media/%2e%2e/api/states',
      '/ha/api/media_player_proxy/media_player.sala/browse_media/album//123',
      '/ha/api/media_player_proxy/media_player.sala/altro/album/123',
    ]) {
      const refused = await acasystem.rawRequest(path);
      expect(refused.status, path).toBe(404);
    }
    expect(fake.requests).toHaveLength(1);
  });

  it('leaves the other routes of the backend unchanged', async () => {
    const { fake, acasystem } = await startWithFake();

    const health = await acasystem.request('/api/health');
    expect(health.status).toBe(200);
    const hassio = await acasystem.request('/hassio/auth/providers');
    expect(hassio.status).toBe(404);
    expect(fake.requests).toHaveLength(0);
  });
});

describe('login attempt limit', () => {
  it('allows 10 login steps per minute per client, then answers 429 JSON', async () => {
    const { fake, acasystem } = await startWithFake();
    const post = (path: string) =>
      acasystem.request(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ client_id: 'http://localhost:3002/', handler: ['homeassistant', null] }),
      });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await post('/ha/auth/login_flow')).status).toBe(200);
      expect((await post('/ha/auth/login_flow/flusso123')).status).toBe(200);
    }

    const limited = await post('/ha/auth/login_flow/flusso123');
    expect(limited.status).toBe(429);
    await expect(limited.json()).resolves.toEqual({
      error: 'Troppi tentativi di accesso. Riprova tra qualche minuto.',
      code: 'HA_LOGIN_RATE_LIMITED',
    });
    expect((await post('/ha/auth/login_flow')).status).toBe(429);
    expect(fake.requests).toHaveLength(10);

    // Il limite riguarda solo i passi di accesso.
    expect((await acasystem.request('/ha/auth/providers')).status).toBe(200);
    expect(
      (await acasystem.request('/ha/auth/login_flow/flusso123', { method: 'DELETE' })).status
    ).toBe(200);
    expect((await post('/ha/auth/token')).status).toBe(400);
  });

  it('reads the limit from HA_LOGIN_RATE_LIMIT_MAX', async () => {
    vi.stubEnv('HA_LOGIN_RATE_LIMIT_MAX', '12');
    const { acasystem } = await startWithFake();

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 13; attempt += 1) {
      const response = await acasystem.request('/ha/auth/login_flow', {
        method: 'POST',
        body: JSON.stringify({ handler: ['homeassistant', null] }),
      });
      statuses.push(response.status);
    }

    expect(statuses.filter((status) => status === 200)).toHaveLength(12);
    expect(statuses.at(-1)).toBe(429);
  });
});

describe('login flow start (SR-1)', () => {
  const loginStart = (handler: unknown) =>
    JSON.stringify({ client_id: 'http://localhost:3002/', handler, redirect_uri: 'http://localhost:3002/' });

  it('forwards only the username and password provider, without contacting HA otherwise', async () => {
    const { fake, acasystem } = await startWithFake();

    for (const body of [
      loginStart(['trusted_networks', null]),
      loginStart(['command_line', null]),
      loginStart('homeassistant'),
      loginStart([]),
      JSON.stringify({ client_id: 'http://localhost:3002/' }),
      JSON.stringify([{ handler: ['homeassistant', null] }]),
      '{"handler": ["homeassistant", null]',
      '',
    ]) {
      const response = await acasystem.request('/ha/auth/login_flow', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      });
      expect(response.status, body).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: 'Percorso di Home Assistant non disponibile attraverso Acasystem.',
        code: 'HA_PATH_NOT_ALLOWED',
      });
    }
    expect(fake.requests).toHaveLength(0);

    // I passi successivi del flusso non sono letti: passano in streaming come prima.
    const step = await acasystem.request('/ha/auth/login_flow/flusso123', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: 'http://localhost:3002/', username: 'prova', password: 'finta' }),
    });
    expect(step.status).toBe(200);
    expect(fake.requests).toHaveLength(1);
  });

  it('answers 413 JSON to a body over 4 KB, declared or streamed, without contacting HA', async () => {
    const { fake, acasystem } = await startWithFake();
    const oversized = JSON.stringify({
      handler: ['homeassistant', null],
      client_id: `http://localhost:3002/${'a'.repeat(4096)}`,
    });
    const expected = {
      error: 'Richiesta di accesso troppo grande.',
      code: 'HA_LOGIN_BODY_TOO_LARGE',
    };

    const declared = await acasystem.request('/ha/auth/login_flow', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: oversized,
    });
    expect(declared.status).toBe(413);
    await expect(declared.json()).resolves.toEqual(expected);

    const streamed = await acasystem.postChunked(
      '/ha/auth/login_flow',
      [oversized.slice(0, 3000), oversized.slice(3000)],
      { 'content-type': 'application/json' }
    );
    expect(streamed.status).toBe(413);
    expect(JSON.parse(streamed.body)).toEqual(expected);
    expect(fake.requests).toHaveLength(0);
  });

  it('sends HA the body it checked, as JSON with its own length', async () => {
    const { fake, acasystem } = await startWithFake();
    const body = loginStart(['homeassistant', null]);

    const response = await acasystem.postChunked(
      '/ha/auth/login_flow',
      [body.slice(0, 20), body.slice(20)],
      { 'content-type': 'text/plain; charset=utf-16le' }
    );

    expect(response.status).toBe(200);
    const [received] = fake.requests;
    expect(received).toMatchObject({ method: 'POST', url: '/auth/login_flow', body });
    expect(received?.headers['content-length']).toBe(String(Buffer.byteLength(body)));
    expect(received?.headers['transfer-encoding']).toBeUndefined();
    expect(received?.headers['content-type']).toBe('application/json');
  });
});

describe('WebSocket proxy /ha/api/websocket', () => {
  it('connects the browser to HA in both directions with the handshake headers only', async () => {
    const { fake, acasystem } = await startWithFake();
    const client = acasystem.openWebSocket('/ha/api/websocket', {
      headers: {
        cookie: 'sessione=segreta',
        origin: 'http://altro.example',
        'x-forwarded-for': '203.0.113.9',
        'user-agent': 'AcasystemTest/1.0',
      },
    });

    await expect(nextMessage(client)).resolves.toEqual({
      type: 'auth_required',
      ha_version: '2026.10.0',
    });
    client.send(JSON.stringify({ type: 'auth', access_token: 'token-di-prova' }));
    await expect(nextMessage(client)).resolves.toEqual({
      type: 'eco',
      data: JSON.stringify({ type: 'auth', access_token: 'token-di-prova' }),
    });
    expect(fake.wsMessages).toEqual([JSON.stringify({ type: 'auth', access_token: 'token-di-prova' })]);

    const [handshake] = fake.handshakes;
    expect(handshake).toMatchObject({
      host: fake.host,
      upgrade: 'websocket',
      'sec-websocket-version': '13',
      'user-agent': 'AcasystemTest/1.0',
    });
    expect(handshake?.['sec-websocket-key']).toBeTruthy();
    expect(handshake?.cookie).toBeUndefined();
    expect(handshake?.origin).toBeUndefined();
    expect(handshake?.['x-forwarded-for']).toBeUndefined();
  });

  it('closes the HA side when the browser closes', async () => {
    const { fake, acasystem } = await startWithFake();
    const client = acasystem.openWebSocket('/ha/api/websocket');
    await nextMessage(client);
    const [serverSide] = [...fake.wsServer.clients];
    if (!serverSide) throw new Error('HA has no client');
    const serverClosed = once(serverSide, 'close');

    client.close(1000, 'uscita');

    const [code] = (await serverClosed) as [number];
    expect(code).toBe(1000);
  });

  it('closes the browser side when HA closes', async () => {
    const { acasystem } = await startWithFake();
    const client = acasystem.openWebSocket('/ha/api/websocket');
    await nextMessage(client);
    const clientClosed = once(client, 'close');

    client.send('chiudi');

    const [code, reason] = (await clientClosed) as [number, Buffer];
    expect(code).toBe(4000);
    expect(String(reason)).toBe('chiusura da HA');
  });

  it('tunnels through the Supervisor ingress prefix', async () => {
    const { acasystem } = await startWithFake();
    const client = acasystem.openWebSocket('/api/hassio_ingress/abc/ha/api/websocket', {
      headers: { 'x-ingress-path': '/api/hassio_ingress/abc' },
    });

    await expect(nextMessage(client)).resolves.toHaveProperty('type', 'auth_required');
  });

  it('refuses upgrades on any other path with 404, without contacting HA', async () => {
    const { fake, acasystem } = await startWithFake();

    for (const path of ['/ha/api/states', '/api/websocket', '/ha/api/websocket/extra', '/']) {
      const rejected = await expectRejectedUpgrade(acasystem.openWebSocket(path));
      expect(rejected.status, path).toBe(404);
      expect(JSON.parse(rejected.body), path).toHaveProperty('code', 'HA_PATH_NOT_ALLOWED');
    }
    expect(fake.handshakes).toHaveLength(0);
  });

  it('refuses an upgrade to a protocol other than WebSocket', async () => {
    const { fake, acasystem } = await startWithFake();

    const response = await acasystem.rawRequest('/ha/api/websocket', 'GET', {
      connection: 'Upgrade',
      upgrade: 'h2c',
    });

    expect(response.status).toBe(404);
    expect(JSON.parse(response.body)).toHaveProperty('code', 'HA_PATH_NOT_ALLOWED');
    expect(fake.handshakes).toHaveLength(0);

    // Comportamento documentato (SR-5): Upgrade h2c riceve 404 anche fuori da /ha.
    const health = await acasystem.rawRequest('/api/health', 'GET', {
      connection: 'Upgrade, HTTP2-Settings',
      upgrade: 'h2c',
      'http2-settings': '',
    });
    expect(health.status).toBe(404);
  });

  it('keeps tunnels and streams open beyond the server timeouts and the response timeout', async () => {
    const fake = await startFakeHomeAssistant();
    vi.stubEnv('TUNET_INTERNAL_HA_URL', fake.url);
    // L'attesa massima della prima risposta (1 s) non vale per stream e tunnel già avviati.
    vi.stubEnv('HA_PROXY_RESPONSE_TIMEOUT_MS', '1000');
    const acasystem = await startAcasystem({
      requestTimeout: 400,
      headersTimeout: 300,
      keepAliveTimeout: 100,
      connectionsCheckingInterval: 50,
    });
    const client = acasystem.openWebSocket('/ha/api/websocket');
    await nextMessage(client);
    const stream = await acasystem.request('/ha/api/camera_proxy_stream/camera.infinita');
    const reader = stream.body?.getReader();
    if (!reader) throw new Error('No response body');

    // Oltre il triplo di requestTimeout: WebSocket inattivo, flusso sempre aperto.
    const decoder = new TextDecoder();
    const startedAt = Date.now();
    let received = '';
    while (Date.now() - startedAt < 1_300) {
      const { value, done } = await reader.read();
      if (done) throw new Error('The stream was closed by a timeout');
      received += decoder.decode(value, { stream: true });
    }
    await reader.cancel();
    expect(received).toContain('fotogramma 10');

    client.send('ancora collegato');
    await expect(nextMessage(client)).resolves.toEqual({ type: 'eco', data: 'ancora collegato' });
  });

  it('passes an HA refusal of the upgrade back to the browser', async () => {
    const { fake, acasystem } = await startWithFake();
    fake.rejectUpgrade = true;

    const rejected = await expectRejectedUpgrade(acasystem.openWebSocket('/ha/api/websocket'));

    expect(rejected).toMatchObject({ status: 403, body: 'vietato' });
  });

  it('limits WebSocket upgrades per client address with 429 on the handshake', async () => {
    vi.stubEnv('HA_WEBSOCKET_RATE_LIMIT_MAX', '10');
    const { fake, acasystem } = await startWithFake();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const client = acasystem.openWebSocket('/ha/api/websocket');
      await expect(nextMessage(client)).resolves.toHaveProperty('type', 'auth_required');
      client.terminate();
    }

    const limited = await expectRejectedUpgrade(acasystem.openWebSocket('/ha/api/websocket'));
    expect(limited.status).toBe(429);
    expect(JSON.parse(limited.body)).toEqual({
      error: 'Troppi collegamenti a Home Assistant. Riprova tra qualche minuto.',
      code: 'HA_WEBSOCKET_RATE_LIMITED',
    });
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    expect(fake.handshakes).toHaveLength(10);

    // Il limite riguarda gli upgrade, non le richieste HTTP del proxy.
    expect((await acasystem.request('/ha/auth/providers')).status).toBe(200);
  });

  it('answers 503 without an internal HA URL and 502 when HA is down', async () => {
    vi.stubEnv('TUNET_INTERNAL_HA_URL', '');
    const acasystem = await startAcasystem();

    const notConfigured = await expectRejectedUpgrade(acasystem.openWebSocket('/ha/api/websocket'));
    expect(notConfigured.status).toBe(503);
    expect(JSON.parse(notConfigured.body)).toHaveProperty('code', 'HA_URL_NOT_CONFIGURED');

    vi.stubEnv('TUNET_INTERNAL_HA_URL', `http://127.0.0.1:${await findClosedLocalPort()}`);
    const unreachable = await expectRejectedUpgrade(acasystem.openWebSocket('/ha/api/websocket'));
    expect(unreachable.status).toBe(502);
    expect(JSON.parse(unreachable.body)).toHaveProperty('code', 'HA_UNREACHABLE');
  });
});

describe('malformed HA responses (SR-3)', () => {
  const startWithRawHomeAssistant = async (rawResponse: string) => {
    vi.stubEnv('TUNET_INTERNAL_HA_URL', await startRawHomeAssistant(rawResponse));
    return startAcasystem();
  };

  it('answers 502 to a status outside 100-599 and keeps serving', async () => {
    for (const status of ['099', '700']) {
      const acasystem = await startWithRawHomeAssistant(
        `HTTP/1.1 ${status} Strano\r\nContent-Type: text/plain\r\nContent-Length: 2\r\nConnection: close\r\n\r\nok`
      );

      const response = await acasystem.request('/ha/auth/providers');

      expect(response.status, status).toBe(502);
      await expect(response.json()).resolves.toEqual({
        error: 'Home Assistant non risponde.',
        code: 'HA_UNREACHABLE',
      });
      expect(response.headers.get('content-security-policy')).toBe(CONTENT_SECURITY_POLICY);
      expect((await acasystem.request('/api/health')).status).toBe(200);
    }
  });

  it('does not pass on a reason phrase with control characters', async () => {
    const acasystem = await startWithRawHomeAssistant(
      'HTTP/1.1 200 O\x01K\x7f\r\nContent-Type: text/plain\r\nContent-Length: 2\r\nConnection: close\r\n\r\nok'
    );

    const response = await acasystem.request('/ha/auth/providers');

    expect(response.status).toBe(200);
    expect(response.statusText).toBe('OK');
    await expect(response.text()).resolves.toBe('ok');
    expect((await acasystem.request('/api/health')).status).toBe(200);
  });

  it('answers 502 to a WebSocket handshake answered with an invalid status', async () => {
    const acasystem = await startWithRawHomeAssistant(
      'HTTP/1.1 099 Strano\r\nContent-Length: 0\r\nConnection: close\r\n\r\n'
    );

    const rejected = await expectRejectedUpgrade(acasystem.openWebSocket('/ha/api/websocket'));

    expect(rejected.status).toBe(502);
    expect(JSON.parse(rejected.body)).toHaveProperty('code', 'HA_UNREACHABLE');
    expect((await acasystem.request('/api/health')).status).toBe(200);
  });
});

describe('first response timeout (SR-4)', () => {
  it('answers 504 HA_TIMEOUT when HA does not answer an HTTP request in time', async () => {
    vi.stubEnv('HA_PROXY_RESPONSE_TIMEOUT_MS', '1000');
    const { fake, acasystem } = await startWithFake();
    fake.hang = true;
    const startedAt = Date.now();

    const response = await acasystem.request('/ha/auth/providers');

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toEqual({
      error: 'Home Assistant non ha risposto in tempo.',
      code: 'HA_TIMEOUT',
    });
    expect(response.headers.get('connection')).toBe('close');
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(900);
    // La richiesta verso HA viene chiusa.
    await vi.waitFor(() => expect(fake.hungClosed).toBe(1));
  });

  it('answers 504 HA_TIMEOUT when HA does not answer the WebSocket handshake in time', async () => {
    vi.stubEnv('HA_PROXY_RESPONSE_TIMEOUT_MS', '1000');
    const { fake, acasystem } = await startWithFake();
    fake.hang = true;

    const rejected = await expectRejectedUpgrade(acasystem.openWebSocket('/ha/api/websocket'));

    expect(rejected.status).toBe(504);
    expect(JSON.parse(rejected.body)).toEqual({
      error: 'Home Assistant non ha risposto in tempo.',
      code: 'HA_TIMEOUT',
    });
    await vi.waitFor(() => expect(fake.hungClosed).toBe(1));
  });
});
