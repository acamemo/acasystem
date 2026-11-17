import type { WidgetProps } from '@/@types/launcher';
import { Body, Caption, Icon } from '@/components/primitives';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { Artwork } from '../../media/parts/Artwork';
import { artworkPath, resolveImage } from '../../media/model/entity';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { WidgetContent, WidgetLoading } from '../../controls/shared/WidgetContent';
import { PowerButton, Transport } from '../../media/parts/Controls';
import { mediaProductBinding, productMediaView } from './productMediaModel';
import { useProductMediaControls } from './useProductMediaControls';
import './productMedia.css';

function HomeControl({ entityId, disabled }: { entityId: string; disabled: boolean }) {
  const media = useProductMediaControls(entityId, disabled);
  return (
    <div className="product-media__commands">
      {media.controls.powerAction === 'turn_on' &&
      (media.view.state === 'off' || media.view.state === 'standby') ? (
        <PowerButton
          on={false}
          action="turn_on"
          pending={media.controls.power.pending}
          disabled={media.blocked}
          onClick={media.controls.togglePower}
        />
      ) : (
        <Transport
          controls={media.controls}
          variant="play"
          disabled={media.blocked || media.view.state === 'off'}
        />
      )}
      {media.feedback && !media.feedback.startsWith('HA ha accettato') && (
        <Caption role="status">Non confermato</Caption>
      )}
    </div>
  );
}
export function ProductMediaWidget({
  id,
  settings,
  size,
  editMode,
  openDetails,
}: WidgetProps & { openDetails?: () => void }) {
  const runtime = useWidgetRuntime(),
    binding = mediaProductBinding(settings),
    visible = usePageVisible();
  const channels = binding?.channelEntityIds ?? [],
    primary = binding?.primaryEntityId ?? '';
  const name =
    runtime.customNames[id] ||
    (typeof settings.name === 'string' && settings.name) ||
    String(
      runtime.entities[primary]?.attributes.friendly_name ||
        (binding?.family === 'sonos' ? 'Sonos' : 'Lettore multimediale')
    );
  const view = productMediaView(runtime.entities[primary]);
  const showArtwork = channels.length === 1 && size.h >= 3 && visible && view.available;
  const picture = showArtwork
    ? resolveImage(artworkPath(runtime.entities[primary]), runtime.getEntityImageUrl)
    : null;
  if (!runtime.entitiesLoaded) return <WidgetLoading size={size} />;
  return (
    <article
      className="product-media"
      data-widget-type={binding?.family ?? 'media'}
      data-entity-id={primary}
      aria-label={name}
    >
      <WidgetContent
        name={name}
        size={size}
        editMode={editMode}
        onOpen={openDetails ?? (() => runtime.openDetails(id))}
      >
        <div className="product-media__identity">
          <Icon name={binding?.family === 'sonos' ? 'speaker' : 'music'} size="sm" />
          <Body as="span" size="sm" className="ctl-name ctl-clamp-2">
            {name}
          </Body>
        </div>
        {channels.length > 1 ? (
          <div className="product-media__summary">
            <Body size="sm">
              {channels.filter((channel) => runtime.entities[channel]?.state === 'playing').length}{' '}
              di {channels.length} canali in riproduzione
            </Body>
            <Caption>
              {
                channels.filter((channel) => !productMediaView(runtime.entities[channel]).available)
                  .length
              }{' '}
              non disponibili
            </Caption>
          </div>
        ) : (
          <>
            {showArtwork && (
              <Artwork
                src={picture}
                icon={binding?.family === 'sonos' ? 'speaker' : 'music'}
                variant={settings.artworkMode === 'cover' ? 'window' : 'small'}
                className="product-media__art"
              />
            )}
            <Caption>{view.stateLabel}</Caption>
            {view.title && (
              <Caption className="product-media__title ctl-clamp-2">{view.title}</Caption>
            )}
            <HomeControl key={primary} entityId={primary} disabled={editMode} />
          </>
        )}
      </WidgetContent>
    </article>
  );
}
