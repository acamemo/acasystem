import { HA_CALLS } from '../../config/homeAssistantApiCatalog.ts';
import { isRecord } from '../../helpers/objects.ts';
import { normalizeMacAddress } from '../../helpers/macAddress.ts';
import { HaError, isHaError } from './haTransport.ts';
import type { HaTransport, HaWsSession } from './haTransport.ts';

/**
 * The only module that knows the shape of Home Assistant's answers (ADR-0021, point 2).
 * Requests are built from the descriptors in config/homeAssistantApiCatalog.ts; answers are
 * read defensively (extra fields, nulls and unknown values are tolerated) and reduced to the
 * few fields the facade needs.
 */

export interface HaUserInfo {
  id: string;
  name: string;
  isAdmin: boolean;
  isOwner: boolean;
}

export interface HaEntry {
  entryId: string;
  domain: string;
  title: string;
  state: string;
  source: string;
}

export interface HaDevice {
  id: string;
  name: string;
  nameByUser: string | null;
  manufacturer: string | null;
  model: string | null;
  areaId: string | null;
  entryIds: string[];
  /** MAC addresses found in `connections`. Used only by the power recipe, never returned. */
  macs: string[];
}

export interface HaEntity {
  entityId: string;
  platform: string;
  deviceId: string | null;
  entryId: string | null;
  hiddenBy: string | null;
  disabledBy: string | null;
}

export interface HaArea {
  id: string;
  name: string;
}

export interface HaState {
  state: string;
  supportedFeatures: number;
}

export interface HaAdminUser {
  id: string;
  name: string;
  username: string | null;
  isActive: boolean;
  isOwner: boolean;
  /** Member of the administrators group (or owner). */
  isAdmin: boolean;
  localOnly: boolean;
  systemGenerated: boolean;
}

export type HaLoginStep =
  | {
      kind: 'form';
      flowId: string;
      stepId: string;
      fields: string[];
      error: string | null;
    }
  | { kind: 'done'; code: string };

/** A flow in progress that HA opened by itself (a discovery), reduced to what the facade reads. */
export interface HaProgressFlow {
  flowId: string;
  handler: string;
  stepId: string | null;
  /** `zeroconf`, `ssdp`, `dhcp`... (`context.source`). */
  source: string;
  /** Name and model from `context.title_placeholders`; never shown if they look like an address. */
  name: string | null;
  model: string | null;
  hasUniqueId: boolean;
}

/** One device that HA saw on the network by SSDP, zeroconf or DHCP (F5). */
export interface HaNetworkDevice {
  source: 'ssdp' | 'zeroconf' | 'dhcp';
  host: string | null;
  /** Only DHCP gives the MAC. Never returned to the browser. */
  mac: string | null;
  hostname: string | null;
  manufacturer: string | null;
  modelName: string | null;
  friendlyName: string | null;
  deviceType: string | null;
  /** SSDP: the UDN; zeroconf: the service name. */
  uid: string | null;
  /** Zeroconf service type, like `_googlecast._tcp.local.`. */
  serviceType: string | null;
  /** SSDP: integrations HA matched for the device (`x_homeassistant_matching_domains`). */
  domains: string[];
}

