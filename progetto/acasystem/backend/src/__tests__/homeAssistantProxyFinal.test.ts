// @vitest-environment node

import http from 'node:http';
import type { IncomingMessage, Server } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import type { Server as NetServer, Socket } from 'node:net';
import { PassThrough } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { openDatabase } from '../models/database.ts';
import type { SqliteDatabase } from '../models/database.ts';
import { attachHomeAssistantWebSocketProxy } from '../routes/homeAssistantProxy.ts';
import { createApp } from '../server.ts';
import { readLimitedRequestBody } from '../services/homeAssistantProxyService.ts';

/**
 * Last review of the Home Assistant proxy (REP-20261007-002): R-1 (an HTTP answer must be
 * final), R-2 (isolation headers on a refused WebSocket handshake), R-6 (time limit on the
 * body of the login start).
 */

const PROXY_CSP = "default-src 'none'; sandbox";

const servers: (Server | NetServer)[] = [];
const databases: SqliteDatabase[] = [];
const sockets: Socket[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  for (const socket of sockets.splice(0)) socket.destroy();
  await Promise.all(
    servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))
  );
  for (const database of databases.splice(0)) database.close();
});

/** A fake HA that writes the same raw answer to every request. */
const startRawHomeAssistant = async (rawResponse: string): Promise<string> => {
  const server = createNetServer((socket) => {
    sockets.push(socket);
    socket.once('data', () => socket.end(rawResponse));
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no address');
  return `http://127.0.0.1:${address.port}`;
};

const startAcasystem = async () => {
  vi.stubEnv('TUNET_INTERNAL_HA_FALLBACK_URL', '');
  vi.stubEnv('TUNET_TRUST_SUPERVISOR_INGRESS', '');
  const database = openDatabase(':memory:');
  databases.push(database);
  const server = http.createServer(createApp({ database, isProduction: false }));
  attachHomeAssistantWebSocketProxy(server);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no address');
  return `127.0.0.1:${address.port}`;
};

describe('Home Assistant proxy, last review', () => {
  it('R-1: answers 502 to a 101 without upgrade on a plain HTTP request', async () => {
    vi.stubEnv(
      'TUNET_INTERNAL_HA_URL',
      await startRawHomeAssistant('HTTP/1.1 101 Switching Protocols\r\nConnection: close\r\n\r\n')
    );
    const host = await startAcasystem();

    const response = await fetch(`http://${host}/ha/auth/providers`);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toHaveProperty('code', 'HA_UNREACHABLE');
  });

  it('R-2: a refused WebSocket handshake carries the isolation headers of /ha', async () => {
    vi.stubEnv(
      'TUNET_INTERNAL_HA_URL',
      await startRawHomeAssistant(
        'HTTP/1.1 403 Forbidden\r\nContent-Type: text/html\r\nContent-Security-Policy: script-src *\r\nContent-Length: 2\r\nConnection: close\r\n\r\nno'
      )
    );
    const host = await startAcasystem();

    const client = new WebSocket(`ws://${host}/ha/api/websocket`);
    const headers = await new Promise<IncomingMessage['headers']>((resolve, reject) => {
      client.on('open', () => reject(new Error('WebSocket opened unexpectedly')));
      client.on('unexpected-response', (req, res) => {
        resolve(res.headers);
        req.destroy();
      });
      client.on('error', () => undefined);
    });

    expect(headers['content-security-policy']).toBe(PROXY_CSP);
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  it('R-6: stops waiting for a login body that never ends', async () => {
    const body = new PassThrough();
    const req = Object.assign(body, {
      headers: { 'content-length': '40' },
    }) as unknown as IncomingMessage;
    body.write('{"handler":');

    const started = Date.now();
    const result = await readLimitedRequestBody(req, 4096, 60);

    expect(result).toEqual({ status: 'timeout' });
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('R-6: still reads a complete body within the time limit', async () => {
    const body = new PassThrough();
    const req = Object.assign(body, {
      headers: {},
    }) as unknown as IncomingMessage;
    setTimeout(() => body.end('{"ok":true}'), 10);

    const result = await readLimitedRequestBody(req, 4096, 1000);

    expect(result).toEqual({ status: 'ok', bytes: Buffer.from('{"ok":true}') });
  });
});
