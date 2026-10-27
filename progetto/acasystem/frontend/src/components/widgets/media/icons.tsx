import {
  ArrowDown2Linear,
  ArrowLeft2Linear,
  ArrowRight2Linear,
  ArrowSwapHorizontalLinear,
  ArrowUp2Linear,
  BackwardLinear,
  ForwardLinear,
  LinkLinear,
  MusicPlaylistLinear,
  RepeateOneLinear,
  ShuffleOutline,
  UndoLinear,
  VideoSlashLinear,
  VolumeCrossLinear,
  VolumeLowLinear,
  type IconProps as MxIconProps,
} from 'mx-icons';
import type { ComponentType } from 'react';
import { Icon, isIconName, type IconName } from '@/components/primitives';

/**
 * Glyphs of the media widgets that the Icon primitive does not have. Every import exists at
 * runtime in mx-icons 1.1.2 (checked with node: the package types declare icons it does not
 * ship). Linear style like the kit; the package has no ShuffleLinear, so shuffle uses the
 * outline variant, the same linear drawing expanded to a fill.
 */
const localIcons = {
  shuffle: ShuffleOutline,
  repeatOne: RepeateOneLinear,
  volumeLow: VolumeLowLinear,
  /** Muted volume knob: the speaker with an X. */
  volumeCross: VolumeCrossLinear,
  playlist: MusicPlaylistLinear,
  /** Pairs with the primitive's `camera` (VideoLinear). */
  cameraOff: VideoSlashLinear,
  link: LinkLinear,
  swap: ArrowSwapHorizontalLinear,
  up: ArrowUp2Linear,
  down: ArrowDown2Linear,
  left: ArrowLeft2Linear,
  right: ArrowRight2Linear,
  back: UndoLinear,
  rewind: BackwardLinear,
  fastForward: ForwardLinear,
} satisfies Record<string, ComponentType<MxIconProps>>;

/** Icons of the kit (play, pause, next, previous, volume, mute, power, tv, camera…) plus the local ones. */
export type MediaIconName = IconName | keyof typeof localIcons;
export type MediaIconTone = 'active' | 'info' | 'danger' | 'muted';

/** Icons need ≥ 3:1 on metal: the -icon inks of the accents (same values as IconText). */
const toneColor: Record<MediaIconTone, string> = {
  active: 'var(--aca-orange-ink-icon)',
  info: 'var(--aca-blue-ink-icon)',
  danger: 'var(--aca-danger-ink-icon)',
  muted: 'var(--aca-ink-muted)',
};

export interface MediaIconProps extends Omit<MxIconProps, 'size' | 'color'> {
  name: MediaIconName;
  /** sm 1em, md 1.25em, lg 1.5em (kit scale); xl 2.5em for placeholders. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: MediaIconTone;
}

/**
 * Icon of the media widgets: the Icon primitive for every name it has (ADR-0005), a local
 * mx-icons glyph otherwise, with the kit sizes, the tones and the xl placeholder size.
 */
export function MediaIcon({ name, size = 'md', tone, className, ...props }: MediaIconProps) {
  const color = tone ? toneColor[tone] : 'currentColor';
  const classes = [
    'aca-icon',
    size === 'xl' ? 'aca-media-icon--xl' : `aca-icon--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');
  if (isIconName(name)) {
    return <Icon name={name} color={color} className={classes} {...props} />;
  }
  const Svg = localIcons[name];
  return <Svg aria-hidden="true" focusable="false" color={color} className={classes} {...props} />;
}
