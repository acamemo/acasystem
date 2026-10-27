import { Caption, Display, IconText, Text } from '@/components/primitives';
import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap } from '@/@types/ha';
import type { WidgetProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { useConfirmedCommand } from '../hooks/commands';
import { useTvChannel } from '../hooks/useTvChannel';
import { useTvVolume } from '../hooks/useTvVolume';
import { readString, resolveImage, stringList } from '../model/entity';
import { pairedRemoteId, resolveTv, tvPowerOffCall, type TvKind, type TvView } from '../model/tv';
import { testi } from '../testi';
import { Artwork } from '../parts/Artwork';
import { TvFace, TvHeadContent, TvPowerKey, TvVolumeKey } from '../parts/tv/TvFace';
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
}

/**
 * Widget settings of a TV. Without a configured remote, the remote HA created with the TV (same
 * object id: `media_player.x` → `remote.x`, as samsungtv and androidtv_remote do) is used, so a
 * Samsung added by hand still switches off with KEY_POWER and shows its remote (2026-10-27).
 */
export const readTvConfig = (settings: CardSettings, entities?: EntityMap): TvConfig => ({
  mediaPlayerId: readString(settings.mediaPlayerId),
  remoteId:
    readString(settings.remoteId) || pairedRemoteId(readString(settings.mediaPlayerId), entities),
  linkedMediaPlayers: stringList(settings.linkedMediaPlayers),
  tapToggle: settings.tapAction === 'toggle',
});

export function tvStatus(view: TvView): string {
  if (view.unavailable) return testi.nonDisponibile;
  if (!view.isOn) return testi.spento;
  return view.isPlaying ? testi.inRiproduzione : testi.acceso;
}

/**
 * Android TV (`androidtv_card_*`) and Apple TV (`appletv_card_*`) widgets: device, app and title,
 * and the basic keys, always on the tile also while the TV is off: power, the single volume knob
 * (tap mutes, vertical drag sets the volume; when the TV declares volume or mute) and, on two
 * rows, the channel key (tap or drag up: next channel, drag down: previous; when the TV can
 * change channel). Off or unavailable, volume and channel keep a «waiting» look and are inert; a TV
 * that cannot be switched on over the network keeps the power key and a tap says how to turn it on.
 * For Apple TV, the optional tap-to-toggle.
 */
export function TvWidget({ kind, id, settings, size, editMode }: WidgetProps & { kind: TvKind }) {
  const runtime = useWidgetRuntime();
  const config = readTvConfig(settings, runtime.entities);
  const view = resolveTv(
    kind,
    runtime.entities,
    id,
    config.mediaPlayerId,
    config.linkedMediaPlayers,
    runtime.customNames
  );
  const power = useConfirmedCommand(view.isOn, { ignoreWhilePending: true });
  const volume = useTvVolume(kind, view, config.mediaPlayerId, Boolean(config.remoteId));
  const channel = useTvChannel(kind, view, config.remoteId);

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
    const off = tvPowerOffCall(view, config.mediaPlayerId, config.remoteId);
    power.request(!power.value, () =>
      power.value
        ? runtime.callService(off.domain, off.service, off.data)
        : runtime.callService('media_player', 'turn_on', { entity_id: config.mediaPlayerId })
    );
  };
  const tapToggle = kind === 'apple' && config.tapToggle;
  const compact = size.h <= 1;
  const picture = resolveImage(view.picture, runtime.getEntityImageUrl);
  const logo = resolveImage(view.logo, runtime.getEntityImageUrl);
  const app = !view.isOn ? testi.spento : view.appName || testi.schermataHome;
  const failed = power.error || volume.failed || channel.failed;
  const status = tvStatus(view);

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
          <Caption tone="danger">{testi.comandoNonRiuscito}</Caption>
        ) : (
          view.title && <Caption tone="ink">{view.title}</Caption>
        )}
      </OpenButton>
      <span className="sr-only" role="status">
        {failed ? testi.comandoNonRiuscito : ''}
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

  const art = picture ?? logo;
  let content;
  if (compact) {
    content = (
      <>
        <Artwork
          src={art}
          icon="tv"
          fit={picture ? 'cover' : 'contain'}
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
    const statusLine = failed
      ? testi.comandoNonRiuscito
      : view.unavailable
        ? status
        : [app, view.isOn ? view.title : ''].filter(Boolean).join(' · ');
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
              <TvHeadContent view={view} failed={failed} statusLine={statusLine} showName />
            </OpenButton>
          }
        />
        <span className="sr-only" role="status">
          {failed ? testi.comandoNonRiuscito : ''}
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

export const AndroidTvWidget = (props: WidgetProps) => <TvWidget kind="android" {...props} />;
export const AppleTvWidget = (props: WidgetProps) => <TvWidget kind="apple" {...props} />;
