/**
 * Guardie e sanificatori della configurazione salvata della dashboard
 * (localStorage, istantanee dei profili, impostazioni sincronizzate).
 * I dati validi passano invariati; le parti malformate vengono scartate.
 */
import type {
  CardSettingsMap,
  HeaderSettings,
  PagesConfig,
  PageSettings,
  PageSettingsMap,
  SectionSpacing,
  StatusPillConfig,
} from '@/@types/dashboard';
import type { GridPosition } from '@/utils/gridLayout';
import { MAX_GRID_COLUMNS, MIN_GRID_COLUMNS } from '@/utils/config/constants';
import { isFiniteNumber, isObject, isRecord, isStringArray, type UnknownRecord } from './guards';

const RESERVED_PAGE_KEYS = ['header', 'settings', 'automations'];

// ── pagesConfig ─────────────────────────────────────────────────────────────

/** Struttura completa: `pages`, `header` e ogni altra chiave sono liste di id. */
export function isPagesConfig(value: unknown): value is PagesConfig {
  return (
    isRecord(value) &&
    isStringArray(value.pages) &&
    isStringArray(value.header) &&
    Object.values(value).every(isStringArray)
  );
}

/**
 * Rende tipizzabile una configurazione delle pagine importata.
 * Le liste valide restano invariate; `header` mancante diventa `[]`;
 * `pages` mancante viene ricostruito dalle liste presenti, come al caricamento.
 * Le chiavi che non sono liste di id vengono scartate.
 */
export function sanitizePagesConfig(value: unknown): PagesConfig | null {
  if (!isRecord(value)) return null;
  if (isPagesConfig(value)) return value;

  const lists: Record<string, string[]> = {};
  Object.entries(value).forEach(([key, list]) => {
    if (Array.isArray(list)) lists[key] = list.filter((id): id is string => typeof id === 'string');
  });

  const detectedPages = Object.keys(lists).filter((key) => !RESERVED_PAGE_KEYS.includes(key));
  const pages = lists.pages ?? (detectedPages.length > 0 ? detectedPages : ['home']);
  return { ...lists, pages, header: lists.header ?? [] };
}

// ── cardSettings ────────────────────────────────────────────────────────────

/** Mappa chiave → impostazioni (oggetti); le voci non oggetto vengono scartate. */
export function sanitizeCardSettingsMap(value: unknown): CardSettingsMap | null {
  if (!isObject(value)) return null;
  const result: CardSettingsMap = {};
  Object.entries(value).forEach(([key, settings]) => {
    if (isObject(settings)) result[key] = settings;
  });
  return result;
}

export function isCardSettingsMap(value: unknown): value is CardSettingsMap {
  return isObject(value) && Object.values(value).every(isObject);
}

// ── Sanificazione campo per campo ──────────────────────────────────────────

type FieldCheck = (value: unknown) => boolean;

const isText: FieldCheck = (value) => typeof value === 'string';
const isNullableText: FieldCheck = (value) => value === null || typeof value === 'string';
const isFlag: FieldCheck = (value) => typeof value === 'boolean';
const isNullableNumber: FieldCheck = (value) => value === null || typeof value === 'number';
const isNumberValue: FieldCheck = (value) => typeof value === 'number';
const oneOf =
  (...allowed: string[]): FieldCheck =>
  (value) =>
    typeof value === 'string' && allowed.includes(value);

/** Copia l'oggetto togliendo i campi noti che hanno un tipo inatteso. */
function withoutInvalidFields(
  value: UnknownRecord,
  schema: Record<string, FieldCheck>
): UnknownRecord {
  const result: UnknownRecord = { ...value };
  Object.entries(schema).forEach(([field, check]) => {
    if (result[field] !== undefined && !check(result[field])) delete result[field];
  });
  return result;
}

const hasValidFields = (value: UnknownRecord, schema: Record<string, FieldCheck>) =>
  Object.entries(schema).every(
    ([field, check]) => value[field] === undefined || check(value[field])
  );

// ── pageSettings ────────────────────────────────────────────────────────────

const PAGE_SETTINGS_SCHEMA: Record<string, FieldCheck> = {
  label: isText,
  icon: isNullableText,
  hidden: isFlag,
  hideSinglePagePill: isFlag,
  gridColumns: isNullableNumber,
  type: isText,
  mediaIds: isStringArray,
  activeId: isNullableText,
  batteryFilter: isText,
  batterySort: isText,
  lightsHideUnavailable: isFlag,
  lightsShowGroups: isFlag,
  lightsSort: isText,
  roomSort: isText,
};

export function isPageSettings(value: unknown): value is PageSettings {
  return isRecord(value) && hasValidFields(value, PAGE_SETTINGS_SCHEMA);
}

