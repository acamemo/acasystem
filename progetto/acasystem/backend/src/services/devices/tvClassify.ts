import { createHash } from 'node:crypto';
import type { HaNetworkDevice } from './haAdapter.ts';
import { brandForMac } from './tvOui.ts';

/**
 * «Televisori in rete» (F5, REP-20261026-006): from the lists that Home Assistant itself keeps
 * of what it saw on the network (SSDP, zeroconf, DHCP) to the televisions a person can connect
 * with one tap. Acasystem sends nothing on the network: this module only reads those lists.
 *
 * It is a classification, not a promise: a prefix or a name can belong to a phone of the same
 * maker, so the person always sees the candidate and decides. What a brand needs to be connected
 * (the integration of Home Assistant and what the television asks for) is the table below.
 */

/** What the television asks of the person while it is being connected (the hint of the screen). */
export type TvConfirmation = 'consenti' | 'pin' | 'codice' | 'nessuno';

interface TvBrand {
  label: string;
  /** Integration of Home Assistant that connects this maker; null when none works for a customer. */
  handler: string | null;
  confirmation: TvConfirmation;
  /** Why it cannot be connected from here, in Italian; only when `handler` is null. */
  reason?: string;
}

const TV_BRANDS = {
  samsung: { label: 'Samsung', handler: 'samsungtv', confirmation: 'pin' },
  lg: { label: 'LG', handler: 'webostv', confirmation: 'consenti' },
  sony: { label: 'Sony', handler: 'braviatv', confirmation: 'pin' },
  philips: { label: 'Philips', handler: 'philips_js', confirmation: 'pin' },
  hisense: { label: 'Hisense', handler: 'androidtv_remote', confirmation: 'codice' },
  tcl: { label: 'TCL', handler: 'androidtv_remote', confirmation: 'codice' },
  xiaomi: { label: 'Xiaomi', handler: 'androidtv_remote', confirmation: 'codice' },
  android: { label: 'Android TV', handler: 'androidtv_remote', confirmation: 'codice' },
  panasonic: { label: 'Panasonic', handler: 'panasonic_viera', confirmation: 'pin' },
  roku: { label: 'Roku', handler: 'roku', confirmation: 'nessuno' },
  vizio: { label: 'Vizio', handler: 'vizio', confirmation: 'pin' },
  apple: { label: 'Apple TV', handler: 'apple_tv', confirmation: 'pin' },
  google: { label: 'Chromecast', handler: 'cast', confirmation: 'nessuno' },
  amazon: {
    label: 'Fire TV',
    handler: null,
    confirmation: 'nessuno',
    reason:
      "Il Fire TV si collega solo dopo aver attivato il debug ADB nelle impostazioni della TV: chiedi all'installatore.",
  },
} as const satisfies Record<string, TvBrand>;

export type TvBrandKey = keyof typeof TV_BRANDS;

/** Handler -> brand, for the devices SSDP describes only by the integrations HA matched. */
const BRAND_BY_DOMAIN: Readonly<Record<string, TvBrandKey>> = {
  samsungtv: 'samsung',
  webostv: 'lg',
  braviatv: 'sony',
  philips_js: 'philips',
  panasonic_viera: 'panasonic',
  roku: 'roku',
  vizio: 'vizio',
  apple_tv: 'apple',
  cast: 'google',
  androidtv_remote: 'android',
};

const BRAND_BY_MAKER: readonly (readonly [RegExp, TvBrandKey])[] = [
  [/samsung/i, 'samsung'],
  [/\blg\b|lg electronics/i, 'lg'],
  [/sony/i, 'sony'],
  [/philips|tp ?vision/i, 'philips'],
  [/hisense/i, 'hisense'],
  [/\btcl\b/i, 'tcl'],
  [/xiaomi/i, 'xiaomi'],
  [/panasonic/i, 'panasonic'],
  [/\broku\b/i, 'roku'],
  [/vizio/i, 'vizio'],
  [/apple/i, 'apple'],
  [/amazon/i, 'amazon'],
  [/google/i, 'google'],
];

/** Host names that say what the device is, for the makers whose prefix covers other products. */
const BRAND_BY_HOSTNAME: readonly (readonly [RegExp, TvBrandKey])[] = [
  [/fire-?tv|^amazon-[0-9a-f]{8,}/i, 'amazon'],
  [/chromecast/i, 'google'],
  [/apple-?tv/i, 'apple'],
  [/android-?tv|androidtv|google-?tv/i, 'android'],
  [/bravia/i, 'sony'],
  [/webos|lgwebos/i, 'lg'],
  [/tizen|samsung-?tv/i, 'samsung'],
  [/\broku\b|^roku/i, 'roku'],
];

