import { useId, type ReactNode } from 'react';
import { Body, Button, Caption } from '@/components/primitives';
import type { WidgetProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { friendlyName, isUnavailableState } from '../shared/entity';
import { formatCompact } from '../shared/format';
import { CardMessage, CardSkeleton, Chip, IconWell, Notice, UtilityCard, commandNotice } from '../shared/UtilityCard';
import { UtilityIcon } from '../shared/UtilityIcon';
import { stateIn, useCommand } from '../shared/useCommand';
import { isErrorState, mowerSpec, vacuumSpec, type RobotAction, type RobotSpec } from './robotSpecs';

/**
 * Card of a robot (vacuum or lawn mower): state, battery, room or zone and the two commands
 * of the legacy card (start/pause and return to base), each shown as requested until the
 * device reports the new state.
 */
function RobotWidget({ spec, id, size, editMode }: WidgetProps & { spec: RobotSpec }) {
  const runtime = useWidgetRuntime();
  const entity = runtime.entities[id];
  const command = useCommand(entity);
  const noticeId = `esito-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const name = runtime.customNames[id] || friendlyName(entity, spec.defaultName);
  const row = size.h <= 1;
  const state = entity?.state;
  const unavailable = !entity || isUnavailableState(state);
  const error = !unavailable && isErrorState(state);
  const active = !unavailable && spec.isActive(state);

  const card = (children: ReactNode) => (
    <UtilityCard
      openLabel={`${name}, apri i comandi`}
      onOpen={() => runtime.openDetails(id)}
      editMode={editMode}
      row={row}
    >
      {children}
    </UtilityCard>
  );

  if (!runtime.entitiesLoaded) return card(<CardSkeleton label={`Caricamento di ${name}…`} />);
  if (!entity) return card(<CardMessage icon="warning" title="Dispositivo non trovato" detail={id} />);

  const battery = spec.battery(entity);
  const place = spec.place(entity);
  const primary = spec.primary(entity);
  const pendingAction = command.pendingKey === primary.key ? primary : command.pendingKey === 'dock' ? spec.dock : null;
  const status = pendingAction ? pendingAction.requested : spec.stateLabel(state, battery);
  const notice = commandNotice(command.errorKey, command.unconfirmedKey);

  const send = (action: RobotAction) =>
    command.run({
      key: action.key,
      domain: action.domain,
      service: action.service,
      data: { entity_id: id },
      confirm: stateIn(...action.confirm),
    });

  const actionButton = (action: RobotAction, labelled: boolean) => (
    <Button
      variant="control"
      size="md"
      shape={labelled ? 'pill' : 'circle'}
      loading={command.pendingKey === action.key}
      disabled={unavailable}
      aria-label={labelled ? undefined : action.label}
      aria-describedby={notice ? noticeId : undefined}
      onClick={() => send(action)}
    >
      <UtilityIcon name={action.icon} size="md" />
      {labelled && action.label}
    </Button>
  );

  const tone = error ? 'danger' : active ? 'active' : null;
  const batteryText = battery === null ? null : `${formatCompact(battery, 0)}%`;

  if (row) {
    return card(
      <>
        <IconWell icon={spec.icon} tone={tone} className="utility-hide-narrow" />
        <div className="utility-stack utility-grow">
          <Caption className="utility-truncate">{name}</Caption>
          <Body as="span" size="sm" tone={error ? 'danger' : 'ink'} className="utility-truncate">
            {status}
          </Body>
          {notice ? (
            <Notice id={noticeId} tone={notice.tone} live>
              {notice.text}
            </Notice>
          ) : (
            batteryText && <Caption className="utility-hide-short">Batteria {batteryText}</Caption>
          )}
        </div>
        <div className="utility-actions">
          {actionButton(primary, false)}
          {actionButton(spec.dock, false)}
        </div>
      </>
    );
  }

  return card(
    <>
      <div className="utility-head">
        <IconWell icon={spec.icon} tone={tone} />
        <div className="utility-head__text">
          <Caption className="utility-truncate">{name}</Caption>
          <Body as="span" size="md" tone={error ? 'danger' : 'ink'} className="utility-truncate">
            {status}
          </Body>
        </div>
      </div>
      <div className="utility-chips utility-grow">
        {batteryText && (
          <Chip icon={battery !== null && battery <= 20 ? 'batteryLow' : 'battery'} tone={battery !== null && battery <= 20 ? 'danger' : 'neutral'}>
            {batteryText}
          </Chip>
        )}
        {place && (
          <Chip icon="location" label={`${spec.placeLabel}: ${place}`}>
            {place}
          </Chip>
        )}
        {error && (
          <Chip icon="warning" tone="danger">
            Richiede attenzione
          </Chip>
        )}
      </div>
      {notice && (
        <Notice id={noticeId} tone={notice.tone} icon="warning" live>
          {notice.text}
        </Notice>
      )}
      <div className="utility-actions utility-actions--primary">
        {actionButton(primary, true)}
        {actionButton(spec.dock, false)}
      </div>
    </>
  );
}

/** Robot vacuum (`vacuum.*`). */
export function VacuumWidget(props: WidgetProps) {
  return <RobotWidget {...props} spec={vacuumSpec} />;
}

/** Lawn mower (`lawn_mower.*`). */
export function MowerWidget(props: WidgetProps) {
  return <RobotWidget {...props} spec={mowerSpec} />;
}
