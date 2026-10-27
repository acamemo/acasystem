import type { PageKindDefinition, WidgetDefinition } from '@/@types/launcher';
import { CameraDetails, CameraWidget } from './widgets/Camera';
import { CameraConsole } from './widgets/CameraConsole';
import { MediaGroupConsole, MediaPlayerConsole } from './widgets/MediaConsole';
import { MediaGroupDetails, MediaPlayerDetails } from './widgets/MediaDetails';
import { MediaGroupWidget, MediaPlayerWidget } from './widgets/MediaWidgets';
import { AndroidTvConsole, AppleTvConsole } from './widgets/TvConsole';
import { AndroidTvDetails, AppleTvDetails } from './widgets/TvDetails';
import { AndroidTvWidget, AppleTvWidget } from './widgets/TvWidget';
import { MediaKindPage, SonosKindPage } from './views/MediaPage';
import { testi } from './testi';

/**
 * Media group (wave 2, B4): media players, media/Sonos groups, Android TV, Apple TV and cameras,
 * plus the media and Sonos pages. Matchers mirror the legacy CARD_REGISTRY prefixes; icons are
 * names of the Icon primitive. Widgets render content only: the launcher draws the frame.
 */
export const mediaWidgets: WidgetDefinition[] = [
  {
    type: 'mediaPlayer',
    label: testi.lettore,
    icon: 'music',
    sizes: { min: { w: 2, h: 1 }, max: { w: 4, h: 2 }, default: { w: 2, h: 2 } },
    matches: (id) => id.startsWith('media_player.'),
    Widget: MediaPlayerWidget,
    Details: MediaPlayerDetails,
    Console: MediaPlayerConsole,
  },
  {
    type: 'mediaGroup',
    label: testi.gruppo,
    icon: 'speaker',
    sizes: { min: { w: 2, h: 1 }, max: { w: 4, h: 2 }, default: { w: 2, h: 2 } },
    matches: (id) => id.startsWith('media_group_') || id.startsWith('sonos_group_'),
    Widget: MediaGroupWidget,
    Details: MediaGroupDetails,
    Console: MediaGroupConsole,
  },
  {
    type: 'androidTv',
    label: testi.androidTv,
    icon: 'tv',
    sizes: { min: { w: 2, h: 1 }, max: { w: 4, h: 2 }, default: { w: 2, h: 2 } },
    matches: (id) => id.startsWith('androidtv_card_'),
    detailsWithoutLabel: true,
    Widget: AndroidTvWidget,
    Details: AndroidTvDetails,
    Console: AndroidTvConsole,
  },
  {
    type: 'appleTv',
    label: testi.appleTv,
    icon: 'tv',
    sizes: { min: { w: 2, h: 1 }, max: { w: 4, h: 2 }, default: { w: 2, h: 2 } },
    matches: (id) => id.startsWith('appletv_card_'),
    detailsWithoutLabel: true,
    Widget: AppleTvWidget,
    Details: AppleTvDetails,
    Console: AppleTvConsole,
  },
  {
    type: 'camera',
    label: testi.videocamera,
    icon: 'camera',
    sizes: { min: { w: 2, h: 1 }, max: { w: 4, h: 4 }, default: { w: 2, h: 2 } },
    matches: (id) => id.startsWith('camera_card_'),
    Widget: CameraWidget,
    Details: CameraDetails,
    Console: CameraConsole,
  },
];

export const mediaPages: PageKindDefinition[] = [
  { kind: 'media', label: testi.media, Page: MediaKindPage },
  { kind: 'sonos', label: testi.sonos, Page: SonosKindPage },
];
