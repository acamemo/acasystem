import type { WidgetProps } from '@/@types/launcher';
import { Body, Caption, Icon } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { WidgetContent, WidgetLoading } from '../../controls/shared/WidgetContent';
import { ProductMowerControls } from './ProductMowerControls';
import { mowerProductBinding, productMowerView } from './productMowerModel';
import './productMower.css';

export function ProductMowerWidget({
  id,
  settings,
  size,
  editMode,
  openDetails,
}: WidgetProps & { openDetails?: () => void }) {
  const runtime = useWidgetRuntime(),
    binding = mowerProductBinding(settings);
  const primary = binding?.primaryEntityId ?? '',
    channels = binding?.channelEntityIds ?? [];
  const name =
    runtime.customNames[id] ||
    (typeof settings.name === 'string' && settings.name) ||
    String(runtime.entities[primary]?.attributes.friendly_name || 'Tagliaerba');
  const view = productMowerView(runtime.entities[primary]);
  if (!runtime.entitiesLoaded) return <WidgetLoading size={size} />;
  return (
    <article
      className="product-mower"
      data-widget-type="mower"
      data-entity-id={primary}
      aria-label={name}
    >
      <WidgetContent
        name={name}
        size={size}
        editMode={editMode}
        onOpen={openDetails ?? (() => runtime.openDetails(id))}
      >
        <div className="product-mower__identity">
          <Icon name="mower" size="sm" />
          <Body as="span" size="sm" className="ctl-name ctl-clamp-2">
            {name}
          </Body>
        </div>
        {channels.length > 1 ? (
          <div className="product-mower__summary">
            <Body size="sm">
              {
                channels.filter((id) => productMowerView(runtime.entities[id]).state === 'mowing')
                  .length
              }{' '}
              di {channels.length} canali in taglio
            </Body>
            <Caption>
              {channels.filter((id) => !productMowerView(runtime.entities[id]).available).length}{' '}
              non disponibili
            </Caption>
          </div>
        ) : (
          <>
            <Caption tone={view.state === 'error' ? 'danger' : undefined}>
              {view.stateLabel}
            </Caption>
            {view.battery !== null && (
              <Caption>Batteria {new Intl.NumberFormat('it-IT').format(view.battery)}%</Caption>
            )}
            <ProductMowerControls
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