/** Host names of phones, tablets, watches and computers of the same makers: not a television. */
const NOT_A_TV_HOSTNAME =
  /iphone|ipad|galaxy|^sm-|android-[0-9a-f]{8,}|pixel|redmi|oneplus|watch|buds|phone|tablet|\btab\b|notebook|laptop|macbook|desktop|^pc-/i;

/** Descriptions of a UPnP device that is a screen or a player (SSDP lists routers and printers too). */
const SCREEN_DEVICE_TYPE = /mediarenderer|dial|tvdevice|basicdevice:1.*tv/i;
const TV_MODEL = /tv|bravia|oled|qled|uhd|webos|chromecast|fire|aft|roku|shield/i;

const IPV4_TEXT = /\b\d{1,3}(?:\.\d{1,3}){3}\b/;
const MAC_TEXT = /\b[0-9a-f]{2}(?:[:-][0-9a-f]{2}){5}\b/i;
// eslint-disable-next-line no-control-regex
const CONTROL_RUN = /[\x00-\x1f\x7f]+/g;

/** A name for a person: cut, without control characters, never an address or a MAC. */
const displayText = (value: string | null): string | null => {
  const text = value?.replace(CONTROL_RUN, ' ').trim().slice(0, 60);
  if (!text || IPV4_TEXT.test(text) || MAC_TEXT.test(text)) return null;
  return text;
};

const brandOfMaker = (text: string | null): TvBrandKey | null => {
  if (!text) return null;
  return BRAND_BY_MAKER.find(([pattern]) => pattern.test(text))?.[1] ?? null;
};

const brandOfDomains = (domains: readonly string[]): TvBrandKey | null => {
  for (const domain of domains) {
    const brand = BRAND_BY_DOMAIN[domain];
    if (brand) return brand;
  }
  return null;
};

/** A television that Home Assistant saw, with what is needed to connect it. */
export interface TvCandidate {
  /** Stable for a device (hash of its MAC, UPnP identity or address); safe to send to the browser. */
  id: string;
  brandKey: TvBrandKey;
  brand: string;
  name: string;
  model: string | null;
  /** Server only: the address the integration is started with. */
  host: string | null;
  /** Server only: kept for the exclusion of configured devices and a future power-on recipe. */
  mac: string | null;
  handler: string | null;
  confirmation: TvConfirmation;
  reason?: string;
}

/** What the browser receives: no address, no MAC. */
export interface TvInReteDto {
  id: string;
  brandKey: TvBrandKey;
  brand: string;
  name: string;
  model: string | null;
  handler: string | null;
  conferma: TvConfirmation;
  collegabile: boolean;
  motivo?: string;
}

export const toTvDto = (candidate: TvCandidate): TvInReteDto => ({
  id: candidate.id,
  brandKey: candidate.brandKey,
  brand: candidate.brand,
  name: candidate.name,
  model: candidate.model,
  handler: candidate.handler,
  conferma: candidate.confirmation,
  collegabile: candidate.handler !== null,
  ...(candidate.reason ? { motivo: candidate.reason } : {}),
});

interface Seen {
  brandKey: TvBrandKey;
  name: string | null;
  model: string | null;
  host: string | null;
  mac: string | null;
  uid: string | null;
  /** The description came from SSDP or zeroconf (richer than a bare prefix). */
  described: boolean;
}

/** SSDP and zeroconf: the device says who it is. Null when it is not a screen or a player. */
const fromDescription = (device: HaNetworkDevice): Seen | null => {
  const brand =
    brandOfDomains(device.domains) ??
    brandOfMaker(device.manufacturer) ??
    (device.serviceType && /googlecast/i.test(device.serviceType) ? 'google' : null) ??
    (device.serviceType && /airplay|companion-link|appletv/i.test(device.serviceType)
      ? 'apple'
      : null);
  if (!brand) return null;

  const model = displayText(device.modelName);
  const label = displayText(device.friendlyName);
  const text = `${model ?? ''} ${label ?? ''}`;
  const matchedByDomain = brandOfDomains(device.domains) !== null;
  const screen = SCREEN_DEVICE_TYPE.test(device.deviceType ?? '');

  // A maker's name alone is not enough: SSDP lists routers, printers and speakers too.
  if (brand === 'amazon') {
    if (!/fire ?tv|\baft/i.test(text)) return null;
  } else if (brand === 'google') {
    if (!/chromecast|tv/i.test(text) && !matchedByDomain && device.source !== 'zeroconf')
      return null;
  } else if (brand === 'apple') {
    if (!/apple ?tv/i.test(text) && !matchedByDomain) return null;
  } else if (!matchedByDomain && !screen && !TV_MODEL.test(text)) {
    return null;
  }

  return {
    brandKey: brand,
    name: label,
    model,
    host: device.host,
    mac: null,
    uid: device.uid,
    described: true,
  };
};

