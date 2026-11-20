// @vitest-environment node

import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DiskMismatchError, downloadFile, verifyDisk } from '../download.ts';
import type { DownloadOptions } from '../download.ts';
import type { DownloadProgress } from '../types.ts';

let dir: string;
let server: http.Server | null = null;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'aca-dl-'));
});

afterEach(async () => {
  server?.closeAllConnections();
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = null;
  await rm(dir, { recursive: true, force: true });
});

const sample = Buffer.from(Array.from({ length: 300_000 }, (_, i) => (i * 7 + 3) % 251));
const sha = (data: Buffer): string => createHash('sha256').update(data).digest('hex');

interface ServerMode {
  dropOnce?: boolean;
  ignoreRange?: boolean;
  fail500Once?: boolean;
}

const serve = async (data: Buffer, mode: ServerMode = {}): Promise<{ url: string; requests: string[] }> => {
  const requests: string[] = [];
  let dropped = false;
  let failed = false;
  server = http.createServer((req, res) => {
    if (req.url === '/redirect') {
      res.writeHead(302, { Location: '/disk.bin' });
      res.end();
      return;
    }
    requests.push(req.headers.range ?? '-');
    if (mode.fail500Once && !failed) {
      failed = true;
      res.writeHead(503);
      res.end();
      return;
    }
    const match = /^bytes=(\d+)-$/.exec(req.headers.range ?? '');
    const start = match && !mode.ignoreRange ? Number(match[1]) : 0;
    if (start >= data.length) {
      res.writeHead(416);
      res.end();
      return;
    }
    const body = data.subarray(start);
    res.writeHead(start > 0 ? 206 : 200, { 'Content-Length': body.length });
    if (mode.dropOnce && !dropped) {
      dropped = true;
      res.write(body.subarray(0, Math.floor(body.length / 2)), () => req.socket.destroy());
      return;
    }
    res.end(body);
  });
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/redirect`, requests };
};

const options = (url: string, overrides: Partial<DownloadOptions> = {}): DownloadOptions => ({
  url,
  partPath: join(dir, 'disk.zip.part'),
  totalBytes: sample.length,
  signal: new AbortController().signal,
  onProgress: () => undefined,
  now: () => Date.now(),
  sleep: () => new Promise((resolve) => setTimeout(resolve, 5)),
  retryDelayMs: 5,
  stallMs: 2_000,
  maxAttempts: 5,
  progressIntervalMs: 0,
  ...overrides,
});

describe('downloadFile', () => {
  it('segue il reindirizzamento e scarica tutto il file', async () => {
    const { url } = await serve(sample);
    const progress: DownloadProgress[] = [];
    await downloadFile(options(url, { onProgress: (p) => progress.push(p) }));
    expect((await readFile(join(dir, 'disk.zip.part'))).equals(sample)).toBe(true);
    expect(progress.at(-1)?.receivedBytes).toBe(sample.length);
    expect(progress.at(-1)?.attempt).toBe(1);
  });

  it('riprende dopo una connessione caduta a metà con Range e il risultato ha l’impronta giusta', async () => {
    const { url, requests } = await serve(sample, { dropOnce: true });
    const progress: DownloadProgress[] = [];
    await downloadFile(options(url, { onProgress: (p) => progress.push(p) }));
    const result = await readFile(join(dir, 'disk.zip.part'));
    expect(sha(result)).toBe(sha(sample));
    expect(requests[0]).toBe('-');
    expect(requests[1]).toMatch(/^bytes=\d+-$/);
    expect(progress.at(-1)?.attempt).toBe(2);
    await verifyDisk(join(dir, 'disk.zip.part'), sample.length, sha(sample));
  });

  it('riprova dopo un errore 5xx', async () => {
    const { url } = await serve(sample, { fail500Once: true });
    const progress: DownloadProgress[] = [];
    await downloadFile(options(url, { onProgress: (p) => progress.push(p) }));
    expect(progress.at(-1)?.attempt).toBe(2);
  });

  it('riparte da zero se il server risponde 200 a una richiesta con Range', async () => {
    const { url } = await serve(sample, { ignoreRange: true });
    await writeFile(join(dir, 'disk.zip.part'), sample.subarray(0, 1000));
    await downloadFile(options(url));
    expect(sha(await readFile(join(dir, 'disk.zip.part')))).toBe(sha(sample));
  });

  it('considera completo un file parziale già della dimensione attesa, senza richieste', async () => {
    const { url, requests } = await serve(sample);
    await writeFile(join(dir, 'disk.zip.part'), sample);
    await downloadFile(options(url));
    expect(requests).toHaveLength(0);
  });

  it('un 404 non si riprova', async () => {
    server = http.createServer((_req, res) => {
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/x`;
    await expect(downloadFile(options(url))).rejects.toThrow('HTTP 404');
  });

  it('annullando si ferma e conserva il file parziale', async () => {
    server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Length': sample.length });
      res.write(sample.subarray(0, 50_000));
    });
    await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/x`;
    const controller = new AbortController();
    const done = downloadFile(
      options(url, {
        signal: controller.signal,
        onProgress: (p) => {
          if (p.receivedBytes >= 50_000) setTimeout(() => controller.abort(), 50);
        },
      })
    );
    await expect(done).rejects.toThrow();
    expect((await stat(join(dir, 'disk.zip.part'))).size).toBeGreaterThan(0);
  });
});

describe('verifyDisk', () => {
  it('impronta diversa: elimina il file e segnala la discordanza', async () => {
    const part = join(dir, 'disk.zip.part');
    await writeFile(part, sample);
    await expect(verifyDisk(part, sample.length, sha(Buffer.from('altro')))).rejects.toBeInstanceOf(DiskMismatchError);
    await expect(stat(part)).rejects.toThrow();
  });

  it('dimensione diversa: discordanza', async () => {
    const part = join(dir, 'disk.zip.part');
    await writeFile(part, sample);
    await expect(verifyDisk(part, sample.length + 1, sha(sample))).rejects.toBeInstanceOf(DiskMismatchError);
  });
});
