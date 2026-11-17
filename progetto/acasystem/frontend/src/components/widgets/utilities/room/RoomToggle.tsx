import { Caption, Toggle } from '@/components/primitives';
import type { HassEntity } from '@/@types/ha';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { useTrackedCommand } from '../../controls/shared/useTrackedCommand';
import { roomServiceAllowed } from './roomCapabilities';

/** The observed state stays distinct from the requested one, including unknown/offline states. */
export function RoomToggle({
  entity,
  entityId,
  domain,
  label,
}: {
  entity: HassEntity | undefined;
  entityId: string;
  domain: string;
  label: string;
}) {
  const runtime = useWidgetRuntime();
  const command = useTrackedCommand(entity?.state ?? '', undefined, 30_000);
  const service = entity?.state === 'on' ? 'turn_off' : 'turn_on';
  const available = Boolean(
    runtime.entitiesLoaded &&
    runtime.conn &&
    runtime.conn.connected !== false &&
    !runtime.editMode &&
    roomServiceAllowed(entity, runtime.services ?? null, domain, service)
  );
  if (!entity || !['on', 'off'].includes(entity.state)) return <Caption>Non disponibile</Caption>;
  return (
    <span className="utility-stack">
      <Toggle
        aria-label={label}
        checked={command.value === 'on'}
        pending={command.pending}
        error={command.failed}
        disabled={!available || command.pending}
        compact
        onClick={() => {
          if (available && !command.pending)
            command.run(entity?.state === 'on' ? 'off' : 'on', domain, service, {
              entity_id: entityId,
            });
        }}
      />
      {command.message && <Caption role="status">{command.message}</Caption>}
    </span>
  );
}