export interface HaWsApi {
  currentUser(): Promise<HaUserInfo>;
  entries(domain?: string): Promise<HaEntry[]>;
  devices(): Promise<HaDevice[]>;
  updateDevice(
    deviceId: string,
    changes: { nameByUser?: string | null; areaId?: string | null }
  ): Promise<void>;
  entities(): Promise<HaEntity[]>;
  updateEntity(entityId: string, changes: { hiddenBy: 'user' | null }): Promise<void>;
  areas(): Promise<HaArea[]>;
  createArea(name: string): Promise<HaArea>;
  validateConfig(config: {
    triggers: unknown[];
    conditions: unknown[];
    actions: unknown[];
  }): Promise<boolean>;
  longLivedToken(clientName: string, lifespanDays: number): Promise<string>;
  adminUsers(): Promise<HaAdminUser[]>;
  createUser(name: string, localOnly: boolean): Promise<HaAdminUser>;
  updateUser(
    userId: string,
    changes: { isActive?: boolean; groupIds?: string[]; localOnly?: boolean }
  ): Promise<void>;
  /** Ids of the long-lived tokens of the connected user (for the rotation of the token). */
  longLivedTokenIds(): Promise<string[]>;
  /** Deletes one refresh token (long-lived or not) of the connected user by id. */
  deleteRefreshToken(refreshTokenId: string): Promise<void>;
  createCredentials(userId: string, username: string, password: string): Promise<void>;
  changePassword(userId: string, password: string): Promise<void>;
  /** Marks a discovery as ignored; HA drops the flow and remembers the device. */
  ignoreFlow(flowId: string, title: string): Promise<void>;
  /** Flows in progress other than the ones opened by a person (`source` is not `user`). */
  flowsInProgress(): Promise<HaProgressFlow[]>;
  /**
   * The list of devices HA sees on the network for one source: the first event of its
   * `subscribe_discovery` subscription of the source, which is closed again. Read-only; HA does the scan.
   */
  networkDevices(source: HaNetworkDevice['source']): Promise<HaNetworkDevice[]>;
  /**
   * Italian texts of the configuration flows of one integration (`frontend/get_translations`,
   * category `config`): the raw `result`, read by `parseTranslations` (haTexts.ts).
   */
  translations(handler: string): Promise<unknown>;
}

export interface HaAdapter {
  readVersion(): Promise<string | null>;
  /** One WebSocket connection per call. */
  ws(token: string): HaWsApi;
  /** One WebSocket connection for the several calls made by `run`. */
  withWs<T>(token: string, run: (api: HaWsApi) => Promise<T>): Promise<T>;

  authProviders(): Promise<{ onboarded: boolean }>;
  flowHandlers(token: string): Promise<string[]>;
  flowStart(token: string, handler: string): Promise<unknown>;
  flowRead(token: string, flowId: string): Promise<unknown>;
  flowStep(token: string, flowId: string, input: Record<string, unknown>): Promise<unknown>;
  /** Cancels a flow; true if HA had it, false if it was already gone. */
  flowCancel(token: string, flowId: string): Promise<boolean>;
  removeEntry(token: string, entryId: string): Promise<boolean>;
  automationExists(token: string, automationId: string): Promise<boolean>;
  automationPut(token: string, automationId: string, body: Record<string, unknown>): Promise<void>;
  automationDelete(token: string, automationId: string): Promise<boolean>;
  state(token: string, entityId: string): Promise<HaState | null>;

  /** Start-up probes with no effect (RD-03, RD-07). */
  probeFlowRoute(token: string): Promise<boolean>;
  probeAutomationRoute(token: string): Promise<boolean>;

  /** Login flow and token exchange, used only by the activation of the service user. */
  loginStart(clientId: string): Promise<HaLoginStep>;
  loginStep(flowId: string, clientId: string, data: Record<string, string>): Promise<HaLoginStep>;
  exchangeCode(
    code: string,
    clientId: string
  ): Promise<{ accessToken: string; refreshToken: string }>;
  revokeRefreshToken(refreshToken: string): Promise<void>;
}

export interface HaAdapterOptions {
  transport: HaTransport;
  callTimeoutMs: number;
  flowStepTimeoutMs: number;
}

/** How long to wait for the first event of a discovery subscription (F5: at most 3 seconds). */
const DISCOVERY_WAIT_MS = 3_000;

const asString = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const protocolError = (): HaError => new HaError('protocol');

const requireRecord = (value: unknown): Record<string, unknown> => {
  if (!isRecord(value) || Array.isArray(value)) throw protocolError();
  return value;
};

