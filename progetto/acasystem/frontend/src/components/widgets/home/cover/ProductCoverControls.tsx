import { useEffect, useRef } from 'react';
import { Button, Caption, Icon, Slider } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { useServiceCatalog } from '../../adaptive/useServiceCatalog';
import { CommandFeedback } from '../../controls/shared/CommandFeedback';
import { useTrackedCommand } from '../../controls/shared/useTrackedCommand';
import {
  coverActionCall,
  coverActionSupported,
  coverReading,
  coverTargetCall,
  productCoverView,
  type CoverAction,
} from './productCoverModel';

const motionMatches = (request: string, observed: string) =>
  request === 'stop'
    ? observed === 'open' || observed === 'closed'
    : request === 'open'
      ? observed === 'open' || observed === 'opening'
      : observed === 'closed' || observed === 'closing';
const near = (request: number | null, observed: number | null) =>
  request !== null && observed !== null && Math.abs(request - observed) < 0.5;
const actions = [
  { key: 'open', label: 'Apri', icon: 'chevronUp' },
  { key: 'stop', label: 'Ferma', icon: 'stop' },
  { key: 'close', label: 'Chiudi', icon: 'chevronDown' },
] as const;

/** Stop owns a separate request and cancels unsent position/tilt gestures. */
export function ProductCoverControls({
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
  const view = productCoverView(runtime.entities[entityId]);
  const movement = useTrackedCommand(view.state, motionMatches, 60_000);
  const stop = useTrackedCommand(view.state, motionMatches, 60_000);
  const position = useTrackedCommand(view.position, near, 60_000);
  const tilt = useTrackedCommand(view.tilt, near, 60_000);
  const timers = useRef<{
    position: ReturnType<typeof setTimeout> | null;
    tilt: ReturnType<typeof setTimeout> | null;
  }>({ position: null, tilt: null });
  const latest = useRef({ runtime, services, disabled });
  useEffect(() => {
    latest.current = { runtime, services, disabled };
  });
  const blocked =
    disabled ||
    !runtime.entitiesLoaded ||
    !runtime.conn ||
    runtime.conn.connected === false ||
    !view.available;
  const { clear: clearMovement } = movement,
    { clear: clearStop } = stop;
  const { clear: clearPosition } = position,
    { clear: clearTilt } = tilt;
  useEffect(() => {
    if (blocked) {
      for (const key of ['position', 'tilt'] as const) {
        if (timers.current[key] !== null) clearTimeout(timers.current[key]);
        timers.current[key] = null;
      }
      clearMovement();
      clearStop();
      clearPosition();
      clearTilt();
    }
  }, [blocked, clearMovement, clearStop, clearPosition, clearTilt]);
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const key of ['position', 'tilt'] as const)
        if (pending[key] !== null) clearTimeout(pending[key]);
    };
  }, [entityId]);
  const act = (action: CoverAction) => {
    const now = latest.current,
      observed = productCoverView(now.runtime.entities[entityId]);
    const call = coverActionCall(observed, now.services, action);
    const busy =
      action === 'stop'
        ? stop.pending
        : movement.pending || position.pending || tilt.pending || stop.pending;
    if (
      now.disabled ||
      !now.runtime.entitiesLoaded ||
      !now.runtime.conn ||
      now.runtime.conn.connected === false ||
      !call ||
      busy
    )
      return;
    if (action === 'stop') {
      for (const key of ['position', 'tilt'] as const) {
        if (timers.current[key] !== null) clearTimeout(timers.current[key]);
        timers.current[key] = null;
      }
      clearMovement();
      clearPosition();
      clearTilt();
      stop.run('stop', 'cover', call.service, { entity_id: entityId });
    } else
      movement.run(action === 'open' ? 'open' : 'closed', 'cover', call.service, {
        entity_id: entityId,
      });
  };
  const target = (key: 'position' | 'tilt', value: number) => {
    const command = key === 'position' ? position : tilt;
    if (blocked || stop.pending || !coverTargetCall(view, services, key, value)) return;
    command.request(value);
    if (timers.current[key] !== null) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => {
      timers.current[key] = null;
      const now = latest.current,
        observed = productCoverView(now.runtime.entities[entityId]);
      const call = coverTargetCall(observed, now.services, key, value);
      if (
        now.disabled ||
        !now.runtime.entitiesLoaded ||
        !now.runtime.conn ||
        now.runtime.conn.connected === false ||
        !call
      ) {
        command.clear();
        return;
      }
      command.run(value, 'cover', call.service, { entity_id: entityId, ...call.data });
    }, 200);
  };
  const feedback = stop.message || movement.message || position.message || tilt.message;
  const pending = stop.pending || movement.pending || position.pending || tilt.pending;
  return (
    <div className="product-cover-controls" data-compact={compact || undefined}>
      <div
        className="product-cover-controls__actions"
        role="group"
        aria-label={`Comandi di ${label}`}
      >
        {actions
          .filter((action) => coverActionSupported(view, services, action.key))
          .map((action) => (
            <Button
              key={action.key}
              variant="control"
              size="sm"
              shape={compact ? 'circle' : 'pill'}
              aria-label={`${action.label} ${label}`}
              aria-busy={
                (action.key === 'stop'
                  ? stop.pending
                  : movement.pending &&
                    movement.value === (action.key === 'open' ? 'open' : 'closed')) || undefined
              }
              disabled={
                blocked ||
                (action.key === 'stop'
                  ? stop.pending
                  : movement.pending || position.pending || tilt.pending || stop.pending)
              }
              onClick={() => act(action.key)}
            >
              <Icon name={action.icon} />
              {!compact && <span>{action.label}</span>}
            </Button>
          ))}
      </div>
      {!compact &&
        (['position', 'tilt'] as const).map((key) => {
          const observed = view[key],
            command = key === 'position' ? position : tilt;
          if (observed === null || !coverTargetCall(view, services, key, Math.round(observed)))
            return null;
          const title = key === 'position' ? 'Apertura' : 'Inclinazione';
          return (
            <div className="product-cover-target" key={key}>
              <Caption>
                {title} osservata · {coverReading(observed)}
              </Caption>
              <Slider
                min={0}
                max={100}
                step={1}
                value={command.value ?? observed}
                label={`${title} di ${label}`}
                valueText={`${coverReading(command.value ?? observed)} richiesto`}
                pending={command.pending}
                error={command.failed}
                disabled={blocked || stop.pending}
                onValueChange={(value) => target(key, value)}
                data-no-long-press
              />
              {command.pending && <Caption>Richiesta · {coverReading(command.value)}</Caption>}
            </div>
          );
        })}
      <CommandFeedback
        message={feedback}
        pendingText={pending && !compact ? 'In attesa di conferma' : null}
      />
    </div>
  );
}
