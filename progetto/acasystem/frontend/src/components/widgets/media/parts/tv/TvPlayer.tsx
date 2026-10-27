import { Heading } from '@/components/primitives';
import { attrNumber, effectivePosition, resolveImage } from '../../model/entity';
import { MEDIA_FEATURE, declares } from '../../model/features';
import { testi } from '../../testi';
import type { TransportProps } from '../Controls';
import { NowPlaying } from '../NowPlaying';
import { RoundKey } from './TvKeys';
import type { TvDetailsState } from './useTvDetailsState';

/**
 * Player, after the «Now Playing» reference (UI-011): a recessed card with the cover tile, title and
 * app, a thin bar with the times, and the transport keys centred and evenly spaced.
 */
export function TvPlayer({ tv }: { tv: TvDetailsState }) {
  const { id, kind, view, media, playing, actions, has, runtime } = tv;
  const picture = resolveImage(view.picture, runtime.getEntityImageUrl);
  const logo = resolveImage(view.logo, runtime.getEntityImageUrl);

  // Playback: the bits are those of the shown player. Stop, seek, shuffle and repeat must be
  // declared; previous, next and play follow the legacy rule (no bits at all: available).
  const caps = media.caps;
  const showPrevious = kind === 'apple' || caps.previous;
  const showNext = kind === 'apple' || caps.next;
  const showPlay = kind === 'apple' || caps.playPause;
  const showStop = declares(view.display, MEDIA_FEATURE.STOP);
  const showShuffle = declares(view.display, MEDIA_FEATURE.SHUFFLE_SET);
  const showRepeat = declares(view.display, MEDIA_FEATURE.REPEAT_SET);
  const duration = attrNumber(view.display, 'media_duration') ?? 0;
  const showSeek =
    declares(view.display, MEDIA_FEATURE.SEEK) &&
    duration > 0 &&
    attrNumber(view.display, 'media_position') !== null;
  // A TV that reports where it is without letting you move: the bar only shows it.
  const showProgress =
    !showSeek && duration > 0 && attrNumber(view.display, 'media_position') !== null;
  // Without a seek bar (the TV does not report the position, e.g. Samsung), rewind and fast
  // forward go through the remote keys of the platform.
  const showSkip = !showSeek && has('rewind') && has('fastForward');
  const showTransport =
    showPrevious || showNext || showPlay || showStop || showShuffle || showRepeat || showSkip;

  // The shared transport, fed with the TV's own commands and gating: the TV decides which keys
  // exist (shuffle, repeat and stop must be declared) and how each one acts.
  const transport: TransportProps = {
    controls: {
      ...media,
      caps: {
        ...media.caps,
        previous: showPrevious,
        next: showNext,
        playPause: showPlay,
        shuffle: showShuffle,
        repeat: showRepeat,
      },
      playing,
      busy: actions.busy,
      previous: () => tv.run('previous', 'media_previous_track'),
      next: () => tv.run('next', 'media_next_track'),
      togglePlay: () => playing.request(!playing.value, () => tv.controlMedia('media_play_pause')),
    },
    variant: 'full',
    playLabel: kind === 'apple' ? testi.playPausa : undefined,
    onStop: showStop ? () => tv.run('stop', 'media_stop') : undefined,
    beforePlay: showSkip && (
      <RoundKey tv={tv} keyName="rewind" label={testi.indietroVeloce} icon="rewind" size="md" />
    ),
    afterPlay: showSkip && (
      <RoundKey
        tv={tv}
        keyName="fastForward"
        label={testi.avantiVeloce}
        icon="fastForward"
        size="md"
      />
    ),
  };

  return (
    <section className="aca-media-section" aria-labelledby={`${id}-riproduzione`}>
      <Heading level={3} size="sm" id={`${id}-riproduzione`}>
        {testi.riproduzione}
      </Heading>
      <NowPlaying
        cover={{
          src: picture ?? logo,
          alt: view.title,
          icon: 'tv',
          fit: picture ? 'cover' : 'contain',
        }}
        title={view.title || testi.nienteInRiproduzione}
        subtitle={view.appName || testi.schermataHome}
        seek={
          showSeek
            ? {
                controls: media,
                position: effectivePosition(view.display, tv.now),
                duration,
                now: tv.now,
              }
            : null
        }
        progress={
          showProgress ? { position: effectivePosition(view.display, tv.now), duration } : null
        }
        transport={showTransport ? transport : null}
      />
    </section>
  );
}
