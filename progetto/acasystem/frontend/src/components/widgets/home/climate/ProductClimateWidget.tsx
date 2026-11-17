import type { WidgetProps } from '@/@types/launcher';
import { Body, Caption, Icon } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { WidgetContent, WidgetLoading } from '../../controls/shared/WidgetContent';
import { ProductClimatePower, ProductClimateTargets } from './ProductClimateControls';
import {
  climateActivity,
  climateProductBinding,
  climateReading,
  climateState,
  climateUsesRange,
  productClimateView,
} from './productClimateModel';
import './productClimate.css';

export function ProductClimateWidget({
  id,
  settings,
  size,
  editMode,
  openDetails,
}: WidgetProps & { openDetails?: () => void }) {
  const runtime = useWidgetRuntime(),
    binding = climateProductBinding(settings);
  const target = binding?.primaryEntityId ?? '',
    channels = binding?.channelEntityIds ?? [];
  const name =
    runtime.customNames[id] ||
    (typeof settings.name === 'string' && settings.name) ||
    String(runtime.entities[target]?.attributes.friendly_name || 'Clima');
  const view = productClimateView(runtime.entities[target], runtime.haConfig);
  const observations = channels.map((entityId) =>
    productClimateView(runtime.entities[entityId], runtime.haConfig)
  );
  const active = observations.filter((item) => item.available && item.mode !== 'off').length;
  const unavailable = observations.filter((item) => !item.available).length;
  const range = climateUsesRange(view);
  if (!runtime.entitiesLoaded) return <WidgetLoading size={size} />;
  return (
    <article
      className="product-climate"
      data-widget-type="climate"
      data-entity-id={target}
      aria-label={name}
    >
      <WidgetContent
        name={name}
        size={size}
        editMode={editMode}
        onOpen={openDetails ?? (() => runtime.openDetails(id))}
      >
        <div className="product-climate__identity">
          <Icon name="thermostat" size="sm" />
          <Body as="span" size="sm" className="ctl-name ctl-clamp-2">
            {name}
          </Body>
        </div>
        {channels.length > 1 ? (
          <div className="product-climate__summary">
            <Body size="sm">
              {active} di {channels.length} canali attivi
            </Body>
            {unavailable > 0 && <Caption>{unavailable} non disponibili</Caption>}
          </div>
        ) : (
          <>
            <div className="product-climate__readings">
              <div>
                <Caption>Attuale</Caption>
                <Body size="sm">{climateReading(view.current, view.unit)}</Body>
              </div>
              <div>
                <Caption>Desiderata</Caption>
                <Body size="sm">
                  {range
                    ? `${climateReading(view.low, view.unit)} – ${climateReading(view.high, view.unit)}`
                    : climateReading(view.target, view.unit)}
                </Body>
              </div>
            </div>
            <div className="product-climate__state">
              <Caption>
                {climateState(view)}
                {view.available && (
                  <span className="product-climate__activity"> · {climateActivity(view)}</span>
                )}
              </Caption>
              <ProductClimatePower
                key={`${target}|power`}
                entityId={target}
                label={name}
                disabled={editMode}
              />
            </div>
            <div className="product-climate__commands">
              {!range && (
                <ProductClimateTargets
                  key={`${target}|targets`}
                  entityId={target}
                  label={name}
                  disabled={editMode}
                  compact
                />
              )}
            </div>
          </>
        )}
      </WidgetContent>
    </article>
  );
}
