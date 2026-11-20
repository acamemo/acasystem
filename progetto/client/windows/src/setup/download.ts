import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, open, readdir, rename, rm, stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { SPEED_WINDOW_MS } from './constants.ts';
import type { SetupDeps } from './deps.ts';
import { openResponse } from './net.ts';
import type { DownloadProgress } from './types.ts';

/** Download del disco con ripresa, tentativi ripetuti, verifica e estrazione. */

/** Errore che non vale la pena riprovare (es. HTTP 404). */
export class DownloadFatalError extends Error {}
/** Tentativi esauriti. */
export class DownloadFailedError extends Error {}
/** Il disco scaricato non corrisponde a quello previsto. */
export class DiskMismatchError extends Error {}
/** L'estrazione dell'archivio non è riuscita. */
export class ExtractError extends Error {}

export interface DownloadOptions {
  url: string;
  partPath: string;
  totalBytes: number;
  signal: AbortSignal;
  onProgress(progress: DownloadProgress): void;
  now(): number;
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
  retryDelayMs: number;
  stallMs: number;
  maxAttempts: number;
  progressIntervalMs: number;
}

const sizeOf = async (path: string): Promise<number> => {
  try {
    return (await stat(path)).size;
  } catch {
    return 0;
  }
};

class RetryableError extends Error {}

export const downloadFile = async (options: DownloadOptions): Promise<void> => {
  const { partPath, totalBytes, signal } = options;
  await mkdir(dirname(partPath), { recursive: true });
  let samples: Array<{ at: number; bytes: number }> = [];
  let lastEmit = 0;

  const emit = (received: number, attempt: number, force: boolean): void => {
    const at = options.now();
    if (!force && at - lastEmit < options.progressIntervalMs) return;
    lastEmit = at;
    samples.push({ at, bytes: received });
    while (samples.length > 1 && at - (samples[0]?.at ?? at) > SPEED_WINDOW_MS) samples.shift();
    const first = samples[0];
    const seconds = first ? (at - first.at) / 1000 : 0;
    const speed = first && seconds > 0 ? Math.max(0, (received - first.bytes) / seconds) : 0;
    options.onProgress({
      receivedBytes: received,
      totalBytes,
      bytesPerSecond: Math.round(speed),
      etaSeconds: speed > 0 ? Math.round((totalBytes - received) / speed) : null,
      attempt,
    });
  };

  const attemptOnce = async (existing: number, attempt: number): Promise<boolean> => {
    const response = await openResponse(options.url, {
      ...(existing > 0 ? { headers: { Range: `bytes=${existing}-` } } : {}),
      timeoutMs: options.stallMs,
      signal,
    });
    const status = response.statusCode ?? 0;
    if (status === 416) {
      response.resume();
      await rm(partPath, { force: true });
      throw new RetryableError('Intervallo non valido');
    }
    if (status >= 500) {
      response.resume();
      throw new RetryableError(`HTTP ${status}`);
    }
    if (status !== 200 && status !== 206) {
      response.resume();
      throw new DownloadFatalError(`HTTP ${status}`);
    }
    // 200 a una richiesta con Range: il server ignora l'intervallo, si riparte da zero.
    const start = status === 206 ? existing : 0;
    let received = start;
    // Ogni blocco è scritto prima di essere contato: annullando o perdendo la connessione,
    // il file parziale contiene esattamente i byte mostrati e la ripresa parte da lì.
    const file = await open(partPath, start > 0 ? 'a' : 'w');
    const stop = (): void => {
      response.destroy(new Error('Download annullato'));
    };
    signal.addEventListener('abort', stop, { once: true });
    try {
      for await (const chunk of response as AsyncIterable<Buffer>) {
        signal.throwIfAborted();
        await file.write(chunk);
        received += chunk.length;
        emit(received, attempt, false);
      }
    } finally {
      signal.removeEventListener('abort', stop);
      await file.close();
    }
    signal.throwIfAborted();
    emit(received, attempt, true);
    if (received > totalBytes) await rm(partPath, { force: true });
    return received === totalBytes;
  };

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    signal.throwIfAborted();
    let existing = await sizeOf(partPath);
    if (existing > totalBytes) {
      await rm(partPath, { force: true });
      existing = 0;
    }
    if (existing === totalBytes) return;
    samples = [];
    emit(existing, attempt, true);
    try {
      if (await attemptOnce(existing, attempt)) return;
    } catch (error) {
      if (signal.aborted || error instanceof DownloadFatalError) throw error;
    }
    if (attempt < options.maxAttempts) await options.sleep(options.retryDelayMs, signal);
  }
  throw new DownloadFailedError('Tentativi esauriti');
};

export const sha256OfFile = async (path: string, signal?: AbortSignal): Promise<string> => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) {
    signal?.throwIfAborted();
    hash.update(chunk as Buffer);
  }
  return hash.digest('hex');
};

/** Verifica dimensione e impronta; in caso di discordanza elimina il file parziale. */
export const verifyDisk = async (partPath: string, expectedSize: number, expectedSha256: string): Promise<void> => {
  const size = await sizeOf(partPath);
  if (size !== expectedSize || (await sha256OfFile(partPath)) !== expectedSha256) {
    await rm(partPath, { force: true });
    throw new DiskMismatchError('Impronta o dimensione diverse');
  }
};

/** Rinomina in .zip, estrae con tar e restituisce il percorso del .vdi. */
export const extractDisk = async (
  deps: SetupDeps,
  partPath: string,
  downloadDir: string
): Promise<string> => {
  const zipPath = partPath.replace(/\.part$/, '');
  await rename(partPath, zipPath);
  const tar = join(deps.env.SystemRoot ?? deps.env.SYSTEMROOT ?? 'C:\\Windows', 'System32', 'tar.exe');
  const result = await deps.exec(tar, ['-xf', zipPath, '-C', downloadDir], { timeoutMs: 15 * 60_000 });
  const vdi = await findVdi(downloadDir);
  if (result.code !== 0 || !vdi) throw new ExtractError('Estrazione non riuscita');
  await rm(zipPath, { force: true });
  return vdi;
};

export const findVdi = async (dir: string): Promise<string | null> => {
  try {
    const name = (await readdir(dir)).find((entry) => entry.toLowerCase().endsWith('.vdi'));
    return name ? join(dir, name) : null;
  } catch {
    return null;
  }
};

/** File .part del disco dentro la cartella dei download (nome ricavato dall'indirizzo). */
export const partPathFor = (downloadDir: string, url: string): string =>
  join(downloadDir, `${basename(new URL(url).pathname)}.part`);

/** Se un'estrazione precedente si è interrotta dopo il rename, il .zip torna a essere .part. */
export const recoverZip = async (partPath: string): Promise<void> => {
  const zipPath = partPath.replace(/\.part$/, '');
  if ((await sizeOf(zipPath)) > 0 && (await sizeOf(partPath)) === 0) await rename(zipPath, partPath);
};
