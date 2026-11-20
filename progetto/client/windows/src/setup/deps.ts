import { execFile } from 'node:child_process';
import { access, statfs } from 'node:fs/promises';
import { availableParallelism, networkInterfaces, totalmem } from 'node:os';
import type { NetworkInterfaceInfo } from 'node:os';
import net from 'node:net';
import { dirname } from 'node:path';
import {
  CHECK_TIMEOUT_MS,
  CREATE_TIMEOUT_MS,
  DISK_SHA256,
  DISK_SIZE_BYTES,
  DISK_URL,
  DOWNLOAD_RETRY_DELAY_MS,
  DOWNLOAD_STALL_MS,
  MAX_DOWNLOAD_ATTEMPTS,
  POLL_MS,
  PREPARING_STALL_MS,
  PROGRESS_INTERVAL_MS,
  REQUIRED_FREE_BYTES,
  SWEEP_INTERVAL_MS,
} from './constants.ts';
import { httpGet } from './net.ts';
import type { HttpGetOptions, HttpGetResult } from './net.ts';

export interface ExecOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ExecResult {
  /** Codice di uscita; null se il processo non è partito o è stato interrotto. */
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/** Valori regolabili (le prove li accorciano). */
export interface SetupTuning {
  diskUrl: string;
  diskSha256: string;
  diskSizeBytes: number;
  requiredFreeBytes: number;
  maxDownloadAttempts: number;
  retryDelayMs: number;
  stallMs: number;
  progressIntervalMs: number;
  pollMs: number;
  /** Minuti senza progressi dopo i quali la preparazione fallisce (20 min). */
  preparingStallMs: number;
  sweepIntervalMs: number;
  checkTimeoutMs: number;
  createTimeoutMs: number;
}

/** Tutto ciò che tocca il sistema operativo o la rete, sostituibile nelle prove. */
export interface SetupDeps {
  exec(file: string, args: string[], options?: ExecOptions): Promise<ExecResult>;
  httpGet(url: string, options: HttpGetOptions): Promise<HttpGetResult>;
  /** true se la connessione TCP si apre entro il tempo dato. */
  tcpProbe(host: string, port: number, timeoutMs: number): Promise<boolean>;
  networkInterfaces(): NodeJS.Dict<NetworkInterfaceInfo[]>;
  /** Memoria totale e processori logici di questo PC. */
  machine(): { totalMemoryBytes: number; logicalCpus: number };
  now(): number;
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
  /** Byte liberi sul disco che contiene (o conterrà) il percorso. */
  freeBytes(path: string): Promise<number>;
  pathExists(path: string): Promise<boolean>;
  env: Record<string, string | undefined>;
  tuning: SetupTuning;
}

/** Sostituzioni parziali accettate da createCentralSetup. */
export type SetupDepsInput = Partial<Omit<SetupDeps, 'tuning'>> & { tuning?: Partial<SetupTuning> };

export const DEFAULT_TUNING: SetupTuning = {
  diskUrl: DISK_URL,
  diskSha256: DISK_SHA256,
  diskSizeBytes: DISK_SIZE_BYTES,
  requiredFreeBytes: REQUIRED_FREE_BYTES,
  maxDownloadAttempts: MAX_DOWNLOAD_ATTEMPTS,
  retryDelayMs: DOWNLOAD_RETRY_DELAY_MS,
  stallMs: DOWNLOAD_STALL_MS,
  progressIntervalMs: PROGRESS_INTERVAL_MS,
  pollMs: POLL_MS,
  preparingStallMs: PREPARING_STALL_MS,
  sweepIntervalMs: SWEEP_INTERVAL_MS,
  checkTimeoutMs: CHECK_TIMEOUT_MS,
  createTimeoutMs: CREATE_TIMEOUT_MS,
};

const exec: SetupDeps['exec'] = (file, args, options = {}) =>
  new Promise((resolve) => {
    execFile(
      file,
      args,
      {
        windowsHide: true,
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
        ...(options.timeoutMs ? { timeout: options.timeoutMs } : {}),
        ...(options.signal ? { signal: options.signal } : {}),
      },
      (error, stdout, stderr) => {
        const failure = error as (NodeJS.ErrnoException & { killed?: boolean }) | null;
        resolve({
          code: failure ? (typeof failure.code === 'number' ? failure.code : null) : 0,
          stdout: String(stdout ?? ''),
          stderr: String(stderr ?? ''),
          timedOut: Boolean(failure?.killed) && !options.signal?.aborted,
        });
      }
    );
  });

const tcpProbe: SetupDeps['tcpProbe'] = (host, port, timeoutMs) =>
  new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (opened: boolean): void => {
      socket.destroy();
      resolve(opened);
    };
    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });

const pathExists: SetupDeps['pathExists'] = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

/** statfs sull'antenato esistente più vicino: la cartella della centrale non esiste ancora. */
const freeBytes: SetupDeps['freeBytes'] = async (path) => {
  let current = path;
  for (;;) {
    try {
      const stats = await statfs(current);
      return Number(stats.bavail) * Number(stats.bsize);
    } catch {
      const parent = dirname(current);
      if (parent === current) throw new Error('Disco non raggiungibile');
      current = parent;
    }
  }
};

const sleep: SetupDeps['sleep'] = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error('Annullato'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(signal?.reason ?? new Error('Annullato'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });

export const resolveDeps = (input: SetupDepsInput = {}): SetupDeps => ({
  exec,
  httpGet,
  tcpProbe,
  networkInterfaces,
  machine: () => ({ totalMemoryBytes: totalmem(), logicalCpus: availableParallelism() }),
  now: () => Date.now(),
  sleep,
  freeBytes,
  pathExists,
  env: process.env,
  ...input,
  tuning: { ...DEFAULT_TUNING, ...input.tuning },
});
