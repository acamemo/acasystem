import { POWER_AUTOMATION_ID_PREFIX } from '../../config/devices.ts';
import { powerTriggerFormsFor } from '../../config/homeAssistantApiCatalog.ts';
import type { PowerTriggerForm } from '../../config/homeAssistantApiCatalog.ts';
import { macDigits, normalizeMacAddress } from '../../helpers/macAddress.ts';
import { normalizeBroadcastAddress, normalizePort } from '../../helpers/network.ts';
import type { PowerLinkRow } from '../../models/deviceModel.ts';
import { DeviceError } from './deviceErrors.ts';
import { runGuarded } from './deviceContext.ts';
import type { DeviceContext, DeviceUser } from './deviceContext.ts';
import {
  devicesOfEntry,
  entitiesOfEntry,
  firstEntityOfDomain,
  waitForEntry,
} from './entryTools.ts';
import { normalizeFlowResult } from './flowModel.ts';
import type { HaDevice, HaWsApi } from './haAdapter.ts';

/**
 * Power-on recipe for an LG TV (D1b, D-D5 "Automazione in HA"): a `wake_on_lan` entry plus one
 * automation in HA whose trigger is the turn-on trigger of `webostv` and whose action presses
 * the Wake on LAN button. HA sends the magic packet; Acasystem never touches the network.
 *
 * The recipe is a closed model: the body of the automation is built here from ids that this
 * server read from the registries of HA, never from the browser. The id of the automation has
 * a fixed prefix. The MAC comes from HA (when its device registry has one) or from the
 * installer; it is passed to HA and forgotten: it is not stored, logged or returned.
 */

export interface PowerOptions {
  /** Installer only. */
  mac?: string | undefined;
  /** Installer only. */
  broadcastAddress?: string | undefined;
  /** Installer only. */
  broadcastPort?: number | undefined;
}

export interface PowerStatusDto {
  entryId: string;
  configured: boolean;
  /** True when the TV shows the turn-on feature; null when it could not be checked. */
  active: boolean | null;
  message: string | null;
  /** Where the MAC came from for this call; the value is never returned. */
  macSource?: 'home_assistant' | 'installer';
}

export interface PowerRecipe {
  status(user: DeviceUser, webostvEntryId: string): Promise<PowerStatusDto>;
  setup(user: DeviceUser, webostvEntryId: string, options: PowerOptions): Promise<PowerStatusDto>;
  remove(user: DeviceUser, webostvEntryId: string): Promise<{ removed: true }>;
}

/** Bit of `supported_features` that a media player shows when it can be turned on. */
const TURN_ON_FEATURE = 128;
/** Marker owner of the flows the server opens for itself, so a restart can cancel them. */
const RECIPE_FLOW_OWNER = '__recipe__';

export const MESSAGE_POWER_INACTIVE = "L'accensione da spento non è attiva.";

export const powerAutomationId = (webostvEntryId: string): string | null => {
  const id = `${POWER_AUTOMATION_ID_PREFIX}${webostvEntryId.toLowerCase()}`;
  return /^acasystem_accensione_[a-z0-9]{1,40}$/.test(id) ? id : null;
};

interface AutomationModel {
  id: string;
  deviceId: string;
  mediaPlayerEntityId: string;
  buttonEntityId: string;
  form: PowerTriggerForm;
}

/** The only automation Acasystem writes. */
export const buildPowerAutomation = (model: AutomationModel): Record<string, unknown> => ({
  id: model.id,
  alias: 'Acasystem: accensione del televisore',
  description: 'Creata da Acasystem per accendere il televisore via rete. Non modificare.',
  mode: 'single',
  triggers: [
    model.form === 'device'
      ? { trigger: 'device', domain: 'webostv', type: 'webostv.turn_on', device_id: model.deviceId }
      : { trigger: 'webostv.turn_on', entity_id: [model.mediaPlayerEntityId] },
  ],
  conditions: [],
  actions: [{ action: 'button.press', target: { entity_id: model.buttonEntityId } }],
});

