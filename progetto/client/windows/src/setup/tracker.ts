import {
  ACA_DOWNLOAD_BYTES,
  ACA_FALLBACK_SECONDS,
  APP_PORT,
  CORE_DOWNLOAD_BYTES,
  HA_PORT,
  JOBS_TIMEOUT_MS,
  RATE_WINDOW_MS,
} from './constants.ts';
import type { SetupDeps } from './deps.ts';
import { createIpDiscovery } from './discovery.ts';
import type { PrepProgress, PrepStep, SetupPhase } from './types.ts';
import { readVmInfo } from './vm.ts';

/** Segue il primo avvio della centrale: VM accesa → IP → Home Assistant → Acasystem. */

export const PREPARING_STALL_MESSAGE =
  'Da 20 minuti la centrale non fa progressi. Controlla la connessione a Internet e riprova.';

export const LABEL_VM = 'Accensione della centrale';
export const LABEL_CORE = 'Download di Home Assistant';
export const LABEL_ACA = 'Installazione di Acasystem';

export type TrackerOutcome =
  | { kind: 'progress'; steps: PrepStep[]; ip?: string; progress: PrepProgress }
  | { kind: 'ready'; ip: string }
  | { kind: 'failed' };

export interface TrackerOptions {
  deps: SetupDeps;
  vbox: string | null;
  vmId: string;
  /** Inizio della finestra senza progressi (si riazzera a ogni ripresa dopo un errore). */
  windowStart: number;
  /** Velocità media di download misurata su questo PC (byte/s), se nota. */
  downloadBytesPerSecond?: number;
  onOutcome(outcome: TrackerOutcome): void;
}

export interface Tracker {
  /** Un giro di controlli; usato dal ciclo e dalle prove. */
  tick(): Promise<void>;
  start(): void;
  stop(): void;
}

const probeStatus = async (deps: SetupDeps, url: string): Promise<{ status: number; body: string } | null> => {
  try {
    return await deps.httpGet(url, { timeoutMs: 5_000, maxRedirects: 0, maxBodyBytes: 16_384 });
  } catch {
    return null;
  }
};

/**
 * Legge l'avanzamento (0-100) del download di Home Assistant Core da supervisor-api/jobs/info.
 * null = nessun dato: risposta non valida, lavoro assente o valore non numerico.
 */
export const parseCoreProgress = (body: string): number | null => {
  try {
    const parsed = JSON.parse(body) as { data?: { jobs?: unknown } };
    const jobs = parsed?.data?.jobs;
    if (!Array.isArray(jobs)) return null;
    const job = jobs.find(
      (entry) => (entry as { name?: unknown } | null)?.name === 'home_assistant_core_install'
    ) as { progress?: unknown } | undefined;
    const value = job?.progress;
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return Math.min(100, Math.max(0, value));
  } catch {
    return null;
  }
};

/** Secondi attesi per scaricare e installare Acasystem, dato il PC (velocità e potenza). */
export const acaStepSeconds = (bytesPerSecond: number | undefined, installAllowanceSeconds: number): number =>
  bytesPerSecond && bytesPerSecond > 0
    ? ACA_DOWNLOAD_BYTES / bytesPerSecond + installAllowanceSeconds
    : ACA_FALLBACK_SECONDS;

/** Secondi rimasti per Home Assistant: dal ritmo recente, altrimenti dalla velocità di download. */
export const coreEtaSeconds = (
  samples: Array<{ at: number; percent: number }>,
  percent: number,
  bytesPerSecond: number | undefined
): number | null => {
  const first = samples[0];
  const last = samples.at(-1);
  if (first && last && last.percent > first.percent && last.at > first.at) {
    const rate = (last.percent - first.percent) / ((last.at - first.at) / 1000);
    return Math.round(Math.max(0, 100 - percent) / rate);
  }
  if (bytesPerSecond && bytesPerSecond > 0) {
    return Math.round(((Math.max(0, 100 - percent) / 100) * CORE_DOWNLOAD_BYTES) / bytesPerSecond);
  }
  return null;
};

export const buildSteps = (flags: { vm: boolean; ip?: string; core: boolean; aca: boolean }): PrepStep[] => {
  const vmStep: PrepStep = flags.vm
    ? { id: 'vm', state: 'done', ...(flags.ip ? { detail: flags.ip } : {}) }
    : { id: 'vm', state: 'active' };
  return [
    { id: 'disk', state: 'done' },
    vmStep,
    { id: 'core', state: flags.core ? 'done' : flags.vm ? 'active' : 'pending' },
    { id: 'aca', state: flags.aca ? 'done' : flags.core ? 'active' : 'pending' },
    { id: 'qr', state: flags.aca ? 'done' : 'pending' },
  ];
};

