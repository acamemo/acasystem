import { isRecord } from '../../helpers/objects.ts';
import type {
  EntityFilter,
  FlowFieldDto,
  FlowLookup,
  NormalizedFlow,
  QrLevel,
} from './flowModel.ts';
import type { HaAdapter } from './haAdapter.ts';

/**
 * The four selectors that used to end in «Richiede l'installatore» (REP-20261028-004, T7):
 * `serial_port`, `entity`, `file` and `qr_code`. Home Assistant fills them like this (frontend
 * `src/components/ha-selector/`, core `helpers/selector.py`):
 * - serial_port: the list of `usb/list_serial_ports`, with a manual entry as a way out;
 * - entity: the entities of the registry, narrowed by the `filter` (domain, integration, device
 *   class), `include_entities` and `exclude_entities` of the selector;
 * - file: the file is uploaded to `POST /api/file_upload`, the flow gets the `file_id`;
 * - qr_code: the `data` of the selector is drawn as a QR code; nothing is answered.
 * This module reads the selector configuration (pure, used by `flowModel.ts`), looks the
 * choices up in HA before the step is shown, and holds the rules of the upload. It never
 * names a route of HA: the calls are the adapter's. Only types are taken from `flowModel.ts`.
 */

export const EXTRA_TEXTS = {
  serialPortHint: 'Scegli la porta a cui è collegato il dispositivo. Se non c’è, scrivi il percorso.',
  recommended: 'consigliata',
  serialPortFallback: 'Porta seriale',
} as const;

const MAX_CHOICES = 500;
const ENTITY_ID = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const WORD = /^[a-z0-9_]+$/;

/** A value HA gives as one string or a list of strings, as a list. */
export const stringList = (value: unknown): string[] =>
  (Array.isArray(value) ? value : value === undefined ? [] : [value]).filter(
    (item): item is string => typeof item === 'string'
  );

const words = (value: unknown): string[] => stringList(value).filter((item) => WORD.test(item));

// --- Selector configuration ---------------------------------------------------------------

const ACCEPT = /^[A-Za-z0-9.,/*+\-\s]{0,200}$/;

/** What the file picker accepts: a short list of extensions and types; null if it is not plain. */
export const fileAccept = (value: unknown): string | null =>
  typeof value === 'string' && ACCEPT.test(value) ? value.trim() : null;

const QR_LEVELS: Readonly<Record<string, QrLevel>> = { low: 'L', medium: 'M', quartile: 'Q', high: 'H' };
/** Longest text drawn as a QR code (byte mode, level M, version 40 holds 2331 bytes). */
const MAX_QR_CHARACTERS = 1000;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\x00-\x1f\x7f]/;

/** The text and the error correction of a `qr_code` selector; null if the text is not usable. */
export const qrConfig = (config: Record<string, unknown>): { data: string; level: QrLevel } | null => {
  const data = config.data;
  if (typeof data !== 'string' || data.length < 1 || data.length > MAX_QR_CHARACTERS) return null;
  if (CONTROL.test(data)) return null;
  const level =
    typeof config.error_correction_level === 'string'
      ? QR_LEVELS[config.error_correction_level]
      : undefined;
  return { data, level: level ?? 'M' };
};

const filterOf = (source: unknown): EntityFilter | null => {
  if (!isRecord(source)) return null;
  const filter: EntityFilter = {
    domains: words(source.domain),
    integrations: words(source.integration),
    deviceClasses: words(source.device_class),
  };
  return filter.domains.length || filter.integrations.length || filter.deviceClasses.length
    ? filter
    : null;
};

const entityIds = (value: unknown): string[] =>
  stringList(value)
    .filter((item) => ENTITY_ID.test(item))
    .slice(0, MAX_CHOICES);

/**
 * The lookup of an `entity` selector and the choices it starts with (the entities the flow
 * named, if it named any). The `device` filter of HA and `supported_features` need the state
 * of the entity and are not applied. Null when the configuration is not an object.
 */
export const entityLookup = (
  field: string,
  config: Record<string, unknown>
): { lookup: FlowLookup; options: { value: string; label: string }[] } | null => {
  const filters: EntityFilter[] = [];
  const nested = Array.isArray(config.filter) ? config.filter : [config.filter];
  for (const item of nested) {
    const parsed = filterOf(item);
    if (parsed) filters.push(parsed);
  }
  // The older form puts domain, integration and device_class on the selector itself.
  const legacy = filterOf(config);
  if (legacy) filters.push(legacy);

  const include = Array.isArray(config.include_entities) ? entityIds(config.include_entities) : null;
  const exclude = entityIds(config.exclude_entities);
  return {
    lookup: { field, type: 'entity', filters, include, exclude },
    options: (include ?? []).map((value) => ({ value, label: value })),
  };
};

// --- Looking the choices up in HA -----------------------------------------------------------

const labelOfPort = (description: string | null, manufacturer: string | null, device: string) =>
  `${description ?? manufacturer ?? EXTRA_TEXTS.serialPortFallback} (${device})`;

