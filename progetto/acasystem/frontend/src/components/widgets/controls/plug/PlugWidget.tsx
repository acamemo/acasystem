import { Body, Caption, Icon } from '@/components/primitives';
import type { WidgetProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { WidgetContent, WidgetLoading } from '../shared/WidgetContent';
import { PlugOutputControl } from './PlugOutputControl';
import { plugBinding, plugOutputs, plugSummary } from './plugModel';
import './plug.css';

export function PlugWidget({
  id,
  settings,
  settingsKey: _settingsKey,
  size,
  editMode,
  entityId = id,
  openDetails,
}: WidgetProps & {
  entityId?: string;
  openDetails?: () => void;
}) {
  const runtime = useWidgetRuntime();
  const target =
    typeof settings.bindingEntityId === 'string' && settings.bindingEntityId.trim()
      ? settings.bindingEntityId
      : entityId;
  const binding = plugBinding(settings, target),
    ids = plugOutputs(settings, target);
  const name =
    runtime.customNames[id] ||
    (binding && typeof settings.name === 'string' ? settings.name : '') ||
    String(runtime.entities[target]?.attributes.friendly_name || 'Presa o interruttore');
  const summary = plugSummary(ids, runtime.entities);
  const powerIds =
    binding?.secondaryEntityIds.filter(
      (targetId) =>
        !binding.technicalEntityIds?.includes(targetId) &&
        runtime.entities[targetId]?.attributes.device_class === 'power'
    ) ?? [];
  const power = powerIds.length === 1 ? runtime.entities[powerIds[0]!] : undefined;
  const powerAvailable = Boolean(
    power &&
    !['unknown', 'unavailable', ''].includes(power.state) &&
    Number.isFinite(Number(power.state))
  );
  if (!runtime.entitiesLoaded) return <WidgetLoading size={size} />;
  return (
    <article
      className="product-plug"
      data-widget-type="plug"
      data-entity-id={target}
      data-single={ids.length <= 1 || undefined}
      aria-label={name}
    >
      <WidgetContent
        name={name}
        size={size}
        editMode={editMode}
        onOpen={openDetails ?? (() => runtime.openDetails(id))}
      >
        <div className="product-plug__identity">
          <Icon name="power" size="md" />
          <Body as="span" size="sm" className="ctl-name ctl-clamp-2">
            {name}
          </Body>
        </div>
        {ids.length <= 1 ? (
          <PlugOutputControl
            key={ids[0] ?? target}
            entityId={ids[0] ?? target}
            label={name}
            disabled={editMode}
            compact
          />
        ) : (
          <div className="product-plug__summary">
            <Body size="sm">
              {summary.active} di {summary.total} uscite attive
            </Body>
            {summary.unavailable > 0 && <Caption>{summary.unavailable} non disponibili</Caption>}
          </div>
        )}
        {power && (
          <Caption className="product-plug__power">
            {powerAvailable
              ? `Potenza · ${power.state}${typeof power.attributes.unit_of_measurement === 'string' ? ` ${power.attributes.unit_of_measurement}` : ''}`
              : 'Potenza non disponibile'}
          </Caption>
        )}
      </WidgetContent>
    </article>
  );
}
