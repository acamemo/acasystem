import { isAbsolute, join, relative, resolve } from 'node:path';
import { readDataDir } from './env.ts';

/**
 * Settings of the device-configuration facade (/api/dispositivi, ADR-0021 and ADR-0022).
 * Everything here is a closed list or a clamped number: the facade denies by default.
 */

/** Display name of the declared service user in Home Assistant (ADR-0022, point 3). */
export const DEVICE_SERVICE_USER_NAME = 'Acasystem (servizio)';

/** Login name of the service user. Its password is random and is never stored. */
export const DEVICE_SERVICE_USERNAME = 'acasystem_servizio';

/** Name shown by Home Assistant for the long-lived token of the service user. */
export const DEVICE_SERVICE_TOKEN_NAME = 'Acasystem (servizio)';

/** Lifespan of the long-lived token, in days (the Home Assistant profile page uses 3650). */
export const DEVICE_SERVICE_TOKEN_LIFESPAN_DAYS = 3650;

/**
 * Integrations and domains that belong to Home Assistant itself (F4, ADR-0024 annotation of
 * 2026-10-27): the facade never lists, starts, shows, renames or removes anything of them. This
 * is the only list left: it protects the system, it does not limit what a customer can add.
 * Every other handler of the catalogue can be started by a customer, with the same steps the
 * installer follows.
 */
export const SYSTEM_DOMAINS: readonly string[] = [
  'homeassistant',
  'hassio',
  'backup',
  'sun',
  'met',
  'go2rtc',
  'google_translate',
  'shopping_list',
  'radio_browser',
  'analytics',
  'person',
  'zone',
  'cloud',
  'onboarding',
  'mobile_app',
  'auth',
  'frontend',
  'history',
  'logbook',
  'energy',
  'tag',
  'webhook',
  'assist_pipeline',
  'conversation',
  'stt',
  'tts',
  'wake_word',
  'system_health',
  'default_config',
  'application_credentials',
  'dhcp',
  'ssdp',
  'zeroconf',
  'usb',
  'bluetooth',
  'network',
  'file_upload',
  'api',
  'websocket_api',
  'http',
  'config',
  'automation',
  'script',
  'scene',
];

/**
 * Integrations whose entries and devices the facade always shows and lets a customer rename:
 * the TV and the Wake on LAN entry created by the recipe. The entries created from Acasystem
 * (any other domain) are recognised by the registry of actions, not by this list.
 */
export const FACADE_DOMAINS: readonly string[] = ['webostv', 'wake_on_lan'];

/** Flow handlers that HA must offer for the facade to work (probe RD-02). */
export const REQUIRED_FLOW_HANDLERS: readonly string[] = ['webostv', 'wake_on_lan'];

/**
 * The closed list of operations of the facade (ADR-0022, point 1). A route that is not
 * here does not exist; each one is checked by `authorizeOperation`.
 */
export const DEVICE_OPERATIONS = [
  'status.read',
  'catalog.read',
  'flow.list',
  'flow.start',
  'flow.read',
  'flow.step',
  'flow.cancel',
  'entry.read',
  'device.update',
  'area.read',
  'area.create',
  'power.read',
  'power.setup',
  'power.remove',
  'action.list',
  // Removal of a device the facade can see (F4): the entry goes away from Home Assistant.
  'voci.rimuovi',
  // Devices that HA found on the network (ADR-0024): any customer may read, take and ignore them.
  'scoperti.leggi',
  'scoperti.aggiungi',
  'scoperti.ignora',
  // Televisions that HA saw on the network and the one-tap connection of one (F5).
  'tv.leggi',
  'tv.collega',
] as const;

export type DeviceOperation = (typeof DEVICE_OPERATIONS)[number];

/** Operations reserved to a Home Assistant administrator (the installer). */
export const INSTALLER_ONLY_OPERATIONS: readonly DeviceOperation[] = [
  'power.remove',
  'action.list',
];

/** Fixed prefix of the id of the power-on automations written by Acasystem (D1b). */
export const POWER_AUTOMATION_ID_PREFIX = 'acasystem_accensione_';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const readNumber = (name: string, fallback: number, min: number, max: number): number =>
  clamp(Number(process.env[name]) || fallback, min, max);

/**
 * File with the service-user secret. Default: inside the data volume (so the bench works
 * without touching the compose file), but `activate` refuses to save there unless the
 * installer allows it; `TUNET_SERVICE_SECRET_FILE` points to a separate mount (ADR-0022,
 * point 3).
 */
export const readDeviceServiceSecretPath = (): string =>
  process.env.TUNET_SERVICE_SECRET_FILE || join(readDataDir(), 'secrets', 'service-identity.json');

/**
 * True when the secret file would sit inside the data directory, i.e. in the volume that is
 * copied with the data. ADR-0022 (point 3) wants the secret outside the copies.
 */
export const isSecretInsideDataDir = (
  secretPath: string = readDeviceServiceSecretPath(),
  dataDir: string = readDataDir()
): boolean => {
  const path = relative(resolve(dataDir), resolve(secretPath));
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
};

/**
 * The installer's explicit choice (TUNET_SERVICE_SECRET_ALLOW_DATA_DIR=1) to let the
 * activation save the secret inside the data volume. Without it the activation refuses.
 */
export const readAllowSecretInDataDir = (): boolean =>
  process.env.TUNET_SERVICE_SECRET_ALLOW_DATA_DIR === '1';

/**
 * Installer's explicit choice (DEVICES_ALLOW_UNVERIFIED_HA_VERSION=1) to let the facade write
 * on a version of HA that was neither verified nor compared with the source. Off by default.
 */
export const readAllowUnverifiedHaVersion = (): boolean =>
  process.env.DEVICES_ALLOW_UNVERIFIED_HA_VERSION === '1';

/** Idle lifetime of an open configuration flow (renewed at every step). Default 10 minutes. */
export const readDeviceFlowTtlMs = (): number =>
  readNumber('DEVICES_FLOW_TTL_MS', 600_000, 5_000, 3_600_000);

/** Maximum time of one flow step towards HA (pairing keeps the call open). Default 90 s. */
export const readDeviceFlowStepTimeoutMs = (): number =>
  readNumber('DEVICES_FLOW_STEP_TIMEOUT_MS', 90_000, 1_000, 300_000);

/** Maximum time of any other REST or WebSocket call towards HA. Default 20 s. */
export const readDeviceCallTimeoutMs = (): number =>
  readNumber('DEVICES_CALL_TIMEOUT_MS', 20_000, 500, 120_000);

/** Time the server waits for a new config entry to reach the `loaded` state. Default 30 s. */
export const readDeviceEntryLoadTimeoutMs = (): number =>
  readNumber('DEVICES_ENTRY_LOAD_TIMEOUT_MS', 30_000, 500, 120_000);

/** Rate limit of the whole /api/dispositivi router: DEVICES_RATE_LIMIT_*, default 90 per minute. */
export const DEVICES_RATE_LIMIT_PREFIX = 'DEVICES_RATE_LIMIT';
export const DEVICES_RATE_LIMIT_DEFAULT_MAX = 90;
