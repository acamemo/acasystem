import { CUSTOMER_STARTABLE_HANDLERS } from '../../config/devices.ts';
import type { DeviceFlowRow } from '../../models/deviceModel.ts';
import { isFacadeDomain, isStartableHandler, searchCatalog } from './catalog.ts';
import type { CatalogEntryDto, CatalogItem } from './catalog.ts';
import { DEVICE_ERROR_DEFINITIONS, DeviceError, describeForLog } from './deviceErrors.ts';
import { authorizeOperation, runGuarded } from './deviceContext.ts';
import type { DeviceContext, DeviceUser } from './deviceContext.ts';
import {
  devicesOfEntry,
  entitiesOfEntry,
  firstEntityOfDomain,
  waitForEntry,
} from './entryTools.ts';
import { buildFlowInput, hasInputRules } from './flowInput.ts';
import { flowErrorsFromBadRequest, normalizeFlowResult } from './flowModel.ts';
import type { FlowAbortDto, FlowCreatedDto, FlowErrorDto, FlowOpenStepDto } from './flowModel.ts';
import type { HaArea, HaDevice, HaEntry } from './haAdapter.ts';
import { isHaError } from './haTransport.ts';
import { describeIdentityState } from './serviceIdentity.ts';
import type { IdentityState } from './serviceIdentity.ts';
import { publicEntryTitle } from './messagesIt.ts';

/**
 * The device facade (/api/dispositivi): catalogue, configuration flows, entries, names and
 * rooms. Every call goes through `runGuarded`, so the closed list of operations, the rate
 * limits, the service identity (no fallback) and the compatibility switches always apply.
 *
 * Home Assistant keeps flows in memory; Acasystem keeps a row per open flow (no field values)
 * so it can cancel them at expiry and at start-up and check that a flow belongs to the user
 * who opened it.
 */

export interface DeviceDto {
  id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  areaId: string | null;
  areaName: string | null;
}

export interface EntryDto {
  entryId: string;
  domain: string;
  title: string;
  state: string;
  loaded: boolean;
  device: DeviceDto | null;
  /** Entities of the entry that are visible (the Wake on LAN button is hidden). */
  entities: string[];
  mediaPlayerEntityId: string | null;
  /** Power-on recipe state for a TV; null for other integrations. */
  power: { configured: boolean } | null;
  /** What to tell the person when the entry is not loaded (TV off, still starting); else null. */
  message: string | null;
}

export type FlowResponseDto =
  FlowOpenStepDto | FlowAbortDto | (FlowCreatedDto & { entry: EntryDto | null; pending: boolean });

