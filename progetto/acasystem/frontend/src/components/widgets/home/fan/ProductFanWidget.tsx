import type { WidgetProps } from '@/@types/launcher';
import { Body, Caption, Icon } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { WidgetContent, WidgetLoading } from '../../controls/shared/WidgetContent';
import { ProductFanControls } from './ProductFanControls';
import { fanProductBinding, fanReading, productFanView } from './productFanModel';
import './productFan.css';

export function ProductFanWidget({
  id,
  settings,
  size,
  editMode,
  openDetails,
}: WidgetProps & { openDetails?: () => void }) {
  const runtime = useWidgetRuntime(),
    binding = fanProductBinding(settings);
  const primary = binding?.primaryEntityId ?? '',
    channels = binding?.channelEntityIds ?? [];
  const name =
    runtime.customNames[id] ||
    (typeof settings.name === 'string' && settings.name) ||
    String(runtime.entities[primary]?.attributes.friendly_name || 'Ventilatore');
  const view = productFanView(runtime.entities[primary]),
    observations = channels.map((entityId) => productFanView(runtime.entities[entityId]));
  const active = observations.filter((item) => item.available && item.state === 'on').length,
    unavailable = observations.filter((item) => !item.available).length;
  if (!runtime.entitiesLoaded) return <WidgetLoading size={size} />;
  return (
    <article
      className="product-fan"
      data-widget-type="fan"
      data-entity-id={primary}
      aria-label={name}
    >
      <WidgetContent
        name={name}
        size={size}
        editMode={editMode}
        onOpen={openDetails ?? (() => runtime.openDetails(id))}
      >
        <div className="product-fan__identity">
          <Icon name="fan" size="sm" />
          <Body as="span" size="sm" className="ctl-name ctl-clamp-2">
            {name}
          </Body>
        </div>
        {channels.length > 1 ? (
          <div className="product-fan__summary">
            <Body size="sm">
              {active} di {channels.length} canali accesi
            </Body>
            {unavailable > 0 && <Caption>{unavailable} non disponibili</Caption>}
          </div>
        ) : (
          <>
            <Caption className="product-fan__observation">
              <span>{view.stateLabel}</span>
              {view.available && view.percentage !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{fanReading(view.percentage)}</span>
                </>
              )}
            </Caption>
            <ProductFanControls
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
