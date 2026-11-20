import { rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { APP_PORT } from './constants.ts';
import { resolveDeps } from './deps.ts';
import type { SetupDeps, SetupDepsInput } from './deps.ts';
import { runAllChecks } from './checks.ts';
import {
  DiskMismatchError,
  downloadFile,
  extractDisk,
  ExtractError,
  findVdi,
  partPathFor,
  recoverZip,
  verifyDisk,
} from './download.ts';
import { buildQr } from './qr.ts';
import { loadState, saveState } from './state.ts';
import { buildSteps, createTracker, PREPARING_TIMEOUT_MESSAGE } from './tracker.ts';
import type { Tracker, TrackerOutcome } from './tracker.ts';
import type { CentralSetup, SetupCheck, SetupFailureStep, SetupPhase } from './types.ts';
import { createVm, findVBoxManage, readInstallInfo } from './vm.ts';

export interface CentralSetupOptions {
  /** app.getPath('userData'): qui vive il file di stato. */
  userDataDir: string;
  /** Cartella della VM, es. <installazione>\Centrale. NON deve esistere prima della creazione. */
  centraleDir: string;
  /** Cartella con Installa-Centrale.ps1 e supervisore\ (<installazione>\Installatore). */
  scriptsDir: string;
  /** Sostituzioni per le prove. */
  deps?: SetupDepsInput;
}

const MESSAGES = {
  download: 'Il download non è riuscito. Controlla la connessione a Internet e riprova.',
  mismatch: 'Il disco scaricato non corrisponde a quello previsto. Riprova: verrà scaricato di nuovo.',
  extract: 'Non è stato possibile estrarre il disco scaricato. Riprova.',
  interrupted: 'La creazione della centrale è stata interrotta. Riprova.',
  incomplete: 'Una creazione precedente della centrale è rimasta a metà. Contatta l’assistenza.',
  generic: 'Qualcosa è andato storto. Riprova; se il problema continua, contatta l’assistenza.',
} as const;

export const createCentralSetup = (options: CentralSetupOptions): CentralSetup => {
  const deps: SetupDeps = resolveDeps(options.deps);
  const { userDataDir, centraleDir, scriptsDir } = options;
  const downloadDir = join(dirname(centraleDir), 'Download');
  const partPath = partPathFor(downloadDir, deps.tuning.diskUrl);

  const listeners: Array<(phase: SetupPhase) => void> = [];
  let phase: SetupPhase = { phase: 'welcome', checking: false, checks: [] };
  let lastChecks: SetupCheck[] = [];
  let lastKey = JSON.stringify(phase);
  let disposed = false;
  let running: Promise<void> | null = null;
  let abort: AbortController | null = null;
  let cancelled = false;
  let tracker: Tracker | null = null;
  let checking: Promise<void> | null = null;

  const setPhase = (next: SetupPhase): void => {
    const key = JSON.stringify(next);
    if (key === lastKey || disposed) return;
    lastKey = key;
    phase = next;
    for (const listener of listeners) listener(phase);
  };

  const fail = (step: SetupFailureStep, message: string, canRetry = true): void =>
    setPhase({ phase: 'failed', step, message, canRetry });

  const backToWelcome = (): void => setPhase({ phase: 'welcome', checking: false, checks: lastChecks });

  const stopTracking = (): void => {
    tracker?.stop();
    tracker = null;
  };

  const readyPhase = (ip: string, startedAt: number, readyAt: number): SetupPhase => ({
    phase: 'ready',
    ip,
    port: APP_PORT,
    elapsedMinutes: Math.max(0, Math.round((readyAt - startedAt) / 60_000)),
    qr: buildQr(`http://${ip}:${APP_PORT}/`),
  });

  /** Avvia il tracciamento del primo avvio; la finestra dei 90 minuti parte da ora. */
  const startTracking = async (vmId: string, startedAt: number): Promise<void> => {
    stopTracking();
    const vbox = await findVBoxManage(deps);
    setPhase({ phase: 'preparing', steps: buildSteps({ vm: false, core: false, aca: false }), startedAt });
    const onOutcome = (outcome: TrackerOutcome): void => {
      if (disposed) return;
      if (outcome.kind === 'progress') {
        setPhase({
          phase: 'preparing',
          steps: outcome.steps,
          ...(outcome.ip ? { ip: outcome.ip } : {}),
          startedAt,
        });
      } else if (outcome.kind === 'ready') {
        const readyAt = deps.now();
        stopTracking();
        void saveState(userDataDir, { schema: 1, phase: 'ready', vmId, ip: outcome.ip, startedAt, readyAt })
          .catch(() => undefined)
          .finally(() => setPhase(readyPhase(outcome.ip, startedAt, readyAt)));
      } else {
        stopTracking();
        fail('preparing', PREPARING_TIMEOUT_MESSAGE);
      }
    };
    const created = createTracker({ deps, vbox, vmId, windowStart: deps.now(), onOutcome });
    tracker = created;
    created.start();
  };

  const finishCreation = async (): Promise<void> => {
    const info = await readInstallInfo(centraleDir);
    if (!info) {
      fail('creating', MESSAGES.generic);
      return;
    }
    const startedAt = deps.now();
    await saveState(userDataDir, { schema: 1, phase: 'preparing', vmId: info.vmId, startedAt });
    await rm(downloadDir, { recursive: true, force: true }).catch(() => undefined);
    await startTracking(info.vmId, startedAt);
  };

  const runCreation = async (vdiPath: string, signal: AbortSignal): Promise<void> => {
    setPhase({ phase: 'creating' });
    await saveState(userDataDir, { schema: 1, phase: 'creating' });
    const result = await createVm(deps, { scriptsDir, centraleDir, vdiPath, signal });
    if (!result.ok) {
      fail('creating', result.message);
      return;
    }
    await finishCreation();
  };

  /** Scarica, verifica ed estrae; restituisce il percorso del .vdi o null se si è fermato. */
  const runDownload = async (signal: AbortSignal): Promise<string | null> => {
    await recoverZip(partPath);
    setPhase({
      phase: 'download',
      progress: {
        receivedBytes: 0,
        totalBytes: deps.tuning.diskSizeBytes,
        bytesPerSecond: 0,
        etaSeconds: null,
        attempt: 1,
      },
    });
    try {
      await downloadFile({
        url: deps.tuning.diskUrl,
        partPath,
        totalBytes: deps.tuning.diskSizeBytes,
        signal,
        onProgress: (progress) => {
          if (!signal.aborted) setPhase({ phase: 'download', progress });
        },
        now: deps.now,
        sleep: deps.sleep,
        retryDelayMs: deps.tuning.retryDelayMs,
        stallMs: deps.tuning.stallMs,
        maxAttempts: deps.tuning.maxDownloadAttempts,
        progressIntervalMs: deps.tuning.progressIntervalMs,
      });
    } catch {
      if (!signal.aborted) fail('download', MESSAGES.download);
      return null;
    }
    setPhase({ phase: 'verify' });
    try {
      await verifyDisk(partPath, deps.tuning.diskSizeBytes, deps.tuning.diskSha256);
      return await extractDisk(deps, partPath, downloadDir);
    } catch (error) {
      if (signal.aborted) return null;
      fail(
        'verify',
        error instanceof DiskMismatchError ? MESSAGES.mismatch : error instanceof ExtractError ? MESSAGES.extract : MESSAGES.generic
      );
      return null;
    }
  };

  /** Pipeline completa: download → verifica → creazione. Riprende dal punto indicato. */
  const pipeline = async (from: 'download' | 'creating'): Promise<void> => {
    const controller = new AbortController();
    abort = controller;
    cancelled = false;
    let step: SetupFailureStep = from === 'download' ? 'download' : 'creating';
    try {
      let vdi: string | null = from === 'creating' ? await findVdi(downloadDir) : null;
      if (!vdi) {
        step = 'download';
        vdi = await runDownload(controller.signal);
        if (!vdi) return;
      }
      step = 'creating';
      await runCreation(vdi, controller.signal);
    } catch {
      if (cancelled || disposed) return;
      fail(step, MESSAGES.generic);
    } finally {
      if (abort === controller) abort = null;
    }
  };

  const launch = (from: 'download' | 'creating'): Promise<void> => {
    running = pipeline(from).finally(() => {
      running = null;
    });
    return running;
  };

  const runChecks = (): Promise<void> => {
    if (checking) return checking;
    if (phase.phase !== 'welcome' && phase.phase !== 'failed') return Promise.resolve();
    setPhase({ phase: 'welcome', checking: true, checks: lastChecks });
    checking = runAllChecks(deps, centraleDir)
      .then((checks) => {
        lastChecks = checks;
        if (phase.phase === 'welcome') setPhase({ phase: 'welcome', checking: false, checks });
      })
      .catch(() => {
        if (phase.phase === 'welcome') setPhase({ phase: 'welcome', checking: false, checks: lastChecks });
      })
      .finally(() => {
        checking = null;
      });
    return checking;
  };

  const resumeTracking = async (): Promise<boolean> => {
    const stored = await loadState(userDataDir);
    if (!stored?.vmId || stored.startedAt === undefined) {
      fail('preparing', MESSAGES.generic, false);
      return false;
    }
    await startTracking(stored.vmId, stored.startedAt);
    return true;
  };

  return {
    getPhase: () => phase,
    onChange: (listener) => {
      listeners.push(listener);
    },
    runChecks,
    start: async () => {
      if (running || (phase.phase !== 'welcome' && phase.phase !== 'failed')) return;
      await launch('download');
    },
    cancel: async () => {
      if (phase.phase !== 'download' || !abort) return;
      cancelled = true;
      abort.abort();
      backToWelcome();
      await running;
    },
    resume: async () => {
      const stored = await loadState(userDataDir);
      if (!stored) return false;
      if (stored.phase === 'preparing') return resumeTracking();
      if (stored.phase === 'ready') {
        if (!stored.ip) return false;
        const startedAt = stored.startedAt ?? stored.readyAt ?? deps.now();
        setPhase(readyPhase(stored.ip, startedAt, stored.readyAt ?? startedAt));
        return true;
      }
      if (await readInstallInfo(centraleDir)) {
        await finishCreation();
        return true;
      }
      fail('creating', MESSAGES.interrupted);
      return true;
    },
    retry: async () => {
      if (phase.phase !== 'failed' || running) return;
      switch (phase.step) {
        case 'checks':
          await runChecks();
          return;
        case 'download':
        case 'verify':
          await launch('download');
          return;
        case 'creating':
          if (await readInstallInfo(centraleDir)) await finishCreation();
          else if (await deps.pathExists(centraleDir)) fail('creating', MESSAGES.incomplete, false);
          else await launch('creating');
          return;
        case 'preparing':
          await resumeTracking();
          return;
      }
    },
    dispose: () => {
      disposed = true;
      abort?.abort();
      stopTracking();
    },
  };
};