export interface FlowSummaryDto {
  flowId: string;
  handler: string;
  stepId: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface CatalogDto {
  items: CatalogEntryDto[];
  total: number;
  /** True in D1: only the flow handlers of HA are listed, without brands and translations. */
  degraded: boolean;
  message: string | null;
}

export interface StatusDto {
  user: { isAdmin: boolean };
  service: {
    state: IdentityState;
    active: boolean;
    message: string | null;
    /** Installer only. */
    detail?: string;
    expiresAt?: string | null;
  };
  homeAssistant: {
    reachable: boolean;
    onboarded: boolean | null;
    /** Installer only. */
    version?: string | null;
    verified?: boolean;
  };
  features: { catalog: boolean; flows: boolean; power: boolean };
  startableHandlers: string[];
  /** Installer only. */
  warnings?: string[];
}

export interface ActionDto {
  id: number;
  at: string;
  user: string | null;
  userName: string | null;
  source: string;
  action: string;
  domain: string | null;
  entryId: string | null;
  outcome: string;
  code: string | null;
}

export interface DeviceService {
  status(user: DeviceUser): Promise<StatusDto>;
  listCatalog(user: DeviceUser, query: { q: string; limit: number }): Promise<CatalogDto>;
  listFlows(user: DeviceUser): FlowSummaryDto[];
  startFlow(user: DeviceUser, handler: string): Promise<FlowResponseDto>;
  getFlow(user: DeviceUser, flowId: string): Promise<FlowResponseDto>;
  stepFlow(user: DeviceUser, flowId: string, input: unknown): Promise<FlowResponseDto>;
  cancelFlow(user: DeviceUser, flowId: string): Promise<{ cancelled: true; pending: boolean }>;
  getEntry(user: DeviceUser, entryId: string): Promise<EntryDto>;
  updateDevice(
    user: DeviceUser,
    deviceId: string,
    changes: { name?: string | null; areaId?: string | null }
  ): Promise<DeviceDto>;
  listAreas(user: DeviceUser): Promise<{ id: string; name: string }[]>;
  createArea(user: DeviceUser, name: string): Promise<{ id: string; name: string }>;
  listActions(user: DeviceUser, limit: number): ActionDto[];
  /** Cancels the flows left open by the previous run and runs the compatibility check. */
  startup(): Promise<void>;
  /** Cancels expired flows and retries the cancellations that could not reach HA. */
  sweep(): Promise<void>;
}

const CATALOG_CACHE_MS = 600_000;
/** A cancellation that never reached HA (HA down, identity not active) is retried this long. */
const CANCEL_RETRY_LIMIT_MS = 3_600_000;

const toIso = (ms: number): string => new Date(ms).toISOString();

/** Italian sentence for an entry that is not `loaded` (HA states `setup_retry`, `setup_error`...). */
export const messageForEntryState = (state: string): string | null => {
  switch (state) {
    case 'loaded':
      return null;
    case 'setup_retry':
    case 'not_loaded':
      return 'Il dispositivo non risponde: controlla che sia acceso e collegato alla rete.';
    case 'setup_error':
    case 'migration_error':
    case 'failed_unload':
      return "Non è stato possibile avviare il dispositivo. Chiedi all'installatore.";
    default:
      return 'Il dispositivo si sta avviando. Aspetta qualche secondo.';
  }
};

export const toDeviceDto = (
  device: HaDevice,
  domains: readonly string[],
  areas: readonly HaArea[]
): DeviceDto => ({
  id: device.id,
  // The Wake on LAN device is named after the MAC of the TV: never shown.
  name:
    device.nameByUser ??
    (domains.includes('wake_on_lan') ? publicEntryTitle('wake_on_lan', '') : device.name),
  manufacturer: device.manufacturer,
  model: device.model,
  areaId: device.areaId,
  areaName: device.areaId ? (areas.find((area) => area.id === device.areaId)?.name ?? null) : null,
});

export const createDeviceService = (ctx: DeviceContext): DeviceService => {
  let catalogCache: { items: CatalogItem[]; at: number } | null = null;

  // --- Entries -----------------------------------------------------------------------------

  /** Description of a config entry of the closed list; `wait` waits for the `loaded` state. */
  const describeEntry = async (
    token: string,
    entryId: string,
    options: { wait: boolean; domain?: string }
  ): Promise<EntryDto> =>
    ctx.adapter.withWs(token, async (api) => {
      let entry: HaEntry | null;
      if (options.wait) {
        entry = await waitForEntry(
          ctx,
          api,
          options.domain,
          entryId,
          ctx.settings.entryLoadTimeoutMs
        );
      } else {
        entry =
          (await api.entries(options.domain)).find((candidate) => candidate.entryId === entryId) ??
          null;
      }
      if (!entry) throw new DeviceError('ENTRY_NOT_FOUND');
      // Entries of other integrations are not exposed by the facade.
      if (!isFacadeDomain(entry.domain)) throw new DeviceError('REQUIRES_INSTALLER');

      const dto: EntryDto = {
        entryId: entry.entryId,
        domain: entry.domain,
        title: publicEntryTitle(entry.domain, entry.title),
        state: entry.state,
        loaded: entry.state === 'loaded',
        device: null,
        entities: [],
        mediaPlayerEntityId: null,
        power:
          entry.domain === 'webostv'
            ? { configured: ctx.model.links.get(entry.entryId) !== undefined }
            : null,
        message: messageForEntryState(entry.state),
      };
      if (!dto.loaded) return dto;

      const [devices, entities, areas] = await Promise.all([
        api.devices(),
        api.entities(),
        api.areas(),
      ]);
      const device = devicesOfEntry(devices, entry.entryId)[0];
      const own = entitiesOfEntry(entities, entry.entryId);
      dto.device = device ? toDeviceDto(device, [entry.domain], areas) : null;
      // HA names the Wake on LAN entities after the MAC of the TV: they are not listed.
      dto.entities =
        entry.domain === 'wake_on_lan'
          ? []
          : own
              .filter((entity) => entity.hiddenBy === null && entity.disabledBy === null)
              .map((entity) => entity.entityId)
              .slice(0, 20);
      dto.mediaPlayerEntityId = firstEntityOfDomain(own, 'media_player')?.entityId ?? null;
      return dto;
    });

  // --- Flows -------------------------------------------------------------------------------

  /**
   * Cancels, in HA, the flows of these rows and deletes the rows. A flow that HA does not know
   * any more is done; a failure to reach HA keeps the row for the next sweep.
   */
  const cancelPending = async (rows: readonly DeviceFlowRow[], action: string): Promise<void> => {
    if (!rows.length) return;

    const status = await ctx.identity.status();
    for (const row of rows) {
      if (ctx.busyFlows.has(row.flow_id)) continue;

      let outcome: 'ok' | 'error' = 'ok';
      let code: string | undefined;
      let remove = true;

      if (status.state !== 'active') {
        // Without the identity nothing can be cancelled from here, but the flow is still open
        // in HA: keep the row (status `cancelling`) and retry until the identity is back, up to
        // the same limit used for an unreachable HA. A flow that HA no longer has is done.
        remove = ctx.now() - row.created_at > CANCEL_RETRY_LIMIT_MS;
        if (!remove) continue;
        outcome = 'error';
        code = status.state === 'unreachable' ? 'HA_UNREACHABLE' : 'SERVICE_NOT_ACTIVE';
      } else {
        try {
          const token = await ctx.identity.requireToken();
          await ctx.adapter.flowCancel(token, row.flow_id);
        } catch (error) {
          // Any failure keeps the row for the next sweep, up to the same limit: only a
          // cancellation that worked, or a flow HA does not know (`flowCancel` returns false,
          // no error), lets the row go earlier.
          remove = ctx.now() - row.created_at > CANCEL_RETRY_LIMIT_MS;
          outcome = 'error';
          code =
            isHaError(error) && (error.kind === 'unreachable' || error.kind === 'timeout')
              ? 'HA_UNREACHABLE'
              : 'cancel_failed';
          if (!remove) continue;
        }
      }

      if (remove) ctx.model.flows.remove(row.flow_id);
      ctx.actions.record({
        user: null,
        source: action === 'flow.cancel_on_start' ? 'startup' : 'timer',
        action,
        domain: row.handler,
        outcome,
        code,
      });
    }
  };

  const expireFlows = async (): Promise<void> => {
    const now = ctx.now();
    for (const row of ctx.model.flows.listExpired(now)) {
      if (ctx.busyFlows.has(row.flow_id)) continue;
      ctx.model.flows.setStatus(row.flow_id, 'cancelling');
    }
    await cancelPending(ctx.model.flows.listCancelling(), 'flow.expire');
  };

  /** The row of a flow that belongs to this user and is still open. */
  const loadOwnFlow = async (user: DeviceUser, flowId: string): Promise<DeviceFlowRow> => {
    const row = ctx.model.flows.get(flowId);
    if (!row || row.status !== 'open') throw new DeviceError('FLOW_NOT_FOUND');
    if (row.ha_user_id !== user.id) throw new DeviceError('FORBIDDEN');
    if (row.expires_at <= ctx.now()) {
      ctx.model.flows.setStatus(flowId, 'cancelling');
      await cancelPending([row], 'flow.expire').catch(() => undefined);
      throw new DeviceError('FLOW_EXPIRED');
    }
    return row;
  };

  const cancelUnsupported = async (
    token: string,
    flowId: string | null,
    row: DeviceFlowRow | null
  ) => {
    const id = flowId ?? row?.flow_id;
    if (id) {
      try {
        await ctx.adapter.flowCancel(token, id);
      } catch {
        // The flow dies with HA or at expiry; the row below is what matters.
      }
    }
    if (row) ctx.model.flows.remove(row.flow_id);
  };

  /** Turns the answer of HA into the response, keeping the row of the flow up to date. */
  const settleFlowResult = async (
    token: string,
    user: DeviceUser,
    handler: string,
    raw: unknown,
    row: DeviceFlowRow | null,
    audit:
      | {
          domain?: string | undefined;
          entryId?: string | undefined;
          code?: string | undefined;
          outcome?: 'ok' | 'error';
        }
      | undefined
  ): Promise<FlowResponseDto> => {
    const normalized = normalizeFlowResult(raw, handler);

    if (normalized.outcome === 'unsupported') {
      await cancelUnsupported(token, normalized.flowId, row);
      if (audit) audit.code = normalized.reason;
      throw new DeviceError('UNSUPPORTED_STEP');
    }

    if (normalized.outcome === 'step') {
      const now = ctx.now();
      if (row) {
        ctx.model.flows.updateStep(
          row.flow_id,
          normalized.stepId,
          now,
          now + ctx.settings.flowTtlMs
        );
      } else {
        ctx.model.flows.insert({
          flow_id: normalized.flowId,
          ha_user_id: user.id,
          handler,
          step_id: normalized.stepId,
          status: 'open',
          created_at: now,
          updated_at: now,
          expires_at: now + ctx.settings.flowTtlMs,
        });
      }
      if (audit && normalized.dto.type === 'form' && normalized.dto.errors.length) {
        audit.code = normalized.dto.errors[0]?.code;
        audit.outcome = 'error';
      }
      return normalized.dto;
    }

    // Terminal result: HA has already dropped the flow.
    if (row) ctx.model.flows.remove(row.flow_id);
    if (normalized.nextFlowId) {
      await ctx.adapter.flowCancel(token, normalized.nextFlowId).catch(() => false);
    }

    if (normalized.dto.type === 'abort') {
      if (audit) {
        audit.code = normalized.dto.reason;
        audit.outcome = normalized.dto.reason.endsWith('successful') ? 'ok' : 'error';
      }
      return normalized.dto;
    }

    if (audit) {
      audit.domain = normalized.dto.domain;
      audit.entryId = normalized.dto.entryId;
    }
    let entry: EntryDto | null = null;
    try {
      entry = await describeEntry(token, normalized.dto.entryId, {
        wait: true,
        domain: normalized.dto.domain,
      });
    } catch (error) {
      if (!isHaError(error) && !(error instanceof DeviceError)) throw error;
      ctx.log(
        `[devices] entry ${normalized.dto.domain} created but not described yet: ${describeForLog(error)}`
      );
    }
    return { ...normalized.dto, entry, pending: entry === null || !entry.loaded };
  };

  const rethrowStepError = (
    error: unknown,
    row: DeviceFlowRow,
    flowErrors: (errors: FlowErrorDto[]) => never
  ): never => {
    if (isHaError(error) && error.kind === 'not_found') {
      // HA no longer has the flow (it restarted): nothing left to cancel.
      ctx.model.flows.remove(row.flow_id);
      throw new DeviceError('FLOW_NOT_FOUND');
    }
    if (isHaError(error) && error.kind === 'bad_request') {
      const errors = flowErrorsFromBadRequest(error.body);
      if (errors.length) return flowErrors(errors);
      throw new DeviceError('INVALID_INPUT');
    }
    throw error;
  };

  // --- Service -----------------------------------------------------------------------------

  const service: DeviceService = {
    async status(user) {
      authorizeOperation('status.read', user);
      const identity = await ctx.identity.status();
      const report = await ctx.compat.get();
      const active = identity.state === 'active';

      const customerMessage = ((): string | null => {
        if (active) return null;
        if (identity.state === 'unreachable')
          return DEVICE_ERROR_DEFINITIONS.HA_UNREACHABLE.message;
        return DEVICE_ERROR_DEFINITIONS.SERVICE_NOT_ACTIVE.message;
      })();

      const open = active && report.reachable && report.onboarded !== false;
      const dto: StatusDto = {
        user: { isAdmin: user.isAdmin },
        service: { state: identity.state, active, message: customerMessage },
        homeAssistant: { reachable: report.reachable, onboarded: report.onboarded },
        features: {
          catalog: open && report.features.catalog,
          flows: open && report.features.flows,
          power: open && report.features.power,
        },
        startableHandlers: [...CUSTOMER_STARTABLE_HANDLERS],
      };
      if (user.isAdmin) {
        dto.service.detail = describeIdentityState(identity.state);
        dto.service.expiresAt = identity.expiresAt;
        dto.homeAssistant.version = report.version;
        dto.homeAssistant.verified = report.versionVerified;
        dto.warnings = report.installerMessages;
      }
      return dto;
    },

    async listCatalog(user, query) {
      return runGuarded(ctx, user, 'catalog.read', { feature: 'catalog' }, async (token) => {
        if (!catalogCache || ctx.now() - catalogCache.at > CATALOG_CACHE_MS) {
          // D1 lists the flow handlers of HA only (REP-20261023-003, section 3, row 9). The
          // full index with brands and translations, and the search over it, are D3.
          const handlers = await ctx.adapter.flowHandlers(token);
          catalogCache = {
            items: handlers
              .filter((domain) => /^[a-z0-9_]{1,64}$/.test(domain))
              .map((domain) => ({
                domain,
                name: domain,
                brand: null,
                integrationType: null,
                iotClass: null,
                startDomain: domain,
              })),
            at: ctx.now(),
          };
        }

        const matches = searchCatalog(catalogCache.items, query.q);
        return {
          items: matches.slice(0, query.limit),
          total: matches.length,
          degraded: true,
          message:
            "L'elenco completo delle marche non è ancora disponibile. Puoi cercare tra le principali.",
        };
      });
    },

    listFlows(user) {
      authorizeOperation('flow.list', user);
      return ctx.model.flows.listOpenForUser(user.id, ctx.now()).map((row) => ({
        flowId: row.flow_id,
        handler: row.handler,
        stepId: row.step_id,
        createdAt: toIso(row.created_at),
        expiresAt: toIso(row.expires_at),
      }));
    },

    async startFlow(user, handler) {
      // The closed list comes first and needs no call to HA: an integration outside it is
      // refused whatever the state of the service (negato per difetto).
      if (!isStartableHandler(handler)) {
        ctx.actions.record({
          user: { id: user.id, name: user.name },
          source: 'api',
          action: 'flow.start',
          domain: handler,
          outcome: 'denied',
          code: 'REQUIRES_INSTALLER',
        });
        throw new DeviceError('REQUIRES_INSTALLER');
      }

      return runGuarded(
        ctx,
        user,
        'flow.start',
        { feature: 'flows', mutation: true, audit: { action: 'flow.start', domain: handler } },
        async (token, audit) => {
          await expireFlows();
          const existing = ctx.model.flows.findOpenForHandler(user.id, handler, ctx.now());
          if (existing) throw new DeviceError('FLOW_ALREADY_OPEN', { flowId: existing.flow_id });
          if (
            ctx.model.flows.countOpen(ctx.now(), user.id) >= ctx.settings.maxOpenFlowsPerUser ||
            ctx.model.flows.countOpen(ctx.now()) >= ctx.settings.maxOpenFlowsTotal
          ) {
            throw new DeviceError('TOO_MANY_FLOWS');
          }
          const turn = ctx.limiters.flowStart.take(user.id);
          if (!turn.allowed)
            throw new DeviceError('RATE_LIMITED', { retryAfterSeconds: turn.retryAfterSeconds });

          const raw = await ctx.adapter.flowStart(token, handler);
          return settleFlowResult(token, user, handler, raw, null, audit);
        }
      );
    },

    async getFlow(user, flowId) {
      return runGuarded(
        ctx,
        user,
        'flow.read',
        { feature: 'flows', audit: undefined },
        async (token) => {
          const row = await loadOwnFlow(user, flowId);
          // HA re-runs the current step when a flow is read; the steps of the listed
          // integrations only show their form again, they do not act.
          let raw: unknown;
          try {
            raw = await ctx.adapter.flowRead(token, flowId);
          } catch (error) {
            return rethrowStepError(error, row, () => {
              throw new DeviceError('INVALID_INPUT');
            });
          }
          return settleFlowResult(token, user, row.handler, raw, row, undefined);
        }
      );
    },

    async stepFlow(user, flowId, input) {
      return runGuarded(
        ctx,
        user,
        'flow.step',
        { feature: 'flows', mutation: true, audit: { action: 'flow.step' } },
        async (token, audit) => {
          const row = await loadOwnFlow(user, flowId);
          if (audit) audit.domain = row.handler;
          if (ctx.busyFlows.has(flowId)) throw new DeviceError('FLOW_BUSY');

          const stepId = row.step_id ?? '';
          if (!hasInputRules(row.handler, stepId)) {
            // A step this server does not know how to answer is never improvised.
            await cancelUnsupported(token, flowId, row);
            if (audit) audit.code = 'unsupported_step';
            throw new DeviceError('UNSUPPORTED_STEP');
          }
          const built = buildFlowInput(row.handler, stepId, input);
          if (!built.ok)
            throw new DeviceError('INVALID_INPUT', built.field ? { field: built.field } : {});

          ctx.busyFlows.add(flowId);
          try {
            const now = ctx.now();
            ctx.model.flows.updateStep(flowId, stepId, now, now + ctx.settings.flowTtlMs);

            let raw: unknown;
            try {
              raw = await ctx.adapter.flowStep(token, flowId, built.input);
            } catch (error) {
              return rethrowStepError(error, row, (errors) => {
                const first = errors[0];
                throw new DeviceError(
                  'INVALID_INPUT',
                  first?.field
                    ? { field: first.field, message: first.message }
                    : { message: first?.message ?? '' }
                );
              });
            }
            return await settleFlowResult(token, user, row.handler, raw, row, audit);
          } finally {
            ctx.busyFlows.delete(flowId);
          }
        }
      );
    },

    async cancelFlow(user, flowId) {
      return runGuarded(
        ctx,
        user,
        'flow.cancel',
        { feature: 'flows', mutation: true, audit: { action: 'flow.cancel' } },
        async (token, audit) => {
          const row = ctx.model.flows.get(flowId);
          if (!row || row.status !== 'open') throw new DeviceError('FLOW_NOT_FOUND');
          if (row.ha_user_id !== user.id) throw new DeviceError('FORBIDDEN');
          if (audit) audit.domain = row.handler;

          try {
            await ctx.adapter.flowCancel(token, flowId);
          } catch (error) {
            if (isHaError(error) && (error.kind === 'unreachable' || error.kind === 'timeout')) {
              // Cancelled for the user now; the sweep finishes the job when HA answers.
              ctx.model.flows.setStatus(flowId, 'cancelling');
              return { cancelled: true as const, pending: true };
            }
            throw error;
          }
          ctx.model.flows.remove(flowId);
          return { cancelled: true as const, pending: false };
        }
      );
    },

    async getEntry(user, entryId) {
      return runGuarded(ctx, user, 'entry.read', {}, (token) =>
        describeEntry(token, entryId, { wait: false })
      );
    },

    async updateDevice(user, deviceId, changes) {
      return runGuarded(
        ctx,
        user,
        'device.update',
        { mutation: true, audit: { action: 'device.update' } },
        async (token, audit) =>
          ctx.adapter.withWs(token, async (api) => {
            const [devices, entries, areas] = await Promise.all([
              api.devices(),
              api.entries(),
              api.areas(),
            ]);
            const device = devices.find((candidate) => candidate.id === deviceId);
            if (!device || !device.entryIds.length) throw new DeviceError('DEVICE_NOT_FOUND');

            // Only devices whose every entry is in the closed list: never a shared device.
            const domains = device.entryIds.map(
              (entryId) => entries.find((entry) => entry.entryId === entryId)?.domain
            );
            if (domains.some((domain) => domain === undefined || !isFacadeDomain(domain))) {
              throw new DeviceError('REQUIRES_INSTALLER');
            }
            if (audit) {
              audit.domain = domains[0];
              audit.entryId = device.entryIds[0];
            }

            if (changes.areaId && !areas.some((area) => area.id === changes.areaId)) {
              throw new DeviceError('AREA_NOT_FOUND');
            }
            await api.updateDevice(deviceId, {
              ...(changes.name !== undefined ? { nameByUser: changes.name } : {}),
              ...(changes.areaId !== undefined ? { areaId: changes.areaId } : {}),
            });

            const updated =
              (await api.devices()).find((candidate) => candidate.id === deviceId) ?? device;
            return toDeviceDto(updated, domains as string[], await api.areas());
          })
      );
    },

    async listAreas(user) {
      return runGuarded(ctx, user, 'area.read', {}, async (token) =>
        (await ctx.adapter.ws(token).areas()).map((area) => ({ id: area.id, name: area.name }))
      );
    },

    async createArea(user, name) {
      return runGuarded(
        ctx,
        user,
        'area.create',
        { mutation: true, audit: { action: 'area.create' } },
        async (token) =>
          ctx.adapter.withWs(token, async (api) => {
            const existing = (await api.areas()).find(
              (area) => area.name.toLocaleLowerCase('it') === name.toLocaleLowerCase('it')
            );
            let area = existing;
            if (!area) {
              try {
                area = await api.createArea(name);
              } catch (error) {
                // HA compares names after its own normalisation and may find a duplicate.
                if (isHaError(error) && error.kind === 'bad_request')
                  throw new DeviceError('AREA_EXISTS');
                throw error;
              }
            }
            return { id: area.id, name: area.name };
          })
      );
    },

    listActions(user, limit) {
      authorizeOperation('action.list', user);
      return ctx.model.actions.list(limit).map((row) => ({
        id: row.id,
        at: toIso(row.at),
        user: row.ha_user_id,
        userName: row.ha_user_name,
        source: row.source,
        action: row.action,
        domain: row.domain,
        entryId: row.entry_id,
        outcome: row.outcome,
        code: row.code,
      }));
    },

    async startup() {
      ctx.model.flows.markAllCancelling();
      await cancelPending(ctx.model.flows.listCancelling(), 'flow.cancel_on_start');
      await ctx.compat.get({ force: true });
    },

    async sweep() {
      await expireFlows();
    },
  };

  return service;
};
