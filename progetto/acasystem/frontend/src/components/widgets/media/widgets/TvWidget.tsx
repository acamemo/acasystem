import { Button, Caption, Display, IconText, Text } from '@/components/primitives';
import type { CardSettings } from '@/@types/dashboard';
import type { WidgetProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { useConfirmedCommand } from '../hooks/commands';
import { MediaIcon } from '../icons';
import { readString, resolveImage, stringList } from '../model/entity';
import { resolveTv, widgetPlayTarget, type TvKind, type TvView } from '../model/tv';
import { testi } from '../testi';
import { Artwork } from '../parts/Artwork';
import { PowerButton } from '../parts/Controls';
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

export const readTvConfig = (settings: CardSettings): TvConfig => ({
  mediaPlayerId: readString(settings.mediaPlayerId),
  remoteId: readString(settings.remoteId),
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
 * play/pause while on, and for Apple TV the power button and the optional tap-to-toggle.
 */
export function TvWidget({ kind, id, settings, size, editMode }: WidgetProps & { kind: TvKind }) {
  const runtime = useWidgetRuntime();
  const config = readTvConfig(settings);
  const view = resolveTv(
    kind,
    runtime.entities,
    id,
    config.mediaPlayerId,
    config.linkedMediaPlayers,
    runtime.customNames
  );
  const power = useConfirmedCommand(view.isOn, { ignoreWhilePending: true });
  const playing = useConfirmedCommand(view.isPlaying);

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
    const service = power.value ? 'turn_off' : 'turn_on';
    power.request(!power.value, () =>
      runtime.callService('media_player', service, { entity_id: config.mediaPlayerId })
    );
  };
  const togglePlay = () => {
    const target = widgetPlayTarget(kind, view, config.mediaPlayerId);
    playing.request(!playing.value, () =>
      runtime.callService('media_player', 'media_play_pause', { entity_id: target })
    );
  };
  const tapToggle = kind === 'apple' && config.tapToggle;
  const compact = size.h <= 1;
  const picture = resolveImage(view.picture, runtime.getEntityImageUrl);
  const logo = resolveImage(view.logo, runtime.getEntityImageUrl);
  const app = view.appName || (view.isOn ? testi.schermataHome : testi.spento);
  const failed = power.error || playing.error;
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

  const powerButton =
    kind === 'apple' ? (
      <PowerButton
        on={power.value}
        action={power.value ? 'turn_off' : 'turn_on'}
        pending={power.pending}
        disabled={editMode || view.unavailable}
        onClick={togglePower}
      />
    ) : null;

  const playButton =
    view.isOn && !compact ? (
      <Button
        variant="primary"
        shape="circle"
        size="lg"
        aria-label={playing.value ? testi.pausa : testi.riproduci}
        loading={playing.pending}
        disabled={editMode}
        onClick={(event) => {
          event.stopPropagation();
          togglePlay();
        }}
      >
        <MediaIcon name={playing.value ? 'pause' : 'play'} size="md" />
      </Button>
    ) : null;

  const art = picture ?? logo;
  return (
    <WidgetShell
      size={size}
      editMode={editMode}
      onBackgroundTap={tapToggle ? togglePower : undefined}
      label={view.deviceName}
    >
      {compact ? (
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
          {powerButton}
        </>
      ) : (
        <>
          <div className="aca-media-row aca-media-row--between">
            {statusCue}
            {powerButton}
          </div>
          {art ? (
            <Artwork
              src={art}
              icon="tv"
              fit={picture ? 'cover' : 'contain'}
              variant="window"
              className="aca-media-show-10"
            />
          ) : (
            <div className="aca-media-grow" />
          )}
          <div className="aca-media-row">
            {info}
            {playButton}
          </div>
        </>
      )}
    </WidgetShell>
  );
}

export const AndroidTvWidget = (props: WidgetProps) => <TvWidget kind="android" {...props} />;
export const AppleTvWidget = (props: WidgetProps) => <TvWidget kind="apple" {...props} />;
