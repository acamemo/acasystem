import type { WidgetDetailsProps } from '@/@types/launcher';
import { Body, Caption, Disclosure, DisclosureGroup } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { AdaptiveCategoryWidget } from '../../adaptive/AdaptiveCategoryWidget';
import { DetailsBody, Section, StatList } from '../../utilities/shared/details';
import {
  ProductClimateChoices,
  ProductClimatePower,
  ProductClimateTargets,
} from './ProductClimateControls';
import {
  climateActivity,
  climateLabel,
  climateProductBinding,
  climateReading,
  climateState,
  productClimateView,
} from './productClimateModel';
import './productClimate.css';

export function ProductClimateDetails({ settings, settingsKey }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime(),
    binding = climateProductBinding(settings);
  const channels = binding?.channelEntityIds ?? [],
    secondary = binding?.secondaryEntityIds ?? [];
  const technical = new Set(binding?.technicalEntityIds ?? []),
    all = [...channels, ...secondary];
  const label = (entityId: string) => climateLabel(entityId, all, runtime.entities);
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
    const view = productClimateView(runtime.entities[entityId], runtime.haConfig),
      name = label(entityId);
    return (
      <Section key={entityId} title={name}>
        <div className="product-climate-channel">
          <div className="product-climate-channel__head">
            <Body size="sm">{climateState(view)}</Body>
            <ProductClimatePower key={`${entityId}|power`} entityId={entityId} label={name} />
          </div>
          <StatList
            items={[
              {
                key: 'current',
                label: 'Temperatura attuale',
                value: climateReading(view.current, view.unit),
              },
              { key: 'action', label: 'Attività osservata', value: climateActivity(view) },
              ...(view.currentHumidity !== null
                ? [
                    {
                      key: 'humidity',
                      label: 'Umidità attuale',
                      value: climateReading(view.currentHumidity, '%'),
                    },
                  ]
                : []),
            ]}
          />
          <ProductClimateTargets key={`${entityId}|targets`} entityId={entityId} label={name} />
          <ProductClimateChoices entityId={entityId} label={name} view={view} />
        </div>
      </Section>
    );
  };
  const controls = (ids: string[]) =>
    ids.map((entityId) =>
      entityId.startsWith('climate.') ? (
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
  const measures = secondary.filter((id) => !technical.has(id) && reading(id));
  const extras = secondary.filter((id) => !technical.has(id) && !reading(id));
  const technicalIds = all.filter((id) => technical.has(id));
  return (
    <div className="product-climate-details">
      <DetailsBody label="Clima del dispositivo">
        {channels.length ? channels.map(channel) : <Body>Nessun canale collegato.</Body>}
        {measures.length > 0 && (
          <Section title="Misure">
            <StatList items={stats(measures)} />
          </Section>
        )}
        {extras.length > 0 && <Section title="Altre funzioni">{controls(extras)}</Section>}
        {binding && (
          <DisclosureGroup>
            <Disclosure id="climate-technical" title="Tecnica e manutenzione">
              <StatList items={stats(technicalIds.filter(reading))} />
              {controls(technicalIds.filter((id) => !reading(id)))}
              <Caption>Dispositivo Home Assistant · {binding.deviceId}</Caption>
            </Disclosure>
          </DisclosureGroup>
        )}
      </DetailsBody>
    </div>
  );
}
