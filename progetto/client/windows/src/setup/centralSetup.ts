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
import type { PersistedState } from './state.ts';
import { buildSteps, createTracker, LABEL_VM, PREPARING_STALL_MESSAGE } from './tracker.ts';
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
  // Download della stessa installazione: inizio e punto di partenza della misura della velocità.
  let downloadStartedAt: number | null = null;
  let downloadBase: { bytes: number; at: number } | null = null;
  /** Velocità media del download su questo PC (byte/s), misurata o letta dal file di stato. */
  let downloadBytesPerSecond: number | undefined;

  /** Scrive lo stato aggiungendo la velocità di download (anche quella già salvata in precedenza). */
  const writeState = async (state: PersistedState): Promise<void> => {
    if (downloadBytesPerSecond === undefined) {
      downloadBytesPerSecond = (await loadState(userDataDir))?.downloadBytesPerSecond;
    }
    await saveState(userDataDir, {
      ...state,
      ...(downloadBytesPerSecond !== undefined ? { downloadBytesPerSecond } : {}),
    });
  };

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

  /** Avvia il tracciamento del primo avvio; la finestra senza progressi parte da ora. */
  const startTracking = async (vmId: string, startedAt: number): Promise<void> => {
    stopTracking();
    const vbox = await findVBoxManage(deps);
    const installInfo = await readInstallInfo(centraleDir);
    const setupNat = installInfo?.vmId === vmId ? installInfo.setupNat : undefined;
    setPhase({
      phase: 'preparing',
      steps: buildSteps({ vm: false, core: false, aca: false }),
      startedAt,
      progress: { label: LABEL_VM, percent: null, etaSeconds: null },
    });
    const onOutcome = (outcome: TrackerOutcome): void => {
      if (disposed) return;
      if (outcome.kind === 'progress') {
        setPhase({
          phase: 'preparing',
          steps: outcome.steps,
          ...(outcome.ip ? { ip: outcome.ip } : {}),
          startedAt,
          progress: outcome.progress,
        });
      } else if (outcome.kind === 'ready') {
        const readyAt = deps.now();
        stopTracking();
        void writeState({ schema: 1, phase: 'ready', vmId, ip: outcome.ip, startedAt, readyAt })
          .catch(() => undefined)
          .finally(() => setPhase(readyPhase(outcome.ip, startedAt, readyAt)));
      } else {
        stopTracking();
        fail('preparing', outcome.message ?? PREPARING_STALL_MESSAGE);
      }
    };
    const created = createTracker({
      deps,
      vbox,
      vmId,
      ...(setupNat ? { setupNat } : {}),
      windowStart: deps.now(),
      ...(downloadBytesPerSecond !== undefined ? { downloadBytesPerSecond } : {}),
      onOutcome,
    });
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
    await writeState({ schema: 1, phase: 'preparing', vmId: info.vmId, startedAt });
    await rm(downloadDir, { recursive: true, force: true }).catch(() => undefined);
    await startTracking(info.vmId, startedAt);
  };

  const runCreation = async (vdiPath: string, signal: AbortSignal): Promise<void> => {
    setPhase({ phase: 'creating' });
    await writeState({ schema: 1, phase: 'creating' });
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
    downloadStartedAt ??= deps.now();
    const startedAt = downloadStartedAt;
    let received = 0;
    setPhase({
      phase: 'download',
      progress: {
        receivedBytes: 0,
        totalBytes: deps.tuning.diskSizeBytes,
        bytesPerSecond: 0,
        etaSeconds: null,
        attempt: 1,
      },
      startedAt,
    });
    try {
      await downloadFile({
        url: deps.tuning.diskUrl,
        partPath,
        totalBytes: deps.tuning.diskSizeBytes,
        signal,
        onProgress: (progress) => {
          if (signal.aborted) return;
          downloadBase ??= { bytes: progress.receivedBytes, at: deps.now() };
          received = progress.receivedBytes;
          setPhase({ phase: 'download', progress, startedAt });
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
    if (downloadBase) {
      // Velocità media dell'intero trasferimento di questa installazione, senza la parte già presente.
      const seconds = (deps.now() - downloadBase.at) / 1000;
      const transferred = received - downloadBase.bytes;
      if (seconds > 0 && transferred > 0) downloadBytesPerSecond = Math.round(transferred / seconds);
    }
    downloadStartedAt = null;
    downloadBase = null;
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
    if (stored.downloadBytesPerSecond !== undefined) downloadBytesPerSecond = stored.downloadBytesPerSecond;
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
      downloadStartedAt = null;
      downloadBase = null;
      abort.abort();
      backToWelcome();
      await running;
    },
    resume: async () => {
      const stored = await loadState(userDataDir);
      if (!stored) return false;
      if (stored.downloadBytesPerSecond !== undefined) downloadBytesPerSecond = stored.downloadBytesPerSecond;
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
