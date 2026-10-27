/**
 * Remote keys of the TV details: one logical key set, mapped per platform to the Home Assistant
 * service that sends it. Pure, so the mappings are tested without rendering.
 *
 * - Samsung (`samsungtv`): `remote.send_command` with KEY_* names.
 * - LG webOS (`webostv`): no remote entity; `webostv.button` on the media player.
 * - Android TV remote (`androidtv_remote`): `remote.send_command` with Android key names.
 * - Apple TV: `remote.send_command` with the pyatv names; only the arrows and a few keys.
 */
import type { TvKind } from './tv';
import type { Entity } from './entity';
import { MEDIA_FEATURE, declares } from './features';

export type TvDigit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export const TV_DIGITS: readonly TvDigit[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

export type TvColour = 'red' | 'green' | 'yellow' | 'blue';
export type TvNamedKey =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'ok'
  | 'back'
  | 'home'
  | 'menu'
  | 'info'
  | 'guide'
  | 'source'
  | 'exit'
  | 'channelUp'
  | 'channelDown'
  | 'rewind'
  | 'fastForward'
  | TvColour;
export type TvKey = TvNamedKey | `digit${TvDigit}`;

export const digitKey = (digit: TvDigit): TvKey => `digit${digit}`;

export type TvRemoteFlavor = 'samsung' | 'webos' | 'androidtv' | 'apple';

export interface TvKeyCall {
  domain: string;
  service: string;
  data: Record<string, unknown>;
}

type KeyMap = Partial<Record<TvKey, string>>;

const digits = (prefix: string, suffix = ''): KeyMap =>
  Object.fromEntries(TV_DIGITS.map((digit) => [digitKey(digit), `${prefix}${digit}${suffix}`]));

const KEYS: Record<TvRemoteFlavor, KeyMap> = {
  samsung: {
    up: 'KEY_UP',
    down: 'KEY_DOWN',
    left: 'KEY_LEFT',
    right: 'KEY_RIGHT',
    ok: 'KEY_ENTER',
    back: 'KEY_RETURN',
    home: 'KEY_HOME',
    menu: 'KEY_MENU',
    info: 'KEY_INFO',
    guide: 'KEY_GUIDE',
    source: 'KEY_SOURCE',
    exit: 'KEY_EXIT',
    red: 'KEY_RED',
    green: 'KEY_GREEN',
    yellow: 'KEY_YELLOW',
    blue: 'KEY_CYAN',
    channelUp: 'KEY_CHUP',
    channelDown: 'KEY_CHDOWN',
    rewind: 'KEY_REWIND',
    fastForward: 'KEY_FF',
    ...digits('KEY_'),
  },
  webos: {
    up: 'UP',
    down: 'DOWN',
    left: 'LEFT',
    right: 'RIGHT',
    ok: 'ENTER',
    back: 'BACK',
    home: 'HOME',
    menu: 'MENU',
    info: 'INFO',
    exit: 'EXIT',
    red: 'RED',
    green: 'GREEN',
    yellow: 'YELLOW',
    blue: 'BLUE',
    channelUp: 'CHANNELUP',
    channelDown: 'CHANNELDOWN',
    rewind: 'REWIND',
    fastForward: 'FASTFORWARD',
    ...digits(''),
  },
  androidtv: {
    up: 'DPAD_UP',
    down: 'DPAD_DOWN',
    left: 'DPAD_LEFT',
    right: 'DPAD_RIGHT',
    ok: 'DPAD_CENTER',
    back: 'BACK',
    home: 'HOME',
    menu: 'MENU',
    info: 'INFO',
    guide: 'GUIDE',
    source: 'TV_INPUT',
    red: 'PROG_RED',
    green: 'PROG_GREEN',
    yellow: 'PROG_YELLOW',
    blue: 'PROG_BLUE',
    channelUp: 'CHANNEL_UP',
    channelDown: 'CHANNEL_DOWN',
    rewind: 'MEDIA_REWIND',
    fastForward: 'MEDIA_FAST_FORWARD',
    ...digits(''),
  },
  apple: {
    up: 'up',
    down: 'down',
    left: 'left',
    right: 'right',
    ok: 'select',
    back: 'menu',
    home: 'home',
    rewind: 'skip_backward',
    fastForward: 'skip_forward',
  },
};

/** Which key set the entity speaks: by `platform` attribute, otherwise by the widget kind. */
export function tvRemoteFlavor(
  kind: TvKind,
  entity: Pick<Entity, 'attributes'> | undefined
): TvRemoteFlavor {
  const platform = entity?.attributes?.platform;
  if (platform === 'samsungtv') return 'samsung';
  if (platform === 'webostv') return 'webos';
  return kind === 'apple' ? 'apple' : 'androidtv';
}

/** A remote exists when a `remote.*` entity is linked, or the platform needs none (LG webOS). */
export const tvHasRemote = (flavor: TvRemoteFlavor, remoteId: string): boolean =>
  flavor === 'webos' || Boolean(remoteId);

/** The platform has this key (the interface hides the ones it cannot send). */
export const tvHasKey = (flavor: TvRemoteFlavor, key: TvKey): boolean =>
  KEYS[flavor][key] !== undefined;

/**
 * Service call that sends a logical key, or null when the platform has no such key or no way to
 * send it (no remote entity, except LG webOS). Pass the media player entity: LG webOS keys go to
 * it, the other platforms to `remoteId`.
 */
export function tvKeyCall(
  kind: TvKind,
  entity: Pick<Entity, 'entity_id' | 'attributes'> | undefined,
  remoteId: string,
  key: TvKey
): TvKeyCall | null {
  const flavor = tvRemoteFlavor(kind, entity);
  const command = KEYS[flavor][key];
  if (command === undefined) return null;
  if (flavor === 'webos') {
    if (!entity?.entity_id) return null;
    return {
      domain: 'webostv',
      service: 'button',
      data: { entity_id: entity.entity_id, button: command },
    };
  }
  if (!remoteId) return null;
  return { domain: 'remote', service: 'send_command', data: { entity_id: remoteId, command } };
}

/**
 * Call that changes the channel by one: the channel key of the platform (Samsung KEY_CHUP,
 * LG CHANNELUP, Android TV CHANNEL_UP…) or, where it has none, the next/previous track when the
 * entity declares it. Null when the TV has no way to change channel.
 */
export function tvChannelCall(
  kind: TvKind,
  entity: Pick<Entity, 'entity_id' | 'attributes'> | undefined,
  remoteId: string,
  direction: 1 | -1
): TvKeyCall | null {
  const keyed = tvKeyCall(kind, entity, remoteId, direction > 0 ? 'channelUp' : 'channelDown');
  if (keyed) return keyed;
  const bit = direction > 0 ? MEDIA_FEATURE.NEXT_TRACK : MEDIA_FEATURE.PREVIOUS_TRACK;
  if (!entity?.entity_id || !declares(entity, bit)) return null;
  return {
    domain: 'media_player',
    service: direction > 0 ? 'media_next_track' : 'media_previous_track',
    data: { entity_id: entity.entity_id },
  };
}
