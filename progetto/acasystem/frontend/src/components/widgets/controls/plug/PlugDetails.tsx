import { Body, Caption, Disclosure, DisclosureGroup } from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { AdaptiveCategoryWidget } from '../../adaptive/AdaptiveCategoryWidget';
import { DetailsBody, Section, StatList } from '../../utilities/shared/details';
import { PlugOutputControl } from './PlugOutputControl';
import { plugBinding, plugEntityLabel, plugOutputs } from './plugModel';
import './plug.css';

/** Outputs, exact device measurements and registry-classified maintenance stay distinct. */
export function PlugDetails({ id, settings, settingsKey }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime(),
    binding = plugBinding(settings, id);
  const outputs = plugOutputs(settings, id);
  const technical = new Set(binding?.technicalEntityIds ?? []);
  const secondary = binding?.secondaryEntityIds ?? [];
  const allIds = [...outputs, ...secondary];
  const label = (entityId: string) => plugEntityLabel(entityId, allIds, runtime.entities);
  const reading = (entityId: string) =>
    ['sensor', 'binary_sensor', 'event', 'update'].includes(entityId.split('.')[0]!);
  const consumption = secondary.filter(
    (entityId) =>
      !technical.has(entityId) &&
      reading(entityId) &&
      ['power', 'energy', 'current', 'voltage'].includes(
        String(runtime.entities[entityId]?.attributes.device_class ?? '')
      )
  );
  const measures = secondary.filter(
    (entityId) => !technical.has(entityId) && reading(entityId) && !consumption.includes(entityId)
  );
  const technicalReadings = secondary.filter(
    (entityId) => technical.has(entityId) && reading(entityId)
  );
  const technicalControls = secondary.filter(
    (entityId) => technical.has(entityId) && !reading(entityId)
  );
  const otherControls = secondary.filter(
    (entityId) => !technical.has(entityId) && !reading(entityId)
  );
  const stats = (ids: string[]) =>
    ids.map((entityId) => {
      const entity = runtime.entities[entityId],
        value = entity?.state;
      const available = Boolean(value && !['unknown', 'unavailable'].includes(value));
      const kind = entity?.attributes.device_class;
      const measurement =
        kind === 'power'
          ? 'Potenza'
          : kind === 'energy'
            ? 'Energia'
            : kind === 'current'
              ? 'Corrente'
              : kind === 'voltage'
                ? 'Tensione'
                : '';
      return {
        key: entityId,
        label: `${label(entityId)}${measurement ? ` · ${measurement}` : ''}`,
        value: available ? value! : 'Non disponibile',
        unit:
          available && typeof entity?.attributes.unit_of_measurement === 'string'
            ? entity.attributes.unit_of_measurement
            : undefined,
      };
    });
  const controls = (ids: string[]) =>
    ids.map((entityId) => (
      <Section key={entityId} title={label(entityId)}>
        <div className="product-plug-technical">
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
        </div>
      </Section>
    ));
  return (
    <DetailsBody label="Prese e interruttori del dispositivo">
      <Section title="Uscite">
        {outputs.length ? (
          <div className="product-plug-outputs">
            {outputs.map((entityId) => (
              <section key={entityId} aria-label={label(entityId)} className="ctl-details__section">
                <Body size="sm">{label(entityId)}</Body>
                <PlugOutputControl key={entityId} entityId={entityId} label={label(entityId)} />
              </section>
            ))}
          </div>
        ) : (
          <Body>Nessuna uscita collegata.</Body>
        )}
      </Section>
      {consumption.length > 0 && (
        <Section title="Consumi e misure">
          <StatList items={stats(consumption)} />
        </Section>
      )}
      {measures.length > 0 && (
        <Section title="Misure">
          <StatList items={stats(measures)} />
        </Section>
      )}
      {otherControls.length > 0 && (
        <Section title="Altre funzioni">{controls(otherControls)}</Section>
      )}
      {binding && (
        <DisclosureGroup>
          <Disclosure id="plug-technical" title="Tecnica e manutenzione">
            {technicalReadings.length > 0 && <StatList items={stats(technicalReadings)} />}
            {controls(technicalControls)}
            <dl className="utility-stats">
              <div className="utility-stat">
                <dt>
                  <Caption>Dispositivo Home Assistant</Caption>
                </dt>
                <dd>
                  <Body size="sm">{binding.deviceId}</Body>
                </dd>
              </div>
            </dl>
          </Disclosure>
        </DisclosureGroup>
      )}
    </DetailsBody>
  );
}
