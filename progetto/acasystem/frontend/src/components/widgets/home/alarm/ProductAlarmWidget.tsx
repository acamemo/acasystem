import type { WidgetProps } from '@/@types/launcher';
import { Body, Button, Caption, Icon } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { WidgetContent, WidgetLoading } from '../../controls/shared/WidgetContent';
import { alarmProductBinding, productAlarmView } from './productAlarmModel';
import './productAlarm.css';

export function ProductAlarmWidget({
  id,
  settings,
  size,
  editMode,
  openDetails,
}: WidgetProps & { openDetails?: () => void }) {
  const runtime = useWidgetRuntime(),
    binding = alarmProductBinding(settings);
  const primary = binding?.primaryEntityId ?? '',
    channels = binding?.channelEntityIds ?? [];
  const name =
    runtime.customNames[id] ||
    (typeof settings.name === 'string' && settings.name) ||
    String(runtime.entities[primary]?.attributes.friendly_name || 'Allarme');
  const view = productAlarmView(runtime.entities[primary]),
    observations = channels.map((entityId) => productAlarmView(runtime.entities[entityId]));
  const armed = observations.filter((item) => item.armed).length,
    triggered = observations.filter((item) => item.state === 'triggered').length,
    unavailable = observations.filter((item) => !item.available).length,
    transitional = observations.filter((item) => item.transitional).length;
  const open = openDetails ?? (() => runtime.openDetails(id));
  if (!runtime.entitiesLoaded) return <WidgetLoading size={size} />;
  return (
    <article
      className="product-alarm"
      data-widget-type="alarm"
      data-entity-id={primary}
      aria-label={name}
    >
      <WidgetContent name={name} size={size} editMode={editMode} onOpen={open}>
        <div className="product-alarm__identity">
          <Icon name="shield" size="sm" />
          <Body as="span" size="sm" className="ctl-name ctl-clamp-2">
            {name}
          </Body>
        </div>
        {channels.length > 1 ? (
          <div className="product-alarm__summary">
            <Body size="sm">
              {armed} di {channels.length} canali inseriti
            </Body>
            {triggered > 0 && <Caption tone="danger">{triggered} allarmi scattati</Caption>}
            {transitional > 0 && <Caption>{transitional} in transizione</Caption>}
            {unavailable > 0 && <Caption>{unavailable} non disponibili</Caption>}
          </div>
        ) : (
          <>
            <Caption tone={view.state === 'triggered' ? 'danger' : undefined}>
              {view.stateLabel}
            </Caption>
            <Button
              variant="control"
              size="sm"
              disabled={editMode}
              onClick={open}
              aria-label={`Gestisci ${name}`}
            >
              <Icon name="shield" />
              Gestisci
            </Button>
          </>
        )}
      </WidgetContent>
    </article>
  );
}
