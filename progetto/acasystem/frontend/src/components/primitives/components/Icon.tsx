import {
  AddLinear,
  Edit2Linear,
  Setting2Linear,
  Element3Linear,
  UserSquareLinear,
  ArrowDownLinear,
  ArrowUp1Linear,
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
  ArrowRight1Linear,
  ArrowLeft1Linear,
  HeartBold,
  BagLinear,
  NotificationLinear,
  TextalignLeftLinear,
  FingerScanLinear,
  Send2Linear,
  CoffeeLinear,
  WalletLinear,
  ActivityLinear,
  Warning2Linear,
  InfoCircleLinear,
  LockLinear,
  UnlockLinear,
  ShieldTickLinear,
  CalendarLinear,
  TaskSquareLinear,
  Sun1Linear,
  CloudLinear,
  CloudSunnyLinear,
  CarLinear,
  FlashLinear,
  MonitorLinear,
  VideoLinear,
  PlayLinear,
  PauseLinear,
  StopLinear,
  NextLinear,
  PreviousLinear,
  VolumeHighLinear,
  VolumeMuteLinear,
  RepeatLinear,
  WifiLinear,
  HouseLinear,
  BroomLinear,
  TreeLinear,
  LampLinear,
  DropLinear,
  SpeedometerLinear,
  ClockLinear,
  KeyLinear,
  Maximize4Linear,
  ArrangeSquareLinear,
  MinusLinear,
  TickCircleLinear,
  CloseCircleLinear,
  type IconProps as MxIconProps,
} from 'mx-icons';
import type { ComponentType } from 'react';
import { BlindsGlyph, FanGlyph, PowerGlyph, ThermometerGlyph } from './glyphs';

const icons = {
  add: AddLinear,
  edit: Edit2Linear,
  settings: Setting2Linear,
  grid: Element3Linear,
  profile: UserSquareLinear,
  chevronDown: ArrowDownLinear,
  /* ArrowUp1 is the mirror of ArrowDown (same chevron); plain ArrowUp has a shaft. */
  chevronUp: ArrowUp1Linear,
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
  chevronRight: ArrowRight1Linear,
  chevronLeft: ArrowLeft1Linear,
  heart: HeartBold,
  bag: BagLinear,
  bell: NotificationLinear,
  menu: TextalignLeftLinear,
  fingerprint: FingerScanLinear,
  share: Send2Linear,
  coffee: CoffeeLinear,
  wallet: WalletLinear,
  activity: ActivityLinear,
  warning: Warning2Linear,
  info: InfoCircleLinear,
  // Devices and domains (wave 3: replaces the local maps of the widget groups).
  lamp: LampLinear,
  power: PowerGlyph,
  thermostat: ThermometerGlyph,
  fan: FanGlyph,
  blinds: BlindsGlyph,
  lock: LockLinear,
  unlock: UnlockLinear,
  shield: ShieldTickLinear,
  calendar: CalendarLinear,
  task: TaskSquareLinear,
  sun: Sun1Linear,
  cloud: CloudLinear,
  weather: CloudSunnyLinear,
  humidity: DropLinear,
  car: CarLinear,
  energy: FlashLinear,
  tv: MonitorLinear,
  camera: VideoLinear,
  room: HouseLinear,
  vacuum: BroomLinear,
  mower: TreeLinear,
  wifi: WifiLinear,
  speed: SpeedometerLinear,
  clock: ClockLinear,
  key: KeyLinear,
  // Media and generic commands.
  play: PlayLinear,
  pause: PauseLinear,
  stop: StopLinear,
  next: NextLinear,
  previous: PreviousLinear,
  volume: VolumeHighLinear,
  mute: VolumeMuteLinear,
  repeat: RepeatLinear,
  minus: MinusLinear,
  ok: TickCircleLinear,
  failed: CloseCircleLinear,
  // Launcher edit mode.
  resize: Maximize4Linear,
  move: ArrangeSquareLinear,
} satisfies Record<string, ComponentType<MxIconProps>>;

export type IconName = keyof typeof icons;

/** Names of every icon of the kit (useful for pickers and for validating saved values). */
export const iconNames = Object.keys(icons) as IconName[];

/** True when the value is the name of an icon of the kit. */
export function isIconName(value: unknown): value is IconName {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(icons, value);
}

/** Sizes in em, so the icon follows the text next to it: sm 1em, md 1.25em, lg 1.5em. */
export type IconSize = 'sm' | 'md' | 'lg';

const iconSizes: ReadonlySet<unknown> = new Set<IconSize>(['sm', 'md', 'lg']);

export type IconProps = Omit<MxIconProps, 'size'> & {
  name: IconName;
  /** A step of the scale, or pixels / any CSS length as before. */
  size?: IconSize | number | (string & {});
};

export function Icon({ name, color = 'currentColor', size, className, ...props }: IconProps) {
  const SvgIcon = icons[name];
  if (iconSizes.has(size)) {
    const classes = ['aca-icon', `aca-icon--${size}`, className].filter(Boolean).join(' ');
    return (
      <SvgIcon color={color} aria-hidden="true" focusable="false" className={classes} {...props} />
    );
  }
  return (
    <SvgIcon
      color={color}
      aria-hidden="true"
      focusable="false"
      size={size}
      className={className}
      {...props}
    />
  );
}
