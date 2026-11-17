import { useEffect, useRef, useState } from 'react';
import { Button, Caption, Icon } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { useServiceCatalog } from '../../adaptive/useServiceCatalog';
import { callSafely } from '../../controls/shared/service';
import { CommandFeedback } from '../../controls/shared/CommandFeedback';
import { useTrackedCommand } from '../../controls/shared/useTrackedCommand';
import { CommandResultError } from '@/api/commandApi';
import { OptionPicker } from '../../utilities/shared/details';
import {
  productVacuumView,
  VACUUM_ACTIONS,
  vacuumActionSupported,
  type VacuumAction,
} from './productVacuumModel';

/** Each action has independent in-flight feedback: pause/stop/home remain available during start/fan requests. */
function VacuumActionButton({
  action,
  entityId,
  label,
  disabled,
  compact,
}: {
  action: VacuumAction;
  entityId: string;
  label: string;
  disabled: boolean;
  compact: boolean;
}) {
  const runtime = useWidgetRuntime(),
    services = useServiceCatalog();
  const view = productVacuumView(runtime.entities[entityId]);
  const [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState('');
  const sending = useRef(false),
    mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  if (!vacuumActionSupported(view, services, action.service)) return null;
  return (
    <div className="product-vacuum-action">
      <Button
        variant="control"
        size="sm"
        shape={compact ? 'circle' : 'pill'}
        aria-label={`${action.label} ${label}`}
        aria-busy={busy || undefined}
        disabled={disabled || busy}
        onClick={() => {
          if (disabled || sending.current || !vacuumActionSupported(view, services, action.service))
            return;
          sending.current = true;
          setBusy(true);
          setFeedback('Invio del comando…');
          void callSafely(runtime, 'vacuum', action.service, { entity_id: entityId })
            .then(() => {
              if (mounted.current) setFeedback('Home Assistant ha accettato il comando.');
            })
            .catch((error: unknown) => {
              if (mounted.current)
                setFeedback(
                  error instanceof CommandResultError && error.code === 'RESULT_UNKNOWN'
                    ? 'Esito non determinato. Verifica lo stato del robot.'
                    : 'Comando non riuscito. Verifica il robot e riprova.'
                );
            })
            .finally(() => {
              sending.current = false;
              if (mounted.current) setBusy(false);
            });
        }}
      >
        <Icon name={action.icon} />
        {!compact && <span>{action.label}</span>}
      </Button>
      <Caption role="status" aria-live="polite" aria-label={feedback || undefined}>
        {compact && feedback
          ? busy
            ? 'Richiesto'
            : feedback.startsWith('Home Assistant')
              ? 'Accettato da HA'
              : feedback.startsWith('Esito non determinato')
                ? 'Da verificare'
                : 'Non riuscito'
          : feedback}
      </Caption>
    </div>
  );
}
export function ProductVacuumControls({
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
    services = useServiceCatalog(),
    view = productVacuumView(runtime.entities[entityId]);
  const fan = useTrackedCommand(view.fanSpeed);
  const blocked =
    disabled ||
    runtime.editMode ||
    !runtime.entitiesLoaded ||
    !runtime.conn ||
    runtime.conn.connected === false ||
    !view.available;
  const primary =
    view.state === 'cleaning'
      ? (VACUUM_ACTIONS.find(
          (action) =>
            action.service === 'pause' && vacuumActionSupported(view, services, action.service)
        ) ?? VACUUM_ACTIONS.find((action) => action.service === 'stop'))
      : VACUUM_ACTIONS[0];
  const actions = compact
    ? [primary, VACUUM_ACTIONS[3]].filter((action): action is VacuumAction => !!action)
    : VACUUM_ACTIONS;
  return (
    <div className="product-vacuum-controls" data-compact={compact || undefined}>
      <div
        className="product-vacuum-controls__actions"
        role="group"
        aria-label={`Comandi di ${label}`}
      >
        {actions.map((action) => (
          <VacuumActionButton
            key={action.service}
            action={action}
            entityId={entityId}
            label={label}
            disabled={blocked}
            compact={compact}
          />
        ))}
      </div>
      {!compact &&
        vacuumActionSupported(view, services, 'set_fan_speed') &&
        view.speeds.length > 0 && (
          <>
            <OptionPicker
              label={`Aspirazione di ${label}`}
              value={view.fanSpeed}
              options={view.speeds.map((value) => ({ value, label: value }))}
              disabled={blocked || fan.pending}
              pending={fan.pending}
              onSelect={(value) => {
                if (
                  !blocked &&
                  !fan.pending &&
                  view.speeds.includes(value) &&
                  vacuumActionSupported(view, services, 'set_fan_speed')
                )
                  fan.run(value, 'vacuum', 'set_fan_speed', {
                    entity_id: entityId,
                    fan_speed: value,
                  });
              }}
              isolateEscape
            />
            <CommandFeedback
              message={fan.message ? 'Esito non determinato. Verifica lo stato del robot.' : null}
              pendingText={fan.pending ? `Aspirazione richiesta: ${fan.value}` : null}
            />
          </>
        )}
    </div>
  );
}