/** MAC known to HA for this device (device registry `connections`); null if HA has none. */
const macFromHomeAssistant = (device: HaDevice | undefined): string | null =>
  device?.macs[0] ?? null;

export const createPowerRecipe = (ctx: DeviceContext): PowerRecipe => {
  /** Waits until the media player of the TV shows the turn-on feature. */
  const waitForTurnOnFeature = async (token: string, entityId: string): Promise<boolean> => {
    const deadline = ctx.now() + ctx.settings.powerStateTimeoutMs;
    for (;;) {
      const state = await ctx.adapter.state(token, entityId);
      if (state && (state.supportedFeatures & TURN_ON_FEATURE) !== 0) return true;
      if (ctx.now() >= deadline) return false;
      await ctx.delay(ctx.settings.pollIntervalMs);
    }
  };

  /**
   * Creates the `wake_on_lan` entry through its own configuration flow, driven by the
   * server. Returns the entry id. The MAC goes to HA and nowhere else.
   */
  const createWakeOnLanEntry = async (
    token: string,
    api: HaWsApi,
    mac: string,
    extras: { broadcastAddress?: string | undefined; broadcastPort?: number | undefined }
  ): Promise<string> => {
    const started = normalizeFlowResult(
      await ctx.adapter.flowStart(token, 'wake_on_lan'),
      'wake_on_lan'
    );
    if (started.outcome !== 'step' || started.dto.type !== 'form') {
      if (started.outcome === 'unsupported' && started.flowId)
        await ctx.adapter.flowCancel(token, started.flowId).catch(() => false);
      throw new DeviceError('RECIPE_FAILED');
    }

    const flowId = started.flowId;
    const now = ctx.now();
    ctx.model.flows.insert({
      flow_id: flowId,
      ha_user_id: RECIPE_FLOW_OWNER,
      handler: 'wake_on_lan',
      step_id: started.stepId,
      status: 'open',
      created_at: now,
      updated_at: now,
      expires_at: now + ctx.settings.flowTtlMs,
    });

    try {
      const body: Record<string, string | number> = { mac };
      if (extras.broadcastAddress) body.broadcast_address = extras.broadcastAddress;
      if (extras.broadcastPort) body.broadcast_port = extras.broadcastPort;
      const result = normalizeFlowResult(
        await ctx.adapter.flowStep(token, flowId, body),
        'wake_on_lan'
      );

      if (result.outcome === 'terminal' && result.dto.type === 'create_entry') {
        return result.dto.entryId;
      }
      if (
        result.outcome === 'terminal' &&
        result.dto.type === 'abort' &&
        result.dto.reason === 'already_configured'
      ) {
        // The same MAC is already configured: reuse that entry (HA titles it after the MAC).
        const wanted = macDigits(mac);
        const existing = (await api.entries('wake_on_lan')).find((entry) =>
          macDigits(entry.title).includes(wanted)
        );
        if (existing) return existing.entryId;
      }
      if (result.outcome === 'step') await ctx.adapter.flowCancel(token, flowId).catch(() => false);
      throw new DeviceError('RECIPE_FAILED');
    } finally {
      ctx.model.flows.remove(flowId);
    }
  };

  /** True if the link still points at things that exist in HA. */
  const linkIsComplete = async (
    token: string,
    api: HaWsApi,
    link: PowerLinkRow
  ): Promise<boolean> => {
    const wolEntry = (await api.entries('wake_on_lan')).some(
      (entry) => entry.entryId === link.wol_entry_id
    );
    if (!wolEntry) return false;
    return ctx.adapter.automationExists(token, link.automation_id);
  };

  const statusOf = async (token: string, entryId: string): Promise<PowerStatusDto> => {
    const link = ctx.model.links.get(entryId);
    if (!link) return { entryId, configured: false, active: null, message: null };

    const complete = await ctx.adapter.withWs(token, (api) => linkIsComplete(token, api, link));
    if (!complete) {
      return { entryId, configured: false, active: false, message: MESSAGE_POWER_INACTIVE };
    }
    const state = await ctx.adapter.state(token, link.media_player_entity_id);
    const active = state ? (state.supportedFeatures & TURN_ON_FEATURE) !== 0 : null;
    return {
      entryId,
      configured: true,
      active,
      message: active === false ? MESSAGE_POWER_INACTIVE : null,
    };
  };

  /** One setup or removal at a time per TV: a second tap or another tablet waits its turn. */
  const exclusive = async <T>(webostvEntryId: string, run: () => Promise<T>): Promise<T> => {
    const key = `power:${webostvEntryId}`;
    if (ctx.busyFlows.has(key)) throw new DeviceError('FLOW_BUSY');
    ctx.busyFlows.add(key);
    try {
      return await run();
    } finally {
      ctx.busyFlows.delete(key);
    }
  };

  return {
    async status(user, webostvEntryId) {
      return runGuarded(ctx, user, 'power.read', { feature: 'power' }, (token) =>
        statusOf(token, webostvEntryId)
      );
    },

    async setup(user, webostvEntryId, options) {
      return runGuarded(
        ctx,
        user,
        'power.setup',
        {
          feature: 'power',
          mutation: true,
          refusal: 'RECIPE_FAILED',
          audit: { action: 'power.setup', domain: 'webostv', entryId: webostvEntryId },
        },
        (token, audit) =>
          exclusive(webostvEntryId, async () => {
            // MAC and broadcast overrides are the installer's: a customer gets the MAC from HA.
            const overrides =
              options.mac !== undefined ||
              options.broadcastAddress !== undefined ||
              options.broadcastPort !== undefined;
            if (overrides && !user.isAdmin) throw new DeviceError('REQUIRES_INSTALLER');

            const suppliedMac = options.mac === undefined ? null : normalizeMacAddress(options.mac);
            if (options.mac !== undefined && !suppliedMac)
              throw new DeviceError('INVALID_INPUT', { field: 'mac' });
            const broadcastAddress =
              options.broadcastAddress === undefined
                ? undefined
                : normalizeBroadcastAddress(options.broadcastAddress);
            if (options.broadcastAddress !== undefined && !broadcastAddress) {
              throw new DeviceError('INVALID_INPUT', { field: 'broadcastAddress' });
            }
            const broadcastPort =
              options.broadcastPort === undefined
                ? undefined
                : normalizePort(options.broadcastPort);
            if (options.broadcastPort !== undefined && !broadcastPort) {
              throw new DeviceError('INVALID_INPUT', { field: 'broadcastPort' });
            }

            const automationId = powerAutomationId(webostvEntryId);
            if (!automationId) throw new DeviceError('ENTRY_NOT_FOUND');

            const haVersion = (await ctx.compat.get()).version;
            const forms = powerTriggerFormsFor(haVersion);

            return ctx.adapter.withWs(token, async (api): Promise<PowerStatusDto> => {
              // 1. The TV entry must exist and be loaded.
              const tv = await waitForEntry(
                ctx,
                api,
                'webostv',
                webostvEntryId,
                ctx.settings.entryLoadTimeoutMs
              );
              if (!tv) throw new DeviceError('ENTRY_NOT_FOUND');
              if (tv.state !== 'loaded') throw new DeviceError('ENTRY_NOT_READY');

              // 2. Ids of the TV device and media player, read from the registries of HA.
              const [devices, entities] = await Promise.all([api.devices(), api.entities()]);
              const tvDevice = devicesOfEntry(devices, webostvEntryId)[0];
              const mediaPlayer = firstEntityOfDomain(
                entitiesOfEntry(entities, webostvEntryId),
                'media_player'
              );
              if (!tvDevice || !mediaPlayer) throw new DeviceError('RECIPE_FAILED');

              // 3. Wake on LAN entry: reuse the one in the link, else create it (needs the MAC).
              const link = ctx.model.links.get(webostvEntryId);
              let macSource: 'home_assistant' | 'installer' | undefined;
              let wolEntryId: string | null = null;
              if (
                link &&
                (await api.entries('wake_on_lan')).some(
                  (entry) => entry.entryId === link?.wol_entry_id
                )
              ) {
                wolEntryId = link.wol_entry_id;
              }
              if (!wolEntryId) {
                const mac = suppliedMac ?? macFromHomeAssistant(tvDevice);
                if (!mac) throw new DeviceError('MAC_REQUIRED');
                macSource = suppliedMac ? 'installer' : 'home_assistant';
                wolEntryId = await createWakeOnLanEntry(token, api, mac, {
                  broadcastAddress: broadcastAddress ?? undefined,
                  broadcastPort: broadcastPort ?? undefined,
                });
                if (audit) audit.code = suppliedMac ? 'mac_from_installer' : 'mac_from_ha';
              }

              const wol = await waitForEntry(
                ctx,
                api,
                'wake_on_lan',
                wolEntryId,
                ctx.settings.entryLoadTimeoutMs
              );
              if (!wol || wol.state !== 'loaded') throw new DeviceError('RECIPE_FAILED');

              // 4. The button of the new entry: hidden, so it never shows up as a widget.
              const wolEntities = entitiesOfEntry(await api.entities(), wolEntryId);
              const button = firstEntityOfDomain(wolEntities, 'button');
              if (!button) throw new DeviceError('RECIPE_FAILED');
              if (button.hiddenBy === null)
                await api.updateEntity(button.entityId, { hiddenBy: 'user' });

              // 5. The automation: prevalidated, written, then checked in the state of the TV (RD-08).
              let active = false;
              let usedForm: PowerTriggerForm = forms[0] ?? 'device';
              for (const form of forms) {
                usedForm = form;
                const model = buildPowerAutomation({
                  id: automationId,
                  deviceId: tvDevice.id,
                  mediaPlayerEntityId: mediaPlayer.entityId,
                  buttonEntityId: button.entityId,
                  form,
                });
                const valid = await api.validateConfig({
                  triggers: model.triggers as unknown[],
                  conditions: model.conditions as unknown[],
                  actions: model.actions as unknown[],
                });
                if (!valid) continue;
                await ctx.adapter.automationPut(token, automationId, model);
                if (await waitForTurnOnFeature(token, mediaPlayer.entityId)) {
                  active = true;
                  break;
                }
              }

              // 6. The link: ids only, no MAC.
              ctx.model.links.upsert({
                webostv_entry_id: webostvEntryId,
                wol_entry_id: wolEntryId,
                automation_id: automationId,
                device_id: tvDevice.id,
                media_player_entity_id: mediaPlayer.entityId,
                trigger_form: usedForm,
                created_by: user.id,
                created_at: link?.created_at ?? ctx.now(),
              });

              if (!active && audit) {
                audit.outcome = 'error';
                audit.code = 'RD-08';
              }
              return {
                entryId: webostvEntryId,
                configured: true,
                active,
                message: active ? null : MESSAGE_POWER_INACTIVE,
                ...(macSource ? { macSource } : {}),
              };
            });
          })
      );
    },

    async remove(user, webostvEntryId) {
      return runGuarded(
        ctx,
        user,
        'power.remove',
        {
          feature: 'power',
          mutation: true,
          refusal: 'RECIPE_FAILED',
          audit: { action: 'power.remove', domain: 'webostv', entryId: webostvEntryId },
        },
        (token) =>
          exclusive(webostvEntryId, async () => {
            // Only what the link records is removed: ids from the browser are never used.
            const link = ctx.model.links.get(webostvEntryId);
            if (!link) throw new DeviceError('ENTRY_NOT_FOUND');

            await ctx.adapter.automationDelete(token, link.automation_id);
            await ctx.adapter.removeEntry(token, link.wol_entry_id);
            ctx.model.links.remove(webostvEntryId);
            return { removed: true as const };
          })
      );
    },
  };
};
