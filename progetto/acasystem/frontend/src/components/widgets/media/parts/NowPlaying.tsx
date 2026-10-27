import type { ReactNode } from 'react';
import { Caption, Heading, Surface } from '@/components/primitives';
import type { MediaIconName } from '../icons';
import type { MediaControls } from '../hooks/useMediaControls';
import { Artwork } from './Artwork';
import { ProgressView, SeekBar, Transport, type TransportProps } from './Controls';

export interface NowPlayingProps {
  /** Cover tile: image URL (null: placeholder glyph), alt text, glyph and fit. */
  cover: { src: string | null; alt?: string; icon: MediaIconName; fit?: 'cover' | 'contain' };
  title: string;
  subtitle?: string;
  /** Small line above the title (the music player names the section there). */
  eyebrow?: ReactNode;
  /** Extra lines under the subtitle (player name, state). */
  meta?: ReactNode;
  /** Seek slider with times; wins over `progress`. */
  seek?: { controls: MediaControls; position: number; duration: number; now: number } | null;
  /** Read-only bar for a player that reports the position without letting you move. */
  progress?: { position: number; duration: number } | null;
  /** Transport keys; null leaves them out. */
  transport?: TransportProps | null;
}

/**
 * «Now Playing» after the reference UI-011: a recessed card with the cover tile, title and
 * subtitle, a thin bar with the times, and the transport keys centred and evenly spaced. Shared
 * by the music player and the TV.
 */
export function NowPlaying({
  cover,
  title,
  subtitle,
  eyebrow,
  meta,
  seek,
  progress,
  transport,
}: NowPlayingProps) {
  return (
    <Surface
      behavior="well"
      shape="card"
      className="aca-media-nowplaying-card"
      contentClassName="aca-media-nowplaying"
    >
      <div className="aca-media-nowplaying__head">
        <Artwork {...cover} variant="medium" />
        <div className="aca-media-text aca-media-grow">
          {eyebrow}
          <Heading level={3} size="md">
            {title}
          </Heading>
          {subtitle && <Caption>{subtitle}</Caption>}
          {meta}
        </div>
      </div>
      {seek ? (
        <SeekBar
          controls={seek.controls}
          position={seek.position}
          duration={seek.duration}
          now={seek.now}
        />
      ) : (
        progress && <ProgressView position={progress.position} duration={progress.duration} />
      )}
      {transport && <Transport {...transport} className="aca-media-nowplaying__keys" />}
    </Surface>
  );
}
