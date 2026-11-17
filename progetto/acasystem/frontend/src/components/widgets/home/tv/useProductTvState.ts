import type { WidgetDetailsProps } from '@/@types/launcher';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { MEDIA_FEATURE, declares } from '../../media/model/features';
import type { TvKind } from '../../media/model/tv';
import { useTvDetailsState } from '../../media/parts/tv/useTvDetailsState';
import { tvPowerSupported } from './productTvModel';

/** Existing adapters and controls, with explicit capability gates for new product widgets. */
export function useProductTvState(kind: TvKind, props: WidgetDetailsProps) {
  const tv = useTvDetailsState(kind, props),
    visible = usePageVisible();
  const entity = tv.view.entity;
  const knownState = Boolean(
    entity &&
    ['on', 'off', 'standby', 'idle', 'playing', 'paused', 'buffering'].includes(entity.state)
  );
  const view =
    knownState || tv.view.wakeable
      ? tv.view
      : {
          ...tv.view,
          isOn: false,
          unavailable: true,
          status: 'unreachable' as const,
          isPlaying: false,
          isPaused: false,
        };
  const powerSupported = tvPowerSupported(
    tv.runtime.entities,
    tv.mediaPlayerId,
    tv.view.isOn,
    tv.config.remoteId,
    tv.view.wakeable
  );
  const interactive = visible && !view.unavailable;
  const volumeSet = declares(entity, MEDIA_FEATURE.VOLUME_SET);
  const volumeStep = declares(entity, MEDIA_FEATURE.VOLUME_STEP);
  const volumeMute = declares(entity, MEDIA_FEATURE.VOLUME_MUTE);
  const remote = tv.runtime.entities[tv.config.remoteId];
  const remoteReady =
    entity?.attributes.platform === 'webostv' ||
    Boolean(remote && !['unknown', 'unavailable', ''].includes(remote.state));
  const run = (key: string, action: string) => {
    if (interactive && tv.view.isOn) tv.run(key, action);
  };
  const nativeChannels = remoteReady && tv.has('channelUp') && tv.has('channelDown');
  const liveChannels =
    kind !== 'apple' &&
    view.liveTv &&
    declares(entity, MEDIA_FEATURE.NEXT_TRACK) &&
    declares(entity, MEDIA_FEATURE.PREVIOUS_TRACK);
  const channelAvailable = tv.channel.available && (nativeChannels || liveChannels);
  return {
    ...tv,
    view,
    statusLine: view.unavailable
      ? entity?.state === 'unknown'
        ? 'Stato sconosciuto'
        : 'Non raggiungibile'
      : tv.statusLine,
    media: {
      ...tv.media,
      caps: {
        ...tv.media.caps,
        playPause: declares(
          tv.view.display,
          tv.view.isPlaying ? MEDIA_FEATURE.PAUSE : MEDIA_FEATURE.PLAY
        ),
      },
    },
    powerSupported,
    interactive,
    channel: {
      ...tv.channel,
      available: channelAvailable,
      step: (direction: 1 | -1) => {
        if (channelAvailable && interactive && view.isOn) tv.channel.step(direction);
      },
    },
    hasRemote: tv.hasRemote && remoteReady,
    has: (key: Parameters<typeof tv.has>[0]) => remoteReady && tv.has(key),
    powerWaiting: !tv.view.isOn && !powerSupported,
    togglePower: () => {
      if (interactive && powerSupported) tv.togglePower();
    },
    run,
    sendKey: (key: Parameters<typeof tv.sendKey>[0]) => {
      if (interactive && tv.view.isOn && remoteReady) tv.sendKey(key);
    },
    volume: {
      ...tv.volume,
      mode:
        volumeSet && tv.volume.level !== null
          ? ('level' as const)
          : volumeStep
            ? ('step' as const)
            : null,
      canMute: volumeMute,
      step: (direction: 1 | -1) => {
        if (interactive && tv.view.isOn && volumeStep) tv.volume.step(direction);
      },
      toggleMute: () => {
        if (interactive && tv.view.isOn && volumeMute) tv.volume.toggleMute();
      },
      previewLevel: (level: number) => {
        if (interactive && tv.view.isOn && volumeSet) tv.volume.previewLevel(level);
      },
      commitLevel: (level: number) => {
        if (interactive && tv.view.isOn && volumeSet) tv.volume.commitLevel(level);
      },
    },
  };
}
