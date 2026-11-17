import { useState } from 'react';
import type { WidgetDetailsProps } from '@/@types/launcher';
import {
  Body,
  Button,
  Caption,
  ConsoleColumns,
  Disclosure,
  DisclosureGroup,
} from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { AdaptiveCategoryWidget } from '../../adaptive/AdaptiveCategoryWidget';
import { DetailsBody, OptionPicker, Section, StatList } from '../../utilities/shared/details';
import { MediaIcon } from '../../media/icons';
import { useNow } from '../../media/hooks/commands';
import { MEDIA_FEATURE } from '../../media/model/features';
import {
  artworkPath,
  detailsSubtitle,
  effectivePosition,
  resolveImage,
} from '../../media/model/entity';
import { Artwork } from '../../media/parts/Artwork';
import {
  PowerButton,
  ProgressView,
  SeekBar,
  Transport,
  VolumeControl,
} from '../../media/parts/Controls';
import { MediaChooser } from '../../media/parts/MediaChooser';
import { mediaLabel, mediaProductBinding, productMediaView } from './productMediaModel';
import { useProductMediaControls } from './useProductMediaControls';
import './productMedia.css';

function MediaChannel({ entityId }: { entityId: string }) {
  const runtime = useWidgetRuntime(),
    visible = usePageVisible(),
    media = useProductMediaControls(entityId);
  const { controls, view } = media,
    entity = runtime.entities[entityId],
    now = useNow(1000, visible && view.state === 'playing');
  const [choosing, setChoosing] = useState(false);
  const position = Math.min(view.duration ?? Infinity, Math.max(0, effectivePosition(entity, now)));
  const browse = view.has(MEDIA_FEATURE.BROWSE_MEDIA) && controls.caps.playMedia;
  const artwork =
    visible && view.available ? resolveImage(artworkPath(entity), runtime.getEntityImageUrl) : null;
  return (
    <div className="product-media-channel">
      <div className="product-media-channel__head">
        <Artwork src={artwork} icon="music" variant="medium" />
        <div className="product-media-channel__track">
          <Body>{view.title || 'Nessun contenuto in riproduzione'}</Body>
          {detailsSubtitle(entity) && <Caption>{detailsSubtitle(entity)}</Caption>}
          <Caption>{view.stateLabel}</Caption>
        </div>
      </div>
      {view.duration !== null &&
        view.position !== null &&
        (controls.caps.seek ? (
          <SeekBar
            controls={controls}
            position={position}
            duration={view.duration}
            now={now}
            disabled={media.blocked || view.state === 'off'}
          />
        ) : (
          <ProgressView position={position} duration={view.duration} />
        ))}
      <div className="product-media-actions">
        <Transport
          controls={controls}
          variant="full"
          disabled={media.blocked || view.state === 'off'}
          onStop={media.stop}
        />
        {controls.powerAction && (
          <PowerButton
            on={view.state !== 'off' && view.state !== 'standby'}
            action={controls.powerAction}
            pending={controls.power.pending}
            disabled={media.blocked}
            onClick={controls.togglePower}
          />
        )}
      </div>
      <VolumeControl controls={controls} disabled={media.blocked || view.state === 'off'} />
      {media.step && !controls.caps.volumeSet && (
        <div className="product-media-actions">
          <Button
            variant="control"
            disabled={media.blocked || view.state === 'off' || media.sending.volume_down}
            onClick={() => media.step?.(-1)}
          >
            <MediaIcon name="volumeLow" />
            Riduci volume
          </Button>
          <Button
            variant="control"
            disabled={media.blocked || view.state === 'off' || media.sending.volume_up}
            onClick={() => media.step?.(1)}
          >
            <MediaIcon name="volume" />
            Aumenta volume
          </Button>
        </div>
      )}
      {media.sourceSupported && view.sources.length > 0 && (
        <OptionPicker
          label="Sorgente"
          value={media.source.value}
          options={view.sources.map((value) => ({ value, label: value }))}
          disabled={media.blocked || view.state === 'off'}
          pending={media.source.pending}
          onSelect={media.setSource}
          isolateEscape
        />
      )}
      {media.soundSupported && view.sounds.length > 0 && (
        <OptionPicker
          label="Modalità audio"
          value={media.sound.value}
          options={view.sounds.map((value) => ({ value, label: value }))}
          disabled={media.blocked || view.state === 'off'}
          pending={media.sound.pending}
          onSelect={media.setSound}
          isolateEscape
        />
      )}
      {browse && (
        <div className="product-media-channel__library">
          <Button
            variant="control"
            disabled={media.blocked || view.state === 'off'}
            aria-expanded={choosing}
            onClick={() => setChoosing((value) => !value)}
          >
            <MediaIcon name="playlist" />
            Scegli contenuto
          </Button>
          {choosing && !media.blocked && view.state !== 'off' && (
            <MediaChooser key={entityId} entityId={entityId} open={visible && choosing} />
          )}
        </div>
      )}
      <Caption role="status">{media.feedback}</Caption>
      {view.group.length > 1 && (
        <Section title="Gruppo audio">
          <Body size="sm">
            {view.group
              .map((id) => String(runtime.entities[id]?.attributes.friendly_name || id))
              .join(' · ')}
          </Body>
        </Section>
      )}
    </div>
  );
}