const parseUser = (value: unknown): HaUserInfo => {
  const record = requireRecord(value);
  const id = asString(record.id);
  if (!id) throw protocolError();
  return {
    id,
    name: asString(record.name) ?? '',
    isAdmin: record.is_admin === true,
    isOwner: record.is_owner === true,
  };
};

const parseEntry = (value: unknown): HaEntry | null => {
  if (!isRecord(value)) return null;
  const entryId = asString(value.entry_id);
  const domain = asString(value.domain);
  if (!entryId || !domain) return null;
  return {
    entryId,
    domain,
    title: asString(value.title) ?? '',
    state: asString(value.state) ?? 'unknown',
    source: asString(value.source) ?? 'unknown',
  };
};

const parseDevice = (value: unknown): HaDevice | null => {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  if (!id) return null;

  const entryIds = new Set<string>();
  const primary = asString(value.primary_config_entry);
  const single = asString(value.config_entry_id);
  if (primary) entryIds.add(primary);
  if (single) entryIds.add(single);
  // `config_entries` is deprecated (removal announced for 2027.8) but still read as a fallback.
  asArray(value.config_entries).forEach((entry) => {
    const entryId = asString(entry);
    if (entryId) entryIds.add(entryId);
  });

  const macs: string[] = [];
  asArray(value.connections).forEach((connection) => {
    if (Array.isArray(connection) && connection[0] === 'mac') {
      const mac = normalizeMacAddress(connection[1]);
      if (mac) macs.push(mac);
    }
  });

  return {
    id,
    name: asString(value.name) ?? '',
    nameByUser: asString(value.name_by_user),
    manufacturer: asString(value.manufacturer),
    model: asString(value.model),
    areaId: asString(value.area_id),
    entryIds: [...entryIds],
    macs,
  };
};

const parseEntity = (value: unknown): HaEntity | null => {
  if (!isRecord(value)) return null;
  const entityId = asString(value.entity_id);
  if (!entityId) return null;
  return {
    entityId,
    platform: asString(value.platform) ?? '',
    deviceId: asString(value.device_id),
    entryId: asString(value.config_entry_id),
    hiddenBy: asString(value.hidden_by),
    disabledBy: asString(value.disabled_by),
  };
};

const parseArea = (value: unknown): HaArea | null => {
  if (!isRecord(value)) return null;
  const id = asString(value.area_id);
  const name = asString(value.name);
  return id && name ? { id, name } : null;
};

const parseAdminUser = (value: unknown): HaAdminUser | null => {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  if (!id) return null;
  return {
    id,
    name: asString(value.name) ?? '',
    username: asString(value.username),
    isActive: value.is_active !== false,
    isOwner: value.is_owner === true,
    isAdmin:
      value.is_owner === true ||
      (Array.isArray(value.group_ids) && value.group_ids.includes('system-admin')),
    localOnly: value.local_only === true,
    systemGenerated: value.system_generated === true,
  };
};

const IPV4_TEXT = /\b\d{1,3}(?:\.\d{1,3}){3}\b/;
const MAC_TEXT = /\b[0-9a-f]{2}(?:[:-][0-9a-f]{2}){5}\b/i;
// eslint-disable-next-line no-control-regex
const CONTROL_RUN = /[\x00-\x1f\x7f]+/g;

/** A name for a person: cut, without control characters, and never an address or a MAC. */
const readDisplayText = (value: unknown): string | null => {
  const text = asString(value)?.replace(CONTROL_RUN, ' ').trim().slice(0, 80);
  if (!text || IPV4_TEXT.test(text) || MAC_TEXT.test(text)) return null;
  return text;
};

