import type { WidgetProps } from '@/@types/launcher';
import { Body, Caption, Icon } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { WidgetContent, WidgetLoading } from '../../controls/shared/WidgetContent';
import { ProductCameraFeed } from './ProductCameraFeed';
import { cameraProductBinding, productCameraView } from './productCameraModel';
import './productCamera.css';

export function ProductCameraWidget({
  id,
  settingsKey,
  settings,
  size,
  editMode,
  openDetails,
}: WidgetProps & {
  openDetails?: () => void;
}) {
  const runtime = useWidgetRuntime(),
    binding = cameraProductBinding(settings);
  const primary = binding?.primaryEntityId ?? '',
    channels = binding?.channelEntityIds ?? [];
  const name =
    runtime.customNames[id] ||
    (typeof settings.name === 'string' && settings.name) ||
    String(runtime.entities[primary]?.attributes.friendly_name || 'Videocamera');
  const view = productCameraView(runtime.entities[primary]);
  const unavailable = channels.filter(
    (id) => !productCameraView(runtime.entities[id]).available
  ).length;
  if (!runtime.entitiesLoaded) return <WidgetLoading size={size} />;
  return (
    <article
      className="product-camera"
      data-widget-type="camera"
      data-entity-id={primary}
      aria-label={name}
    >
      <WidgetContent
        name={name}
        size={size}
        editMode={editMode}
        onOpen={openDetails ?? (() => runtime.openDetails(id))}
      >
        <div className="product-camera__identity">
          <Icon name="camera" size="sm" />
          <Body as="span" size="sm" className="ctl-name ctl-clamp-2">
            {name}
          </Body>
        </div>
        <Caption>
          {view.stateLabel}
          {channels.length > 1 ? ` · ${channels.length} canali` : ''}
        </Caption>
        <div className="product-camera__preview" aria-hidden="true" inert>
          <ProductCameraFeed
            key={primary}
            entityId={primary}
            label={name}
            settings={settings}
            settingsKey={settingsKey}
            disabled={editMode}
          />
        </div>
        {unavailable > 0 && channels.length > 1 && (
          <Caption>{unavailable} canali non disponibili</Caption>
        )}
      </WidgetContent>
    </article>
  );
}