export function ProductMediaDetails({ settings, settingsKey }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime(),
    binding = mediaProductBinding(settings);
  const channels = binding?.channelEntityIds ?? [],
    secondary = binding?.secondaryEntityIds ?? [],
    technical = new Set(binding?.technicalEntityIds ?? []);
  const [selected, setSelected] = useState(binding?.primaryEntityId ?? ''),
    active = channels.includes(selected) ? selected : (channels[0] ?? '');
  const label = (id: string) => mediaLabel(id, [...channels, ...secondary], runtime.entities);
  const reading = (id: string) =>
    ['sensor', 'binary_sensor', 'event', 'update', 'media_player', 'remote'].includes(
      id.split('.')[0]!
    );
  const stats = (ids: string[]) =>
    ids.map((id) => {
      const entity = runtime.entities[id],
        available = entity && !['unknown', 'unavailable', ''].includes(entity.state);
      return {
        key: id,
        label: label(id),
        value: id.startsWith('media_player.')
          ? productMediaView(entity).stateLabel
          : available
            ? entity!.state
            : 'Non disponibile',
        unit:
          available && typeof entity?.attributes.unit_of_measurement === 'string'
            ? entity.attributes.unit_of_measurement
            : undefined,
      };
    });
  const extra = (ids: string[]) =>
    ids.map((id) => (
      <Section key={id} title={label(id)}>
        <AdaptiveCategoryWidget
          type="sensor"
          entityId={id}
          id={id}
          settingsKey={settingsKey}
          settings={{ categoryWidgetType: 'sensor', bindingEntityId: id }}
          size={{ w: 4, h: 4 }}
          editMode={false}
          detailsMode
        />
      </Section>
    ));
  return (
    <div className="product-media-details">
      <DetailsBody label="Lettori del dispositivo">
        {channels.length > 1 && (
          <OptionPicker
            label="Canale"
            value={active}
            options={channels.map((id) => ({ value: id, label: label(id) }))}
            onSelect={(id) => {
              if (channels.includes(id)) setSelected(id);
            }}
            isolateEscape
          />
        )}
        {active ? (
          <Section title={label(active)}>
            <MediaChannel key={active} entityId={active} />
          </Section>
        ) : (
          <Body>Nessun lettore collegato.</Body>
        )}
        {secondary.some((id) => !technical.has(id) && reading(id)) && (
          <Section title="Misure e informazioni">
            <StatList items={stats(secondary.filter((id) => !technical.has(id) && reading(id)))} />
          </Section>
        )}
        {extra(secondary.filter((id) => !technical.has(id) && !reading(id)))}
        {binding && (
          <DisclosureGroup>
            <Disclosure id="media-technical" title="Tecnica e manutenzione">
              <StatList items={stats(secondary.filter((id) => technical.has(id) && reading(id)))} />
              {extra(secondary.filter((id) => technical.has(id) && !reading(id)))}
              <Caption>Dispositivo Home Assistant · {binding.deviceId}</Caption>
            </Disclosure>
          </DisclosureGroup>
        )}
      </DetailsBody>
    </div>
  );
}
export function ProductMediaConsole(props: WidgetDetailsProps) {
  return (
    <ConsoleColumns
      main={
        <div className="widget-console-details">
          <ProductMediaDetails {...props} />
        </div>
      }
    />
  );
}