const parseProgressFlow = (value: unknown): HaProgressFlow | null => {
  if (!isRecord(value)) return null;
  const flowId = asString(value.flow_id);
  const handler = asString(value.handler);
  if (!flowId || !handler) return null;
  const context = isRecord(value.context) ? value.context : {};
  const placeholders = isRecord(context.title_placeholders) ? context.title_placeholders : {};
  return {
    flowId,
    handler,
    stepId: asString(value.step_id),
    source: asString(context.source) ?? 'unknown',
    name:
      readDisplayText(placeholders.name) ??
      readDisplayText(placeholders.device) ??
      readDisplayText(placeholders.title),
    model: readDisplayText(placeholders.model),
    hasUniqueId: asString(context.unique_id) !== null,
  };
};

const compact = <T>(items: (T | null)[]): T[] => items.filter((item): item is T => item !== null);

const hostOfUrl = (value: unknown): string | null => {
  const text = asString(value);
  if (!text) return null;
  try {
    return new URL(text).hostname || null;
  } catch {
    return null;
  }
};

const IPV4_ADDRESS = /^\d{1,3}(\.\d{1,3}){3}$/;

const parseNetworkDevice = (
  source: HaNetworkDevice['source'],
  value: unknown
): HaNetworkDevice | null => {
  if (!isRecord(value)) return null;
  const device: HaNetworkDevice = {
    source,
    host: null,
    mac: null,
    hostname: null,
    manufacturer: null,
    modelName: null,
    friendlyName: null,
    deviceType: null,
    uid: null,
    serviceType: null,
    domains: [],
  };
  if (source === 'dhcp') {
    device.mac = normalizeMacAddress(value.mac_address);
    device.host = asString(value.ip_address);
    device.hostname = asString(value.hostname);
    return device.mac || device.host ? device : null;
  }
  if (source === 'ssdp') {
    const upnp = isRecord(value.upnp) ? value.upnp : {};
    device.host = hostOfUrl(value.ssdp_location);
    device.manufacturer = asString(upnp.manufacturer);
    device.modelName = asString(upnp.modelName);
    device.friendlyName = asString(upnp.friendlyName);
    device.deviceType = asString(upnp.deviceType);
    device.uid = asString(upnp.UDN) ?? asString(value.ssdp_udn) ?? asString(value.ssdp_usn);
    device.domains = asArray(value.x_homeassistant_matching_domains).filter(
      (domain): domain is string => typeof domain === 'string'
    );
    return device.host || device.uid ? device : null;
  }
  // Zeroconf: the list was empty when observed; the keys follow HA's ServiceInfo, read tolerantly.
  const properties = isRecord(value.properties) ? value.properties : {};
  const addresses = asArray(value.ip_addresses ?? value.addresses).filter(
    (address): address is string => typeof address === 'string' && IPV4_ADDRESS.test(address)
  );
  device.host = addresses[0] ?? null;
  device.uid = asString(value.name);
  device.serviceType = asString(value.type);
  device.friendlyName = asString(properties.fn) ?? asString(properties.friendly_name);
  device.modelName = asString(properties.md) ?? asString(properties.model);
  device.manufacturer = asString(properties.manufacturer);
  return device.host ? device : null;
};

