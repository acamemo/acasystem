import type { ReactNode } from 'react';
import { Body, Caption, Text } from '@/components/primitives';
import type { CardSettings } from '@/@types/dashboard';
import type { CellSize } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { useNow } from '../hooks/commands';
import { useMediaControls } from '../hooks/useMediaControls';
import {
  artworkPath,
  attrNumber,
  attrString,
  effectivePosition,
  isChannel,
  isMediaActive,
  isUnavailable,
  resolveImage,
  widgetSubtitle,
} from '../model/entity';
import { isSonosMediaEntity } from '@/utils/mediaEntityClassification';
import { testi } from '../testi';
import { Artwork } from '../parts/Artwork';
import { PowerButton, ProgressView, Transport, VolumeControl } from '../parts/Controls';
import { OpenButton, WidgetShell } from '../parts/WidgetShell';

export interface PlayerViewProps {
  size: CellSize;
  editMode: boolean;
  /** media_player shown and controlled. */
  entityId: string;
  name: string;
  settings: CardSettings;
  /** Player switch of the group widget. */
  extra?: ReactNode;
  /** Group widgets: active when any member is active. */
  activeOverride?: boolean;
  onOpen: () => void;
}

function stateLabel(state: string | undefined): string {
  if (state === 'playing') return testi.inRiproduzione;
  if (state === 'paused') return testi.inPausa;
  if (state === 'off') return testi.spento;
  return testi.acceso;
}

/**
 * Body of the media player and group widgets. Density follows the cells:
 * one row → artwork, text and play/pause (previous/next from three columns);
 * two rows → transport and volume; three or more columns → large artwork and playhead.
 * `artworkMode: cover` (legacy setting) turns the artwork into a window across the widget.
 */
export function PlayerView({
  size,
  editMode,
  entityId,
  name,
  settings,
  extra,
  activeOverride,
  onOpen,
}: PlayerViewProps) {
  const { getEntityImageUrl } = useWidgetRuntime();
  const controls = useMediaControls(entityId);
  const { entity } = controls;
  const playing = entity?.state === 'playing';
  const visible = usePageVisible();
  const now = useNow(playing ? 1000 : 10000, visible);
  const unavailable = isUnavailable(entity);
  const active = !unavailable && (activeOverride ?? isMediaActive(entity, now));
  const compact = size.h <= 1;
  const wide = size.w >= 3;
  const cover = settings.artworkMode === 'cover' && !compact;
  const picture = resolveImage(artworkPath(entity), getEntityImageUrl);
  const isSonos = settings.categoryWidgetType === 'sonos' || isSonosMediaEntity(entity);
  const icon = isChannel(entity) ? 'tv' : isSonos ? 'speaker' : 'music';
  const title =
    attrString(entity, 'media_title') ||
    stateLabel(controls.playing.value ? 'playing' : entity?.state);
  const subtitle = widgetSubtitle(entity);
  const disabled = editMode;

  const openButton = (
    heading: string,
    line?: string,
    headingSize: 'sm' | 'md' = 'md',
    lineClassName?: string
  ) => (
    <>
      <OpenButton editMode={editMode} onOpen={onOpen} className="aca-media-grow aca-media-text">
        <Caption>{name}</Caption>{' '}
        <Text className={`aca-type aca-type--heading-${headingSize}`} tone="ink">
          {heading}
        </Text>{' '}
        {controls.error ? (
          <Caption tone="danger" className={!compact ? 'aca-media-error-caption' : undefined}>
            {testi.comandoNonRiuscito}
          </Caption>
        ) : (
          line && (
            <Caption tone="ink" className={lineClassName}>
              {line}
            </Caption>
          )
        )}
      </OpenButton>
      <span className="sr-only" role="status">
        {controls.error ? testi.comandoNonRiuscito : ''}
      </span>
    </>
  );

  if (!active) {
    const reason = unavailable ? testi.nonDisponibile : testi.nienteInRiproduzione;
    const power = !unavailable && controls.powerAction && (
      <PowerButton
        on={controls.power.value}
        action={controls.powerAction}
        pending={controls.power.pending}
        disabled={disabled}
        onClick={controls.togglePower}
      />
    );
    return (
      <WidgetShell size={size} editMode={editMode} label={name}>
        <div className="aca-media-widget__state">
          <Artwork
            src={null}
            icon={icon}
            variant={compact ? 'compact' : 'small'}
            className="aca-media-show-13"
          />
          <OpenButton editMode={editMode} onOpen={onOpen} className="aca-media-text">
            <Body as="span" size="sm" tone={unavailable ? 'danger' : 'ink'}>
              {reason}
            </Body>{' '}
            <Caption>{name}</Caption>
          </OpenButton>
          {power}
          {extra}
        </div>
      </WidgetShell>
    );
  }

  const position = effectivePosition(entity, now);
  const duration = attrNumber(entity, 'media_duration') ?? 0;

  if (compact) {
    return (
      <WidgetShell size={size} editMode={editMode} label={name}>
        <Artwork
          src={picture}
          icon={icon}
          variant="compact"
          className={wide ? 'aca-media-show-25' : 'aca-media-show-13'}
        />
        {openButton(title, subtitle, 'sm')}
        {extra}
        <Transport
          controls={controls}
          variant={wide ? 'basic' : 'play'}
          showPower={wide}
          disabled={disabled}
          skipClassName="aca-media-show-13"
          powerClassName="aca-media-show-20"
        />
      </WidgetShell>
    );
  }

  if (cover) {
    return (
      <WidgetShell size={size} editMode={editMode} label={name}>
        <Artwork src={picture} icon={icon} variant="window" className="aca-media-show-10" />
        <div className="aca-media-row">
          {openButton(title, subtitle, 'sm')}
          {extra}
        </div>
        <Transport
          controls={controls}
          variant="basic"
          showPower={wide}
          disabled={disabled}
          skipClassName="aca-media-show-10"
          powerClassName="aca-media-show-13"
        />
      </WidgetShell>
    );
  }

  if (wide) {
    return (
      <WidgetShell size={size} editMode={editMode} label={name}>
        <div className="aca-media-row aca-media-row--stretch aca-media-grow">
          <Artwork src={picture} icon={icon} variant="tall" className="aca-media-show-25" />
          <div className="aca-media-grow aca-media-stack">
            <div className="aca-media-row aca-media-row--top">
              {openButton(title, subtitle)}
              {extra}
            </div>
            <ProgressView position={position} duration={duration} />
            <Transport
              controls={controls}
              variant="basic"
              showPower
              disabled={disabled}
              align="start"
              skipClassName="aca-media-show-10"
              powerClassName="aca-media-show-13"
            />
            <div className="aca-media-widget-show-25">
              <VolumeControl controls={controls} disabled={disabled} steps={false} />
            </div>
          </div>
        </div>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell size={size} editMode={editMode} label={name}>
      <div className="aca-media-row aca-media-row--top">
        <Artwork src={picture} icon={icon} variant="medium" className="aca-media-show-10" />
        {openButton(title, subtitle, 'sm', 'aca-media-show-10')}
        {extra}
      </div>
      <div className="aca-media-grow" />
      <Transport
        controls={controls}
        variant="basic"
        showPower
        disabled={disabled}
        skipClassName="aca-media-show-10"
        powerClassName="aca-media-show-13"
      />
      <div className="aca-media-show-13">
        <VolumeControl controls={controls} disabled={disabled} steps={false} />
      </div>
    </WidgetShell>
  );
}
