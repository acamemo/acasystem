import {
  readDeviceCallTimeoutMs,
  readDeviceEntryLoadTimeoutMs,
  readDeviceFlowStepTimeoutMs,
  readDeviceFlowTtlMs,
  readDeviceServiceSecretPath,
  readSupervisorAccess,
} from '../../config/devices.ts';
import type { SupervisorAccess } from '../../config/devices.ts';
import { getHomeAssistantUrlCandidates } from '../../middlewares/homeAssistantAuth.ts';
import { createSlidingWindowLimiter } from '../../helpers/slidingWindow.ts';
import type { SqliteDatabase } from '../../models/database.ts';
import { createDeviceModel } from '../../models/deviceModel.ts';
import { createActionLog } from './actionLog.ts';
import { createCompatibilityChecker } from './compatibility.ts';
import type { CompatibilityChecker } from './compatibility.ts';
import type { DeviceContext } from './deviceContext.ts';
import { describeForLog } from './deviceErrors.ts';
import { createDeviceService } from './deviceService.ts';
import type { DeviceService } from './deviceService.ts';
import { createHaAdapter } from './haAdapter.ts';
import type { HaAdapter } from './haAdapter.ts';
import { createHaTransport } from './haTransport.ts';
import { createPowerRecipe } from './powerRecipe.ts';
import type { PowerRecipe } from './powerRecipe.ts';
import { createServiceIdentity, createServiceIdentityStore } from './serviceIdentity.ts';
import type { ServiceIdentity } from './serviceIdentity.ts';
import { createServiceKeeper } from './serviceKeeper.ts';
import type { ServiceKeeper } from './serviceKeeper.ts';

/**
 * Wiring of the device facade. `createDeviceModule` builds everything from the server
 * configuration (HA URLs, secret path, timeouts); every part can be replaced in the tests.
 * Timers start only in `start()`, so creating the app never leaves a timer behind.
 */

export interface DeviceModuleOptions {
  /** HA URLs of the server, never of the browser. Default: TUNET_INTERNAL_HA_URL (+ fallback). */
  haUrls?: () => readonly string[];
  secretPath?: () => string;
  now?: () => number;
  delay?: (ms: number) => Promise<void>;
  log?: (line: string) => void;
  /** Called with the id of every call made to HA; for the tests. */
  onHaCall?: (id: string) => void;
  callTimeoutMs?: number;
  flowStepTimeoutMs?: number;
  flowTtlMs?: number;
  entryLoadTimeoutMs?: number;
  pollIntervalMs?: number;
  powerStateTimeoutMs?: number;
  identityCacheMs?: number;
  compatCacheMs?: number;
  sweepIntervalMs?: number;
  maxOpenFlowsPerUser?: number;
  maxOpenFlowsTotal?: number;
  /** Per-user limit on flow starts. Default 6 per 10 minutes. */
  flowStartLimit?: { max: number; windowMs: number };
  /** Per-user limit on writes. Default 60 per minute. */
  mutationLimit?: { max: number; windowMs: number };
  /**
   * Supervisor proxy to Core (HA OS). Default: SUPERVISOR_TOKEN and ACASYSTEM_SUPERVISOR_URL;
   * `null` switches it off.
   */
  supervisor?: SupervisorAccess | null;
  /** How often the service identity is checked and repaired. Default 10 minutes. */
  serviceCheckIntervalMs?: number;
  /** Pause between the quick checks after start-up while Core is not ready. Default 30 s. */
  serviceQuickCheckMs?: number;
}

export interface DeviceModule {
  service: DeviceService;
  power: PowerRecipe;
  identity: ServiceIdentity;
  /** Automatic activation and self-repair of the service identity. */
  keeper: ServiceKeeper;
  compat: CompatibilityChecker;
  adapter: HaAdapter;
  context: DeviceContext;
  /** Cancels the flows left open by the previous run, checks compatibility, starts the sweep. */
  start(): Promise<void>;
  stop(): void;
}

