/**
 * Catalogue of the Home Assistant calls made by the device facade (REP-20261023-003,
 * section 3 "Chiamate a HA: API pubbliche documentate o endpoint interni").
 *
 * This is the only place that writes a route or a WebSocket command of HA. The adapter
 * (services/devices/haAdapter.ts) builds every request from these descriptors, and the tests
 * check that nothing else in the backend names them.
 *
 * Classes:
 * - DOC        documented on the official developer pages (REST, WebSocket, Auth API);
 * - DOC-nome   the command is only named there, with no format: treated as internal;
 * - INT        internal endpoint used by the HA frontend: no stability guarantee.
 * A call is "public" only when its class is DOC. Internal calls need a contract test
 * (CT-nn) and, where it matters, a start-up probe (RD-nn) with a degrade message.
 */

/** Core version the calls were read against and the only one declared supported (D-I5). */
export const SUPPORTED_HA_VERSION = '2026.9.4';

/**
 * Versions whose behaviour was checked. "Checked" here means read in the source of HA at the
 * tag: nothing has been observed on a running HA yet (REP-20261023-003, section 3).
 */
export const VERIFIED_HA_VERSIONS: readonly string[] = [SUPPORTED_HA_VERSION];

/**
 * Series of versions provata on a running HA: every 2026.10.x. Tried on 2026-10-27 on the copy of
 * the VM (REP-20261026-006): probes ok, flows read, Samsung pairing still to be tried. The
 * calls are internal endpoints, so a later patch release is accepted, a later series is not.
 */
export const VERIFIED_HA_SERIES: readonly string[] = ['2026.10'];

/** Compared with the source but not verified: it may work, it is not promised. */
export const COMPARED_HA_VERSIONS: readonly string[] = [];

export type HaCallClass = 'DOC' | 'DOC-nome' | 'INT';
export type HaCallKind = 'public' | 'internal';
export type HaPermission = 'none' | 'user' | 'admin';

interface HaCallBase {
  /** Stable id used in logs, tests and the registry of calls. */
  id: string;
  haClass: HaCallClass;
  /** `public` only for DOC; everything else is an internal endpoint. */
  kind: HaCallKind;
  permission: HaPermission;
  /** Version the call was read against. */
  verifiedVersion: string;
  /**
   * What the verification was: reading the source ('code'), the documentation, or nothing
   * yet ('unverified': the call is used on a best-effort basis and may be refused).
   */
  evidence: 'code' | 'documentation' | 'unverified';
  /** Contract tests (CT) and start-up probes (RD) that cover it. */
  checks: readonly string[];
}

export interface HaRestCall extends HaCallBase {
  transport: 'rest';
  method: 'GET' | 'POST' | 'DELETE';
  /** Path with `{name}` placeholders. */
  path: string;
}

export interface HaWsCall extends HaCallBase {
  transport: 'ws';
  /** The WebSocket command type. */
  type: string;
}

export type HaCall = HaRestCall | HaWsCall;

type CallMeta = {
  haClass: HaCallClass;
  permission: HaPermission;
  evidence?: 'code' | 'documentation' | 'unverified';
  checks?: readonly string[];
};

const base = (id: string, meta: CallMeta): HaCallBase => ({
  id,
  haClass: meta.haClass,
  kind: meta.haClass === 'DOC' ? 'public' : 'internal',
  permission: meta.permission,
  verifiedVersion: SUPPORTED_HA_VERSION,
  evidence: meta.evidence ?? 'code',
  checks: meta.checks ?? [],
});

const rest = (
  id: string,
  method: HaRestCall['method'],
  path: string,
  meta: CallMeta
): HaRestCall => ({ ...base(id, meta), transport: 'rest', method, path });

const ws = (id: string, type: string, meta: CallMeta): HaWsCall => ({
  ...base(id, meta),
  transport: 'ws',
  type,
});

