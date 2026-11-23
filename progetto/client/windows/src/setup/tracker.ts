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
import { connectVmCable, readVmInfo, readVmReceivedBytes, switchVmToBridge } from './vm.ts';
import type { SetupNat } from './vm.ts';

/** Segue il primo avvio della centrale: VM accesa → IP → Home Assistant → Acasystem. */

export const PREPARING_STALL_MESSAGE =
  'Da 20 minuti non rileviamo progressi nella preparazione. Controlla la connessione a Internet e riprova.';

export const LABEL_VM = 'Accensione della centrale';
export const LABEL_CORE = 'Download di Home Assistant';
const LABEL_CORE_PREPARING = 'Preparazione di Home Assistant in corso';
const LABEL_LAN = 'Collegamento alla rete di casa';
export const LABEL_ACA = 'Installazione di Acasystem';

// Il contatore include tutto il traffico della VM. Considera due intervalli consecutivi
// sopra la soglia per filtrare sonde, pacchetti di servizio e brevi picchi della LAN.
const MIN_CORE_RX_BYTES_PER_SECOND = 4 * 1024;

export type TrackerOutcome =
  | { kind: 'progress'; steps: PrepStep[]; ip?: string; progress: PrepProgress }
  | { kind: 'ready'; ip: string }
  | { kind: 'failed'; message?: string };

