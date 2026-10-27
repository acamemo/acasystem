/**
 * Android TV and Apple TV cards: which entity provides the metadata (a linked player that is
 * playing wins), power state, app name and logo. Same rules as GenericAndroidTVCard/Modal and
 * GenericAppleTVCard/Modal.
 */
import type { EntityMap } from '@/@types/ha';
import { getMediaLogoUrl } from '@/utils/mediaLogos';
import { getMediaPlayerPowerAction } from '@/utils/mediaPlayerFeatures';
import { attrString, isUnavailable, type Entity } from './entity';
import { MEDIA_FEATURE } from './features';

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
    if (appId.includes('jellyfin') || displayApp.includes('jellyfin'))
      logo = getMediaLogoUrl('jellyfin');
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

/**
 * The power button of the Android TV widget: only when the entity itself declares that it can be
 * turned on (while off) or off (while on). An Android TV without a remote used to show none; a
 * TV that declares the feature, like an LG TV added from Acasystem with the power-on recipe,
 * shows it (REQ-18). Apple TV always shows it.
 */
export function tvCanPower(kind: TvKind, view: TvView): boolean {
  return kind === 'apple' || getMediaPlayerPowerAction(view.entity) !== null;
}

/**
 * The «App» list of the details: Apple TV when the entity lists sources; Android TV only when
 * the entity declares that it can select a source (SELECT_SOURCE), as the LG TV does, so the apps
 * of the list (Netflix, YouTube…) open from the widget (REQ-18).
 */
export function tvShowsApps(kind: TvKind, view: TvView): boolean {
  if (view.sources.length === 0) return false;
  if (kind === 'apple') return true;
  const raw = view.entity?.attributes?.supported_features;
  const bits = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(bits) && (bits & MEDIA_FEATURE.SELECT_SOURCE) !== 0;
}

/**
 * Volume and mute of the details: Apple TV always (as before); any other TV when the entity
 * declares volume steps or a level (VOLUME_STEP/VOLUME_SET) and mute (VOLUME_MUTE), as a Samsung
 * TV added from «Rileva dispositivi» does (REP-20261026-006).
 */
export function tvShowsVolume(kind: TvKind, view: TvView): boolean {
  return kind === 'apple' || declares(view, MEDIA_FEATURE.VOLUME_STEP | MEDIA_FEATURE.VOLUME_SET);
}

export function tvShowsMute(kind: TvKind, view: TvView): boolean {
  return kind === 'apple' || declares(view, MEDIA_FEATURE.VOLUME_MUTE);
}

const declares = (view: TvView, mask: number): boolean => {
  const raw = view.entity?.attributes?.supported_features;
  const bits = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(bits) && (bits & mask) !== 0;
};

/**
 * Service call that switches the TV off. A Samsung TV with its remote gets the single key
 * KEY_POWER: on the 2015 models (encrypted protocol, e.g. UE50J6200) HA's `turn_off` sends
 * KEY_POWEROFF then KEY_POWER and the TV stays on, while KEY_POWER alone switches it off
 * (tried on 2026-10-27, REP-20261026-006). It is sent only while the TV is on, where the key
 * switches off on the newer models too.
 */
export function tvPowerOffCall(
  view: TvView,
  mediaPlayerId: string,
  remoteId: string
): { domain: string; service: string; data: Record<string, unknown> } {
  if (remoteId && view.entity?.attributes?.platform === 'samsungtv') {
    return {
      domain: 'remote',
      service: 'send_command',
      data: { entity_id: remoteId, command: 'KEY_POWER' },
    };
  }
  return { domain: 'media_player', service: 'turn_off', data: { entity_id: mediaPlayerId } };
}

/** Target of the play/pause button on the widget: Android follows the playing display entity. */
export function widgetPlayTarget(kind: TvKind, view: TvView, mediaPlayerId: string): string {
  if (kind === 'apple') return view.linkedActive ? view.displayId : mediaPlayerId;
  return view.isPlaying ? view.displayId : mediaPlayerId;
}

/** Target of a details command: media_* actions go to the linked player when it is shown. */
export function detailsTarget(action: string, view: TvView, mediaPlayerId: string): string {
  return action.includes('media') && view.displayId !== mediaPlayerId
    ? view.displayId
    : mediaPlayerId;
}
