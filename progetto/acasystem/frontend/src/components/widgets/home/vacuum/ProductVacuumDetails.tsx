import { useState } from 'react';
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
import { DetailsBody, OptionPicker, Section, StatList } from '../../utilities/shared/details';
import { ProductVacuumControls } from './ProductVacuumControls';
import { ProductVacuumOptions } from './ProductVacuumOptions';
import {
  productVacuumView,
  vacuumLabel,
  vacuumProductBinding,
  VACUUM_READINGS,
} from './productVacuumModel';
import './productVacuum.css';

export function ProductVacuumDetails({ settings, settingsKey }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime(),
    binding = vacuumProductBinding(settings);
  const channels = binding?.channelEntityIds ?? [],
    secondary = binding?.secondaryEntityIds ?? [];
  const [selected, setSelected] = useState(binding?.primaryEntityId ?? '');
  const active = channels.includes(selected) ? selected : (channels[0] ?? '');
  const technical = new Set(binding?.technicalEntityIds ?? []),
    all = [...channels, ...secondary];
  const maintenance = settings.adaptiveBindings?.maintenance;
  if (typeof maintenance === 'string' && /^(button|sensor)\./.test(maintenance))
    technical.add(maintenance);
  const technicalIds = [
    ...new Set([
      ...secondary.filter((id) => technical.has(id)),
      ...(typeof maintenance === 'string' && technical.has(maintenance) ? [maintenance] : []),
    ]),
  ];
  const label = (id: string) => vacuumLabel(id, all, runtime.entities);
  const reading = (id: string) =>
    ['vacuum', 'sensor', 'binary_sensor', 'event', 'update', 'image', 'camera'].includes(
      id.split('.')[0]!
    );
  const stats = (ids: string[]) =>
    ids.map((id) => {
      const entity = runtime.entities[id],
        available = entity && !['unknown', 'unavailable', ''].includes(entity.state);
      return {
        key: id,
        label: label(id),
        value: id.startsWith('vacuum.')
          ? productVacuumView(entity).stateLabel
          : available
            ? entity!.state
            : 'Non disponibile',
        unit:
          available && typeof entity?.attributes.unit_of_measurement === 'string'
            ? entity.attributes.unit_of_measurement
            : undefined,
      };
    });
  const mapped = VACUUM_READINGS.flatMap(([key, title]) => {
    const id = settings[key];
    if (typeof id !== 'string' || !id.startsWith('sensor.') || technical.has(id)) return [];
    return stats([id]).map((item) => ({ ...item, key, label: title }));
  });
  const mappedIds = new Set(VACUUM_READINGS.map(([key]) => settings[key]));
  const ordinaryReadings = secondary.filter(
    (id) => !technical.has(id) && reading(id) && !/^(image|camera)\./.test(id) && !mappedIds.has(id)
  );
  const extra = (ids: string[]) =>
    ids.map((id) => (
      <Section key={id} title={label(id)}>
        <AdaptiveCategoryWidget
          type="sensor"
          entityId={id}
          id={id}
          settingsKey={settingsKey}
          settings={{ categoryWidgetType: 'sensor', bindingEntityId: id }}
          size={{ w: 4, h: 4 }}
          editMode={false}
          detailsMode
        />
      </Section>
    ));
  return (
    <div className="product-vacuum-details">
      <DetailsBody label="Aspirapolvere del dispositivo">
        {channels.length > 1 && (
          <OptionPicker
            label="Aspirapolvere"
            value={active}
            options={channels.map((id) => ({ value: id, label: label(id) }))}
            onSelect={(id) => {
              if (channels.includes(id)) setSelected(id);
            }}
            isolateEscape
          />
        )}
        {active ? (
          <Section title={label(active)}>
            <div className="product-vacuum-channel" key={active}>
              <Body size="sm">{productVacuumView(runtime.entities[active]).stateLabel}</Body>
              {productVacuumView(runtime.entities[active]).battery !== null && (
                <Caption>Batteria {productVacuumView(runtime.entities[active]).battery}%</Caption>
              )}
              <ProductVacuumControls entityId={active} label={label(active)} />
              <ProductVacuumOptions entityId={active} label={label(active)} settings={settings} />
            </div>
          </Section>
        ) : (
          <Body>Nessun aspirapolvere collegato.</Body>
        )}
        {(mapped.length > 0 || ordinaryReadings.length > 0) && (
          <Section title="Misure e pulizie">
            <StatList items={[...mapped, ...stats(ordinaryReadings)]} />
          </Section>
        )}
        {secondary.some((id) => !technical.has(id) && !reading(id)) && (
          <Section title="Altre funzioni">
            {extra(secondary.filter((id) => !technical.has(id) && !reading(id)))}
          </Section>
        )}
        {binding && (
          <DisclosureGroup>
            <Disclosure id="vacuum-technical" title="Tecnica e manutenzione">
              <StatList items={stats(technicalIds.filter(reading))} />
              {extra(technicalIds.filter((id) => !reading(id)))}
              <Caption>Dispositivo Home Assistant · {binding.deviceId}</Caption>
            </Disclosure>
          </DisclosureGroup>
        )}
      </DetailsBody>
    </div>
  );
}
export function ProductVacuumConsole(props: WidgetDetailsProps) {
  return (
    <ConsoleColumns
      main={
        <div className="widget-console-details">
          <ProductVacuumDetails {...props} />
        </div>
      }
    />
  );
}
