import type { WidgetProps } from '@/@types/launcher';
import { Body, Caption, Icon } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { WidgetContent, WidgetLoading } from '../../controls/shared/WidgetContent';
import { ProductVacuumControls } from './ProductVacuumControls';
import { productVacuumView, vacuumProductBinding } from './productVacuumModel';
import './productVacuum.css';

export function ProductVacuumWidget({
  id,
  settings,
  size,
  editMode,
  openDetails,
}: WidgetProps & { openDetails?: () => void }) {
  const runtime = useWidgetRuntime(),
    binding = vacuumProductBinding(settings);
  const primary = binding?.primaryEntityId ?? '',
    channels = binding?.channelEntityIds ?? [];
  const name =
    runtime.customNames[id] ||
    (typeof settings.name === 'string' && settings.name) ||
    String(runtime.entities[primary]?.attributes.friendly_name || 'Aspirapolvere');
  const view = productVacuumView(runtime.entities[primary]);
  if (!runtime.entitiesLoaded) return <WidgetLoading size={size} />;
  return (
    <article
      className="product-vacuum"
      data-widget-type="vacuum"
      data-entity-id={primary}
      aria-label={name}
    >
      <WidgetContent
        name={name}
        size={size}
        editMode={editMode}
        onOpen={openDetails ?? (() => runtime.openDetails(id))}
      >
        <div className="product-vacuum__identity">
          <Icon name="vacuum" size="sm" />
          <Body as="span" size="sm" className="ctl-name ctl-clamp-2">
            {name}
          </Body>
        </div>
        {channels.length > 1 ? (
          <div className="product-vacuum__summary">
            <Body size="sm">
              {
                channels.filter(
                  (id) => productVacuumView(runtime.entities[id]).state === 'cleaning'
                ).length
              }{' '}
              di {channels.length} canali in pulizia
            </Body>
            <Caption>
              {channels.filter((id) => !productVacuumView(runtime.entities[id]).available).length}{' '}
              non disponibili
            </Caption>
          </div>
        ) : (
          <>
            <Caption>{view.stateLabel}</Caption>
            {view.battery !== null && (
              <Caption>Batteria {new Intl.NumberFormat('it-IT').format(view.battery)}%</Caption>
            )}
            <ProductVacuumControls
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
