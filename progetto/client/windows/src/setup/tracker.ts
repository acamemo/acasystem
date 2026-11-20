import { APP_PORT, HA_PORT } from './constants.ts';
import type { SetupDeps } from './deps.ts';
import { createIpDiscovery } from './discovery.ts';
import type { PrepStep, SetupPhase } from './types.ts';
import { readVmInfo } from './vm.ts';

/** Segue il primo avvio della centrale: VM accesa → IP → Home Assistant → Acasystem. */

export const PREPARING_TIMEOUT_MESSAGE =
  'La centrale non ha finito di prepararsi entro 90 minuti. Controlla la connessione a Internet e riprova.';

export type TrackerOutcome =
  | { kind: 'progress'; steps: PrepStep[]; ip?: string }
  | { kind: 'ready'; ip: string }
  | { kind: 'failed' };

export interface TrackerOptions {
  deps: SetupDeps;
  vbox: string | null;
  vmId: string;
  /** Inizio della finestra dei 90 minuti (si riazzera a ogni ripresa dopo un errore). */
  windowStart: number;
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
      if (deps.now() - options.windowStart >= deps.tuning.preparingTimeoutMs) {
        finished = true;
        options.onOutcome({ kind: 'failed' });
        return;
      }
      options.onOutcome({
        kind: 'progress',
        steps: buildSteps({ vm: Boolean(ip), ...(ip ? { ip } : {}), core: coreDone, aca: false }),
        ...(ip ? { ip } : {}),
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
