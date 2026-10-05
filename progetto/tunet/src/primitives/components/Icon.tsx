import {
  AddLinear,
  Edit2Linear,
  Setting2Linear,
  Element3Linear,
  UserSquareLinear,
  ArrowDownLinear,
  ColorSwatchLinear,
  TextLinear,
  DriverLinear,
  TickSquareLinear,
  type IconProps as MxIconProps,
} from 'mx-icons';

const icons = {
  add: AddLinear,
  edit: Edit2Linear,
  settings: Setting2Linear,
  grid: Element3Linear,
  profile: UserSquareLinear,
  chevronDown: ArrowDownLinear,
  appearance: ColorSwatchLinear,
  text: TextLinear,
  server: DriverLinear,
  done: TickSquareLinear,
};

export type IconProps = MxIconProps & { name: keyof typeof icons };

export function Icon({ name, color = 'currentColor', ...props }: IconProps) {
  const SvgIcon = icons[name];
  return <SvgIcon color={color} aria-hidden="true" focusable="false" {...props} />;
}