const createWsApi = (
  send: (
    call: Parameters<HaWsSession['send']>[0],
    payload?: Record<string, unknown>
  ) => Promise<unknown>,
  collect: (call: Parameters<HaWsSession['send']>[0]) => Promise<unknown[]>
): HaWsApi => ({
  async currentUser() {
    return parseUser(await send(HA_CALLS.currentUser));
  },
  async entries(domain) {
    const result = await send(HA_CALLS.entriesGet, domain ? { domain } : {});
    return compact(asArray(result).map(parseEntry));
  },
  async devices() {
    return compact(asArray(await send(HA_CALLS.devicesList)).map(parseDevice));
  },
  async updateDevice(deviceId, changes) {
    const payload: Record<string, unknown> = { device_id: deviceId };
    if (changes.nameByUser !== undefined) payload.name_by_user = changes.nameByUser;
    if (changes.areaId !== undefined) payload.area_id = changes.areaId;
    await send(HA_CALLS.devicesUpdate, payload);
  },
  async entities() {
    return compact(asArray(await send(HA_CALLS.entitiesList)).map(parseEntity));
  },
  async updateEntity(entityId, changes) {
    await send(HA_CALLS.entitiesUpdate, { entity_id: entityId, hidden_by: changes.hiddenBy });
  },
  async areas() {
    return compact(asArray(await send(HA_CALLS.areasList)).map(parseArea));
  },
  async createArea(name) {
    const area = parseArea(await send(HA_CALLS.areasCreate, { name }));
    if (!area) throw protocolError();
    return area;
  },
  async validateConfig(config) {
    const result = requireRecord(await send(HA_CALLS.validateConfig, config));
    return ['triggers', 'conditions', 'actions'].every((key) => {
      const part = result[key];
      return isRecord(part) && part.valid === true;
    });
  },
  async longLivedToken(clientName, lifespanDays) {
    const token = await send(HA_CALLS.longLivedToken, {
      client_name: clientName,
      lifespan: lifespanDays,
    });
    if (typeof token !== 'string' || !token) throw protocolError();
    return token;
  },
  async adminUsers() {
    return compact(asArray(await send(HA_CALLS.usersList)).map(parseAdminUser));
  },
  async createUser(name, localOnly) {
    const result = requireRecord(
      await send(HA_CALLS.usersCreate, { name, group_ids: ['system-admin'], local_only: localOnly })
    );
    const user = parseAdminUser(result.user);
    if (!user) throw protocolError();
    return user;
  },
  async updateUser(userId, changes) {
    const payload: Record<string, unknown> = { user_id: userId };
    if (changes.isActive !== undefined) payload.is_active = changes.isActive;
    if (changes.groupIds !== undefined) payload.group_ids = changes.groupIds;
    if (changes.localOnly !== undefined) payload.local_only = changes.localOnly;
    await send(HA_CALLS.usersUpdate, payload);
  },
  async longLivedTokenIds() {
    const ids: string[] = [];
    for (const item of asArray(await send(HA_CALLS.refreshTokens))) {
      if (!isRecord(item) || item.type !== 'long_lived_access_token') continue;
      const id = asString(item.id);
      if (id) ids.push(id);
    }
    return ids;
  },
  async deleteRefreshToken(refreshTokenId) {
    await send(HA_CALLS.deleteRefreshToken, { refresh_token_id: refreshTokenId });
  },
  async createCredentials(userId, username, password) {
    await send(HA_CALLS.credentialsCreate, { user_id: userId, username, password });
  },
  async changePassword(userId, password) {
    await send(HA_CALLS.credentialsAdminChangePassword, {
      user_id: userId,
      password,
    });
  },
  async ignoreFlow(flowId, title) {
    await send(HA_CALLS.flowIgnore, { flow_id: flowId, title });
  },
  async flowsInProgress() {
    return compact(asArray(await send(HA_CALLS.flowList)).map(parseProgressFlow));
  },
  async networkDevices(source) {
    const call =
      source === 'ssdp'
        ? HA_CALLS.ssdpDiscovery
        : source === 'dhcp'
          ? HA_CALLS.dhcpDiscovery
          : HA_CALLS.zeroconfDiscovery;
    const found: HaNetworkDevice[] = [];
    for (const event of await collect(call)) {
      if (!isRecord(event)) continue;
      for (const key of ['add', 'change']) {
        found.push(...compact(asArray(event[key]).map((item) => parseNetworkDevice(source, item))));
      }
    }
    return found;
  },
  async translations(handler) {
    return send(HA_CALLS.translations, {
      language: 'it',
      category: 'config',
      integration: [handler],
    });
  },
});

