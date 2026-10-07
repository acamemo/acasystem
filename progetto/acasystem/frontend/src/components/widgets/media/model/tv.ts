/**
 * Android TV and Apple TV cards: which entity provides the metadata (a linked player that is
 * playing wins), power state, app name and logo. Same rules as GenericAndroidTVCard/Modal and
 * GenericAppleTVCard/Modal.
 */
import type { EntityMap } from '@/@types/ha';
import { getMediaLogoUrl } from '@/utils/mediaLogos';
import { attrString, isUnavailable, type Entity } from './entity';

export type TvKind = 'android' | 'apple';

export interface TvView {
  entity: Entity | undefined;
  displayId: string;
  display: Entity | undefined;
  /** A linked player (Emby, Jellyfin…) is playing, paused or buffering. */
  linkedActive: boolean;
  unavailable: boolean;
  isOn: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  deviceName: string;
  appName: string;
  title: string;
  /** Raw entity_picture of the display entity. */
  picture: unknown;
  logo: string | null;
  sources: string[];
  muted: boolean;
}

const LINKED_ACTIVE_STATES = new Set(['playing', 'paused', 'buffering']);

export function resolveTv(
  kind: TvKind,
  entities: EntityMap,
  cardId: string,
  mediaPlayerId: string,
  linkedMediaPlayers: readonly string[],
  customNames: Record<string, string>
): TvView {
  const entity = entities[mediaPlayerId];
  let displayId = mediaPlayerId;
  let linkedActive = false;
  for (const linkedId of linkedMediaPlayers) {
    if (LINKED_ACTIVE_STATES.has(entities[linkedId]?.state ?? '')) {
      displayId = linkedId;
      linkedActive = true;
      break;
    }
  }
  const display = entities[displayId];
  const state = entity?.state ?? '';
  const unavailable = isUnavailable(entity);
  const isOn = !unavailable && state !== 'off' && !(kind === 'apple' && state === 'standby');

  let appName = attrString(display, 'app_name');
  const title = attrString(display, 'media_title');
  const otherName = () =>
    displayId !== mediaPlayerId
      ? customNames[displayId] || attrString(display, 'friendly_name')
      : '';
  if (linkedActive) {
    const series = attrString(display, 'media_series_title');
    if (series) appName = series;
    else if (!appName) appName = otherName();
  } else if (!appName) {
    appName = otherName();
  }

  let logo: string | null = null;
  if (linkedActive) {
    const appId = attrString(display, 'app_id').toLowerCase();
    const displayApp = attrString(display, 'app_name').toLowerCase();
    if (appId.includes('jellyfin') || displayApp.includes('jellyfin')) logo = getMediaLogoUrl('jellyfin');
    else if (appId.includes('emby') || displayApp.includes('emby')) logo = getMediaLogoUrl('emby');
  }
  if (!logo) logo = getMediaLogoUrl(appName);

  const fallbackName = kind === 'apple' ? 'Apple TV' : 'Android TV';
  const sourceList = entity?.attributes?.source_list;
  return {
    entity,
    displayId,
    display,
    linkedActive,
    unavailable,
    isOn,
    isPlaying: display?.state === 'playing',
    isPaused: display?.state === 'paused',
    deviceName:
      customNames[cardId] ||
      customNames[mediaPlayerId] ||
      attrString(entity, 'friendly_name') ||
      fallbackName,
    appName,
    title,
    picture: display?.attributes?.entity_picture ?? null,
    logo,
    sources: Array.isArray(sourceList)
      ? sourceList.filter((item): item is string => typeof item === 'string')
      : [],
    muted: entity?.attributes?.is_volume_muted === true,
  };
}

/** Target of the play/pause button on the widget: Android follows the playing display entity. */
export function widgetPlayTarget(kind: TvKind, view: TvView, mediaPlayerId: string): string {
  if (kind === 'apple') return view.linkedActive ? view.displayId : mediaPlayerId;
  return view.isPlaying ? view.displayId : mediaPlayerId;
}

/** Target of a details command: media_* actions go to the linked player when it is shown. */
export function detailsTarget(action: string, view: TvView, mediaPlayerId: string): string {
  return action.includes('media') && view.displayId !== mediaPlayerId ? view.displayId : mediaPlayerId;
}