/** Impostazioni di una pagina: i campi noti con un tipo inatteso vengono tolti. */
export function sanitizePageSettings(value: unknown): PageSettings | null {
  if (!isRecord(value)) return null;
  const cleaned = withoutInvalidFields(value, PAGE_SETTINGS_SCHEMA);
  return isPageSettings(cleaned) ? cleaned : null;
}

/** Impostazioni delle pagine; le voci che non sono oggetti vengono scartate. */
export function sanitizePageSettingsMap(value: unknown): PageSettingsMap | null {
  if (!isObject(value)) return null;
  const result: PageSettingsMap = {};
  Object.entries(value).forEach(([pageId, settings]) => {
    const sanitized = sanitizePageSettings(settings);
    if (sanitized) result[pageId] = sanitized;
  });
  return result;
}

// ── Liste e mappe semplici ──────────────────────────────────────────────────

export function sanitizeStringList(value: unknown): string[] | null {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : null;
}

export function sanitizeStringMap(value: unknown): Record<string, string> | null {
  if (!isObject(value)) return null;
  const result: Record<string, string> = {};
  Object.entries(value).forEach(([key, entry]) => {
    if (typeof entry === 'string') result[key] = entry;
  });
  return result;
}

// ── Intestazione, spaziature, pillole ───────────────────────────────────────

const HEADER_SETTINGS_SCHEMA: Record<string, FieldCheck> = {
  showTitle: isFlag,
  showClock: isFlag,
  showClockOnMobile: isFlag,
  showDate: isFlag,
  showPagePillLabelsOnMobile: isFlag,
  mobileAlignment: oneOf('left', 'center', 'right'),
  fontWeight: isText,
  fontFamily: isText,
  headerFont: isText,
  letterSpacing: isText,
  fontStyle: isText,
  clockFormat: isText,
  clockScale: isNumberValue,
  dateScale: isNumberValue,
  headerStyle: isText,
  batteryVariant: oneOf('glass', 'outline', 'solid'),
  showBatteryNub: isFlag,
};

export function isHeaderSettings(value: unknown): value is HeaderSettings {
  return isRecord(value) && hasValidFields(value, HEADER_SETTINGS_SCHEMA);
}

/** Impostazioni dell'intestazione: i campi noti con un tipo inatteso vengono tolti. */
export function sanitizeHeaderSettings(value: unknown): HeaderSettings | null {
  if (!isRecord(value)) return null;
  const cleaned = withoutInvalidFields(value, HEADER_SETTINGS_SCHEMA);
  return isHeaderSettings(cleaned) ? cleaned : null;
}

export const DEFAULT_SECTION_SPACING: SectionSpacing = {
  headerToStatus: 16,
  statusToNav: 24,
  navToGrid: 24,
};

/** Spaziature: i valori non numerici tornano a quelli predefiniti. */
export function sanitizeSectionSpacing(
  value: unknown,
  fallback: SectionSpacing = DEFAULT_SECTION_SPACING
): SectionSpacing | null {
  if (!isObject(value)) return null;
  return {
    headerToStatus: isFiniteNumber(value.headerToStatus)
      ? value.headerToStatus
      : fallback.headerToStatus,
    statusToNav: isFiniteNumber(value.statusToNav) ? value.statusToNav : fallback.statusToNav,
    navToGrid: isFiniteNumber(value.navToGrid) ? value.navToGrid : fallback.navToGrid,
  };
}

export function isPartialSectionSpacing(value: unknown): value is Partial<SectionSpacing> {
  return (
    isRecord(value) &&
    ['headerToStatus', 'statusToNav', 'navToGrid'].every(
      (field) => value[field] === undefined || typeof value[field] === 'number'
    )
  );
}

export function isStatusPillConfig(value: unknown): value is StatusPillConfig {
  return isRecord(value) && typeof value.id === 'string' && typeof value.type === 'string';
}

export function sanitizeStatusPills(value: unknown): StatusPillConfig[] | null {
  return Array.isArray(value) ? value.filter(isStatusPillConfig) : null;
}

// ── Griglia ─────────────────────────────────────────────────────────────────

/** Colonne della griglia: numero intero tra 1 e 5 (4 se il valore non è numerico). */
export function normalizeGridColumns(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 4;
  return Math.max(MIN_GRID_COLUMNS, Math.min(Math.round(parsed), MAX_GRID_COLUMNS));
}

/** Numero finito (spaziature, raggi, scale), altrimenti `null`. */
export function readFiniteNumber(value: unknown): number | null {
  return isFiniteNumber(value) ? value : null;
}

export function isGridPosition(value: unknown): value is GridPosition {
  return (
    isRecord(value) &&
    ['row', 'col', 'span', 'colSpan'].every(
      (field) => Number.isInteger(value[field]) && Number(value[field]) >= 1
    )
  );
}

/** Mappa id card → posizione, come prodotta da `buildGridLayout`. */
export function isGridLayout(value: unknown): value is Record<string, GridPosition> {
  return isRecord(value) && Object.values(value).every(isGridPosition);
}
