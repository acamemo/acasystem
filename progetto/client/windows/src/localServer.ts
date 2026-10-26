import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, request as httpRequest } from 'node:http';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Duplex } from 'node:stream';
import { extname, join, resolve, sep } from 'node:path';

/**
 * Server locale del guscio Windows, solo su 127.0.0.1 (ADR-0023, scelta esecutiva di C5):
 * serve l'interfaccia scaricata e inoltra `/api` e `/ha` (WebSocket compreso) al server
 * Acasystem sul mini PC. La pagina vede una sola origine, come sul banco: niente CORS,
 * niente contenuto misto, `client_id` di HA uguale all'origine (loopback, ammessa da HA).
 */

/** Copia della CSP del server (backend/src/config/security.ts): da tenere allineata. */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: http: https: https://cdn.jsdelivr.net https://cdn.simpleicons.org https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org",
  "connect-src 'self' ws: wss: http: https:",
  'frame-src https://www.openstreetmap.org',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.hdr': 'application/octet-stream',
};

/** Percorsi inoltrati al mini PC; tutto il resto viene dall'interfaccia scaricata. */
export const isProxiedPath = (pathname: string): boolean =>
  pathname === '/api' || pathname.startsWith('/api/') || pathname === '/ha' || pathname.startsWith('/ha/');

export interface LocalServerTarget {
  /** Cartella dell'interfaccia (bundles/<versione>). */
  bundleDir: string;
  /** Server Acasystem, per esempio http://192.168.1.184:3002. */
  serverOrigin: string;
}

export interface LocalServer {
  readonly origin: string;
  setTarget(target: LocalServerTarget | null): void;
  close(): Promise<void>;
}

const sendText = (res: ServerResponse, status: number, text: string): void => {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
  res.end(text);
};

/** File dentro la cartella o `null`: niente uscite con `..` o percorsi codificati. */
const resolveInside = (root: string, pathname: string): string | null => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const base = resolve(root);
  const target = resolve(join(base, decoded));
  return target === base || target.startsWith(base + sep) ? target : null;
};

const fileAt = async (path: string): Promise<string | null> => {
  try {
    const info = await stat(path);
    if (info.isFile()) return path;
    if (info.isDirectory()) {
      const index = join(path, 'index.html');
      return (await stat(index)).isFile() ? index : null;
    }
  } catch {
    // assente
  }
  return null;
};

const serveStatic = async (bundleDir: string, pathname: string, res: ServerResponse): Promise<void> => {
  const candidate = resolveInside(bundleDir, pathname);
  if (!candidate) return sendText(res, 400, 'Percorso non valido');
  let file = await fileAt(candidate);
  // Ripiego SPA come il server (frontendController): solo per percorsi senza estensione,
  // e non sotto /casa3d/, dove un file mancante è un 404 (ADR-0014, D16).
  if (!file && !extname(pathname) && !pathname.startsWith('/casa3d/')) {
    file = await fileAt(join(bundleDir, 'index.html'));
  }
  if (!file) return sendText(res, 404, 'Non trovato');
  const isHtml = extname(file) === '.html';
  res.writeHead(200, {
    'Content-Type': CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Content-Security-Policy': CONTENT_SECURITY_POLICY,
    'X-Content-Type-Options': 'nosniff',
    // I file con hash non cambiano dentro una versione; index.html sì, al cambio di versione.
    'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  createReadStream(file).on('error', () => res.destroy()).pipe(res);
};

const upstreamHeaders = (headers: IncomingHttpHeaders, upstream: URL): IncomingHttpHeaders => ({
  ...headers,
  host: upstream.host,
});

const proxyHttp = (req: IncomingMessage, res: ServerResponse, upstream: URL): void => {
  const proxied = httpRequest(
    {
      protocol: upstream.protocol,
      hostname: upstream.hostname,
      port: upstream.port,
      method: req.method,
      path: req.url,
      headers: upstreamHeaders(req.headers, upstream),
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    }
  );
  proxied.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'MINI_PC_UNREACHABLE' }));
    } else {
      res.destroy();
    }
  });
  req.pipe(proxied);
};

