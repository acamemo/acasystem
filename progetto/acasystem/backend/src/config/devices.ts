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
 * Integrations a customer may start (D-D22 b1). In D1 only the LG TV. The Wake on LAN entry
 * that turns the TV on is created by the server recipe (D1b) with the MAC read from HA or
 * given by the installer; a customer never starts it, because its flow takes a MAC, a
 * broadcast address and a port. Every other integration is visible in the catalogue but
 * answers "Richiede l'installatore".
 */
export const CUSTOMER_STARTABLE_HANDLERS: readonly string[] = ['webostv'];

/**
 * Integrations whose entries and devices the facade shows and lets a customer rename: the
 * TV and the Wake on LAN entry created by the recipe. Not a list of what can be started.
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