export interface TrackerOptions {
  deps: SetupDeps;
  vbox: string | null;
  vmId: string;
  setupNat?: SetupNat;
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

const probeCoreReady = async (deps: SetupDeps, address: string, nat: SetupNat | undefined): Promise<boolean> => {
  const status = (await probeStatus(deps, `http://${address}:${nat?.corePort ?? HA_PORT}/api/`))?.status;
  if (status === 401) return true;
  if (!nat) return false;

  // HAOS può reindirizzare la 8123 alla 80. Solo Core espone i passi di onboarding.
  // Non seguire la Location del guest: usa l'altro inoltro locale.
  const onboarding = await probeStatus(deps, `http://${address}:${nat.jobsPort}/api/onboarding`);
  if (onboarding?.status !== 200) return false;
  try {
    const steps: unknown = JSON.parse(onboarding.body);
    return Array.isArray(steps) && steps.some((step) => step?.step === 'user' && typeof step.done === 'boolean');
  } catch {
    return false;
  }
};

interface CoreJob {
  percent: number | null;
  active: boolean;
}

/** Legge il job di Core da supervisor-api/jobs/info; la percentuale è facoltativa. */
export const parseCoreJob = (body: string): CoreJob | null => {
  try {
    const parsed = JSON.parse(body) as { data?: { jobs?: unknown } };
    const jobs = parsed?.data?.jobs;
    if (!Array.isArray(jobs)) return null;
    const job = jobs.find(
      (entry) => (entry as { name?: unknown } | null)?.name === 'home_assistant_core_install'
    ) as { progress?: unknown; done?: unknown } | undefined;
    if (!job) return null;
    const value = job.progress;
    const percent = typeof value === 'number' && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null;
    return { percent, active: job.done === false };
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

export const buildSteps = (flags: { vm: boolean; ip?: string; core: boolean; aca: boolean; coreReceiving?: boolean }): PrepStep[] => {
  const vmStep: PrepStep = flags.vm
    ? { id: 'vm', state: 'done', ...(flags.ip ? { detail: flags.ip } : {}) }
    : { id: 'vm', state: 'active' };
  return [
    { id: 'disk', state: 'done' },
    vmStep,
    {
      id: 'core',
      state: flags.core ? 'done' : flags.vm ? 'active' : 'pending',
      ...(flags.coreReceiving ? { detail: 'Dati in ricezione' } : {}),
    },
    { id: 'aca', state: flags.aca ? 'done' : flags.core ? 'active' : 'pending' },
    { id: 'qr', state: flags.aca ? 'done' : 'pending' },
  ];
};

export const createTracker = (options: TrackerOptions): Tracker => {
  const { deps, vbox, vmId, setupNat } = options;
  const discovery = createIpDiscovery(deps);
  const controller = new AbortController();
  let ip: string | undefined;
  let coreDone = false;
  let waitingForLan = false;
  let mac: string | null = null;
  let finished = false;
  let running = false;
  const machine = deps.machine();
  const installAllowance = machine.logicalCpus >= 4 && machine.totalMemoryBytes >= 8 * 1024 ** 3 ? 60 : 120;
  const speed = options.downloadBytesPerSecond;
  let lastCorePercent = 0;
  let maxPercent = 0;
  let samples: Array<{ at: number; percent: number }> = [];
  let rxSample: { at: number; bytes: number } | null = null;
  let previousRxIntervalActive = false;
  let acaStartedAt: number | null = null;
  let lastStep: 'vm' | 'core' | 'aca' | null = null;
  let lastChangeAt = options.windowStart;

  const pollCore = async (address: string, port: number): Promise<CoreJob | null> => {
    try {
      const authority = port === 80 ? address : `${address}:${port}`;
      const response = await deps.httpGet(`http://${authority}/supervisor-api/jobs/info`, {
        timeoutMs: JOBS_TIMEOUT_MS,
        maxRedirects: 0,
        maxBodyBytes: 262_144,
      });
      return response.status === 200 ? parseCoreJob(response.body) : null;
    } catch {
      return null;
    }
  };

  const updateCorePercent = (value: number | null, at: number): boolean => {
    if (value === null) return false;
    const advanced = value > lastCorePercent;
    lastCorePercent = value;
    if (value === 0) {
      maxPercent = 0;
      samples = [];
      return false;
    }
    maxPercent = Math.max(maxPercent, value);
    samples.push({ at, percent: maxPercent });
    samples = samples.filter((sample) => at - sample.at <= RATE_WINDOW_MS);
    return advanced;
  };

  const pollCoreTraffic = async (active: boolean): Promise<boolean> => {
    const bytes = active && vbox
      ? await readVmReceivedBytes(deps, vbox, vmId, controller.signal)
      : null;
    const previous = rxSample;
    const at = deps.now();
    rxSample = bytes === null ? null : { at, bytes };
    const intervalActive = previous !== null && bytes !== null && at > previous.at
      && (bytes - previous.bytes) * 1_000 / (at - previous.at) >= MIN_CORE_RX_BYTES_PER_SECOND;
    const receiving = intervalActive && previousRxIntervalActive;
    previousRxIntervalActive = intervalActive;
    return receiving;
  };

  const progressFor = (reachable: boolean, at: number): PrepProgress => {
    if (!reachable) return { label: waitingForLan ? LABEL_LAN : LABEL_VM, percent: null, etaSeconds: null };
    const acaSeconds = acaStepSeconds(speed, installAllowance);
    if (coreDone) {
      acaStartedAt ??= at;
      const elapsed = (at - acaStartedAt) / 1000;
      const percent = Math.min(95, Math.round((100 * elapsed) / acaSeconds));
      const remaining = acaSeconds - elapsed;
      return { label: LABEL_ACA, percent, etaSeconds: remaining > 0 ? Math.round(Math.max(30, remaining)) : null };
    }
    const percent = Math.round(maxPercent);
    if (percent === 0) return { label: LABEL_CORE_PREPARING, percent: null, etaSeconds: null };
    const core = coreEtaSeconds(samples, maxPercent, speed);
    return {
      label: LABEL_CORE,
      percent,
      etaSeconds: core === null ? null : Math.round(core + acaSeconds),
    };
  };

  const tick = async (): Promise<void> => {
    if (finished || running) return;
    running = true;
    try {
      let nat: SetupNat | undefined;
      if (!ip && vbox) {
        const info = await readVmInfo(deps, vbox, vmId);
        if (info?.mac) mac = info.mac;
        if (info?.state === 'running') {
          if (setupNat && info.cableConnected === false && !finished) await connectVmCable(deps, vbox, vmId);
          if (setupNat && info.network === 'nat') {
            nat = setupNat;
            waitingForLan = false;
          } else if (mac) {
            waitingForLan = Boolean(setupNat);
            ip = (await discovery.find(mac)) ?? undefined;
          }
        }
      }
      let acaDone = false;
      let coreAdvanced = false;
      let coreReceiving = false;
      const address = nat ? '127.0.0.1' : ip;
      let reachable = Boolean(address);
      if (address) {
        if (!coreDone) coreDone = await probeCoreReady(deps, address, nat);
        if (!coreDone) {
          const job = await pollCore(address, nat?.jobsPort ?? 80);
          coreAdvanced = updateCorePercent(job?.percent ?? null, deps.now());
          coreReceiving = await pollCoreTraffic(job?.active === true);
        }
        const health = await probeStatus(deps, `http://${address}:${nat?.appPort ?? APP_PORT}/api/health`);
        if (health?.status === 200) {
          try {
            acaDone = (JSON.parse(health.body) as { status?: unknown }).status === 'ok';
          } catch {
            acaDone = false;
          }
        }
      }
      if (finished || controller.signal.aborted) return;
      if (acaDone && coreDone && nat && vbox) {
        const switched = await switchVmToBridge(deps, vbox, vmId, nat.bridgeAdapter);
        if (finished || controller.signal.aborted) return;
        if (!switched) {
          finished = true;
          options.onOutcome({ kind: 'failed', message: 'La centrale è attiva, ma il passaggio alla rete di casa non è riuscito. Controlla la scheda di rete e riprova.' });
          return;
        }
        waitingForLan = true;
        reachable = false;
        lastChangeAt = deps.now();
      }
      if (acaDone && ip) {
        finished = true;
        options.onOutcome({ kind: 'ready', ip });
        return;
      }
      const at = deps.now();
      const activeStep = !reachable ? 'vm' : coreDone ? 'aca' : 'core';
      if ((lastStep !== null && activeStep !== lastStep) || coreAdvanced || coreReceiving) lastChangeAt = at;
      lastStep = activeStep;
      if (at - lastChangeAt >= deps.tuning.preparingStallMs) {
        finished = true;
        options.onOutcome({ kind: 'failed' });
        return;
      }
      options.onOutcome({
        kind: 'progress',
        steps: buildSteps({ vm: reachable, ...(ip ? { ip } : {}), core: coreDone, aca: false, coreReceiving }),
        ...(ip ? { ip } : {}),
        progress: progressFor(reachable, at),
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
