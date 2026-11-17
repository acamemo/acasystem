import type { WidgetDetailsProps } from '@/@types/launcher';
import {
  Body,
  Caption,
  ConsoleColumns,
  Disclosure,
  DisclosureGroup,
} from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { AdaptiveCategoryWidget } from '../../adaptive/AdaptiveCategoryWidget';
import { DetailsBody, Section, StatList } from '../../utilities/shared/details';
import { ProductLockControls } from './ProductLockControls';
import { lockLabel, lockProductBinding, productLockView } from './productLockModel';
import './productLock.css';

export function ProductLockDetails({ settings, settingsKey }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime(),
    binding = lockProductBinding(settings);
  const channels = binding?.channelEntityIds ?? [],
    secondary = binding?.secondaryEntityIds ?? [];
  const technical = new Set(binding?.technicalEntityIds ?? []),
    all = [...channels, ...secondary];
  const label = (entityId: string) => lockLabel(entityId, all, runtime.entities);
  const reading = (entityId: string) =>
    ['sensor', 'binary_sensor', 'event', 'update'].includes(entityId.split('.')[0]!);
  const stats = (ids: string[]) =>
    ids.map((entityId) => {
      const entity = runtime.entities[entityId],
        available = !!entity && !['unknown', 'unavailable', ''].includes(entity.state);
      return {
        key: entityId,
        label: label(entityId),
        value: available ? entity!.state : 'Non disponibile',
        unit:
          available && typeof entity?.attributes.unit_of_measurement === 'string'
            ? entity.attributes.unit_of_measurement
            : undefined,
      };
    });
  const channel = (entityId: string) => {
    const view = productLockView(runtime.entities[entityId]),
      name = label(entityId);
    return (
      <Section key={entityId} title={name}>
        <div className="product-lock-channel">
          <Body size="sm">{view.stateLabel}</Body>
          <ProductLockControls key={entityId} entityId={entityId} label={name} />
        </div>
      </Section>
    );
  };
  const extras = (ids: string[]) =>
    ids.map((entityId) =>
      entityId.startsWith('lock.') ? (
        channel(entityId)
      ) : (
        <Section key={entityId} title={label(entityId)}>
          <AdaptiveCategoryWidget
            type="sensor"
            entityId={entityId}
            id={entityId}
            settingsKey={settingsKey}
            settings={{ categoryWidgetType: 'sensor', bindingEntityId: entityId }}
            size={{ w: 4, h: 4 }}
            editMode={false}
            detailsMode
          />
        </Section>
      )
    );
  const measures = secondary.filter((id) => !technical.has(id) && reading(id)),
    other = secondary.filter((id) => !technical.has(id) && !reading(id));
  const technicalIds = all.filter((id) => technical.has(id));
  return (
    <div className="product-lock-details">
      <DetailsBody label="Serrature del dispositivo">
        {channels.length ? channels.map(channel) : <Body>Nessun canale collegato.</Body>}
        {measures.length > 0 && (
          <Section title="Misure">
            <StatList items={stats(measures)} />
          </Section>
        )}
        {other.length > 0 && <Section title="Altre funzioni">{extras(other)}</Section>}
        {binding && (
          <DisclosureGroup>
            <Disclosure id="lock-technical" title="Tecnica e manutenzione">
              <StatList items={stats(technicalIds.filter(reading))} />
              {extras(technicalIds.filter((id) => !reading(id)))}
              <Caption>Dispositivo Home Assistant · {binding.deviceId}</Caption>
            </Disclosure>
          </DisclosureGroup>
        )}
      </DetailsBody>
    </div>
  );
}
export function ProductLockConsole(props: WidgetDetailsProps) {
  return (
    <ConsoleColumns
      main={
        <div className="widget-console-details">
          <ProductLockDetails {...props} />
        </div>
      }
    />
  );
}
