/**
 * Apps of the TV details: which apps can be opened and with which Home Assistant call. Pure, so
 * the rules are tested without rendering.
 *
 * - LG webOS, Apple TV and the Samsung models that list them: the apps are in `source_list`
 *   (next to the inputs, for LG and Samsung) and open with `media_player.select_source`.
 * - Android TV remote (`androidtv_remote`): no list; the common apps open with the deep links
 *   of the integration's documentation (`play_media`, type `url`), which the docs advise over the
 *   package name (home-assistant.io/integrations/androidtv_remote, read 2026-10-27).
 */
import type { TvKind, TvView } from './tv';
import { tvShowsApps } from './tv';
import type { TvKeyCall } from './tvRemote';

export interface TvApp {
  name: string;
  call: TvKeyCall;
}

/** Inputs and tuners of `source_list` (HDMI 1, TV, Live TV, AV…): everything else is an app. */
const INPUT =
  /^(tv|live ?tv|hdmi|av|component|composite|scart|usb|dvi|pc|vga|rgb|antenna|cable|displayport)\b/i;

export const isTvInput = (source: string): boolean => INPUT.test(source.trim());

/** Deep links listed by the Android TV Remote documentation. */
export const ANDROID_TV_APPS: readonly { name: string; link: string }[] = [
  { name: 'Netflix', link: 'netflix://' },
  { name: 'Prime Video', link: 'https://app.primevideo.com' },
  { name: 'YouTube', link: 'https://www.youtube.com' },
  { name: 'Disney+', link: 'https://www.disneyplus.com' },
  { name: 'Plex', link: 'plex://' },
  { name: 'Twitch', link: 'twitch://home' },
];

const platformOf = (view: TvView): unknown => view.entity?.attributes?.platform;

/** The apps the TV can open, in the order of the TV's list (or of the documentation). */
export function tvApps(kind: TvKind, view: TvView, mediaPlayerId: string): TvApp[] {
  if (tvShowsApps(kind, view)) {
    return view.sources
      .filter((source) => kind === 'apple' || !isTvInput(source))
      .map((source) => ({
        name: source,
        call: {
          domain: 'media_player',
          service: 'select_source',
          data: { entity_id: mediaPlayerId, source },
        },
      }));
  }
  if (platformOf(view) !== 'androidtv_remote') return [];
  return ANDROID_TV_APPS.map(({ name, link }) => ({
    name,
    call: {
      domain: 'media_player',
      service: 'play_media',
      data: { entity_id: mediaPlayerId, media_content_type: 'url', media_content_id: link },
    },
  }));
}

/** The inputs of the list (HDMI, TV…): a separate choice from the apps. Apple TV has none. */
export function tvInputs(kind: TvKind, view: TvView): string[] {
  if (kind === 'apple' || !tvShowsApps(kind, view)) return [];
  return view.sources.filter(isTvInput);
}
