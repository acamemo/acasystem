/**
 * Pure helpers on media_player entities, shared by the media widgets, their details and the
 * media page. Behaviour follows Tunet (MediaCards.jsx, MediaModal.jsx, MediaPage.jsx).
 */
import type { HassEntity } from 'home-assistant-js-websocket';
import type { EntityLike, EntityMap } from '@/@types/ha';
import { ENTITY_UPDATE_THRESHOLD, MEDIA_TIMEOUT } from '@/utils/config/constants';
import { toDate } from '@/validators/guards';

export type Entity = HassEntity;

export const readString = (value: unknown): string =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';

export const attrString = (entity: EntityLike | null | undefined, key: string): string =>
  readString(entity?.attributes?.[key]);

export function attrNumber(entity: EntityLike | null | undefined, key: string): number | null {
  const raw = entity?.attributes?.[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export const attrBoolean = (entity: EntityLike | null | undefined, key: string): boolean =>
  entity?.attributes?.[key] === true;

export function attrStringList(entity: EntityLike | null | undefined, key: string): string[] {
  const raw = entity?.attributes?.[key];
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
}

export const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/** No state, `unavailable` or `unknown`: Home Assistant cannot reach the device. */
export const isUnavailable = (entity: EntityLike | null | undefined): boolean => {
  const state = entity?.state;
  return !state || state === 'unavailable' || state === 'unknown';
};

/** Legacy isMediaActive: playing, or updated in the last 30 seconds. */
export function isMediaActive(entity: EntityLike | null | undefined, nowMs: number): boolean {
  if (!entity?.state) return false;
  if (entity.state === 'playing') return true;
  return nowMs - toDate(entity.last_updated).getTime() < ENTITY_UPDATE_THRESHOLD;
}

/** Legacy isSonosActive: playing, or paused in the last 2 minutes. */
export function isSonosActive(entity: EntityLike | null | undefined, nowMs: number): boolean {
  if (!entity?.state) return false;
  if (entity.state === 'playing') return true;
  if (entity.state === 'paused') {
    return nowMs - toDate(entity.last_updated).getTime() < MEDIA_TIMEOUT;
  }
  return false;
}

export const friendlyName = (entity: EntityLike | null | undefined, fallback: string): string =>
  attrString(entity, 'friendly_name') || entity?.entity_id || fallback;

/** Widget subtitle of MediaCards.jsx: artist, series or album. */
export const widgetSubtitle = (entity: EntityLike | null | undefined): string =>
  attrString(entity, 'media_artist') ||
  attrString(entity, 'media_series_title') ||
  attrString(entity, 'media_album_name');

/** Details subtitle of MediaModal.jsx: series (with season for episodes), artist or season. */
export function detailsSubtitle(entity: EntityLike | null | undefined): string {
  let series = attrString(entity, 'media_series_title');
  const season = attrString(entity, 'media_season');
  if (attrString(entity, 'media_content_type') === 'episode') {
    if (series && season) series = `${series} • ${season}`;
    else if (!series && season) series = season;
  }
  return series || attrString(entity, 'media_artist') || season;
}

export const isChannel = (entity: EntityLike | null | undefined): boolean =>
  attrString(entity, 'media_content_type') === 'channel';

/** The media page also treats `device_class: tv` as a television. */
export const isTelevision = (entity: EntityLike | null | undefined): boolean =>
  isChannel(entity) || attrString(entity, 'device_class') === 'tv';

/**
 * Image URL for an HA-relative path or an absolute one. Only http(s) and inline images are kept,
 * as MediaModal's sanitizeHttpImageSrc did; anything else gives the kit placeholder.
 */
export function resolveImage(
  raw: unknown,
  getEntityImageUrl: (path?: string | null) => string | null
): string | null {
  const value = readString(raw).trim();
  if (!value) return null;
  if (value.startsWith('data:image/')) return value;
  const absolute = /^https?:\/\//i.test(value) ? value : getEntityImageUrl(value);
  if (!absolute) return null;
  try {
    const base = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    const parsed = new URL(absolute, base);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/** Artwork chain of MediaModal/MediaPage: entity_picture, media_image_url, media_image. */
export const artworkPath = (entity: EntityLike | null | undefined): unknown =>
  entity?.attributes?.entity_picture ||
  entity?.attributes?.media_image_url ||
  entity?.attributes?.media_image ||
  null;

/** Position of the playhead, advanced while playing (MediaModal/MediaPage). */
export function effectivePosition(entity: EntityLike | null | undefined, nowMs: number): number {
  const duration = attrNumber(entity, 'media_duration');
  const base = attrNumber(entity, 'media_position') ?? 0;
  const updatedAt = attrString(entity, 'media_position_updated_at');
  const updatedMs = updatedAt ? new Date(updatedAt).getTime() : NaN;
  const elapsed =
    entity?.state === 'playing' && Number.isFinite(updatedMs)
      ? Math.max(0, (nowMs - updatedMs) / 1000)
      : 0;
  return Math.min(duration || base, base + elapsed);
}

const REPEAT_MODES = ['off', 'one', 'all'] as const;

/** Next repeat mode in the legacy cycle off → one → all. */
export function nextRepeatMode(current: string): string {
  const index = REPEAT_MODES.indexOf(current as (typeof REPEAT_MODES)[number]);
  return REPEAT_MODES[(index + 1) % REPEAT_MODES.length];
}

export const VOLUME_STEP = 0.03;

export const clampVolume = (value: number): number => Math.min(1, Math.max(0, value));

/** Media server label of the legacy getServerInfo. */
export function serverName(entityId: string | null | undefined): string {
  const id = entityId ?? '';
  if (id.includes('nrk')) return 'NRK';
  if (id.includes('jellyfin')) return 'Jellyfin';
  if (id.includes('emby')) return 'Emby';
  return '';
}

/**
 * Removes the configured name prefixes («Sonos *, Kitchen *»), as the legacy
 * applyPlayerNameFilter with `tunet_media_name_display_filter`.
 */
export function applyPlayerNameFilter(value: string, filter: string): string {
  const name = String(value || '');
  const patterns = String(filter || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!name || patterns.length === 0) return name;
  let cleaned = name;
  let applied = false;
  patterns.forEach((pattern) => {
    const wildcard = pattern.indexOf('*');
    const prefix = (wildcard >= 0 ? pattern.slice(0, wildcard) : pattern).trim();
    if (!prefix) return;
    const escaped = prefix.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escaped}`, 'i');
    if (regex.test(cleaned)) {
      cleaned = cleaned.replace(regex, '').trim();
      applied = true;
    }
  });
  return applied ? cleaned : name;
}

/** Media players of the entity map, in insertion order. */
export const mediaPlayerIds = (entities: EntityMap): string[] =>
  Object.keys(entities).filter((id) => id.startsWith('media_player.'));

export const byFriendlyName = (a: EntityLike, b: EntityLike): number =>
  attrString(a, 'friendly_name').localeCompare(attrString(b, 'friendly_name'));
