import type { ComponentType } from 'react';
import {
  ArrowSwapHorizontalLinear,
  ArrowUpLinear,
  CloudFogLinear,
  CommandLinear,
  MagicStarLinear,
  MagicpenLinear,
  RadarLinear,
  RotateLeftLinear,
  RotateRightLinear,
  SliderHorizontalLinear,
  SortLinear,
  ToggleOnLinear,
  UserTickLinear,
  type IconProps as MxIconProps,
} from 'mx-icons';
import { Icon, isIconName, type IconName } from '@/components/primitives';

/**
 * Glyphs of the control widgets that the Icon primitive does not have. Each one was checked
 * to exist at runtime in mx-icons 1.1.2 (its types also declare icons it does not ship); every
 * other name is an icon of the primitive.
 */
const localGlyphs = {
  arrowUp: ArrowUpLinear,
  oscillate: ArrowSwapHorizontalLinear,
  smoke: CloudFogLinear,
  script: CommandLinear,
  select: SortLinear,
  scene: MagicStarLinear,
  automation: MagicpenLinear,
  motion: RadarLinear,
  rotateLeft: RotateLeftLinear,
  rotateRight: RotateRightLinear,
  number: SliderHorizontalLinear,
  toggle: ToggleOnLinear,
  presence: UserTickLinear,
} satisfies Record<string, ComponentType<MxIconProps>>;

type LocalGlyphName = keyof typeof localGlyphs;

/** Names of the local glyphs (tests check that each one renders). */
export const localGlyphNames = Object.keys(localGlyphs) as LocalGlyphName[];

/** A name of the Icon primitive, or one of the few local glyphs above. */
export type ControlIconName = IconName | LocalGlyphName;

const isLocalGlyph = (name: ControlIconName): name is LocalGlyphName =>
  Object.prototype.hasOwnProperty.call(localGlyphs, name);

const steps: ReadonlySet<unknown> = new Set(['sm', 'md', 'lg']);

export type ControlIconProps = Omit<MxIconProps, 'size'> & {
  name: ControlIconName;
  /** Same scale as the Icon primitive: sm 1em, md 1.25em, lg 1.5em, or any CSS length. */
  size?: 'sm' | 'md' | 'lg' | number | (string & {});
};

/** Decorative glyph (aria-hidden); the owner's accessible name carries the meaning. */
export function ControlIcon({
  name,
  color = 'currentColor',
  size = 'md',
  className,
  ...props
}: ControlIconProps) {
  if (!isLocalGlyph(name)) {
    return <Icon name={name} color={color} size={size} className={className} {...props} />;
  }
  const Glyph = localGlyphs[name];
  if (steps.has(size)) {
    return (
      <Glyph
        color={color}
        aria-hidden="true"
        focusable="false"
        className={['aca-icon', `aca-icon--${size}`, className].filter(Boolean).join(' ')}
        {...props}
      />
    );
  }
  return (
    <Glyph
      color={color}
      aria-hidden="true"
      focusable="false"
      size={size}
      className={className}
      {...props}
    />
  );
}

/** Legacy icon names (lucide/mdi) of the most common devices mapped to these glyphs. */
const LEGACY_ALIASES: Readonly<Record<string, ControlIconName>> = {
  lightbulb: 'light',
  lamp: 'lamp',
  lampdesk: 'lamp',
  'floor-lamp': 'lamp',
  fan: 'fan',
  lock: 'lock',
  unlock: 'unlock',
  thermometer: 'thermostat',
  droplet: 'humidity',
  droplets: 'humidity',
  'water-percent': 'humidity',
  zap: 'energy',
  flash: 'energy',
  sun: 'sun',
  'door-open': 'room',
  dooropen: 'room',
  door: 'room',
  'window-closed': 'blinds',
  blinds: 'blinds',
  'window-shutter': 'blinds',
  battery: 'battery',
  activity: 'activity',
  play: 'play',
  power: 'power',
  workflow: 'automation',
  robot: 'automation',
  'motion-sensor': 'motion',
};

/** Glyph for a legacy custom icon, an HA `icon` attribute or a kit icon name, when known. */
export function aliasIcon(name: unknown): ControlIconName | null {
  if (typeof name !== 'string' || !name.trim()) return null;
  const trimmed = name.trim();
  if (isIconName(trimmed)) return trimmed;
  const key = trimmed
    .replace(/^mdi:/, '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
  return LEGACY_ALIASES[key] ?? LEGACY_ALIASES[key.replace(/-/g, '')] ?? null;
}
