import { ProductTvWidget } from '../../home/tv/ProductTvWidget';
import { tvProductBinding } from '../../home/tv/productTvModel';
import { Caption, Display, IconText, Text } from '@/components/primitives';
import { castOnlyBrand, nativeCounterpart, type NativeTvBrand } from '@/utils/devices/tvBrand';
import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap } from '@/@types/ha';
import type { WidgetProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { useCastPowerGuard } from '../hooks/useCastPowerGuard';
import { useTvBrandLogo } from '../hooks/useTvBrandLogo';
import { useTvChannel } from '../hooks/useTvChannel';
import { useTvPower } from '../hooks/useTvPower';
import { useTvVolume } from '../hooks/useTvVolume';
import { useTvWake } from '../hooks/useTvWake';
import { readString, resolveImage, stringList } from '../model/entity';
import {
  pairedRemoteId,
  resolveTv,
  tvCover,
  tvPowerOffCall,
  tvStatusLine,
  tvStatusOf,
  type TvKind,
} from '../model/tv';
import { testi } from '../testi';
import { Artwork } from '../parts/Artwork';
import {
  TvFace,
  TvHeadContent,
  TvPowerKey,
  TvVolumeKey,
  tvKeyWaiting,
} from '../parts/tv/TvFace';
import { TvLinkHint } from '../parts/tv/TvLinkHint';
import {
  OpenButton,
  WidgetLoading,
  WidgetMessage,
  WidgetShell,
  missingDevice,
} from '../parts/WidgetShell';

export interface TvConfig {
  mediaPlayerId: string;
  remoteId: string;
  linkedMediaPlayers: string[];
  /** Apple TV `tapAction: toggle`: a tap on the widget switches the TV on or off. */
  tapToggle: boolean;
  /**
   * The brand of a TV that is bound to its Google Cast player with no native one of the same TV
   * in Home Assistant: power there only starts the Cast app, so it is not sent (null otherwise).
   */
  castBrand: NativeTvBrand | null;
}

/**
 * Widget settings of a TV. Without a configured remote, the remote HA created with the TV (same
 * object id: `media_player.x` → `remote.x`, as samsungtv and androidtv_remote do) is used, so a
 * Samsung added by hand still switches off with KEY_POWER and shows its remote (2026-10-27).
 *
 * A widget bound to the Cast player of a branded TV (an LG that HA added through Google Cast)
 * uses the native player of the same TV (webostv...) as soon as there is one: state, power and
 * remote. It is resolved here at every render, not saved in the settings of the widget.
 */
export const readTvConfig = (settings: CardSettings, entities?: EntityMap): TvConfig => {
  const configured = readString(settings.mediaPlayerId);
  const native = entities ? nativeCounterpart(configured, entities) : null;
  const mediaPlayerId = native ?? configured;
  return {
    mediaPlayerId,
    remoteId: readString(settings.remoteId) || pairedRemoteId(mediaPlayerId, entities),
    linkedMediaPlayers: stringList(settings.linkedMediaPlayers),
    tapToggle: settings.tapAction === 'toggle',
    castBrand: native ? null : castOnlyBrand(entities?.[configured]),
  };
};

/**
 * Android TV (`androidtv_card_*`) and Apple TV (`appletv_card_*`) widgets: device, app and title,
 * and the basic keys, always on the tile also while the TV is off: power, the single volume knob
 * (tap mutes, vertical drag sets the volume; when the TV declares volume or mute) and, on two
 * rows, the channel key (tap or drag up: next channel, drag down: previous; when the TV can
 * change channel). Off or unavailable, volume and channel keep a «waiting» look and are inert; a TV
 * that cannot be switched on over the network keeps the power key and a tap says how to turn it on.
 * For Apple TV, the optional tap-to-toggle.
 */
function LegacyTvWidget({ kind, id, settings, size, editMode }: WidgetProps & { kind: TvKind }) {
  const runtime = useWidgetRuntime();
  const config = readTvConfig(settings, runtime.entities);
  // An LG webOS TV that is off reports `unavailable`: «Spento» when it can be woken.
  const canWake = useTvWake(runtime.entities[config.mediaPlayerId]);
  const view = resolveTv(
    kind,
    runtime.entities,
    id,
    config.mediaPlayerId,
    config.linkedMediaPlayers,
    runtime.customNames,
    { canWake }
  );
  const power = useTvPower(view.isOn);
  const volume = useTvVolume(kind, view, config.mediaPlayerId, Boolean(config.remoteId));
  const channel = useTvChannel(kind, view, config.remoteId);
  const castGuard = useCastPowerGuard(config.castBrand);
  const brandLogo = useTvBrandLogo(view);

  if (!runtime.entitiesLoaded)
    return <WidgetLoading size={size} label={testi.caricamentoLettore} />;
  if (!config.mediaPlayerId || !view.entity) {
    return (
      <WidgetMessage size={size} editMode={editMode} {...missingDevice(config.mediaPlayerId)} />
    );
  }

  const openDetails = () => runtime.openDetails(id);
  const togglePower = () => {
    if (editMode || view.unavailable) return;
    if (castGuard.block()) return;
    const off = tvPowerOffCall(view, config.mediaPlayerId, config.remoteId);
    power.request(!power.confirmed, () =>
      power.confirmed
        ? runtime.callService(off.domain, off.service, off.data)
        : runtime.callService('media_player', 'turn_on', { entity_id: config.mediaPlayerId })
    );
  };
  const tapToggle = kind === 'apple' && config.tapToggle;
  const compact = size.h <= 1;
  const picture = resolveImage(view.picture, runtime.getEntityImageUrl);
  const logo = resolveImage(view.logo, runtime.getEntityImageUrl);
  const status = tvStatusOf(view);
  const app = !view.isOn ? status : view.place;
  // A command that failed, or that the TV never confirmed, replaces the status until it changes.
  const notice =
    power.timedOut ??
    (power.error || volume.failed || channel.failed ? testi.comandoNonRiuscito : '');
  const failed = notice !== '';
  // The one-row card shows the state word beside the title unless the status cue already does.
  const caption = [view.isOn && size.w < 3 ? status : '', view.title].filter(Boolean).join(' · ');

  const info = (
    <>
      <OpenButton
        editMode={editMode}
        onOpen={openDetails}
        stretch={!tapToggle}
        className="aca-media-grow aca-media-text"
      >
        <Caption>{view.deviceName}</Caption>{' '}
        {compact ? (
          <Text className="aca-type aca-type--heading-sm" tone="ink">
            {app}
          </Text>
        ) : (
          <Display as="span" size="sm">
            {app}
          </Display>
        )}{' '}
        {failed ? (
          <Caption tone="danger">{notice}</Caption>
        ) : (
          caption && <Caption tone="ink">{caption}</Caption>
        )}
      </OpenButton>
      <span className="sr-only" role="status">
        {notice}
      </span>
    </>
  );

  const statusCue = (
    <IconText
      icon={view.isOn ? 'activity' : 'info'}
      iconTone={view.isOn ? 'active' : undefined}
      iconSize="sm"
      tone={view.unavailable ? 'danger' : 'muted'}
    >
      {power.pending ? testi.inAttesa : status}
    </IconText>
  );

  // One row: small keys. Two rows: three keys of the same size, larger on wide tiles.
  const bigKeys = !compact && size.w >= 3;
  const keySize = compact ? 'md' : bigKeys ? 'xl' : 'lg';
  const face = { kind, view, power, volume, channel, togglePower };
  const hint = tvKeyWaiting(face) && !editMode ? testi.tvAccensioneDaRete : '';

  const cover = tvCover(picture, logo, brandLogo);
  let content;
  if (castGuard.shown) {
    content = <TvLinkHint guard={castGuard} />;
  } else if (compact) {
    content = (
      <>
        <Artwork
          src={cover.src}
          icon="tv"
          fit={cover.fit}
          variant="compact"
          className="aca-media-show-13"
        />
        {info}
        {size.w >= 3 && statusCue}
        <TvVolumeKey tv={face} size={keySize} editMode={editMode} />
        <TvPowerKey tv={face} size={keySize} editMode={editMode} />
      </>
    );
  } else {
    // Two rows: TV icon and name, a small status line (failure, hint, «Spento», or the app and
    // title), then the three keys; the space is shared evenly in both directions.
    const statusLine = failed ? notice : tvStatusLine(view);
    content = (
      <>
        <TvFace
          tv={face}
          size={keySize}
          statusLine={statusLine}
          failed={failed}
          editMode={editMode}
          head={
            <OpenButton
              editMode={editMode}
              onOpen={openDetails}
              stretch={!tapToggle}
              className="aca-media-remote__head"
            >
              <TvHeadContent
                view={view}
                failed={failed}
                statusLine={statusLine}
                showName
                hint={hint}
              />
            </OpenButton>
          }
        />
        <span className="sr-only" role="status">
          {notice}
        </span>
      </>
    );
  }

  return (
    <WidgetShell
      size={size}
      editMode={editMode}
      className={!view.isOn ? 'aca-media-widget--off' : undefined}
      onBackgroundTap={tapToggle ? togglePower : undefined}
      label={view.deviceName}
    >
      {content}
    </WidgetShell>
  );
}

export function TvWidget({ kind, ...props }: WidgetProps & { kind: TvKind }) {
  if (tvProductBinding(props.settings)) return <ProductTvWidget {...props} kind={kind} />;
  return <LegacyTvWidget kind={kind} {...props} />;
}

export const AndroidTvWidget = (props: WidgetProps) => <TvWidget kind="android" {...props} />;
export const AppleTvWidget = (props: WidgetProps) => <TvWidget kind="apple" {...props} />;
