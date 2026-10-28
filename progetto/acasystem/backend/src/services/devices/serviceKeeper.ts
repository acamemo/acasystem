import {
  DEVICE_SERVICE_CHECK_INTERVAL_MS,
  DEVICE_SERVICE_TOKEN_RENEW_BEFORE_DAYS,
} from '../../config/devices.ts';
import type { ActionLog } from './actionLog.ts';
import { DEVICE_ERROR_DEFINITIONS, DeviceError, describeForLog } from './deviceErrors.ts';
import type { DeviceContext, DeviceUser } from './deviceContext.ts';
import { activateServiceIdentity } from './identityActivation.ts';
import type { ActivationResult, AdminSession } from './identityActivation.ts';

/**
 * Automatic activation and self-repair of the service identity (REP-20261028-004, T1-T3, T8).
 *
 * Nobody has to run a command or call anybody: when the means exist, the server creates, renews
 * and reactivates the user "Acasystem (servizio)" by itself. The means are, in this order:
 * - HA OS: the Supervisor token of the app (`SUPERVISOR_TOKEN`, through the proxy to Core);
 * - elsewhere: the access token of a Home Assistant administrator who is using Acasystem right
 *   now. It is used for that one run, held in memory only and never stored or logged.
 * Without either, nothing happens (the person can still tap «Ripara il servizio» as an
 * administrator, or the next administrator who opens the app repairs it).
 *
 * It looks at the identity at start-up, every 10 minutes, on every refusal of the token and when
 * somebody opens the screen: a missing, revoked, suspended, deleted or soon-to-expire identity is
 * repaired with the steps of the activation command, which prove the result with a test flow.
 * After a failure it waits longer each time (backoff) and writes the registry only when the
 * outcome changes, so a broken system does not fill the log. The registry never holds secrets.
 */

export type RepairTrigger = 'startup' | 'timer' | 'rejected' | 'demand' | 'admin' | 'user';

export interface RepairAnswer {
  active: boolean;
  /** Italian, plain: what happened or what the person can do. */
  message: string;
}

export interface SupervisorMeans {
  /** Adapter whose transport is the Supervisor proxy to Core. */
  adapter: AdminSession['adapter'];
  token: string;
}

export interface ServiceKeeperOptions {
  supervisor: SupervisorMeans | null;
  checkIntervalMs?: number;
  /** Pause between the quick checks after start-up while HA is not ready. Default 30 s. */
  quickCheckMs?: number;
}

export interface ServiceKeeper {
  /** Checks now (start-up) and starts the periodic check. */
  start(): Promise<void>;
  stop(): void;
  /** HA refused the service token during a call. Never throws. */
  noteRejected(): void;
  /** A screen of the facade is open and the service may be off: the Supervisor repairs it. */
  poke(): void;
  /** A Home Assistant administrator is using Acasystem: their token can activate the service. */
  offerAdmin(session: { token: string; user: { id: string; name: string } }): void;
  /** True when «Ripara il servizio» can fix the service without anybody else. */
  canRepairAutomatically(user: DeviceUser): boolean;
  /** «Ripara il servizio»: any user; repairs now if it can and says where things stand. */
  repair(user: DeviceUser, adminToken: string | null): Promise<RepairAnswer>;
}

type Outcome =
  | { kind: 'active' }
  | { kind: 'unreachable' }
  | { kind: 'no_means' }
  | { kind: 'waiting' }
  | { kind: 'ran'; result: ActivationResult };

const MESSAGE_ACTIVE = 'Servizio attivo.';
const MESSAGE_NO_MEANS =
  "Apri Acasystem con l'account che hai creato per primo in Home Assistant e tocca di nuovo «Ripara il servizio».";
const MESSAGE_GENERIC =
  'Non sono riuscito a riattivare il servizio. Riprova tra qualche minuto con «Ripara il servizio».';

const MIN_GAP_MS = 60_000;
const MAX_BACKOFF_MS = 6 * 3_600_000;
const SAME_ERROR_QUIET_MS = 3_600_000;
const QUICK_CHECKS = 10;
const DAY_MS = 86_400_000;

