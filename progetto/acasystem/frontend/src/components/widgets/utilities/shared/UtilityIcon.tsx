import {
  BatteryChargingLinear,
  BatteryEmpty1Linear,
  ChartLinear,
  ElectricityLinear,
  EyeLinear,
  LocationLinear,
  MapLinear,
  RadarLinear,
  TimerLinear,
  ToggleOnLinear,
  TrendDownLinear,
  TrendUpLinear,
  type IconProps as MxIconProps,
} from 'mx-icons';
import type { ComponentType } from 'react';
import { Icon, iconNames, isIconName, type IconName, type IconSize } from '@/components/primitives';

/**
 * Glyphs of the utility widgets that the Icon primitive has no equivalent for. Every other
 * name is a kit icon and is drawn by the primitive. Each import here exists at runtime in
 * mx-icons 1.1.2 (checked by UtilityMatchers.test.tsx).
 */
const extraIcons = {
  batteryCharging: BatteryChargingLinear,
  batteryLow: BatteryEmpty1Linear,
  chart: ChartLinear,
  location: LocationLinear,
  map: MapLinear,
  motion: RadarLinear,
  plug: ElectricityLinear,
  sensor: EyeLinear,
  switch: ToggleOnLinear,
  timer: TimerLinear,
  trendDown: TrendDownLinear,
  trendUp: TrendUpLinear,
} satisfies Record<string, ComponentType<MxIconProps>>;

export type UtilityExtraIconName = keyof typeof extraIcons;

/** A kit icon (Icon primitive) or one of the few extra glyphs of the utility widgets. */
export type UtilityIconName = IconName | UtilityExtraIconName;

/** The extra glyphs, for the test that checks each one exists at runtime. */
export const UTILITY_EXTRA_ICON_NAMES = Object.keys(extraIcons) as UtilityExtraIconName[];

/** Every name UtilityIcon accepts. */
export const UTILITY_ICON_NAMES: UtilityIconName[] = [...iconNames, ...UTILITY_EXTRA_ICON_NAMES];

export type UtilityIconProps = Omit<MxIconProps, 'size'> & {
  name: UtilityIconName;
  size?: IconSize;
};

const toneColor = {
  active: 'var(--aca-orange-ink-icon)',
  info: 'var(--aca-blue-ink-icon)',
  danger: 'var(--aca-danger-ink-icon)',
} as const;

export type UtilityIconTone = keyof typeof toneColor;

/** Decorative icon in em sizes: the kit's Icon, or an extra glyph with the same classes. */
export function UtilityIcon({
  name,
  size = 'md',
  color = 'currentColor',
  className,
  ...props
}: UtilityIconProps) {
  if (isIconName(name)) {
    return <Icon name={name} size={size} color={color} className={className} {...props} />;
  }
  const SvgIcon = extraIcons[name];
  return (
    <SvgIcon
      color={color}
      aria-hidden="true"
      focusable="false"
      className={['aca-icon', `aca-icon--${size}`, className].filter(Boolean).join(' ')}
      {...props}
    />
  );
}

/** Icon colour of a tone: the ≥ 3:1 icon inks on metal, or the current text colour. */
export function iconTone(tone: UtilityIconTone | null | undefined): string {
  return tone ? toneColor[tone] : 'currentColor';
}
