import type { WidgetProps } from '@/@types/launcher';
import { Body, Caption } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { sensorProductBinding } from '@/utils/devices/productBinding';
import { ControlIcon } from '../../controls/shared/ControlIcon';
import { WidgetContent, WidgetLoading } from '../../controls/shared/WidgetContent';
import { productSensorView, sensorBattery, sensorEntityName } from './productSensorModel';
import './productSensor.css';

export function ProductSensorWidget({
  openDetails,
  ...props
}: WidgetProps & { openDetails?: () => void }) {
  const runtime = useWidgetRuntime(),
    binding = sensorProductBinding(props.settings);
  if (!runtime.entitiesLoaded) return <WidgetLoading size={props.size} />;
  if (!binding) return null;
  const name =
    runtime.customNames[props.id] ||
    (typeof props.settings.name === 'string' && props.settings.name) ||
    sensorEntityName(binding.primaryEntityId, runtime.entities);
  const channels = binding.channelEntityIds,
    battery = sensorBattery([...channels, ...binding.secondaryEntityIds], runtime.entities);
  const visible = [
    binding.primaryEntityId,
    ...channels.filter((id) => id !== binding.primaryEntityId),
  ].slice(0, 2);
  const summary = [
    channels.length > visible.length ? `Altre ${channels.length - visible.length} misure` : '',
    battery && !visible.includes(battery.entityId) ? `Batteria ${battery.value}%` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const primary = productSensorView(runtime.entities[binding.primaryEntityId]);
  return (
    <article
      className="product-sensor"
      data-widget-type="sensor"
      data-entity-id={binding.primaryEntityId}
      aria-label={name}
    >
      <WidgetContent
        name={name}
        size={props.size}
        editMode={props.editMode}
        onOpen={openDetails ?? (() => runtime.openDetails(props.id))}
      >
        <div className="product-sensor__identity">
          <ControlIcon name={primary.icon} size="sm" />
          <Body as="span" size="sm" className="ctl-name ctl-clamp-2" title={name}>
            {name}
          </Body>
        </div>
        <dl className="product-sensor__readings">
          {visible.map((id) => {
            const view = productSensorView(runtime.entities[id]),
              label = sensorEntityName(id, runtime.entities);
            return (
              <div key={id} title={`${label}: ${view.value} ${view.unit}`}>
                <dt className={channels.length === 1 ? 'sr-only' : undefined}>
                  <Caption className="ctl-clamp-1">{label}</Caption>
                </dt>
                <dd>
                  <Body size="sm" className="ctl-clamp-2">
                    {view.value}
                    {view.unit && ` ${view.unit}`}
                  </Body>
                </dd>
              </div>
            );
          })}
        </dl>
        {summary && (
          <Caption className="product-sensor__summary ctl-clamp-1" title={summary}>
            {summary}
          </Caption>
        )}
      </WidgetContent>
    </article>
  );
}