/** What to tell the person for the outcome of a repair that ran. */
const messageForResult = (result: ActivationResult): string => {
  switch (result.code) {
    case 'activated':
    case 'already_active':
      return MESSAGE_ACTIVE;
    case 'ha_unreachable':
      return DEVICE_ERROR_DEFINITIONS.HA_UNREACHABLE.message;
    case 'ha_not_ready':
      return DEVICE_ERROR_DEFINITIONS.HA_NOT_READY.message;
    case 'user_conflict':
      return 'In Home Assistant c’è già un utente «Acasystem (servizio)» creato a mano. Rinominalo da Persone > Utenti e tocca di nuovo «Ripara il servizio».';
    case 'secret_location':
      return 'Su questa installazione il servizio non ha un posto riservato dove salvare il suo accesso. Si risolve con un aggiornamento di Acasystem: riprova più tardi.';
    default:
      return MESSAGE_GENERIC;
  }
};

export const createServiceKeeper = (
  ctx: DeviceContext,
  { supervisor, checkIntervalMs, quickCheckMs = 30_000 }: ServiceKeeperOptions
): ServiceKeeper => {
  let running: Promise<Outcome> | null = null;
  let failures = 0;
  let notBefore = 0;
  let lastAttemptAt = 0;
  let lastErrorCode: string | null = null;
  let lastErrorAt = 0;
  let timer: NodeJS.Timeout | null = null;
  let quickTimer: NodeJS.Timeout | null = null;
  let quickLeft = 0;

  const nearExpiry = (expiresAt: string | null): boolean => {
    if (!expiresAt) return false;
    const end = Date.parse(expiresAt);
    return Number.isFinite(end) && end - ctx.now() < DEVICE_SERVICE_TOKEN_RENEW_BEFORE_DAYS * DAY_MS;
  };

  /** What the identity needs: nothing, a repair, a new token, or HA is not there to ask. */
  const evaluate = async (force: boolean): Promise<'ok' | 'unreachable' | 'repair' | 'renew'> => {
    const status = await ctx.identity.status({ force });
    if (status.state === 'unreachable') return 'unreachable';
    if (status.state === 'active') return nearExpiry(status.expiresAt) ? 'renew' : 'ok';
    return 'repair';
  };

  /**
   * The registry for the runs of the keeper: a run that fails the same way as the one before is
   * written once an hour, and «already active» is not written at all.
   */
  const registry = (quiet: boolean): ActionLog => ({
    record(entry) {
      if (entry.code === 'already_active') return;
      if (entry.outcome === 'error') {
        const same = entry.code === lastErrorCode && ctx.now() - lastErrorAt < SAME_ERROR_QUIET_MS;
        if (quiet && same) return;
        if (!same) ctx.log(`[devices] service repair failed (${entry.code ?? 'unknown'})`);
        lastErrorCode = entry.code ?? null;
        lastErrorAt = ctx.now();
      } else if (lastErrorCode !== null) {
        ctx.log('[devices] service repaired');
        lastErrorCode = null;
      }
      ctx.actions.record(entry);
    },
  });

  const attempt = async (
    session: AdminSession,
    trigger: RepairTrigger,
    rotate: boolean
  ): Promise<ActivationResult> => {
    lastAttemptAt = ctx.now();
    const result = await activateServiceIdentity({
      adapter: ctx.adapter,
      store: ctx.identity.store,
      actions: registry(trigger !== 'user'),
      admin: session,
      source: trigger === 'user' || trigger === 'admin' ? 'api' : trigger === 'startup' ? 'startup' : 'timer',
      action: 'service.repair',
      reactivate: true,
      rotate,
      now: ctx.now,
    });
    ctx.identity.invalidate();
    ctx.compat.invalidate();
    if (result.ok) {
      failures = 0;
      notBefore = 0;
    } else {
      failures += 1;
      const wait = Math.min(DEVICE_SERVICE_CHECK_INTERVAL_MS * 2 ** (failures - 1), MAX_BACKOFF_MS);
      notBefore = ctx.now() + wait;
    }
    return result;
  };

  const check = (
    trigger: RepairTrigger,
    session: AdminSession | null,
    options: { force: boolean }
  ): Promise<Outcome> => {
    if (running) return running;
    const run = (async (): Promise<Outcome> => {
      const need = await evaluate(options.force);
      if (need === 'ok') {
        failures = 0;
        return { kind: 'active' };
      }
      if (need === 'unreachable') return { kind: 'unreachable' };
      if (!session) return need === 'renew' ? { kind: 'active' } : { kind: 'no_means' };
      const manual = trigger === 'user';
      if (!manual && (ctx.now() < notBefore || ctx.now() - lastAttemptAt < MIN_GAP_MS)) {
        return need === 'renew' ? { kind: 'active' } : { kind: 'waiting' };
      }
      const result = await attempt(session, trigger, need === 'renew');
      return { kind: 'ran', result };
    })().finally(() => {
      if (running === run) running = null;
    });
    running = run;
    return run;
  };

  const supervisorSession = (): AdminSession | null =>
    supervisor ? { adapter: supervisor.adapter, token: supervisor.token, user: null } : null;

  const background = (
    trigger: RepairTrigger,
    session: AdminSession | null,
    force = false
  ): Promise<Outcome | null> =>
    check(trigger, session, { force }).catch((error: unknown) => {
      ctx.log(`[devices] service check failed: ${describeForLog(error)}`);
      return null;
    });

  const startQuickChecks = (): void => {
    quickLeft = QUICK_CHECKS;
    const next = (): void => {
      if (quickLeft <= 0) return;
      quickTimer = setTimeout(() => {
        quickLeft -= 1;
        void background('startup', supervisorSession(), true).then((outcome) => {
          const settled = outcome?.kind === 'active' || outcome?.kind === 'no_means';
          if (settled || (outcome?.kind === 'ran' && outcome.result.ok)) quickLeft = 0;
          next();
        });
      }, quickCheckMs);
      quickTimer.unref();
    };
    next();
  };

  let lastDemandAt = 0;

  return {
    async start() {
      if (!timer) {
        timer = setInterval(() => {
          void background('timer', supervisorSession(), true);
        }, checkIntervalMs ?? DEVICE_SERVICE_CHECK_INTERVAL_MS);
        timer.unref();
      }
      const outcome = await background('startup', supervisorSession(), true);
      // HA OS starts the app and Core at the same time: look again soon while Core is not ready.
      const ready = outcome?.kind === 'active' || outcome?.kind === 'no_means';
      if (supervisor && !ready && !(outcome?.kind === 'ran' && outcome.result.ok)) {
        startQuickChecks();
      }
    },

    stop() {
      if (timer) clearInterval(timer);
      if (quickTimer) clearTimeout(quickTimer);
      timer = null;
      quickTimer = null;
      quickLeft = 0;
    },

    noteRejected() {
      if (!supervisor) return;
      void background('rejected', supervisorSession(), true);
    },

    poke() {
      if (!supervisor || ctx.now() - lastDemandAt < MIN_GAP_MS) return;
      lastDemandAt = ctx.now();
      void background('demand', supervisorSession());
    },

    offerAdmin({ token, user }) {
      if (supervisor || running) return;
      void (async () => {
        // Cheap when all is well: the identity answers from its own cache.
        if ((await evaluate(false)) === 'ok') return;
        await background('admin', { adapter: ctx.adapter, token, user });
      })().catch(() => undefined);
    },

    canRepairAutomatically(user) {
      return supervisor !== null || user.isAdmin;
    },

    async repair(user, adminToken) {
      const turn = ctx.limiters.mutation.take(user.id);
      if (!turn.allowed) {
        throw new DeviceError('RATE_LIMITED', { retryAfterSeconds: turn.retryAfterSeconds });
      }

      const session: AdminSession | null =
        supervisorSession() ??
        (adminToken ? { adapter: ctx.adapter, token: adminToken, user: { id: user.id, name: user.name } } : null);

      const report = await ctx.compat.get().catch(() => null);
      if (report?.onboarded === false) {
        return { active: false, message: DEVICE_ERROR_DEFINITIONS.HA_NOT_READY.message };
      }

      const outcome = await check('user', session, { force: true });
      switch (outcome.kind) {
        case 'active':
          return { active: true, message: MESSAGE_ACTIVE };
        case 'unreachable':
          return { active: false, message: DEVICE_ERROR_DEFINITIONS.HA_UNREACHABLE.message };
        case 'no_means':
          return { active: false, message: MESSAGE_NO_MEANS };
        case 'waiting':
          return { active: false, message: MESSAGE_GENERIC };
        case 'ran':
          return {
            active: outcome.result.ok,
            message: messageForResult(outcome.result),
          };
      }
    },
  };
};
