/**
 * Page identity of the launcher: kinds of the legacy special pages, ids and labels.
 * The ids stay those of the legacy `pagesConfig.pages`, so card settings keyed
 * `pageId::cardId` keep working.
 */
import type { PageSettingsMap } from '@/@types/dashboard';
import type { PageKind } from '@/@types/launcher';

/** Kinds detected as `DashboardGrid` does: media, then sonos, lights, battery, rooms. */
export function legacyPageKind(
  pageId: string,
  pageSettings: PageSettingsMap | null | undefined
): PageKind {
  const type = pageSettings?.[pageId]?.type;
  if (type === 'media' || pageId.startsWith('media')) return 'media';
  if (type === 'sonos' || pageId.startsWith('sonos')) return 'sonos';
  if (type === 'lights' || pageId.startsWith('lights')) return 'lights';
  if (type === 'battery' || pageId.startsWith('battery')) return 'battery';
  if (type === 'room_explorer' || pageId.startsWith('room_explorer')) return 'rooms';
  // Only the type: before the Casa 3D page the `casa3d` prefix was free, so an old widget page
  // such as «Casa3D giardino» (id casa3d_giardino) must not become the Casa 3D page.
  if (type === 'casa3d') return 'casa3d';
  if (type === 'cover') return 'cover';
  return 'widgets';
}

/** `pageSettings.type` written for a kind, as the legacy page creation does. */
export const LEGACY_PAGE_TYPE: Record<Exclude<PageKind, 'widgets'>, string> = {
  media: 'media',
  sonos: 'sonos',
  lights: 'lights',
  battery: 'battery',
  rooms: 'room_explorer',
  cover: 'cover',
  casa3d: 'casa3d',
};

/** Italian default labels of the special pages. */
export const PAGE_KIND_LABEL: Record<PageKind, string> = {
  widgets: 'Nuova pagina',
  media: 'Multimedia',
  sonos: 'Sonos',
  lights: 'Luci',
  battery: 'Batterie',
  rooms: 'Stanze',
  cover: 'Copertina',
  casa3d: 'Casa 3D',
};

/** Label of the legacy home page when the user never renamed it. */
export const HOME_PAGE_LABEL = 'Principale';

const RESERVED_PREFIX = /^(media|sonos|lights|battery|room_explorer|casa3d)/;

/**
 * New unique page id. Widget pages never start with a special-page prefix, otherwise the
 * legacy helpers (isMediaPage…) would mistake them for special pages.
 */
export function createPageId(
  label: string,
  kind: PageKind,
  existing: ReadonlySet<string> | readonly string[]
): string {
  const taken = existing instanceof Set ? existing : new Set(existing);
  let base: string;
  if (kind === 'widgets') {
    base =
      label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'pagina';
    if (RESERVED_PREFIX.test(base)) base = `page_${base}`;
  } else {
    base = LEGACY_PAGE_TYPE[kind];
  }
  let id = base;
  let counter = 1;
  while (taken.has(id)) {
    counter += 1;
    id = `${base}_${counter}`;
  }
  return id;
}

/**
 * Label shown to people: sentence case. Text typed all in capitals (as the legacy defaults
 * were) becomes «Luci»; mixed case is kept as typed, with the first letter capitalised.
 */
export function displayLabel(label: string | null | undefined, fallback = ''): string {
  const text = String(label ?? '').trim() || fallback;
  if (!text) return '';
  const hasLetters = /\p{L}/u.test(text);
  if (hasLetters && text.length > 1 && text === text.toLocaleUpperCase('it-IT')) {
    const lower = text.toLocaleLowerCase('it-IT');
    return lower.charAt(0).toLocaleUpperCase('it-IT') + lower.slice(1);
  }
  return text.charAt(0).toLocaleUpperCase('it-IT') + text.slice(1);
}

/** Label for a continuation page: «Luci 2», «Luci 3»… unique among the given labels. */
export function continuationLabel(label: string, labels: readonly string[]): string {
  const base = label.replace(/\s+\d+$/, '');
  let counter = 2;
  const taken = new Set(labels.map((item) => item.toLocaleLowerCase('it-IT')));
  while (taken.has(`${base} ${counter}`.toLocaleLowerCase('it-IT'))) counter += 1;
  return `${base} ${counter}`;
}
