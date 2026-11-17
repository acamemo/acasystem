import type { WidgetProps } from '@/@types/launcher';
import { Body, Caption, Icon } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { WidgetContent, WidgetLoading } from '../../controls/shared/WidgetContent';
import { ProductCoverControls } from './ProductCoverControls';
import { coverProductBinding, coverReading, productCoverView } from './productCoverModel';
import './productCover.css';

export function ProductCoverWidget({
  id,
  settings,
  size,
  editMode,
  openDetails,
}: WidgetProps & { openDetails?: () => void }) {
  const runtime = useWidgetRuntime(),
    binding = coverProductBinding(settings);
  const primary = binding?.primaryEntityId ?? '',
    channels = binding?.channelEntityIds ?? [];
  const name =
    runtime.customNames[id] ||
    (typeof settings.name === 'string' && settings.name) ||
    String(runtime.entities[primary]?.attributes.friendly_name || 'Tapparella');
  const view = productCoverView(runtime.entities[primary]);
  const observations = channels.map((entityId) => productCoverView(runtime.entities[entityId]));
  const available = observations.filter((item) => item.available),
    moving = available.filter(
      (item) => item.state === 'opening' || item.state === 'closing'
    ).length;
  const open = available.filter((item) => item.state === 'open').length;
  if (!runtime.entitiesLoaded) return <WidgetLoading size={size} />;
  return (
    <article
      className="product-cover"
      data-widget-type="cover"
      data-entity-id={primary}
      aria-label={name}
    >
      <WidgetContent
        name={name}
        size={size}
        editMode={editMode}
        onOpen={openDetails ?? (() => runtime.openDetails(id))}
      >
        <div className="product-cover__identity">
          <Icon name="blinds" size="sm" />
          <Body as="span" size="sm" className="ctl-name ctl-clamp-2">
            {name}
          </Body>
        </div>
        {channels.length > 1 ? (
          <div className="product-cover__summary">
            <Body size="sm">
              {channels.length} canali · {open} aperti
            </Body>
            {moving > 0 && <Caption>{moving} in movimento</Caption>}
            {available.length < channels.length && (
              <Caption>{channels.length - available.length} non disponibili</Caption>
            )}
          </div>
        ) : (
          <>
            <Caption className="product-cover__observation">
              <span>{view.stateLabel}</span>
              {view.available && view.position !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{coverReading(view.position)}</span>
                </>
              )}
            </Caption>
            <ProductCoverControls
              key={primary}
              entityId={primary}
              label={name}
              disabled={editMode}
              compact
            />
          </>
        )}
      </WidgetContent>
    </article>
  );
}