export const HA_CALLS = {
  // --- Access and token (A) -------------------------------------------------------------
  authProviders: rest('auth.providers', 'GET', '/auth/providers', {
    haClass: 'INT',
    permission: 'none',
    checks: ['CT-01', 'RD-01'],
  }),
  loginFlowStart: rest('auth.login_flow.start', 'POST', '/auth/login_flow', {
    haClass: 'INT',
    permission: 'none',
    checks: ['CT-01'],
  }),
  loginFlowStep: rest('auth.login_flow.step', 'POST', '/auth/login_flow/{flow_id}', {
    haClass: 'INT',
    permission: 'none',
    checks: ['CT-01'],
  }),
  authToken: rest('auth.token', 'POST', '/auth/token', {
    haClass: 'DOC',
    permission: 'none',
    evidence: 'documentation',
    checks: ['CT-01'],
  }),
  authRevoke: rest('auth.revoke', 'POST', '/auth/revoke', {
    haClass: 'DOC',
    permission: 'none',
    evidence: 'documentation',
    checks: ['CT-01'],
  }),
  currentUser: ws('auth.current_user', 'auth/current_user', {
    haClass: 'INT',
    permission: 'user',
    checks: ['CT-01', 'RD-09'],
  }),
  longLivedToken: ws('auth.long_lived_access_token', 'auth/long_lived_access_token', {
    haClass: 'DOC',
    permission: 'user',
    evidence: 'documentation',
    checks: ['CT-14'],
  }),

  // Rotation of the service token: list the refresh tokens of the connected user, then delete
  // the old long-lived ones by id once the new token is saved. `auth/delete_all_refresh_tokens`
  // is not used: it cannot spare the new token. Permissions read in components/auth/__init__.py
  // at 2026.9.4 (notes of 2026-10-23); the fields of the list (`id`, `type`) are not checked
  // against a recording, so the answer is read tolerantly and, if it does not match, the old
  // tokens are simply left to expire. Never run against a real HA.
  refreshTokens: ws('auth.refresh_tokens', 'auth/refresh_tokens', {
    haClass: 'INT',
    permission: 'user',
    evidence: 'unverified',
    checks: ['CT-14'],
  }),
  deleteRefreshToken: ws('auth.delete_refresh_token', 'auth/delete_refresh_token', {
    haClass: 'INT',
    permission: 'user',
    checks: ['CT-14'],
  }),

  // --- Users and credentials, only for the activation of the service user (C) -----------
  usersList: ws('config.auth.list', 'config/auth/list', {
    haClass: 'INT',
    permission: 'admin',
    checks: ['CT-14'],
  }),
  usersCreate: ws('config.auth.create', 'config/auth/create', {
    haClass: 'INT',
    permission: 'admin',
    checks: ['CT-14'],
  }),
  usersUpdate: ws('config.auth.update', 'config/auth/update', {
    haClass: 'INT',
    permission: 'admin',
    checks: ['CT-14'],
  }),
  credentialsCreate: ws(
    'config.auth_provider.homeassistant.create',
    'config/auth_provider/homeassistant/create',
    { haClass: 'INT', permission: 'admin', checks: ['CT-14'] }
  ),
  credentialsAdminChangePassword: ws(
    'config.auth_provider.homeassistant.admin_change_password',
    'config/auth_provider/homeassistant/admin_change_password',
    { haClass: 'INT', permission: 'admin', checks: ['CT-14'] }
  ),

  // --- Catalogue (E) ---------------------------------------------------------------------
  flowHandlers: rest(
    'config_entries.flow_handlers',
    'GET',
    '/api/config/config_entries/flow_handlers',
    {
      haClass: 'INT',
      permission: 'user',
      checks: ['CT-04', 'RD-02'],
    }
  ),

  // --- Configuration flows (F) -----------------------------------------------------------
  flowStart: rest('config_entries.flow.start', 'POST', '/api/config/config_entries/flow', {
    haClass: 'INT',
    permission: 'admin',
    checks: ['CT-05', 'CT-06', 'RD-03'],
  }),
  flowRead: rest('config_entries.flow.read', 'GET', '/api/config/config_entries/flow/{flow_id}', {
    haClass: 'INT',
    permission: 'admin',
    checks: ['CT-05', 'CT-06'],
  }),
  flowStep: rest('config_entries.flow.step', 'POST', '/api/config/config_entries/flow/{flow_id}', {
    haClass: 'INT',
    permission: 'admin',
    checks: ['CT-05', 'CT-06', 'CT-07'],
  }),
  flowCancel: rest(
    'config_entries.flow.cancel',
    'DELETE',
    '/api/config/config_entries/flow/{flow_id}',
    {
      haClass: 'INT',
      permission: 'user',
      checks: ['CT-05', 'RD-03'],
    }
  ),

  // Flows that HA opened by itself when it discovered a device (zeroconf, ssdp, dhcp...). The
  // list leaves out the flows with source `user`; `config_entries/ignore_flow` marks a
  // discovery as ignored. On HA 2026.10.4 (copy of the test VM, 2026-10-27) the REST
  // `GET /api/config/config_entries/flow` answers 405, while this WS command answers with the
  // list (REP-20261026-006): run once against a real HA, not read in the source.
  flowList: ws('config_entries.flow.progress', 'config_entries/flow/progress', {
    haClass: 'INT',
    permission: 'admin',
    evidence: 'unverified',
    checks: ['CT-12'],
  }),
  flowIgnore: ws('config_entries.ignore_flow', 'config_entries/ignore_flow', {
    haClass: 'INT',
    permission: 'admin',
    evidence: 'unverified',
    checks: ['CT-12'],
  }),

  // Italian texts of the flows of an integration, for the generic forms of F4. Observed once on
  // HA 2026.10.4 (copy of the test VM, 2026-10-27, REP-20261026-006): with `language: 'it'`,
  // `category: 'config'` and `integration: ['samsungtv']` it answers
  // `result.resources` with keys like `component.samsungtv.config.step.encrypted_pairing.data.pin`.
  // Some descriptions are still English there. Not read in the source of HA and the `evidence`
  // enum has no "observed" value, so it stays `unverified`; the answer is read tolerantly and,
  // when the command fails, the texts of Acasystem and the generic Italian labels are used.
  translations: ws('frontend.get_translations', 'frontend/get_translations', {
    haClass: 'INT',
    permission: 'user',
    evidence: 'unverified',
    checks: ['CT-13'],
  }),

  // --- Entries (H) -----------------------------------------------------------------------
  entriesGet: ws('config_entries.get', 'config_entries/get', {
    haClass: 'INT',
    permission: 'user',
    checks: ['CT-09'],
  }),
  entryRemove: rest(
    'config_entries.entry.remove',
    'DELETE',
    '/api/config/config_entries/entry/{entry_id}',
    {
      haClass: 'INT',
      permission: 'admin',
      checks: ['CT-09'],
    }
  ),

  // --- Registries (I) --------------------------------------------------------------------
  devicesList: ws('config.device_registry.list', 'config/device_registry/list', {
    haClass: 'INT',
    permission: 'user',
    checks: ['CT-10'],
  }),
  devicesUpdate: ws('config.device_registry.update', 'config/device_registry/update', {
    haClass: 'INT',
    permission: 'admin',
    checks: ['CT-10'],
  }),
  entitiesList: ws('config.entity_registry.list', 'config/entity_registry/list', {
    haClass: 'INT',
    permission: 'user',
    checks: ['CT-10'],
  }),
  entitiesUpdate: ws('config.entity_registry.update', 'config/entity_registry/update', {
    haClass: 'INT',
    permission: 'admin',
    checks: ['CT-10'],
  }),
  areasList: ws('config.area_registry.list', 'config/area_registry/list', {
    haClass: 'INT',
    permission: 'user',
    checks: ['CT-10'],
  }),
  areasCreate: ws('config.area_registry.create', 'config/area_registry/create', {
    haClass: 'INT',
    permission: 'admin',
    checks: ['CT-10'],
  }),

  // --- Power-on recipe (J, D) ------------------------------------------------------------
  validateConfig: ws('validate_config', 'validate_config', {
    haClass: 'DOC',
    permission: 'user',
    evidence: 'documentation',
    checks: ['CT-11'],
  }),
  automationGet: rest('config.automation.get', 'GET', '/api/config/automation/config/{id}', {
    haClass: 'INT',
    permission: 'admin',
    checks: ['CT-11', 'RD-07'],
  }),
  automationPut: rest('config.automation.put', 'POST', '/api/config/automation/config/{id}', {
    haClass: 'INT',
    permission: 'admin',
    checks: ['CT-11'],
  }),
  automationDelete: rest(
    'config.automation.delete',
    'DELETE',
    '/api/config/automation/config/{id}',
    {
      haClass: 'INT',
      permission: 'admin',
      checks: ['CT-11'],
    }
  ),
  stateGet: rest('states.get', 'GET', '/api/states/{entity_id}', {
    haClass: 'DOC',
    permission: 'user',
    evidence: 'documentation',
    checks: ['CT-03', 'RD-08'],
  }),
} as const satisfies Record<string, HaCall>;

