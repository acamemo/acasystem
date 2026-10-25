import { createContext, useContext, type ReactNode } from 'react';
import { Button, Caption, Icon } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import {
  actionByKey,
  requiresCode,
  TRANSITION_STATES,
  unsupportedCode,
} from '../home/alarm/alarmModel';
import { type AlarmCommand, useAlarmCommand } from '../home/alarm/useAlarmCommand';
import { requestAlarmAction } from '../home/alarm/alarmRequests';
import type { Capability } from './widgetDesignModel';

const AlarmCommandContext = createContext<AlarmCommand | null>(null);
export function AlarmControlGroup({
  entityId,
  children,
}: {
  entityId: string;
  children: ReactNode;
}) {
  const { entities } = useWidgetRuntime();
  const command = useAlarmCommand(entityId, entities[entityId]!);
  return <AlarmCommandContext value={command}>{children}</AlarmCommandContext>;
}

export function AlarmControl({
  cap,
  entityId,
  disabled,
  openDetails,
}: {
  cap: Capability;
  entityId: string;
  disabled: boolean;
  openDetails?: () => void;
}) {
  const { entities } = useWidgetRuntime();
  const entity = entities[entityId]!;
  const command = useContext(AlarmCommandContext);
  if (!command) return null;
  const action = actionByKey(cap.id);
  const run = () => {
    if (
      !action ||
      disabled ||
      TRANSITION_STATES.has(entity.state) ||
      command.pendingAction ||
      unsupportedCode(entity)
    )
      return;
    if (requiresCode(action.key, entity)) {
      requestAlarmAction(entityId, action.key);
      openDetails?.();
    } else command.run(action);
  };
  return (
    <div className="uikwa-action">
      <Button
        variant="control"
        shape="circle"
        size="lg"
        aria-label={cap.label}
        disabled={
          disabled ||
          !action ||
          TRANSITION_STATES.has(entity.state) ||
          Boolean(command.pendingAction) ||
          unsupportedCode(entity)
        }
        aria-busy={Boolean(command.pendingAction) || undefined}
        onClick={run}
      >
        <Icon name={cap.icon} size="lg" />
      </Button>
      <Caption>{cap.label}</Caption>
      {command.error && (
        <Caption role="alert" tone="danger">
          Home Assistant non ha confermato il comando.
        </Caption>
      )}
    </div>
  );
}
