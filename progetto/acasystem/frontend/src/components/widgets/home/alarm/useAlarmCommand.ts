import type { HassEntity } from 'home-assistant-js-websocket';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { useRequested } from '../shared/useRequested';
import { actionByKey, alarmCall, type AlarmAction } from './alarmModel';

export interface AlarmCommand {
  /** Action sent and not yet confirmed by the panel state. */
  pendingAction: AlarmAction | undefined;
  error: boolean;
  /** Sends the action; the code goes into the service data only. */
  run: (action: AlarmAction, code?: string, onSent?: () => void) => void;
  clearError: () => void;
}

/** Requested vs confirmed for the alarm: pending until the state matches the action. */
export function useAlarmCommand(entityId: string, entity: HassEntity): AlarmCommand {
  const { callService } = useWidgetRuntime();
  const command = useRequested<string>(
    entity.state,
    (state, key) => actionByKey(key)?.confirms.includes(state) ?? false
  );
  const run = (action: AlarmAction, code?: string, onSent?: () => void) => {
    const call = alarmCall(entityId, action, code);
    command.request(action.key, () =>
      Promise.resolve(callService(call.domain, call.service, call.data)).then((result) => {
        onSent?.();
        return result;
      })
    );
  };
  return {
    pendingAction: command.pending ? actionByKey(command.requested) : undefined,
    error: command.error,
    run,
    clearError: command.clearError,
  };
}
