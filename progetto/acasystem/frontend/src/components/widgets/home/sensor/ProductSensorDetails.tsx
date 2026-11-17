import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { WidgetDetailsProps, WidgetRuntime } from '@/@types/launcher';
import {
  Body,
  Caption,
  ConsoleColumns,
  Disclosure,
  DisclosureGroup,
} from '@/components/primitives';
import { useWidgetRuntime, WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { sensorProductBinding } from '@/utils/devices/productBinding';
import { AdaptiveCategoryWidget } from '../../adaptive/AdaptiveCategoryWidget';
import { formatDateTime } from '../../controls/shared/format';
import { DetailsBody, OptionPicker, Section, StatList } from '../../utilities/shared/details';
import { ProductSensorHistory } from './ProductSensorHistory';
import { finiteSensorNumber, productSensorView, sensorEntityName } from './productSensorModel';
import './productSensor.css';

function TechnicalControl({ entityId, settingsKey }: { entityId: string; settingsKey: string }) {
  const runtime = useWidgetRuntime(),
    visible = usePageVisible();
  const mounted = useRef(false),
    live = useRef({ runtime, visible });
  live.current = { runtime, visible };
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const callService = useCallback<WidgetRuntime['callService']>((domain, service, data) => {
    if (
      !mounted.current ||
      !live.current.visible ||
      !live.current.runtime.conn ||
      live.current.runtime.conn.connected === false
    )
      return Promise.reject(new Error('Schermata non attiva o collegamento non disponibile'));
    return live.current.runtime.callService(domain, service, data);
  }, []);
  return (
    <WidgetRuntimeProvider value={{ ...runtime, callService }}>
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
    </WidgetRuntimeProvider>
  );
}

export function ProductSensorDetails(props: WidgetDetailsProps) {
  const runtime = useWidgetRuntime(),
    binding = sensorProductBinding(props.settings);
  const [selected, setSelected] = useState(binding?.primaryEntityId ?? '');
  const [technicalOpen, setTechnicalOpen] = useState<string | null>(null);
  if (!binding) return null;
  const active = binding.channelEntityIds.includes(selected) ? selected : binding.primaryEntityId;
  const entity = runtime.entities[active],
    view = productSensorView(entity),
    technical = new Set(binding.technicalEntityIds ?? []);
  const reading = (id: string) => {
    const current = runtime.entities[id];
    if (/^(sensor|binary_sensor)\./.test(id)) {
      const item = productSensorView(current);
      return {
        key: id,
        label: sensorEntityName(id, runtime.entities),
        value: item.value,
        unit: item.unit || undefined,
      };
    }
    const state = current?.state;
    return {
      key: id,
      label: sensorEntityName(id, runtime.entities),
      value:
        !state || state === 'unavailable'
          ? 'Non disponibile'
          : state === 'unknown'
            ? 'Stato sconosciuto'
            : state,
      unit: undefined,
    };
  };
  const technicalAction = (id: string) => {
    if (!technical.has(id)) return false;
    const domain = id.split('.')[0]!,
      current = runtime.entities[id];
    const service = new Map([
      ['button', 'press'],
      ['switch', 'turn_on'],
      ['number', 'set_value'],
      ['select', 'select_option'],
    ]).get(domain);
    if (
      !service ||
      !current ||
      current.state === 'unavailable' ||
      !runtime.services?.[domain] ||
      !Object.hasOwn(runtime.services[domain]!, service)
    )
      return false;
    if (domain === 'number') {
      const min = current.attributes.min,
        max = current.attributes.max,
        step = current.attributes.step;
      return (
        finiteSensorNumber(current.state) !== null &&
        typeof min === 'number' &&
        Number.isFinite(min) &&
        typeof max === 'number' &&
        Number.isFinite(max) &&
        max > min &&
        typeof step === 'number' &&
        Number.isFinite(step) &&
        step > 0
      );
    }
    if (domain === 'select')
      return (
        Array.isArray(current.attributes.options) &&
        current.attributes.options.length > 0 &&
        current.attributes.options.every((value) => typeof value === 'string') &&
        current.attributes.options.includes(current.state)
      );
    return domain !== 'switch' || current.state === 'on' || current.state === 'off';
  };
  return (
    <div className="product-sensor-details">
      <DetailsBody label="Sensori del dispositivo">
        <Section title="Letture">
          <StatList items={binding.channelEntityIds.map(reading)} />
        </Section>
        {binding.channelEntityIds.length > 1 && (
          <OptionPicker
            label="Sensore della cronologia"
            value={active}
            options={binding.channelEntityIds.map((id) => ({
              value: id,
              label: sensorEntityName(id, runtime.entities),
            }))}
            onSelect={(id) => {
              if (binding.channelEntityIds.includes(id)) setSelected(id);
            }}
            isolateEscape
          />
        )}
        {entity ? (
          <ProductSensorHistory
            key={active}
            entity={entity}
            initialHours={props.settings.adaptiveHistoryHours}
          />
        ) : (
          <Body size="sm">Il sensore selezionato non è disponibile.</Body>
        )}
        <DisclosureGroup value={technicalOpen} onValueChange={setTechnicalOpen}>
          <Disclosure id={`${props.id}-sensor-technical`} title="Tecnica e manutenzione">
            {(view.updated || view.changed) && (
              <StatList
                items={[
                  ...(view.changed
                    ? [
                        {
                          key: 'changed',
                          label: 'Ultima variazione',
                          value: formatDateTime(view.changed),
                        },
                      ]
                    : []),
                  ...(view.updated
                    ? [
                        {
                          key: 'updated',
                          label: 'Ultimo aggiornamento',
                          value: formatDateTime(view.updated),
                        },
                      ]
                    : []),
                ]}
              />
            )}
            <StatList
              items={binding.secondaryEntityIds.filter((id) => !technicalAction(id)).map(reading)}
            />
            {technicalOpen &&
              binding.secondaryEntityIds.filter(technicalAction).map((id) => (
                <Section key={id} title={sensorEntityName(id, runtime.entities)}>
                  <TechnicalControl entityId={id} settingsKey={props.settingsKey} />
                </Section>
              ))}
            <Caption>Dispositivo Home Assistant · {binding.deviceId}</Caption>
            <Caption>{active}</Caption>
          </Disclosure>
        </DisclosureGroup>
      </DetailsBody>
    </div>
  );
}

export function ProductSensorConsole(props: WidgetDetailsProps) {
  return (
    <ConsoleColumns
      main={
        <div className="widget-console-details">
          <ProductSensorDetails {...props} />
        </div>
      }
    />
  );
}
