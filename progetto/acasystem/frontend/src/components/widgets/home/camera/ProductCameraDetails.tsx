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
import { ProductCameraControls } from './ProductCameraControls';
import { ProductCameraFeed } from './ProductCameraFeed';
import { cameraLabel, cameraProductBinding, productCameraView } from './productCameraModel';
import './productCamera.css';

export function ProductCameraDetails({ settings, settingsKey }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime(),
    binding = cameraProductBinding(settings);
  const channels = binding?.channelEntityIds ?? [],
    secondary = binding?.secondaryEntityIds ?? [];
  const technical = new Set(binding?.technicalEntityIds ?? []),
    all = [...channels, ...secondary];
  const selectable = channels.filter((id) => !technical.has(id));
  const [selected, setSelected] = useState(binding?.primaryEntityId ?? '');
  const active = selectable.includes(selected) ? selected : (selectable[0] ?? '');
  const label = (id: string) => cameraLabel(id, all, runtime.entities);
  const reading = (id: string) =>
    ['camera', 'sensor', 'binary_sensor', 'event', 'update'].includes(id.split('.')[0]!);
  const stats = (ids: string[]) =>
    ids.map((id) => {
      const entity = runtime.entities[id],
        available = entity && !['unknown', 'unavailable', ''].includes(entity.state);
      // No raw camera attributes, playback URLs or access tokens enter the information view.
      const camera = id.startsWith('camera.');
      return {
        key: id,
        label: label(id),
        value: camera
          ? productCameraView(entity).stateLabel
          : available
            ? entity!.state
            : 'Non disponibile',
        unit:
          !camera && available && typeof entity?.attributes.unit_of_measurement === 'string'
            ? entity.attributes.unit_of_measurement
            : undefined,
      };
    });
  const extras = (ids: string[]) =>
    ids.map((id) => (
      <Section key={id} title={label(id)}>
        <AdaptiveCategoryWidget
          type={id.startsWith('light.') ? 'light' : 'sensor'}
          entityId={id}
          id={id}
          settingsKey={settingsKey}
          settings={{
            categoryWidgetType: id.startsWith('light.') ? 'light' : 'sensor',
            bindingEntityId: id,
          }}
          size={{ w: 4, h: 4 }}
          editMode={false}
          detailsMode
        />
      </Section>
    ));
  return (
    <div className="product-camera-details">
      <DetailsBody label="Videocamere del dispositivo">
        {selectable.length > 1 && (
          <OptionPicker
            label="Videocamera"
            value={active}
            options={selectable.map((id) => ({ value: id, label: label(id) }))}
            onSelect={(id) => {
              if (selectable.includes(id)) setSelected(id);
            }}
            isolateEscape
          />
        )}
        {active ? (
          <Section title={label(active)}>
            <div className="product-camera-channel" key={active}>
              <Body size="sm">{productCameraView(runtime.entities[active]).stateLabel}</Body>
              <ProductCameraFeed
                entityId={active}
                label={label(active)}
                settings={settings}
                settingsKey={settingsKey}
                controls
              />
              <ProductCameraControls entityId={active} label={label(active)} settings={settings} />
            </div>
          </Section>
        ) : (
          <Body>Nessuna videocamera collegata.</Body>
        )}
        {secondary.some((id) => !technical.has(id) && reading(id)) && (
          <Section title="Misure">
            <StatList items={stats(secondary.filter((id) => !technical.has(id) && reading(id)))} />
          </Section>
        )}
        {secondary.some((id) => !technical.has(id) && !reading(id)) && (
          <Section title="Altre funzioni">
            {extras(secondary.filter((id) => !technical.has(id) && !reading(id)))}
          </Section>
        )}
        {binding && (
          <DisclosureGroup>
            <Disclosure id="camera-technical" title="Tecnica e manutenzione">
              <StatList items={stats(all.filter((id) => technical.has(id) && reading(id)))} />
              {extras(all.filter((id) => technical.has(id) && !reading(id)))}
              <Caption>Dispositivo Home Assistant · {binding.deviceId}</Caption>
            </Disclosure>
          </DisclosureGroup>
        )}
      </DetailsBody>
    </div>
  );
}
export function ProductCameraConsole(props: WidgetDetailsProps) {
  return (
    <ConsoleColumns
      main={
        <div className="widget-console-details">
          <ProductCameraDetails {...props} />
        </div>
      }
    />
  );
}
