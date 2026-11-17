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
import { ProductMowerControls } from './ProductMowerControls';
import {
  mowerLabel,
  mowerNumericControlReady,
  mowerProductBinding,
  productMowerView,
} from './productMowerModel';
import './productMower.css';

export function ProductMowerDetails({ settings, settingsKey }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime(),
    binding = mowerProductBinding(settings);
  const channels = binding?.channelEntityIds ?? [];
  const explicit = [
    ['zone', 'Zona di taglio'],
    ['height', 'Altezza di taglio'],
  ] as const;
  const titles = new Map<string, string>();
  for (const [key, title] of explicit) {
    const id = settings.adaptiveBindings?.[key];
    if (typeof id === 'string' && runtime.entities[id] && !channels.includes(id) && !titles.has(id))
      titles.set(id, title);
  }
  const secondary = [...new Set([...(binding?.secondaryEntityIds ?? []), ...titles.keys()])];
  const technical = new Set(binding?.technicalEntityIds ?? []),
    all = [...channels, ...secondary];
  const label = (id: string) => titles.get(id) ?? mowerLabel(id, all, runtime.entities);
  const [selected, setSelected] = useState(binding?.primaryEntityId ?? '');
  const active = channels.includes(selected) ? selected : (channels[0] ?? '');
  const reading = (id: string) =>
    ['sensor', 'binary_sensor', 'event', 'update', 'image', 'camera', 'lawn_mower'].includes(
      id.split('.')[0]!
    );
  const stats = (ids: string[]) =>
    ids.map((id) => {
      const entity = runtime.entities[id],
        available = entity && !['unknown', 'unavailable', ''].includes(entity.state);
      return {
        key: id,
        label: label(id),
        value: id.startsWith('lawn_mower.')
          ? productMowerView(entity).stateLabel
          : available
            ? entity!.state
            : 'Non disponibile',
        unit:
          available && typeof entity?.attributes.unit_of_measurement === 'string'
            ? entity.attributes.unit_of_measurement
            : undefined,
      };
    });
  const extra = (ids: string[]) =>
    ids.map((id) => {
      const entity = runtime.entities[id];
      const numeric = /^(number|input_number)\./.test(id);
      const select = /^(select|input_select)\./.test(id),
        options = entity?.attributes.options;
      const knownChoice =
        Array.isArray(options) &&
        entity &&
        !['unknown', 'unavailable', ''].includes(entity.state) &&
        options.includes(entity.state);
      return (
        <Section key={id} title={label(id)}>
          {select && !knownChoice ? (
            <OptionPicker
              label={label(id)}
              value={null}
              options={[]}
              disabled
              placeholder="Non disponibile"
              onSelect={() => undefined}
            />
          ) : numeric && !mowerNumericControlReady(entity) ? (
            <StatList items={stats([id])} />
          ) : (
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
          )}
        </Section>
      );
    });
  return (
    <div className="product-mower-details">
      <DetailsBody label="Tagliaerba del dispositivo">
        {channels.length > 1 && (
          <OptionPicker
            label="Tagliaerba"
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
            <div className="product-mower-channel" key={active}>
              <Body size="sm">{productMowerView(runtime.entities[active]).stateLabel}</Body>
              {productMowerView(runtime.entities[active]).battery !== null && (
                <Caption>Batteria {productMowerView(runtime.entities[active]).battery}%</Caption>
              )}
              <ProductMowerControls entityId={active} label={label(active)} />
            </div>
          </Section>
        ) : (
          <Body>Nessun tagliaerba collegato.</Body>
        )}
        {secondary.some((id) => !technical.has(id) && reading(id)) && (
          <Section title="Misure">
            <StatList items={stats(secondary.filter((id) => !technical.has(id) && reading(id)))} />
          </Section>
        )}
        {secondary.some((id) => !technical.has(id) && !reading(id)) && (
          <Section title="Altre funzioni">
            {extra(secondary.filter((id) => !technical.has(id) && !reading(id)))}
          </Section>
        )}
        {binding && (
          <DisclosureGroup>
            <Disclosure id="mower-technical" title="Tecnica e manutenzione">
              <StatList items={stats(secondary.filter((id) => technical.has(id) && reading(id)))} />
              {extra(secondary.filter((id) => technical.has(id) && !reading(id)))}
              <Caption>Dispositivo Home Assistant · {binding.deviceId}</Caption>
            </Disclosure>
          </DisclosureGroup>
        )}
      </DetailsBody>
    </div>
  );
}
export function ProductMowerConsole(props: WidgetDetailsProps) {
  return (
    <ConsoleColumns
      main={
        <div className="widget-console-details">
          <ProductMowerDetails {...props} />
        </div>
      }
    />
  );
}
