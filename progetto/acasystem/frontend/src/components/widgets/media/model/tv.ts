/**
 * Android TV and Apple TV cards: which entity provides the metadata (a linked player that is
 * playing wins), power state, app name and logo. Same rules as GenericAndroidTVCard/Modal and
 * GenericAppleTVCard/Modal.
 */
import type { EntityMap } from '@/@types/ha';
import { getMediaLogoUrl } from '@/utils/mediaLogos';
import { getMediaPlayerPowerAction } from '@/utils/mediaPlayerFeatures';
import { testi } from '../testi';
import { attrString, isUnavailable, type Entity } from './entity';
import { MEDIA_FEATURE } from './features';

export type TvKind = 'android' | 'apple';

/** The `remote.*` entity with the same object id as the TV's media player, when HA has one. */
export function pairedRemoteId(mediaPlayerId: string, entities?: EntityMap): string {
  if (!entities || !mediaPlayerId.startsWith('media_player.')) return '';
  const remoteId = `remote.${mediaPlayerId.slice('media_player.'.length)}`;
  return entities[remoteId] ? remoteId : '';
}

/**
 * What the TV is doing, in one word for the card, the details and the console. `unreachable` is
 * the only fault: an off TV, a TV in standby or an LG that sleeps is not one.
 */
export type TvStatus = 'playing' | 'paused' | 'buffering' | 'on' | 'off' | 'standby' | 'unreachable';

export interface TvView {
  entity: Entity | undefined;
  displayId: string;
  display: Entity | undefined;
  /** A linked player (Emby, Jellyfin…) is playing, paused or buffering. */
  linkedActive: boolean;
  /** Home Assistant cannot reach the TV and there is no way to wake it (a real fault). */
  unavailable: boolean;
  /**
   * An LG webOS TV that is off, which Home Assistant reports as `unavailable`, and that can be
   * woken from the network: it counts as off, not as a fault.
   */
  wakeable: boolean;
  isOn: boolean;
  status: TvStatus;
  isPlaying: boolean;
  isPaused: boolean;
  deviceName: string;
  appName: string;
  /** The TV shows its own channels (source «Live TV»/«TV», or a `channel` content type). */
  liveTv: boolean;
  /** Where the TV is, for a line of text: the app, «TV in diretta», the source or the home screen. */
  place: string;
  /** Previous/next are channel keys: live TV, and always a Samsung TV (KEY_CHUP/KEY_CHDOWN). */
  channelSkip: boolean;
  title: string;
  /** Raw entity_picture of the display entity. */
  picture: unknown;
  logo: string | null;
  sources: string[];
  muted: boolean;
}

const LINKED_ACTIVE_STATES = new Set(['playing', 'paused', 'buffering']);

/**
 * The only platform whose off TV Home Assistant reports as `unavailable` (webOS docs): with a way
 * to wake it, `unavailable` means «Spento». Other platforms report `off`.
 */
const SLEEPS_AS_UNAVAILABLE = 'webostv';

/**
 * Integrations whose Home Assistant brand logo is the integration's (Android TV, Google Cast), not
 * the maker's: for these the maker of the device, when known, is tried first.
 */
const GENERIC_BRAND_PLATFORMS = new Set(['androidtv_remote', 'androidtv', 'cast']);

/**
 * The brand domains to ask for the logo of a TV. HA brand logos are per domain: the integration
 * (`webostv`, `samsungtv`, `apple_tv`) for a branded integration; for a generic one the logo of
 * the maker (`Sony` -> `sony`, from the device `manufacturer`) comes first and the integration's
 * is the fallback. An empty string is «none»: a TV with no `platform` has no logo.
 */
export function tvBrandDomains(entity: Entity | undefined): { maker: string; platform: string } {
  const platform = attrString(entity, 'platform').trim().toLowerCase();
  if (!platform) return { maker: '', platform: '' };
  const maker = GENERIC_BRAND_PLATFORMS.has(platform)
    ? (/[a-z0-9]+/.exec(attrString(entity, 'manufacturer').toLowerCase())?.[0] ?? '')
    : '';
  return { maker, platform };
}

/**
 * The image of the TV cover: the media picture, then the logo of the app, then the logo of the
 * brand of the TV; null leaves the TV icon. Pictures fill the well, logos are contained.
 */
export function tvCover(
  picture: string | null,
  appLogo: string | null,
  brandLogo: string | null
): { src: string | null; fit: 'cover' | 'contain' } {
  return { src: picture ?? appLogo ?? brandLogo, fit: picture ? 'cover' : 'contain' };
}

/** The entity could be an LG webOS TV that is off: `unavailable` and of the webOS platform. */
export const tvMaybeAsleep = (entity: Entity | undefined): boolean =>
  isUnavailable(entity) && entity?.attributes?.platform === SLEEPS_AS_UNAVAILABLE;

export interface ResolveTvOptions {
  /**
   * The TV can be switched on from the network (see `useTvWake`); only used for webOS. `null`
   * while it is still being checked: the TV is shown as asleep until Home Assistant says no.
   */
  canWake?: boolean | null;
}

