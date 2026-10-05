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
  CloseSquareLinear,
  SearchNormalLinear,
  HomeLinear,
  MusicLinear,
  SpeakerLinear,
  LampOnLinear,
  BatteryFullLinear,
  RefreshLinear,
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
  close: CloseSquareLinear,
  search: SearchNormalLinear,
  home: HomeLinear,
  music: MusicLinear,
  speaker: SpeakerLinear,
  light: LampOnLinear,
  battery: BatteryFullLinear,
  refresh: RefreshLinear,
};

export type IconProps = MxIconProps & { name: keyof typeof icons };

export function Icon({ name, color = 'currentColor', ...props }: IconProps) {
  const SvgIcon = icons[name];
  return <SvgIcon color={color} aria-hidden="true" focusable="false" {...props} />;
}