const rawHeaderBlock = (rawHeaders: string[]): string => {
  let block = '';
  for (let index = 0; index + 1 < rawHeaders.length; index += 2) {
    block += `${rawHeaders[index]}: ${rawHeaders[index + 1]}\r\n`;
  }
  return block;
};

const proxyUpgrade = (
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  upstream: URL,
  track: (socket: Duplex) => void
): void => {
  const proxied = httpRequest({
    protocol: upstream.protocol,
    hostname: upstream.hostname,
    port: upstream.port,
    method: req.method,
    path: req.url,
    headers: upstreamHeaders(req.headers, upstream),
  });
  proxied.on('upgrade', (upstreamRes, upstreamSocket, upstreamHead) => {
    track(upstreamSocket);
    socket.write(
      `HTTP/1.1 ${upstreamRes.statusCode} ${upstreamRes.statusMessage}\r\n${rawHeaderBlock(upstreamRes.rawHeaders)}\r\n`
    );
    if (upstreamHead.length) socket.write(upstreamHead);
    if (head.length) upstreamSocket.write(head);
    upstreamSocket.on('error', () => socket.destroy());
    socket.on('error', () => upstreamSocket.destroy());
    upstreamSocket.pipe(socket).pipe(upstreamSocket);
  });
  proxied.on('response', (upstreamRes) => {
    socket.end(`HTTP/1.1 ${upstreamRes.statusCode} ${upstreamRes.statusMessage}\r\nConnection: close\r\n\r\n`);
    upstreamRes.resume();
  });
  proxied.on('error', () => socket.end('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n'));
  proxied.end();
};

/** Avvia il server su 127.0.0.1:`port`; rifiuta se la porta è occupata. */
export const startLocalServer = (port: number): Promise<LocalServer> =>
  new Promise((resolveStart, rejectStart) => {
    let target: LocalServerTarget | null = null;
    // Calcolati dopo l'avvio: con la porta 0 (prove) la porta vera la sceglie il sistema.
    let allowedHosts = new Set<string>();
    // Difesa dal DNS rebinding: una pagina esterna non può parlare con questo server.
    const hostAllowed = (req: IncomingMessage) => allowedHosts.has(req.headers.host ?? '');
    // I WebSocket passati all'upgrade non sono più connessioni HTTP: si chiudono a mano.
    const upgraded = new Set<Duplex>();
    const track = (socket: Duplex) => {
      upgraded.add(socket);
      socket.once('close', () => upgraded.delete(socket));
    };

    const server = createServer((req, res) => {
      if (!hostAllowed(req)) return sendText(res, 421, 'Host non ammesso');
      if (!target) return sendText(res, 503, 'Acasystem non è ancora pronto');
      const { pathname } = new URL(req.url ?? '/', 'http://127.0.0.1');
      if (isProxiedPath(pathname)) return proxyHttp(req, res, new URL(target.serverOrigin));
      if (req.method !== 'GET' && req.method !== 'HEAD') return sendText(res, 405, 'Metodo non ammesso');
      void serveStatic(target.bundleDir, pathname, res);
    });

    server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
      const { pathname } = new URL(req.url ?? '/', 'http://127.0.0.1');
      if (!hostAllowed(req) || !target || !pathname.startsWith('/ha/')) {
        socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
        return;
      }
      track(socket);
      proxyUpgrade(req, socket, head, new URL(target.serverOrigin), track);
    });

    server.once('error', rejectStart);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', rejectStart);
      const actualPort = (server.address() as AddressInfo).port;
      allowedHosts = new Set([`127.0.0.1:${actualPort}`, `localhost:${actualPort}`]);
      resolveStart({
        origin: `http://127.0.0.1:${actualPort}`,
        setTarget: (next) => {
          target = next;
        },
        close: () =>
          new Promise((resolveClose) => {
            server.closeAllConnections();
            for (const socket of upgraded) socket.destroy();
            server.close(() => resolveClose());
          }),
      });
    });
  });
