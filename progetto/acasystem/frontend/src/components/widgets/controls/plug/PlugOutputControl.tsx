import { useEffect, useId } from 'react';
import { Caption, Toggle } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { useServiceCatalog } from '../../adaptive/useServiceCatalog';
import { CommandFeedback } from '../shared/CommandFeedback';
import { useTrackedCommand } from '../shared/useTrackedCommand';
import { outputAvailable } from './plugModel';

/** Exactly one output, through the same personal command/confirmation path in Home and details. */
export function PlugOutputControl({
  entityId,
  label,
  disabled = false,
  compact = false,
}: {
  entityId: string;
  label: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const runtime = useWidgetRuntime(),
    services = useServiceCatalog();
  const entity = runtime.entities[entityId];
  const command = useTrackedCommand(entity?.state === 'on');
  const clear = command.clear;
  const feedbackId = `plug-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const observed = outputAvailable(runtime.entities, entityId);
  const available =
    entityId.startsWith('switch.') &&
    runtime.entitiesLoaded &&
    Boolean(runtime.conn) &&
    runtime.conn?.connected !== false &&
    observed &&
    Object.hasOwn(services?.switch ?? {}, 'turn_on') &&
    Object.hasOwn(services?.switch ?? {}, 'turn_off');
  useEffect(() => {
    if (disabled || !available) clear();
  }, [disabled, available, clear]);
  return (
    <div className="product-plug-control">
      <div className="product-plug-control__line">
        <Caption id={`${feedbackId}-state`}>
          {observed ? (entity?.state === 'on' ? 'Acceso' : 'Spento') : 'Non disponibile'}
        </Caption>
        <Toggle
          compact={compact}
          aria-label={`Accensione di ${label}`}
          aria-describedby={`${feedbackId}-state ${feedbackId}`}
          onLabel={observed ? 'Acceso' : 'Non disponibile'}
          offLabel={observed ? 'Spento' : 'Non disponibile'}
          checked={command.value}
          pending={command.pending}
          error={command.failed}
          disabled={disabled || !available || command.pending}
          onClick={() => {
            if (disabled || !available || command.pending) return;
            command.run(!command.value, 'switch', command.value ? 'turn_off' : 'turn_on', {
              entity_id: entityId,
            });
          }}
        />
      </div>
      <CommandFeedback
        id={feedbackId}
        message={command.message}
        pendingText={command.pending ? 'Richiesto…' : null}
      />
    </div>
  );
}
