/**
 * Icons of the comfort widgets (climate, weather, calendar, to-do, alarm).
 *
 * Names that the Icon primitive exposes are drawn by the primitive (same names, same glyphs).
 * Only the glyphs the kit does not have yet stay here (weather conditions, alarm modes, trash,
 * backspace), with the same contract: aria-hidden, em sizes, accent inks.
 */
import type { ComponentType } from 'react';
import {
  ArrowLeftLinear,
  CloudDrizzleLinear,
  CloudFogLinear,
  CloudLightningLinear,
  CloudSnowLinear,
  LogoutLinear,
  MoonLinear,
  ShieldCrossLinear,
  ShieldSecurityLinear,
  SunLinear,
  TrashLinear,
  WindLinear,
  type IconProps as MxIconProps,
} from 'mx-icons';
import { Icon, isIconName, type IconName } from '@/components/primitives';

/** Icons of the primitive used by this group. */
const KIT_ICONS = [
  'add',
  'calendar',
  'chevronRight',
  'clock',
  'cloud',
  'fan',
  'home',
  'humidity',
  'minus',
  'ok',
  'power',
  'shield',
  'sun',
  'task',
  'thermostat',
  'unlock',
  'warning',
  'weather',
] as const satisfies readonly IconName[];

/**
 * Glyphs missing from the primitive, as shipped by mx-icons 1.1.2. Its type declarations list
 * more icons than the package exports: every entry here is checked at runtime by
 * ComfortRegistry.test.tsx.
 */
const localIcons = {
  backspace: ArrowLeftLinear,
  cloudFog: CloudFogLinear,
  cloudLightning: CloudLightningLinear,
  cloudRain: CloudDrizzleLinear,
  cloudSnow: CloudSnowLinear,
  // mx-icons ships a snowflake under the name «Sun» and the sun as «Sun1».
  cool: SunLinear,
  logout: LogoutLinear,
  moon: MoonLinear,
  shieldCross: ShieldCrossLinear,
  shieldSecurity: ShieldSecurityLinear,
  trash: TrashLinear,
  wind: WindLinear,
} satisfies Record<string, ComponentType<MxIconProps>>;

type LocalIconName = keyof typeof localIcons;
export type HomeIconName = (typeof KIT_ICONS)[number] | LocalIconName;
export const HOME_ICON_NAMES: HomeIconName[] = [
  ...KIT_ICONS,
  ...(Object.keys(localIcons) as LocalIconName[]),
];
export type HomeIconTone = 'active' | 'info' | 'danger' | 'muted';

/** Icons need ≥ 3:1 on metal: the -icon inks of the accents (as IconText). */
const toneInk: Record<HomeIconTone, string> = {
  active: 'var(--aca-orange-ink-icon)',
  info: 'var(--aca-blue-ink-icon)',
  danger: 'var(--aca-danger-ink-icon)',
  muted: 'var(--aca-ink-muted)',
};

export interface HomeIconProps {
  name: HomeIconName;
  /** sm 1em, md 1.25em, lg 1.5em, as the Icon primitive. */
  size?: 'sm' | 'md' | 'lg';
  tone?: HomeIconTone;
  className?: string;
}

/** Decorative icon: the text next to it carries the meaning. */
export function HomeIcon({ name, size = 'md', tone, className }: HomeIconProps) {
  const color = tone ? toneInk[tone] : 'currentColor';
  if (isIconName(name)) {
    return <Icon name={name} size={size} color={color} className={className} />;
  }
  const Svg = localIcons[name];
  return (
    <Svg
      aria-hidden="true"
      focusable="false"
      color={color}
      className={['aca-icon', `aca-icon--${size}`, className].filter(Boolean).join(' ')}
    />
  );
}
