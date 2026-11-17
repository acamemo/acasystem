import type { HassEntity, EntityMap } from '@/@types/ha';
import type { ServiceCatalog } from '../../adaptive/operationalProfile';
import { MEDIA_FEATURE } from '../../media/model/features';
import type { CardSettings } from '@/@types/dashboard';
import { multimediaProductBinding } from '@/utils/devices/productBinding';
export function mediaProductBinding(settings: CardSettings) {
  const binding = multimediaProductBinding(settings);
  return binding && (binding.family === 'media' || binding.family === 'sonos') ? binding : null;
}

export function mediaNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null);
export const mediaOptions = (value: unknown): string[] =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter((item): item is string => typeof item === 'string' && !!item.trim())
        ),
      ]
    : [];
export function productMediaView(entity: HassEntity | undefined) {
  const attributes = entity?.attributes ?? {},
    state = entity?.state ?? '';
  const labels: Record<string, string> = {
    off: 'Spento',
    on: 'Acceso',
    idle: 'Inattivo',
    playing: 'In riproduzione',
    paused: 'In pausa',
    buffering: 'Caricamento',
    standby: 'In attesa',
  };
  const features =
    typeof attributes.supported_features === 'number' &&
    Number.isSafeInteger(attributes.supported_features) &&
    attributes.supported_features >= 0
      ? attributes.supported_features
      : 0;
  const number = (key: string) => mediaNumber(attributes[key]);
  const volume = number('volume_level'),
    duration = number('media_duration'),
    position = number('media_position');
  return {
    state,
    available: Object.hasOwn(labels, state),
    stateLabel: Object.hasOwn(labels, state) ? labels[state]! : 'Non disponibile',
    features,
    has: (mask: number) => (features & mask) === mask,
    volume: volume !== null && volume >= 0 && volume <= 1 ? volume : null,
    muted: typeof attributes.is_volume_muted === 'boolean' ? attributes.is_volume_muted : null,
    shuffle: typeof attributes.shuffle === 'boolean' ? attributes.shuffle : null,
    repeat: ['off', 'one', 'all'].includes(String(attributes.repeat))
      ? String(attributes.repeat)
      : null,
    duration: duration !== null && duration > 0 ? duration : null,
    position: position !== null && position >= 0 ? position : null,
    source: text(attributes.source),
    sources: mediaOptions(attributes.source_list),
    sound: text(attributes.sound_mode),
    sounds: mediaOptions(attributes.sound_mode_list),
    title: text(attributes.media_title),
    artist: text(attributes.media_artist) || text(attributes.media_album_artist),
    group: mediaOptions(attributes.group_members),
  };
}
export type ProductMediaView = ReturnType<typeof productMediaView>;
export function mediaLabel(id: string, ids: readonly string[], entities: EntityMap) {
  const name = String(entities[id]?.attributes.friendly_name || id);
  return ids.filter((other) => String(entities[other]?.attributes.friendly_name || other) === name)
    .length > 1
    ? `${name} (${id})`
    : name;
}
const serviceFeatures: Record<string, number> = {
  media_play: MEDIA_FEATURE.PLAY,
  media_pause: MEDIA_FEATURE.PAUSE,
  media_stop: MEDIA_FEATURE.STOP,
  media_previous_track: MEDIA_FEATURE.PREVIOUS_TRACK,
  media_next_track: MEDIA_FEATURE.NEXT_TRACK,
  turn_on: MEDIA_FEATURE.TURN_ON,
  turn_off: MEDIA_FEATURE.TURN_OFF,
  volume_set: MEDIA_FEATURE.VOLUME_SET,
  volume_up: MEDIA_FEATURE.VOLUME_STEP,
  volume_down: MEDIA_FEATURE.VOLUME_STEP,
  volume_mute: MEDIA_FEATURE.VOLUME_MUTE,
  media_seek: MEDIA_FEATURE.SEEK,
  shuffle_set: MEDIA_FEATURE.SHUFFLE_SET,
  repeat_set: MEDIA_FEATURE.REPEAT_SET,
  select_source: MEDIA_FEATURE.SELECT_SOURCE,
  select_sound_mode: MEDIA_FEATURE.SELECT_SOUND_MODE,
  play_media: MEDIA_FEATURE.PLAY_MEDIA,
};
export function mediaServiceSupported(
  view: ProductMediaView,
  services: ServiceCatalog | null,
  service: string
) {
  return (
    Object.hasOwn(serviceFeatures, service) &&
    view.has(serviceFeatures[service]!) &&
    Object.hasOwn(services?.media_player ?? {}, service)
  );
}
export function mediaActionAllowed(
  view: ProductMediaView,
  services: ServiceCatalog | null,
  service: string
) {
  if (!view.available || !mediaServiceSupported(view, services, service)) return false;
  if (service === 'turn_on') return view.state === 'off' || view.state === 'standby';
  if (view.state === 'off') return false;
  if (service === 'turn_off') return true;
  return true;
}