/** Handshake of the WebSocket API: `auth_required` carries `ha_version` before any login. */
export const HA_WEBSOCKET_PATH = '/api/websocket';

export const ALL_HA_CALLS: readonly HaCall[] = Object.values(HA_CALLS);

/**
 * True for a version whose behaviour was read in the source (verified or compared). Any other
 * version keeps the writes of the facade off until the installer allows it explicitly, because
 * most of the calls are internal endpoints with no stability promise.
 */
export const isKnownHaVersion = (version: string | null | undefined): boolean =>
  isVerifiedHaVersion(version) ||
  (typeof version === 'string' && COMPARED_HA_VERSIONS.includes(version));

/** True for a version the facade was verified against (an exact one, or a patch of a series). */
export const isVerifiedHaVersion = (version: string | null | undefined): boolean =>
  typeof version === 'string' &&
  (VERIFIED_HA_VERSIONS.includes(version) ||
    VERIFIED_HA_SERIES.some(
      (series) =>
        version.startsWith(`${series}.`) && /^[0-9]{1,3}$/.test(version.slice(series.length + 1))
    ));

/**
 * Form of the `webostv.turn_on` trigger by HA version (D1b). The device trigger is the form
 * the HA interface writes. `platform` is the fallback tried when the state of the TV does
 * not show the turn-on feature (RD-08). Which one is right is not verified on a running HA.
 */
export type PowerTriggerForm = 'device' | 'platform';

export const POWER_TRIGGER_FORMS_BY_VERSION: Readonly<Record<string, readonly PowerTriggerForm[]>> =
  {
    [SUPPORTED_HA_VERSION]: ['device', 'platform'],
  };

export const DEFAULT_POWER_TRIGGER_FORMS: readonly PowerTriggerForm[] = ['device', 'platform'];

export const powerTriggerFormsFor = (version: string | null): readonly PowerTriggerForm[] =>
  (version ? POWER_TRIGGER_FORMS_BY_VERSION[version] : undefined) ?? DEFAULT_POWER_TRIGGER_FORMS;
