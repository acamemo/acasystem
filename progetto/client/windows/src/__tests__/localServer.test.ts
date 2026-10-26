// @vitest-environment node

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { IncomingMessage, Server } from 'node:http';
import { connect } from 'node:net';
import type { AddressInfo } from 'node:net';
import type { Duplex } from 'node:stream';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isProxiedPath, startLocalServer } from '../localServer.ts';
import type { LocalServer } from '../localServer.ts';

/**
 * Il server locale con un finto mini PC: HTTP con corpo, WebSocket come upgrade grezzo,
 * file statici, ripiego SPA e controlli di sicurezza.
 */

let bundleDir: string;
let upstream: Server;
let upstreamOrigin: string;
let local: LocalServer;
const seen: { method: string; url: string; host: string; body: string }[] = [];
const upstreamSockets = new Set<Duplex>();

const listen = (server: Server): Promise<number> =>
  new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port)));

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => resolve(body));
  });

beforeEach(async () => {
  seen.length = 0;
  bundleDir = await mkdtemp(join(tmpdir(), 'aca-bundle-'));
  await mkdir(join(bundleDir, 'assets'));
  await mkdir(join(bundleDir, 'casa3d'));
  await writeFile(join(bundleDir, 'index.html'), '<!doctype html><title>Aca</title>');
  await writeFile(join(bundleDir, 'assets', 'app.js'), 'console.log(1)');
  await writeFile(join(bundleDir, 'casa3d', 'index.html'), 'casa');

  upstream = createServer(async (req, res) => {
    seen.push({ method: req.method ?? '', url: req.url ?? '', host: req.headers.host ?? '', body: await readBody(req) });
    res.writeHead(200, { 'Content-Type': 'application/json', 'X-Upstream': 'yes' });
    res.end(JSON.stringify({ status: 'ok', version: '0.9.28' }));
  });
  upstream.on('upgrade', (req, socket) => {
    upstreamSockets.add(socket);
    seen.push({ method: 'UPGRADE', url: req.url ?? '', host: req.headers.host ?? '', body: '' });
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');
    socket.on('data', (chunk) => socket.write(`eco:${chunk.toString()}`));
  });
  upstreamOrigin = `http://127.0.0.1:${await listen(upstream)}`;

  local = await startLocalServer(0);
});

afterEach(async () => {
  await local.close();
  upstream.closeAllConnections();
  for (const socket of upstreamSockets) socket.destroy();
  upstreamSockets.clear();
  await new Promise((resolve) => upstream.close(resolve));
  await rm(bundleDir, { recursive: true, force: true });
});

// La porta 0 sceglie una porta libera; l'origine reale si legge dal socket.
const portOf = () => Number(new URL(local.origin).port);

describe('server locale del guscio', () => {
  it('risponde 503 finché non ha una versione da servire', async () => {
    const response = await fetch(`${local.origin}/`);
    expect(response.status).toBe(503);
  });

  it('serve i file e ripiega su index.html solo per le rotte', async () => {
    local.setTarget({ bundleDir, serverOrigin: upstreamOrigin });
    const index = await fetch(`${local.origin}/`);
    expect(index.status).toBe(200);
    expect(index.headers.get('content-security-policy')).toContain("script-src 'self'");
    expect(index.headers.get('cache-control')).toBe('no-cache');

    const asset = await fetch(`${local.origin}/assets/app.js`);
    expect(asset.headers.get('content-type')).toContain('text/javascript');
    expect(await asset.text()).toBe('console.log(1)');

    expect(await (await fetch(`${local.origin}/sistema/aspetto`)).text()).toContain('<title>Aca</title>');
    expect((await fetch(`${local.origin}/assets/missing.js`)).status).toBe(404);
    expect(await (await fetch(`${local.origin}/casa3d/`)).text()).toBe('casa');
    expect((await fetch(`${local.origin}/casa3d/editor`)).status).toBe(404);
  });

  it('non esce dalla cartella e rifiuta host estranei', async () => {
    local.setTarget({ bundleDir, serverOrigin: upstreamOrigin });
    const escaped = await fetch(`${local.origin}/%2e%2e/%2e%2e/windows/win.ini`);
    expect([400, 404]).toContain(escaped.status);
    const rebinding = await new Promise<string>((resolve) => {
      const socket = connect(portOf(), '127.0.0.1', () =>
        socket.write('GET / HTTP/1.1\r\nHost: attacker.example:80\r\nConnection: close\r\n\r\n')
      );
      let text = '';
      socket.on('data', (chunk) => (text += chunk.toString()));
      socket.on('end', () => resolve(text));
    });
    expect(rebinding).toMatch(/^HTTP\/1\.1 421/);
  });

  it('inoltra /api e /ha al mini PC con il corpo e l\'host giusto', async () => {
    local.setTarget({ bundleDir, serverOrigin: upstreamOrigin });
    const health = await fetch(`${local.origin}/api/health`);
    expect(await health.json()).toEqual({ status: 'ok', version: '0.9.28' });
    expect(health.headers.get('x-upstream')).toBe('yes');

    await fetch(`${local.origin}/ha/auth/token?x=1`, { method: 'POST', body: 'grant_type=refresh_token' });
    expect(seen.at(-1)).toEqual({
      method: 'POST',
      url: '/ha/auth/token?x=1',
      host: new URL(upstreamOrigin).host,
      body: 'grant_type=refresh_token',
    });
    expect(isProxiedPath('/apix')).toBe(false);
    expect(isProxiedPath('/hacker')).toBe(false);
  });

  it('dice 502 se il mini PC non risponde', async () => {
    local.setTarget({ bundleDir, serverOrigin: 'http://127.0.0.1:1' });
    const response = await fetch(`${local.origin}/api/health`);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'MINI_PC_UNREACHABLE' });
  });

  it('inoltra il WebSocket di /ha nei due sensi e rifiuta gli altri upgrade', async () => {
    local.setTarget({ bundleDir, serverOrigin: upstreamOrigin });
    const exchange = (path: string, send: string) =>
      new Promise<string>((resolve) => {
        const socket = connect(portOf(), '127.0.0.1', () =>
          socket.write(
            `GET ${path} HTTP/1.1\r\nHost: 127.0.0.1:${portOf()}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n`
          )
        );
        let text = '';
        socket.on('data', (chunk) => {
          text += chunk.toString();
          if (text.includes('\r\n\r\n') && !text.includes('eco:') && text.startsWith('HTTP/1.1 101')) socket.write(send);
          if (text.includes(`eco:${send}`)) socket.destroy();
        });
        socket.on('close', () => resolve(text));
      });
    const reply = await exchange('/ha/api/websocket', 'ciao');
    expect(reply).toMatch(/^HTTP\/1\.1 101/);
    expect(reply).toContain('eco:ciao');
    expect(seen.some((item) => item.method === 'UPGRADE' && item.url === '/ha/api/websocket')).toBe(true);
    expect(await exchange('/api/socket', 'x')).toMatch(/^HTTP\/1\.1 403/);
  });

  it('segnala la porta occupata', async () => {
    await expect(startLocalServer(portOf())).rejects.toThrow();
  });
});