export function resolveTv(
  kind: TvKind,
  entities: EntityMap,
  cardId: string,
  mediaPlayerId: string,
  linkedMediaPlayers: readonly string[],
  customNames: Record<string, string>,
  { canWake = false }: ResolveTvOptions = {}
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
  const noAnswer = isUnavailable(entity);
  const wakeable = noAnswer && canWake !== false && tvMaybeAsleep(entity);
  const unavailable = noAnswer && !wakeable;
  // `standby` is deprecated in Home Assistant: off for every kind of TV.
  const isOn = !noAnswer && state !== 'off' && state !== 'standby';
  const shownState = display?.state ?? '';
  const status: TvStatus = unavailable
    ? 'unreachable'
    : wakeable || state === 'off'
      ? 'off'
      : state === 'standby'
        ? 'standby'
        : shownState === 'playing' || shownState === 'paused' || shownState === 'buffering'
          ? shownState
          : 'on';

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

  const source = attrString(display, 'source');
  const liveTv =
    /^(live tv|tv)$/i.test(source.trim()) || attrString(display, 'media_content_type') === 'channel';
  const place = appName || (liveTv ? testi.tvInDiretta : source || testi.schermataHome);
  const channelSkip = liveTv || entity?.attributes?.platform === 'samsungtv';
  const fallbackName = kind === 'apple' ? 'Apple TV' : 'Android TV';
  const sourceList = entity?.attributes?.source_list;
  return {
    entity,
    displayId,
    display,
    linkedActive,
    unavailable,
    wakeable,
    isOn,
    status,
    isPlaying: display?.state === 'playing',
    isPaused: display?.state === 'paused',
    deviceName:
      customNames[cardId] ||
      customNames[mediaPlayerId] ||
      attrString(entity, 'friendly_name') ||
      fallbackName,
    appName,
    liveTv,
    place,
    channelSkip,
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
  return kind === 'apple' || view.wakeable || getMediaPlayerPowerAction(view.entity) !== null;
}

const STATUS_WORDS: Record<TvStatus, string> = {
  playing: testi.inRiproduzione,
  paused: testi.inPausa,
  buffering: testi.caricamento,
  on: testi.acceso,
  off: testi.spento,
  standby: testi.inStandby,
  unreachable: testi.nonRaggiungibile,
};

/**
 * The word for a raw state of a TV entity (the adaptive card has no `TvView`): the same words
 * as `tvStatusOf`, null for a state that has none (`unavailable` is a fault, not a state).
 */
export function tvStateWord(state: string): string | null {
  if (state === 'idle') return STATUS_WORDS.on;
  if (state === 'unreachable' || !Object.hasOwn(STATUS_WORDS, state)) return null;
  return STATUS_WORDS[state as TvStatus];
}

/**
 * The state of the TV in words, the same on the card, the details and the console. Pending
 * requests do not change it: only what Home Assistant reports does.
 */
export const tvStatusOf = (view: TvView): string => STATUS_WORDS[view.status];

/**
 * The status line of the card and the details: the state in words, then (while the TV is on)
 * the app and the title. An off TV, a TV in standby and an unreachable one show only the word.
 */
export function tvStatusLine(view: TvView): string {
  const word = tvStatusOf(view);
  if (!view.isOn) return word;
  return [word, view.place, view.title].filter(Boolean).join(' · ');
}

/**
 * The power key is inert because nothing can switch the TV on from here: a TV that is off and
 * declares no turn-on (Samsung on Wi-Fi), or an LG that does not answer and has no power-on
 * recipe. The widget says so instead of leaving a dead key.
 */
export const tvPowerWaiting = (kind: TvKind, view: TvView, on: boolean): boolean =>
  view.unavailable
    ? tvMaybeAsleep(view.entity)
    : !on && !tvCanPower(kind, view);

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

export type TvVolumeMode = 'level' | 'step';

/**
 * How the single volume knob works: `level` when the entity reports a numeric `volume_level` and
 * can set it (LG webOS: the drag sets a percentage), `step` when it only has relative volume
 * (Samsung UE50J6200 declares VOLUME_SET but reports no level; a configured remote or an Apple TV
 * also work in steps), `null` when the TV declares no volume at all.
 */
export function tvVolumeMode(kind: TvKind, view: TvView, hasRemote = false): TvVolumeMode | null {
  if (tvVolumeLevel(view) !== null && declares(view, MEDIA_FEATURE.VOLUME_SET)) return 'level';
  return hasRemote || tvShowsVolume(kind, view) ? 'step' : null;
}

/** `volume_level` of the TV (0–1), or null when the entity does not report one. */
export function tvVolumeLevel(view: TvView): number | null {
  const raw = view.entity?.attributes?.volume_level;
  return typeof raw === 'number' && Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : null;
}

/** The entity reports `is_volume_muted`; otherwise the mute state is only the widget's own. */
export const tvReportsMute = (view: TvView): boolean =>
  typeof view.entity?.attributes?.is_volume_muted === 'boolean';

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

/** Target of a details command: media_* actions go to the linked player when it is shown. */
export function detailsTarget(action: string, view: TvView, mediaPlayerId: string): string {
  return action.includes('media') && view.displayId !== mediaPlayerId
    ? view.displayId
    : mediaPlayerId;
}
