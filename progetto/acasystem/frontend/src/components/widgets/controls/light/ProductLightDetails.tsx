import { useCallback, useState } from 'react';
import './productLightDetails.css';
import { Body, Button, Caption, Disclosure, DisclosureGroup, Slider, Toggle } from '@/components/primitives';
import type { CardSettings } from '@/@types/dashboard';
import type { ProductDeviceBinding } from '@/utils/devices/productBinding';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { AdaptiveCategoryWidget } from '../../adaptive/AdaptiveCategoryWidget';
import { useServiceCatalog } from '../../adaptive/useServiceCatalog';
import { DetailsBody, OptionPicker, Section, StatList } from '../../utilities/shared/details';
import { CommandFeedback } from '../shared/CommandFeedback';
import { callSafely } from '../shared/service';
import { useRequestedState } from '../shared/useRequestedState';
import { useThrottledCommand, useTrackedCommand } from '../shared/useTrackedCommand';

/** Technical controls keep the same tracked user-command path as ordinary widget controls. */
function SecondaryControl({ entityId }: { entityId: string }) {
  const runtime = useWidgetRuntime(), services = useServiceCatalog();
  const entity = runtime.entities[entityId], domain = entityId.split('.')[0]!;
  const name = String(entity?.attributes.friendly_name ?? entityId);
  const available = Boolean(entity && runtime.conn && entity.state !== 'unavailable'
    && (entity.state !== 'unknown' || domain === 'button'));
  const request = useTrackedCommand(domain === 'switch' ? entity?.state === 'on' : entity?.state ?? '');
  const [accepted, setAccepted] = useState(false);
  const action = useRequestedState({ confirmed: false, matches: (a: boolean, b: boolean) => a === b });
  const numberCall = useCallback((value: number) => ({ domain: 'number', service: 'set_value', data: { entity_id: entityId, value } }), [entityId]);
  const numeric = useThrottledCommand(Number(entity?.state) || 0, (a, b) => Math.abs(a - b) < 0.001, numberCall);
  const has = (service: string) => Boolean(services?.[domain] && Object.hasOwn(services[domain], service));
  let control;
  if (domain === 'switch' && has('turn_on') && has('turn_off')) {
    control = <Toggle aria-label={name} checked={Boolean(request.value)} pending={request.pending} error={request.failed} disabled={!available}
      onClick={() => { if (available) request.run(!request.value, domain, request.value ? 'turn_off' : 'turn_on', { entity_id: entityId }); }} />;
  } else if (domain === 'number' && has('set_value')) {
    const min = Number(entity?.attributes.min), max = Number(entity?.attributes.max), step = Number(entity?.attributes.step ?? 1);
    if ([min, max, step].every(Number.isFinite) && max > min && step > 0)
      control = <Slider label={name} min={min} max={max} step={step} value={numeric.value} pending={numeric.pending} error={numeric.failed} disabled={!available}
        valueText={String(numeric.value)} onValueChange={value => { if (available) numeric.set(value); }} />;
  } else if (domain === 'select' && has('select_option') && Array.isArray(entity?.attributes.options)) {
    const options = entity.attributes.options.filter((value): value is string => typeof value === 'string');
    control = <OptionPicker label={name} value={String(request.value)} options={options.map(value => ({ value, label: value }))} disabled={!available} pending={request.pending}
      onSelect={option => { if (available && options.includes(option)) request.run(option, domain, 'select_option', { entity_id: entityId, option }); }} isolateEscape />;
  } else if (domain === 'button' && has('press')) {
    control = <Button variant="control" disabled={!available || action.pending} onClick={() => {
      if (!available || action.pending) return;
      setAccepted(false); action.request(true);
      const pending = callSafely(runtime, domain, 'press', { entity_id: entityId });
      action.track(pending); action.settle();
      void pending.then(() => { action.clear(); setAccepted(true); }).catch(() => undefined);
    }}>{name}</Button>;
  }
  return <div className="ctl-details__section">
    <div className="ctl-details__row"><Body size="sm">{name}</Body>{control}</div>
    {!control && <Caption>{entity ? 'Controllo non disponibile' : 'Entità non disponibile'}</Caption>}
    {!available && control && <Caption>Non raggiungibile</Caption>}
    <CommandFeedback message={request.message ?? numeric.message ?? action.message} pendingText={request.pending || numeric.pending || action.pending ? 'Richiesto…' : null} />
    {accepted && <Caption role="status">Comando accettato da Home Assistant</Caption>}
  </div>;
}

/** A single device, its distinct light channels and the registry-classified technical area. */
export function ProductLightDetails({ binding, settings, settingsKey }: {
  binding: ProductDeviceBinding; settings: CardSettings; settingsKey: string;
}) {
  const runtime = useWidgetRuntime();
  const technical = new Set(binding.technicalEntityIds ?? []);
  const name = (id: string) => String(runtime.entities[id]?.attributes.friendly_name ?? id);
  const isReading = (id: string) => ['sensor', 'binary_sensor', 'event', 'update'].includes(id.split('.')[0]!);
  const stats = (ids: string[]) => ids.map(id => {
    const entity = runtime.entities[id], value = entity?.state;
    return { key: id, label: name(id), value: !value || value === 'unavailable' || value === 'unknown' ? 'Non disponibile' : value,
      unit: typeof entity?.attributes.unit_of_measurement === 'string' ? entity.attributes.unit_of_measurement : undefined };
  });
  const channel = (id: string) => <Section key={id} title={name(id)}>
    <div className="product-light-channel">
    <AdaptiveCategoryWidget id={id} entityId={id} type="light" settingsKey={settingsKey}
      settings={{ ...settings, productDevice: undefined, bindingEntityId: id }} size={{ w: 4, h: 4 }} editMode={false} detailsMode />
    </div>
  </Section>;
  const daily = binding.secondaryEntityIds.filter(id => !technical.has(id) && isReading(id));
  const dailyControls = binding.secondaryEntityIds.filter(id => !technical.has(id) && !isReading(id));
  const controls = binding.secondaryEntityIds.filter(id => technical.has(id) && !isReading(id));
  const technicalReadings = binding.secondaryEntityIds.filter(id => technical.has(id) && isReading(id));
  return <DetailsBody label="Luci del dispositivo">
    {binding.channelEntityIds.filter(id => !technical.has(id)).map(channel)}
    {daily.length > 0 && <Section title="Misure"><StatList items={stats(daily)} /></Section>}
    {dailyControls.length > 0 && <Section title="Altre funzioni">{dailyControls.map(id => <SecondaryControl key={id} entityId={id} />)}</Section>}
    <DisclosureGroup><Disclosure id="light-technical" title="Tecnica e manutenzione">
      {binding.channelEntityIds.filter(id => technical.has(id)).map(channel)}
      {technicalReadings.length > 0 && <StatList items={stats(technicalReadings)} />}
      {controls.map(id => <SecondaryControl key={id} entityId={id} />)}
      <dl className="utility-stats"><div className="utility-stat"><dt><Caption>Dispositivo Home Assistant</Caption></dt><dd><Body size="sm">{binding.deviceId}</Body></dd></div></dl>
    </Disclosure></DisclosureGroup>
  </DetailsBody>;
}