const parseLoginStep = (value: unknown): HaLoginStep => {
  const record = requireRecord(value);
  if (record.type === 'create_entry') {
    const code = asString(record.result);
    if (!code) throw protocolError();
    return { kind: 'done', code };
  }
  if (record.type === 'form') {
    const flowId = asString(record.flow_id);
    if (!flowId) throw protocolError();
    const errors = isRecord(record.errors) ? record.errors : null;
    return {
      kind: 'form',
      flowId,
      stepId: asString(record.step_id) ?? '',
      fields: compact(
        asArray(record.data_schema).map((field) => (isRecord(field) ? asString(field.name) : null))
      ),
      error: errors ? asString(errors.base) : null,
    };
  }
  throw protocolError();
};

export const createHaAdapter = ({
  transport,
  callTimeoutMs,
  flowStepTimeoutMs,
}: HaAdapterOptions): HaAdapter => {
  const withSession = async <T>(
    token: string,
    run: (session: HaWsSession) => Promise<T>
  ): Promise<T> => {
    const session = await transport.openSession(token, callTimeoutMs);
    try {
      return await run(session);
    } finally {
      session.close();
    }
  };

  const wsApiFor = (session: HaWsSession): HaWsApi =>
    createWsApi(
      (call, payload) =>
        session.send(call, { ...(payload ? { payload } : {}), timeoutMs: callTimeoutMs }),
      (call) => session.collect(call, HA_CALLS.unsubscribeEvents, { timeoutMs: DISCOVERY_WAIT_MS })
    );

  const oneShotApi = (token: string): HaWsApi =>
    createWsApi(
      (call, payload) =>
        withSession(token, (session) =>
          session.send(call, { ...(payload ? { payload } : {}), timeoutMs: callTimeoutMs })
        ),
      (call) =>
        withSession(token, (session) =>
          session.collect(call, HA_CALLS.unsubscribeEvents, { timeoutMs: DISCOVERY_WAIT_MS })
        )
    );

  const rest = async (
    call: Parameters<HaTransport['rest']>[0],
    options: Omit<Parameters<HaTransport['rest']>[1], 'timeoutMs'> & {
      timeoutMs?: number;
    }
  ) => transport.rest(call, { timeoutMs: callTimeoutMs, ...options });

  const flowParams = (flowId: string) => ({ flow_id: flowId });

  return {
    readVersion: () => transport.readVersion(callTimeoutMs),
    ws: oneShotApi,
    withWs: (token, run) => withSession(token, (session) => run(wsApiFor(session))),

    async authProviders() {
      try {
        await rest(HA_CALLS.authProviders, {});
        return { onboarded: true };
      } catch (error) {
        const body = isHaError(error) ? error.body : null;
        if (
          isHaError(error) &&
          error.kind === 'bad_request' &&
          isRecord(body) &&
          body.code === 'onboarding_required'
        ) {
          return { onboarded: false };
        }
        throw error;
      }
    },

    async flowHandlers(token) {
      const { body } = await rest(HA_CALLS.flowHandlers, { token });
      return asArray(body).filter((item): item is string => typeof item === 'string');
    },

    async flowStart(token, handler) {
      const { body } = await rest(HA_CALLS.flowStart, {
        token,
        body: { handler },
        timeoutMs: flowStepTimeoutMs,
      });
      return body;
    },

    async flowRead(token, flowId) {
      const { body } = await rest(HA_CALLS.flowRead, {
        token,
        params: flowParams(flowId),
        timeoutMs: flowStepTimeoutMs,
      });
      return body;
    },

    async flowStep(token, flowId, input) {
      const { body } = await rest(HA_CALLS.flowStep, {
        token,
        params: flowParams(flowId),
        body: input,
        timeoutMs: flowStepTimeoutMs,
      });
      return body;
    },

    async flowCancel(token, flowId) {
      try {
        await rest(HA_CALLS.flowCancel, { token, params: flowParams(flowId) });
        return true;
      } catch (error) {
        if (isHaError(error) && error.kind === 'not_found') return false;
        throw error;
      }
    },

    async removeEntry(token, entryId) {
      try {
        await rest(HA_CALLS.entryRemove, { token, params: { entry_id: entryId } });
        return true;
      } catch (error) {
        if (isHaError(error) && error.kind === 'not_found') return false;
        throw error;
      }
    },

    async automationExists(token, automationId) {
      try {
        await rest(HA_CALLS.automationGet, { token, params: { id: automationId } });
        return true;
      } catch (error) {
        if (isHaError(error) && error.kind === 'not_found') return false;
        throw error;
      }
    },

    async automationPut(token, automationId, body) {
      const { body: answer } = await rest(HA_CALLS.automationPut, {
        token,
        params: { id: automationId },
        body,
      });
      if (!isRecord(answer) || answer.result !== 'ok') throw protocolError();
    },

    async automationDelete(token, automationId) {
      try {
        await rest(HA_CALLS.automationDelete, { token, params: { id: automationId } });
        return true;
      } catch (error) {
        // HA answers 400 "Resource not found" (not 404) for an unknown id.
        if (isHaError(error) && (error.kind === 'not_found' || error.kind === 'bad_request'))
          return false;
        throw error;
      }
    },

    async state(token, entityId) {
      try {
        const { body } = await rest(HA_CALLS.stateGet, { token, params: { entity_id: entityId } });
        const record = requireRecord(body);
        const attributes = isRecord(record.attributes) ? record.attributes : {};
        const features = attributes.supported_features;
        return {
          state: asString(record.state) ?? 'unknown',
          supportedFeatures: typeof features === 'number' ? features : 0,
        };
      } catch (error) {
        if (isHaError(error) && error.kind === 'not_found') return null;
        throw error;
      }
    },

    async probeFlowRoute(token) {
      try {
        await rest(HA_CALLS.flowCancel, { token, params: flowParams('acasystem-sonda') });
        return false;
      } catch (error) {
        // RD-03: an unknown flow answers 404 with {"message": "Invalid flow specified"}. Any
        // other failure (timeout, 500, protocol) means the probe could not run: it is thrown,
        // not counted as a failed probe, so the report is repeated soon.
        if (isHaError(error) && error.kind === 'not_found') {
          return isRecord(error.body) && error.body.message === 'Invalid flow specified';
        }
        throw error;
      }
    },

    async probeAutomationRoute(token) {
      try {
        await rest(HA_CALLS.automationGet, { token, params: { id: 'acasystem-sonda' } });
        return false;
      } catch (error) {
        // RD-07: an unknown automation answers 404 with {"message": "Resource not found"}.
        // Any other failure means the probe could not run (see RD-03).
        if (isHaError(error) && error.kind === 'not_found') {
          return isRecord(error.body) && error.body.message === 'Resource not found';
        }
        throw error;
      }
    },

    async loginStart(clientId) {
      const { body } = await rest(HA_CALLS.loginFlowStart, {
        body: { client_id: clientId, handler: ['homeassistant', null], redirect_uri: clientId },
      });
      return parseLoginStep(body);
    },

    async loginStep(flowId, clientId, data) {
      const { body } = await rest(HA_CALLS.loginFlowStep, {
        params: flowParams(flowId),
        body: { client_id: clientId, ...data },
      });
      return parseLoginStep(body);
    },

    async exchangeCode(code, clientId) {
      const { body } = await rest(HA_CALLS.authToken, {
        form: { grant_type: 'authorization_code', code, client_id: clientId },
      });
      const record = requireRecord(body);
      const accessToken = asString(record.access_token);
      const refreshToken = asString(record.refresh_token);
      if (!accessToken || !refreshToken) throw protocolError();
      return { accessToken, refreshToken };
    },

    async revokeRefreshToken(refreshToken) {
      await rest(HA_CALLS.authRevoke, { form: { token: refreshToken, action: 'revoke' } });
    },
  };
};