export const createTracker = (options: TrackerOptions): Tracker => {
  const { deps, vmId } = options;
  const discovery = createIpDiscovery(deps);
  const controller = new AbortController();
  let ip: string | undefined;
  let coreDone = false;
  let mac: string | null = null;
  let finished = false;
  let running = false;
  const machine = deps.machine();
  const installAllowance = machine.logicalCpus >= 4 && machine.totalMemoryBytes >= 8 * 1024 ** 3 ? 60 : 120;
  const speed = options.downloadBytesPerSecond;
  let maxPercent: number | null = null;
  let samples: Array<{ at: number; percent: number }> = [];
  let acaStartedAt: number | null = null;
  // Finestra senza progressi: cambia quando si muove l'avanzamento o il passo attivo.
  let lastSignature = '';
  let lastChangeAt = options.windowStart;

  const pollCore = async (address: string, at: number): Promise<void> => {
    let value: number | null = null;
    try {
      const response = await deps.httpGet(`http://${address}/supervisor-api/jobs/info`, {
        timeoutMs: JOBS_TIMEOUT_MS,
        maxRedirects: 0,
        maxBodyBytes: 262_144,
      });
      if (response.status === 200) value = parseCoreProgress(response.body);
    } catch {
      value = null;
    }
    if (value === null) return;
    maxPercent = Math.max(maxPercent ?? 0, value);
    samples.push({ at, percent: maxPercent });
    samples = samples.filter((sample) => at - sample.at <= RATE_WINDOW_MS);
  };

  const progressFor = (flags: { ip?: string; core: boolean }, at: number): PrepProgress => {
    if (!flags.ip) return { label: LABEL_VM, percent: null, etaSeconds: null };
    const acaSeconds = acaStepSeconds(speed, installAllowance);
    if (flags.core) {
      acaStartedAt ??= at;
      const elapsed = (at - acaStartedAt) / 1000;
      const percent = Math.min(95, Math.round((100 * elapsed) / acaSeconds));
      const remaining = acaSeconds - elapsed;
      return { label: LABEL_ACA, percent, etaSeconds: remaining > 0 ? Math.round(Math.max(30, remaining)) : null };
    }
    if (maxPercent === null) return { label: LABEL_CORE, percent: null, etaSeconds: null };
    const core = coreEtaSeconds(samples, maxPercent, speed);
    return {
      label: LABEL_CORE,
      percent: Math.round(maxPercent),
      etaSeconds: core === null ? null : Math.round(core + acaSeconds),
    };
  };

  const tick = async (): Promise<void> => {
    if (finished || running) return;
    running = true;
    try {
      if (!ip && options.vbox) {
        const info = await readVmInfo(deps, options.vbox, vmId);
        if (info?.mac) mac = info.mac;
        if (info?.state === 'running' && mac) ip = (await discovery.find(mac)) ?? undefined;
      }
      let acaDone = false;
      if (ip) {
        if (!coreDone) coreDone = (await probeStatus(deps, `http://${ip}:${HA_PORT}/api/`))?.status === 401;
        if (!coreDone) await pollCore(ip, deps.now());
        const health = await probeStatus(deps, `http://${ip}:${APP_PORT}/api/health`);
        if (health?.status === 200) {
          try {
            acaDone = (JSON.parse(health.body) as { status?: unknown }).status === 'ok';
          } catch {
            acaDone = false;
          }
        }
      }
      if (finished || controller.signal.aborted) return;
      if (acaDone && ip) {
        finished = true;
        options.onOutcome({ kind: 'ready', ip });
        return;
      }
      const at = deps.now();
      const activeStep = !ip ? 'vm' : coreDone ? 'aca' : 'core';
      const signature = `${activeStep}:${maxPercent ?? ''}`;
      if (signature !== lastSignature) {
        // Il primo giro non sposta la finestra: parte da windowStart.
        if (lastSignature !== '') lastChangeAt = at;
        lastSignature = signature;
      }
      if (at - lastChangeAt >= deps.tuning.preparingStallMs) {
        finished = true;
        options.onOutcome({ kind: 'failed' });
        return;
      }
      options.onOutcome({
        kind: 'progress',
        steps: buildSteps({ vm: Boolean(ip), ...(ip ? { ip } : {}), core: coreDone, aca: false }),
        ...(ip ? { ip } : {}),
        progress: progressFor({ ...(ip ? { ip } : {}), core: coreDone }, at),
      });
    } finally {
      running = false;
    }
  };

  const loop = async (): Promise<void> => {
    while (!finished && !controller.signal.aborted) {
      await tick();
      if (finished) return;
      try {
        await deps.sleep(deps.tuning.pollMs, controller.signal);
      } catch {
        return;
      }
    }
  };

  return {
    tick,
    start: () => {
      void loop();
    },
    stop: () => {
      finished = true;
      controller.abort();
    },
  };
};

export type PreparingPhase = Extract<SetupPhase, { phase: 'preparing' }>;