const entityMatches = (
  filters: readonly EntityFilter[],
  entity: { entityId: string; platform: string; deviceClass: string | null }
): boolean =>
  filters.length === 0 ||
  filters.some(
    (filter) =>
      (filter.domains.length === 0 || filter.domains.includes(entity.entityId.split('.')[0] ?? '')) &&
      (filter.integrations.length === 0 || filter.integrations.includes(entity.platform)) &&
      (filter.deviceClasses.length === 0 ||
        (entity.deviceClass !== null && filter.deviceClasses.includes(entity.deviceClass)))
  );

const portOptions = async (
  adapter: HaAdapter,
  token: string,
  recommended: readonly string[]
): Promise<{ value: string; label: string }[]> => {
  const ports = await adapter.ws(token).serialPorts();
  const seen = new Set<string>();
  const listed = ports
    .filter((port) => !seen.has(port.device) && seen.add(port.device))
    .map((port) => ({
      port,
      recommended: port.matchingIntegrations.some((domain) => recommended.includes(domain)),
    }))
    // The ports HA recommends for this integration first; the order of HA otherwise.
    .sort((a, b) => Number(b.recommended) - Number(a.recommended));
  return listed.slice(0, MAX_CHOICES).map(({ port, recommended: isRecommended }) => ({
    value: port.device,
    label:
      labelOfPort(port.description, port.manufacturer, port.device) +
      (isRecommended ? ` – ${EXTRA_TEXTS.recommended}` : ''),
  }));
};

const entityOptions = async (
  adapter: HaAdapter,
  token: string,
  lookup: Extract<FlowLookup, { type: 'entity' }>,
  current: { value: string; label: string }[]
): Promise<{ value: string; label: string }[]> => {
  const choices = await adapter.ws(token).entityChoices();
  const byId = new Map(choices.map((choice) => [choice.entityId, choice]));
  const labelOf = (entityId: string): string => {
    const name = byId.get(entityId)?.name;
    return name ? `${name} (${entityId})` : entityId;
  };

  const ids = lookup.include
    ? // The flow named the entities: those are the choices (the filter was already applied by it).
      current.map((option) => option.value)
    : choices.filter((choice) => entityMatches(lookup.filters, choice)).map((c) => c.entityId);
  return [...new Set(ids)]
    .filter((id) => !lookup.exclude.includes(id))
    .map((value) => ({ value, label: labelOf(value) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'it'))
    .slice(0, MAX_CHOICES);
};

/**
 * Gives the fields of a form their choices (serial ports, entities). A lookup HA cannot answer
 * leaves the field with what the flow itself listed: a serial port can still be typed, and an
 * entity choice then shows whatever the flow named.
 */
export const fillLookups = async (
  adapter: HaAdapter,
  token: string,
  step: Extract<NormalizedFlow, { outcome: 'step' }>
): Promise<Extract<NormalizedFlow, { outcome: 'step' }>> => {
  const lookups = step.lookups ?? [];
  if (step.dto.type !== 'form' || lookups.length === 0) return step;

  const fields: FlowFieldDto[] = [];
  for (const field of step.dto.fields) {
    const lookup = lookups.find((item) => item.field === field.name);
    if (!lookup) {
      fields.push(field);
      continue;
    }
    try {
      const options =
        lookup.type === 'serial_port'
          ? await portOptions(adapter, token, lookup.recommended)
          : await entityOptions(adapter, token, lookup, field.options ?? []);
      fields.push({ ...field, options });
    } catch {
      fields.push(field);
    }
  }
  return { ...step, dto: { ...step.dto, fields } };
};

// --- Upload of a file ------------------------------------------------------------------------

/** Largest file taken for a flow (certificates, backups of a radio: a few kilobytes). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** Files a single flow may upload. */
const MAX_UPLOADS_PER_FLOW = 5;
/** The id HA gives to an upload (`ulid_hex`). */
export const FILE_ID = /^[0-9a-f]{32}$/;

/** A name HA accepts: no path, no odd character, at most 100 characters. */
export const uploadFileName = (raw: unknown): string => {
  const base = typeof raw === 'string' ? (raw.split(/[\\/]/).pop() ?? '') : '';
  const cleaned = base
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^[._]+/, '')
    .slice(-100);
  return cleaned || 'file';
};

/**
 * The ids of the files a flow uploaded, in memory. An answer may name only an id that this
 * server obtained from HA for that flow, so a file of somebody else's cannot be attached.
 */
export const createUploadLedger = () => {
  const byFlow = new Map<string, Set<string>>();
  return {
    /** False when the flow reached its limit. */
    add(flowId: string, fileId: string): boolean {
      const ids = byFlow.get(flowId) ?? new Set<string>();
      if (!ids.has(fileId) && ids.size >= MAX_UPLOADS_PER_FLOW) return false;
      ids.add(fileId);
      byFlow.set(flowId, ids);
      return true;
    },
    canAdd(flowId: string): boolean {
      return (byFlow.get(flowId)?.size ?? 0) < MAX_UPLOADS_PER_FLOW;
    },
    has(flowId: string, fileId: string): boolean {
      return byFlow.get(flowId)?.has(fileId) ?? false;
    },
    /** Forgets the flows for which `keep` says no. */
    prune(keep: (flowId: string) => boolean): void {
      for (const flowId of byFlow.keys()) if (!keep(flowId)) byFlow.delete(flowId);
    },
    forget(flowId: string): void {
      byFlow.delete(flowId);
    },
  };
};