export const createDeviceModule = (
  database: SqliteDatabase,
  options: DeviceModuleOptions = {}
): DeviceModule => {
  const now = options.now ?? Date.now;
  const log = options.log ?? ((line: string) => console.log(line));
  const delay =
    options.delay ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  const transport = createHaTransport({
    baseUrls: options.haUrls ?? getHomeAssistantUrlCandidates,
    ...(options.onHaCall ? { onCall: options.onHaCall } : {}),
  });
  const adapter = createHaAdapter({
    transport,
    callTimeoutMs: options.callTimeoutMs ?? readDeviceCallTimeoutMs(),
    flowStepTimeoutMs: options.flowStepTimeoutMs ?? readDeviceFlowStepTimeoutMs(),
  });

  const store = createServiceIdentityStore(options.secretPath ?? readDeviceServiceSecretPath);
  // Late-bound: the keeper needs the context, which needs the identity.
  let keeper: ServiceKeeper | null = null;
  const identity = createServiceIdentity({
    store,
    adapter,
    now,
    onRejected: () => keeper?.noteRejected(),
    ...(options.identityCacheMs !== undefined ? { cacheMs: options.identityCacheMs } : {}),
  });
  const compat = createCompatibilityChecker({
    adapter,
    identity,
    now,
    log,
    ...(options.compatCacheMs !== undefined ? { cacheMs: options.compatCacheMs } : {}),
  });

  const model = createDeviceModel(database);
  const startLimit = options.flowStartLimit ?? { max: 6, windowMs: 600_000 };
  const mutationLimit = options.mutationLimit ?? { max: 60, windowMs: 60_000 };

  const context: DeviceContext = {
    adapter,
    identity,
    compat,
    model,
    actions: createActionLog(model, now),
    settings: {
      flowTtlMs: options.flowTtlMs ?? readDeviceFlowTtlMs(),
      maxOpenFlowsPerUser: options.maxOpenFlowsPerUser ?? 3,
      maxOpenFlowsTotal: options.maxOpenFlowsTotal ?? 10,
      entryLoadTimeoutMs: options.entryLoadTimeoutMs ?? readDeviceEntryLoadTimeoutMs(),
      pollIntervalMs: options.pollIntervalMs ?? 500,
      powerStateTimeoutMs: options.powerStateTimeoutMs ?? 10_000,
    },
    limiters: {
      flowStart: createSlidingWindowLimiter(startLimit.max, startLimit.windowMs, now),
      mutation: createSlidingWindowLimiter(mutationLimit.max, mutationLimit.windowMs, now),
    },
    busyFlows: new Set<string>(),
    now,
    delay,
    log,
  };

  const supervisorAccess =
    options.supervisor === undefined ? readSupervisorAccess() : options.supervisor;
  keeper = createServiceKeeper(context, {
    supervisor: supervisorAccess
      ? {
          token: supervisorAccess.token,
          adapter: createHaAdapter({
            transport: createHaTransport({
              baseUrls: () => [supervisorAccess.coreUrl],
              wsPath: '/websocket',
            }),
            callTimeoutMs: options.callTimeoutMs ?? readDeviceCallTimeoutMs(),
            flowStepTimeoutMs: options.flowStepTimeoutMs ?? readDeviceFlowStepTimeoutMs(),
          }),
        }
      : null,
    ...(options.serviceCheckIntervalMs !== undefined
      ? { checkIntervalMs: options.serviceCheckIntervalMs }
      : {}),
    ...(options.serviceQuickCheckMs !== undefined
      ? { quickCheckMs: options.serviceQuickCheckMs }
      : {}),
  });
  const activeKeeper = keeper;
  context.repairAvailable = (user) => activeKeeper.canRepairAutomatically(user);
  context.pokeService = () => activeKeeper.poke();

  const service = createDeviceService(context);
  const power = createPowerRecipe(context);

  let timer: NodeJS.Timeout | null = null;

  return {
    service,
    power,
    identity,
    keeper: activeKeeper,
    compat,
    adapter,
    context,

    async start() {
      if (!timer) {
        timer = setInterval(() => {
          service.sweep().catch((error: unknown) => {
            log(`[devices] sweep failed: ${describeForLog(error)}`);
          });
        }, options.sweepIntervalMs ?? 30_000);
        timer.unref();
      }
      try {
        await service.startup();
      } catch (error) {
        log(`[devices] start-up failed: ${describeForLog(error)}`);
      }
      await activeKeeper.start();
    },

    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      activeKeeper.stop();
    },
  };
};
