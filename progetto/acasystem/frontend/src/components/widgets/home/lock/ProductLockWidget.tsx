import type { WidgetProps } from '@/@types/launcher';
import { Body, Caption, Icon } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { WidgetContent, WidgetLoading } from '../../controls/shared/WidgetContent';
import { ProductLockControls } from './ProductLockControls';
import { lockProductBinding, productLockView } from './productLockModel';
import './productLock.css';

export function ProductLockWidget({
  id,
  settings,
  size,
  editMode,
  openDetails,
}: WidgetProps & { openDetails?: () => void }) {
  const runtime = useWidgetRuntime(),
    binding = lockProductBinding(settings);
  const primary = binding?.primaryEntityId ?? '',
    channels = binding?.channelEntityIds ?? [];
  const name =
    runtime.customNames[id] ||
    (typeof settings.name === 'string' && settings.name) ||
    String(runtime.entities[primary]?.attributes.friendly_name || 'Serratura');
  const view = productLockView(runtime.entities[primary]),
    observations = channels.map((entityId) => productLockView(runtime.entities[entityId]));
  const locked = observations.filter((item) => item.state === 'locked').length,
    unavailable = observations.filter((item) => !item.available).length;
  if (!runtime.entitiesLoaded) return <WidgetLoading size={size} />;
  return (
    <article
      className="product-lock"
      data-widget-type="lock"
      data-entity-id={primary}
      aria-label={name}
    >
      <WidgetContent
        name={name}
        size={size}
        editMode={editMode}
        onOpen={openDetails ?? (() => runtime.openDetails(id))}
      >
        <div className="product-lock__identity">
          <Icon name="lock" size="sm" />
          <Body as="span" size="sm" className="ctl-name ctl-clamp-2">
            {name}
          </Body>
        </div>
        {channels.length > 1 ? (
          <div className="product-lock__summary">
            <Body size="sm">
              {locked} di {channels.length} canali bloccati
            </Body>
            {unavailable > 0 && <Caption>{unavailable} non disponibili</Caption>}
          </div>
        ) : (
          <>
            <Caption>{view.stateLabel}</Caption>
            <ProductLockControls
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
