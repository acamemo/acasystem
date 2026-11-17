import { useEffect, useRef, useState } from 'react';
import { Button, Icon } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { useServiceCatalog } from '../../adaptive/useServiceCatalog';
import { CommandFeedback } from '../../controls/shared/CommandFeedback';
import { useTrackedCommand } from '../../controls/shared/useTrackedCommand';
import { callSafely } from '../../controls/shared/service';
import {
  MOWER_ACTIONS,
  mowerActionAllowed,
  mowerActionSupported,
  productMowerView,
  type MowerAction,
} from './productMowerModel';

/** Each request keeps its own outcome; stopping or docking never cancels a sent start. */
export function ProductMowerControls({
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
    view = productMowerView(runtime.entities[entityId]);
  const start = useTrackedCommand(view.state, undefined, 30_000),
    pause = useTrackedCommand(view.state, undefined, 30_000),
    stop = useTrackedCommand(view.state, undefined, 30_000),
    dock = useTrackedCommand(view.state, undefined, 30_000);
  const commands = { start_mowing: start, pause, stop, dock };
  const sending = useRef({ start_mowing: false, pause: false, stop: false, dock: false });
  const [inFlight, setInFlight] = useState({
    start_mowing: false,
    pause: false,
    stop: false,
    dock: false,
  });
  const mounted = useRef(false);
  const latest = useRef({ runtime, services, disabled, entityId, commands });
  latest.current = { runtime, services, disabled, entityId, commands };
  const blocked =
    disabled ||
    runtime.editMode ||
    !runtime.entitiesLoaded ||
    !runtime.conn ||
    runtime.conn.connected === false ||
    !view.available;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const busy = (action: MowerAction) =>
    action.service === 'start_mowing'
      ? Object.values(commands).some((command) => command.pending) ||
        Object.values(sending.current).some(Boolean)
      : commands[action.service].pending || sending.current[action.service];
  const send = (action: MowerAction) => {
    const now = latest.current,
      observed = productMowerView(now.runtime.entities[now.entityId]);
    const command = now.commands[action.service],
      starting = now.commands.start_mowing.pending || sending.current.start_mowing;
    const busyNow =
      action.service === 'start_mowing'
        ? Object.values(now.commands).some((item) => item.pending) ||
          Object.values(sending.current).some(Boolean)
        : command.pending || sending.current[action.service];
    if (
      now.entityId !== entityId ||
      now.disabled ||
      now.runtime.editMode ||
      !now.runtime.entitiesLoaded ||
      !now.runtime.conn ||
      now.runtime.conn.connected === false ||
      busyNow ||
      !mowerActionAllowed(observed, now.services, action, starting)
    )
      return;
    sending.current[action.service] = true;
    setInFlight((current) => ({ ...current, [action.service]: true }));
    command.request(action.target);
    const call = callSafely(now.runtime, 'lawn_mower', action.service, { entity_id: now.entityId });
    command.track(call);
    command.settle();
    const released = () => {
      sending.current[action.service] = false;
      if (mounted.current) setInFlight((current) => ({ ...current, [action.service]: false }));
    };
    void call.then(released, released);
  };
  const primary =
    view.state === 'mowing'
      ? (MOWER_ACTIONS.find(
          (action) => action.service === 'pause' && mowerActionSupported(view, services, action)
        ) ?? MOWER_ACTIONS.find((action) => action.service === 'stop'))
      : MOWER_ACTIONS[0];
  const actions = compact
    ? [primary, MOWER_ACTIONS[3]].filter((action): action is MowerAction => !!action)
    : MOWER_ACTIONS;
  return (
    <div className="product-mower-controls" data-compact={compact || undefined}>
      <div
        className="product-mower-controls__actions"
        role="group"
        aria-label={`Comandi di ${label}`}
      >
        {actions
          .filter((action) => mowerActionSupported(view, services, action))
          .map((action) => (
            <Button
              key={action.service}
              variant="control"
              size="sm"
              shape={compact ? 'circle' : 'pill'}
              aria-label={`${action.label} ${label}`}
              aria-busy={commands[action.service].pending || inFlight[action.service] || undefined}
              disabled={
                blocked ||
                busy(action) ||
              !mowerActionAllowed(view, services, action, start.pending || inFlight.start_mowing)
              }
              onClick={() => send(action)}
            >
              <Icon name={action.icon} />
              {!compact && <span>{action.label}</span>}
            </Button>
          ))}
      </div>
      {MOWER_ACTIONS.map((action) => (
        <CommandFeedback
          key={action.service}
          message={
            commands[action.service].message
              ? compact
                ? 'Non confermato'
                : 'Esito non confermato. Verifica lo stato del robot.'
              : null
          }
          pendingText={
            commands[action.service].pending
              ? compact
                ? 'Richiesto'
                : `${action.label}: richiesta in attesa`
              : null
          }
        />
      ))}
    </div>
  );
}
