import { FACADE_DOMAINS, SYSTEM_DOMAINS } from '../../config/devices.ts';
import { DISCOVERY_SOURCES } from '../../config/deviceFamilies.ts';
import { isRecord } from '../../helpers/objects.ts';

/**
 * Catalogue of the integrations. In D1 it is built from the flow handlers of HA only
 * (REP-20261023-003, section 3, row 9); `parseIntegrationDescriptions` reads the full
 * `integration/descriptions` index and is NOT used until D3 (brands, translations, search),
 * which needs its own probe and contract record. Since F4 every handler is startable by a
 * customer, except the domains of Home Assistant itself (SYSTEM_DOMAINS), which are not listed.
 * Custom integrations (`custom_components`) are not listed in D1.
 */

export interface CatalogItem {
  domain: string;
  name: string;
  brand: string | null;
  integrationType: string | null;
  iotClass: string | null;
  /** Domain whose flow is started (a virtual integration is served by `supported_by`). */
  startDomain: string;
}

export interface CatalogEntryDto extends CatalogItem {
  startable: boolean;
  requiresInstaller: boolean;
}

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value ? value : null;

const itemFrom = (domain: string, value: unknown, brand: string | null): CatalogItem | null => {
  if (!isRecord(value)) return null;
  const supportedBy = asString(value.supported_by);
  if (value.config_flow !== true && !supportedBy) return null;
  if (!/^[a-z0-9_]{1,64}$/.test(domain)) return null;

  return {
    domain,
    name: asString(value.name) ?? domain,
    brand,
    integrationType: asString(value.integration_type),
    iotClass: asString(value.iot_class),
    startDomain: supportedBy && /^[a-z0-9_]{1,64}$/.test(supportedBy) ? supportedBy : domain,
  };
};

/** Reads `integration/descriptions` (D3, unused in D1): tolerant of missing and unknown fields. */
export const parseIntegrationDescriptions = (raw: unknown): CatalogItem[] => {
  if (!isRecord(raw) || !isRecord(raw.core) || !isRecord(raw.core.integration)) return [];

  const items: CatalogItem[] = [];
  for (const [domain, value] of Object.entries(raw.core.integration)) {
    if (isRecord(value) && isRecord(value.integrations)) {
      const brand = asString(value.name) ?? domain;
      for (const [childDomain, child] of Object.entries(value.integrations)) {
        const item = itemFrom(childDomain, child, brand);
        if (item) items.push(item);
      }
    } else {
      const item = itemFrom(domain, value, null);
      if (item) items.push(item);
    }
  }
  return items;
};

/** True for a domain that belongs to Home Assistant itself: never listed, started or touched. */
export const isSystemDomain = (domain: string): boolean => SYSTEM_DOMAINS.includes(domain);

/** Every handler of the catalogue can be started by a customer, except the system ones. */
export const isStartableHandler = (domain: string): boolean =>
  /^[a-z0-9_]{1,64}$/.test(domain) && !isSystemDomain(domain);

/** True for the integrations whose entries and devices the facade always shows (TV, Wake on LAN). */
export const isFacadeDomain = (domain: string): boolean => FACADE_DOMAINS.includes(domain);

/**
 * True for an entry the facade shows and lets a customer rename without looking at the registry
 * of actions: the integrations of FACADE_DOMAINS, and the ones of a device that HA discovered and
 * a person added from Acasystem (F2: the entry keeps the discovery as its `source`). System
 * integrations never. An entry created from the catalogue has the source `user`, like one made
 * by hand in HA: the service tells them apart with the registry of actions (`createdByFacade`).
 */
export const isFacadeEntry = (entry: { domain: string; source: string }): boolean =>
  !isSystemDomain(entry.domain) &&
  (isFacadeDomain(entry.domain) || DISCOVERY_SOURCES.includes(entry.source));

export const toCatalogEntry = (item: CatalogItem): CatalogEntryDto => {
  const startable = isStartableHandler(item.startDomain);
  return { ...item, startable, requiresInstaller: !startable };
};

const COMBINING_MARKS = /[\u0300-\u036f]/g;

const fold = (text: string): string =>
  text.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();

/** Every word of the query must appear in the name, brand or domain. Startable items first. */
export const searchCatalog = (items: readonly CatalogItem[], query: string): CatalogEntryDto[] => {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return items
    .filter((item) => {
      const haystack = fold(`${item.name} ${item.brand ?? ''} ${item.domain}`);
      return words.every((word) => haystack.includes(word));
    })
    .map(toCatalogEntry)
    .sort(
      (a, b) => Number(b.startable) - Number(a.startable) || a.name.localeCompare(b.name, 'it')
    );
};