/** DHCP: only the prefix of the MAC and the host name. */
const fromDhcp = (device: HaNetworkDevice): Seen | null => {
  const hostname = device.hostname ?? '';
  const named = BRAND_BY_HOSTNAME.find(([pattern]) => pattern.test(hostname))?.[1] ?? null;
  const byPrefix = device.mac ? brandForMac(device.mac) : null;
  const brand = named ?? (byPrefix && !NOT_A_TV_HOSTNAME.test(hostname) ? byPrefix : null);
  if (!brand) return null;
  return {
    brandKey: brand,
    name: null,
    model: null,
    host: device.host,
    mac: device.mac,
    uid: null,
    described: false,
  };
};

const identityOf = (seen: Seen): string => seen.mac ?? seen.uid ?? seen.host ?? seen.brandKey;

export const tvIdFor = (identity: string): string =>
  createHash('sha256').update(`acasystem-tv:${identity}`).digest('hex').slice(0, 16);

const toCandidate = (seen: Seen): TvCandidate => {
  const brand: TvBrand = TV_BRANDS[seen.brandKey];
  const model = seen.model;
  const name = seen.name ?? (model ? `${brand.label} ${model}` : `Televisore ${brand.label}`);
  return {
    id: tvIdFor(identityOf(seen)),
    brandKey: seen.brandKey,
    brand: brand.label,
    name,
    model,
    host: seen.host,
    mac: seen.mac,
    handler: brand.handler,
    confirmation: brand.confirmation,
    ...('reason' in brand ? { reason: brand.reason } : {}),
  };
};

/**
 * The television candidates among what Home Assistant saw. The same device often shows in two
 * lists (SSDP and DHCP): they are merged by address, keeping the description of SSDP and the MAC
 * of DHCP.
 */
export const classifyTvs = (devices: readonly HaNetworkDevice[]): TvCandidate[] => {
  const merged = new Map<string, Seen>();
  const loose: Seen[] = [];

  const add = (seen: Seen) => {
    if (!seen.host) {
      loose.push(seen);
      return;
    }
    const known = merged.get(seen.host);
    if (!known) {
      merged.set(seen.host, seen);
      return;
    }
    // A description beats a bare prefix; the MAC and the UPnP identity are kept from either.
    const best = seen.described && !known.described ? { ...seen } : { ...known };
    const other = best === known ? seen : known;
    best.mac = best.mac ?? other.mac;
    best.uid = best.uid ?? other.uid;
    best.name = best.name ?? other.name;
    best.model = best.model ?? other.model;
    merged.set(seen.host, best);
  };

  for (const device of devices) {
    const seen = device.source === 'dhcp' ? fromDhcp(device) : fromDescription(device);
    if (seen) add(seen);
  }

  return [...merged.values(), ...loose]
    .map(toCandidate)
    .sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));
};

export interface TvExclusions {
  /** MACs of the devices already in the registry of Home Assistant. */
  configuredMacs: ReadonlySet<string>;
  /** `brand|model` of the configured devices (lower case), for the television seen without a MAC. */
  configuredModels: ReadonlySet<string>;
  /** Handlers of the discoveries HA already offers in «Trovati in rete», with how many. */
  discoveredByHandler: ReadonlyMap<string, number>;
}

/** The brand of a registry device from its maker's name, to compare with a candidate. */
export const brandKeyOfMaker = brandOfMaker;

/**
 * Drops the televisions that are already connected or that HA already offers as a discovery
 * (where the person has the same device in «Trovati in rete»). A discovery has no address, so it
 * hides as many candidates of its handler as there are discoveries.
 */
export const withoutKnown = (
  candidates: readonly TvCandidate[],
  exclusions: TvExclusions
): TvCandidate[] => {
  const remainingDiscoveries = new Map(exclusions.discoveredByHandler);
  return candidates.filter((candidate) => {
    if (candidate.mac && exclusions.configuredMacs.has(candidate.mac)) return false;
    if (
      !candidate.mac &&
      candidate.model &&
      exclusions.configuredModels.has(`${candidate.brandKey}|${candidate.model.toLowerCase()}`)
    ) {
      return false;
    }
    const left = candidate.handler ? (remainingDiscoveries.get(candidate.handler) ?? 0) : 0;
    if (candidate.handler && left > 0) {
      remainingDiscoveries.set(candidate.handler, left - 1);
      return false;
    }
    return true;
  });
};

/** Names of the fields in which a flow asks for the address of the device, in order of choice. */
export const ADDRESS_FIELD_NAMES: readonly string[] = ['host', 'address', 'ip_address', 'ip', 'device'];
