/**
 * What the facade knows about the integrations that Home Assistant discovers on the network
 * (ADR-0024, F2 and F3 of REP-20261026-006).
 *
 * `PLATFORM_FAMILY` has the same keys and values as the table of the same name in the browser
 * (frontend/src/utils/devices/classify.ts): a test (devicesDiscovered.test.ts) reads the
 * source of the browser table and fails when the two differ. The browser has no other source
 * of truth, because the two packages are built apart.
 */

import { SYSTEM_DOMAINS } from './devices.ts';

export type DeviceFamily =
  | 'tv'
  | 'sonos'
  | 'media'
  | 'light'
  | 'plug'
  | 'climate'
  | 'sensor'
  | 'cover'
  | 'lock'
  | 'camera'
  | 'vacuum'
  | 'mower'
  | 'fan'
  | 'alarm';

/** Family of the devices of an integration, when the integration alone says it. */
export const PLATFORM_FAMILY: Readonly<Record<string, DeviceFamily>> = {
  webostv: 'tv',
  samsungtv: 'tv',
  androidtv_remote: 'tv',
  androidtv: 'tv',
  cast: 'tv',
  braviatv: 'tv',
  philips_js: 'tv',
  sonos: 'sonos',
  spotify: 'media',
  hue: 'light',
  lifx: 'light',
  wiz: 'light',
  nanoleaf: 'light',
  yeelight: 'light',
  shelly: 'plug',
  tplink: 'plug',
  esphome: 'sensor',
  homekit_controller: 'sensor',
  zha: 'sensor',
  mqtt: 'sensor',
  tado: 'climate',
  nest: 'climate',
  ecobee: 'climate',
  netatmo: 'climate',
  google: 'media',
};

/**
 * Origins of a flow that Home Assistant opens by itself when it finds a device (ADR-0024,
 * point 1). `user`, `reauth`, `reconfigure`, `import`, `system`, `hassio` and `unignore` are
 * flows of somebody else or of the system: never listed and never taken over.
 */
export const DISCOVERY_SOURCES: readonly string[] = [
  'zeroconf',
  'ssdp',
  'dhcp',
  'usb',
  'bluetooth',
  'homekit',
  'mqtt',
  'integration_discovery',
  'discovery',
];

/** Name of an integration for a person, used when the discovery gives no name. */
export const HANDLER_NAMES: Readonly<Record<string, string>> = {
  webostv: 'Televisore LG',
  samsungtv: 'Televisore Samsung',
  androidtv_remote: 'Android TV',
  androidtv: 'Android TV',
  cast: 'Chromecast',
  braviatv: 'Televisore Sony',
  philips_js: 'Televisore Philips',
  sonos: 'Sonos',
  hue: 'Philips Hue',
  lifx: 'Luce LIFX',
  wiz: 'Luce WiZ',
  nanoleaf: 'Nanoleaf',
  yeelight: 'Luce Yeelight',
  shelly: 'Shelly',
  tplink: 'TP-Link',
  esphome: 'ESPHome',
  homekit_controller: 'Dispositivo HomeKit',
};

export const familyOfHandler = (handler: string): DeviceFamily | null =>
  PLATFORM_FAMILY[handler] ?? null;

/**
 * True for the integrations whose discovery a customer can take over: every handler except the
 * ones of Home Assistant itself (F4: no list of what a customer may add; OAuth sites, brokers and
 * coordinators go through the generic steps, or answer "Richiede l'installatore" at the step
 * Acasystem cannot draw).
 */
export const isAddableHandler = (handler: string): boolean =>
  /^[a-z0-9_]{1,64}$/.test(handler) && !SYSTEM_DOMAINS.includes(handler);
