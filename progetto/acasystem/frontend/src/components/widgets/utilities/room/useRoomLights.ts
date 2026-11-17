import { useMemo } from 'react';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { useTrackedCommand } from '../../controls/shared/useTrackedCommand';
import { callSafely } from '../../controls/shared/service';
import { roomServiceAllowed } from './roomCapabilities';

const matches = (requested: Record<string, string>, observed: Record<string, string>) =>
  Object.entries(requested).every(([id, state]) => observed[id] === state);
/** The room's existing collective light action waits for each requested observed state. */
export function useRoomLights(ids: readonly string[]) {
  const runtime = useWidgetRuntime();
  const observed = useMemo(
    () => Object.fromEntries(ids.map((id) => [id, runtime.entities[id]?.state ?? ''])),
    [ids, runtime.entities]
  );
  const command = useTrackedCommand(observed, matches, 30_000);
  const lightsOn = ids.filter((id) => runtime.entities[id]?.state === 'on').length;
  const service = lightsOn > 0 ? 'turn_off' : 'turn_on';
  const ready = ids.filter((id) =>
    roomServiceAllowed(runtime.entities[id], runtime.services ?? null, 'light', service)
  );
  const disabled =
    !runtime.conn ||
    runtime.conn.connected === false ||
    runtime.editMode ||
    command.pending ||
    ready.length === 0;
  const toggleAllLights = () => {
    if (disabled) return;
    command.request(
      Object.fromEntries(ready.map((id) => [id, service === 'turn_off' ? 'off' : 'on']))
    );
    command.track(
      Promise.all(ready.map((id) => callSafely(runtime, 'light', service, { entity_id: id })))
    );
    command.settle();
  };
  return {
    lightsOn,
    toggleAllLights,
    lightsError: command.failed,
    lightsPending: command.pending,
    lightsMessage: command.message,
    lightsDisabled: disabled,
    unavailableLights: ids.length - ready.length,
  };
}
