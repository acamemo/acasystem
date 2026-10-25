import { useServiceCatalog } from '../../adaptive/useServiceCatalog';
import { Body, Button, Caption } from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { isUnavailableState } from '../shared/entity';
import { formatCompact } from '../shared/format';
import { DetailsBody, Section, StatList } from '../shared/details';
import { Chip, Meter, Notice, commandNotice } from '../shared/UtilityCard';
import { UtilityIcon } from '../shared/UtilityIcon';
import { stateIn, useCommand } from '../shared/useCommand';
import { isErrorState, robotActionSupported, mowerSpec, type RobotAction } from './robotSpecs';

/** Lawn mower details (legacy MowerModal): state, start/pause, return to base, battery, zone. */
export function MowerDetails({ id }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime();
  const services = useServiceCatalog();
  const entity = runtime.entities[id];
  const command = useCommand(entity);

  if (!entity) {
    return (
      <DetailsBody>
        <Notice icon="warning">Il dispositivo {id} non è stato trovato in Home Assistant.</Notice>
      </DetailsBody>
    );
  }

  const unavailable = isUnavailableState(entity.state);
  const battery = mowerSpec.battery(entity);
  const zone = mowerSpec.place(entity);
  const primary = mowerSpec.primary(entity);
  const pending =
    command.pendingKey === primary.key
      ? primary
      : command.pendingKey === 'dock'
        ? mowerSpec.dock
        : null;
  const notice = commandNotice(command.errorKey, command.unconfirmedKey);
  const error = isErrorState(entity.state);
  const send = (action: RobotAction) =>
    command.run({
      key: action.key,
      domain: action.domain,
      service: action.service,
      data: { entity_id: id },
      confirm: stateIn(...action.confirm),
    });

  return (
    <DetailsBody>
      <Section title="Stato" icon="mower">
        <Body size="md" tone={error ? 'danger' : 'ink'} aria-live="polite">
          {pending ? pending.requested : mowerSpec.stateLabel(entity.state, battery)}
        </Body>
        {error && (
          <div className="utility-chips">
            <Chip icon="warning" tone="danger">
              Richiede attenzione
            </Chip>
          </div>
        )}
        <div className="utility-actions utility-actions--fill">
          <Button
            variant={primary.key === 'start' ? 'primary' : 'control'}
            size="md"
            loading={command.pendingKey === primary.key}
            disabled={
              unavailable ||
              !runtime.conn ||
              !robotActionSupported(entity, primary.domain, primary.service, services)
            }
            onClick={() => send(primary)}
          >
            <UtilityIcon name={primary.icon} size="md" />
            {primary.label}
          </Button>
          <Button
            variant="control"
            size="md"
            loading={command.pendingKey === 'dock'}
            disabled={
              unavailable ||
              !runtime.conn ||
              !robotActionSupported(entity, mowerSpec.dock.domain, mowerSpec.dock.service, services)
            }
            onClick={() => send(mowerSpec.dock)}
          >
            <UtilityIcon name="home" size="md" />
            {mowerSpec.dock.label}
          </Button>
        </div>
        {unavailable && (
          <Notice icon="wifi">Il dispositivo non è raggiungibile: i comandi sono sospesi.</Notice>
        )}
        {notice && (
          <Notice tone={notice.tone} icon="warning" live>
            {notice.text}
          </Notice>
        )}
      </Section>
      <Section title="Dettagli" icon="battery">
        <StatList
          items={[
            {
              key: 'battery',
              label: 'Batteria',
              value: battery === null ? '--' : formatCompact(battery, 0),
              unit: battery === null ? undefined : '%',
            },
            ...(zone ? [{ key: 'zone', label: 'Zona', value: zone }] : []),
          ]}
        />
        {battery !== null && (
          <Meter value={battery} label="Batteria del tosaerba" low={battery < 20} />
        )}
        <Caption>{id}</Caption>
      </Section>
    </DetailsBody>
  );
}
