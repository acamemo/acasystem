import { INSTALLER_ONLY_OPERATIONS } from '../../config/devices.ts';
import type { DeviceOperation } from '../../config/devices.ts';
import type { SlidingWindowLimiter } from '../../helpers/slidingWindow.ts';
import type { DeviceModel } from '../../models/deviceModel.ts';
import type { ActionLog, ActionSource } from './actionLog.ts';
import type { CompatibilityChecker } from './compatibility.ts';
import {
  DeviceError,
  isDeviceError,
  isServiceRejection,
  translateHaError,
} from './deviceErrors.ts';
import type { HaAdapter } from './haAdapter.ts';
import { isHaError } from './haTransport.ts';
import type { ServiceIdentity } from './serviceIdentity.ts';

/** Who is calling: the Home Assistant user the tablet is logged in with. */
export interface DeviceUser {
  id: string;
  name: string;
  isAdmin: boolean;
}

export interface DeviceSettings {
  flowTtlMs: number;
  maxOpenFlowsPerUser: number;
  maxOpenFlowsTotal: number;
  entryLoadTimeoutMs: number;
  pollIntervalMs: number;
  /** How long to wait for the turn-on feature to show in the state of the TV. */
  powerStateTimeoutMs: number;
}

export interface DeviceContext {
  adapter: HaAdapter;
  identity: ServiceIdentity;
  compat: CompatibilityChecker;
  model: DeviceModel;
  actions: ActionLog;
  settings: DeviceSettings;
  limiters: { flowStart: SlidingWindowLimiter; mutation: SlidingWindowLimiter };
  /** Flows that have a step in progress, to refuse a second one (double tap). */
  busyFlows: Set<string>;
  now(): number;
  delay(ms: number): Promise<void>;
  log(line: string): void;
}

/** What the registry should say about the call, filled in by the operation as it learns more. */
export interface AuditTrail {
  action: string;
  domain?: string | undefined;
  entryId?: string | undefined;
  code?: string | undefined;
  /** `error` when the operation answered but did not succeed (a form error, for example). */
  outcome?: 'ok' | 'error';
  source?: ActionSource;
}

export type DeviceFeature = 'catalog' | 'flows' | 'power';

export interface GuardOptions {
  feature?: DeviceFeature;
  /** A write: counted against the per-user rate limit. */
  mutation?: boolean;
  /** Written to the registry (with its outcome) when given. */
  audit?: AuditTrail;
  /** What a refusal of HA becomes. Default HA_REFUSED; the power-on recipe uses RECIPE_FAILED. */
  refusal?: 'HA_REFUSED' | 'RECIPE_FAILED';
}

const DENIAL_CODES: ReadonlySet<string> = new Set([
  'REQUIRES_INSTALLER',
  'FORBIDDEN',
  'RATE_LIMITED',
  'TOO_MANY_FLOWS',
  'FLOW_ALREADY_OPEN',
]);

/** Throws if this operation needs the installer and the user is not an administrator. */
export const authorizeOperation = (operation: DeviceOperation, user: DeviceUser): void => {
  if (INSTALLER_ONLY_OPERATIONS.includes(operation) && !user.isAdmin) {
    throw new DeviceError('REQUIRES_INSTALLER');
  }
};

/**
 * Every operation of the facade goes through here: closed list of operations, per-user rate
 * limit, service identity (no fallback), feature switch from the compatibility check, and
 * translation of the errors of HA. The token handed to `run` is the service token and is used
 * only to call HA.
 */
export const runGuarded = async <T>(
  ctx: DeviceContext,
  user: DeviceUser,
  operation: DeviceOperation,
  options: GuardOptions,
  run: (token: string, audit: AuditTrail | undefined) => Promise<T>
): Promise<T> => {
  const audit: AuditTrail | undefined = options.audit ? { ...options.audit } : undefined;
  const record = (outcome: 'ok' | 'denied' | 'error', code?: string) => {
    if (!audit) return;
    ctx.actions.record({
      user: { id: user.id, name: user.name },
      source: audit.source ?? 'api',
      action: audit.action,
      domain: audit.domain,
      entryId: audit.entryId,
      outcome,
      code: code ?? audit.code,
    });
  };

  try {
    authorizeOperation(operation, user);

    if (options.mutation) {
      const turn = ctx.limiters.mutation.take(user.id);
      if (!turn.allowed) {
        throw new DeviceError('RATE_LIMITED', { retryAfterSeconds: turn.retryAfterSeconds });
      }
    }

    const token = await ctx.identity.requireToken();

    if (options.feature) {
      const report = await ctx.compat.get();
      if (report.onboarded === false) throw new DeviceError('HA_NOT_READY');
      if (!report.features[options.feature]) {
        throw new DeviceError('FEATURE_UNAVAILABLE', {
          ...(report.customerMessage ? { message: report.customerMessage } : {}),
        });
      }
    }

    const result = await run(token, audit);
    record(audit?.outcome ?? 'ok');
    return result;
  } catch (error) {
    if (isDeviceError(error)) {
      record(DENIAL_CODES.has(error.code) ? 'denied' : 'error', error.code);
      throw error;
    }
    if (isHaError(error)) {
      if (isServiceRejection(error)) {
        ctx.identity.markRejected();
        ctx.compat.invalidate();
      } else if (error.kind === 'unreachable') {
        ctx.compat.invalidate();
      }
      const translated = translateHaError(error, options.refusal);
      record('error', translated.code);
      throw translated;
    }
    record('error', 'INTERNAL');
    throw error;
  }
};
