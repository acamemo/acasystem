import { useEffect, useRef } from 'react';
import { Button, Caption, Icon, Slider, Toggle } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { useServiceCatalog } from '../../adaptive/useServiceCatalog';
import { CommandFeedback } from '../../controls/shared/CommandFeedback';
import { useTrackedCommand } from '../../controls/shared/useTrackedCommand';
import { OptionPicker } from '../../utilities/shared/details';
import {
  fanDirectionCall,
  fanOscillationCall,
  fanPowerCall,
  fanPowerSupported,
  fanPresetCall,
  fanPresetSupported,
  fanReading,
  fanSpeedCall,
  productFanPresetLabel,
  productFanView,
} from './productFanModel';

const near = (requested: number | null, observed: number | null) =>
  requested !== null && observed !== null && Math.abs(requested - observed) < 0.5;
/** Each control retains its own outcome; turning off never erases a sent speed/preset failure. */
export function ProductFanControls({
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
    view = productFanView(runtime.entities[entityId]);
  const on = useTrackedCommand(view.state),
    off = useTrackedCommand(view.state);
  const speed = useTrackedCommand(view.percentage, near),
    preset = useTrackedCommand(view.preset);
  const oscillation = useTrackedCommand(view.oscillating),
    direction = useTrackedCommand(view.direction);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    latest = useRef({ runtime, services, disabled });
  useEffect(() => {
    latest.current = { runtime, services, disabled };
  });
  const blocked =
    disabled ||
    !runtime.entitiesLoaded ||
    !runtime.conn ||
    runtime.conn.connected === false ||
    !view.available;
  const { clear: clearOn } = on,
    { clear: clearOff } = off,
    { clear: clearSpeed } = speed;
  const { clear: clearPreset } = preset,
    { clear: clearOscillation } = oscillation,
    { clear: clearDirection } = direction;
  useEffect(() => {
    if (!blocked) return;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    clearOn();
    clearOff();
    clearSpeed();
    clearPreset();
    clearOscillation();
    clearDirection();
  }, [blocked, clearOn, clearOff, clearSpeed, clearPreset, clearOscillation, clearDirection]);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [entityId]
  );
  const current = () => {
    const now = latest.current;
    return {
      ...now,
      view: productFanView(now.runtime.entities[entityId]),
      blocked:
        now.disabled ||
        !now.runtime.entitiesLoaded ||
        !now.runtime.conn ||
        now.runtime.conn.connected === false,
    };
  };
  const power = (turnOn: boolean) => {
    const now = current(),
      command = turnOn ? on : off,
      call = fanPowerCall(now.view, now.services, turnOn);
    if (now.blocked || !call || command.pending || (turnOn && off.pending)) return;
    if (!turnOn && timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
      clearSpeed();
    }
    command.run(turnOn ? 'on' : 'off', 'fan', call.service, { entity_id: entityId });
  };
  const setSpeed = (raw: number) => {
    const now = current(),
      call = fanSpeedCall(now.view, now.services, raw);
    if (now.blocked || off.pending || !call) return;
    if (call.data.percentage === now.view.percentage) {
      if (timer.current !== null) {
        clearTimeout(timer.current);
        timer.current = null;
        clearSpeed();
      }
      return;
    }
    const requested = call.data.percentage;
    speed.request(requested);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      const active = current(),
        checked = fanSpeedCall(active.view, active.services, requested);
      if (active.blocked || !checked || checked.data.percentage !== requested) {
        clearSpeed();
        return;
      }
      speed.run(requested, 'fan', checked.service, { entity_id: entityId, ...checked.data });
    }, 200);
  };
  return (
    <div className="product-fan-controls" data-compact={compact || undefined}>
      <div className="product-fan-power">
        <div
          className="product-fan-power__actions"
          role="group"
          aria-label={`Accensione di ${label}`}
        >
          {[true, false]
            .filter((turnOn) => fanPowerSupported(view, services, turnOn))
            .map((turnOn) => {
              const command = turnOn ? on : off;
              return (
                <Button
                  key={String(turnOn)}
                  variant="control"
                  size="sm"
                  shape={compact ? 'circle' : 'pill'}
                  aria-label={`${turnOn ? 'Accendi' : 'Spegni'} ${label}`}
                  aria-pressed={view.available && view.state === (turnOn ? 'on' : 'off')}
                  aria-busy={command.pending || undefined}
                  disabled={blocked || command.pending || (turnOn && off.pending)}
                  onClick={() => power(turnOn)}
                >
                  <Icon name={turnOn ? 'power' : 'stop'} />
                  {!compact && <span>{turnOn ? 'Accendi' : 'Spegni'}</span>}
                </Button>
              );
            })}
        </div>
        <CommandFeedback
          message={off.message || on.message}
          pendingText={
            !compact
              ? off.pending
                ? 'Spegnimento richiesto'
                : on.pending
                  ? 'Accensione richiesta'
                  : null
              : null
          }
        />
      </div>
      {!compact && (
        <>
          {view.percentage !== null && fanSpeedCall(view, services, view.percentage) && (
            <div className="product-fan-control">
              <Caption>Velocità osservata · {fanReading(view.percentage)}</Caption>
              <Slider
                label={`Velocità di ${label}`}
                value={speed.value ?? view.percentage}
                min={0}
                max={100}
                step={view.step!}
                valueText={`${fanReading(speed.value ?? view.percentage)} richiesto`}
                pending={speed.pending}
                error={speed.failed}
                disabled={blocked || off.pending}
                onValueChange={setSpeed}
                data-no-long-press
              />
              <CommandFeedback
                message={speed.message}
                pendingText={
                  speed.pending ? `Velocità richiesta · ${fanReading(speed.value)}` : null
                }
              />
            </div>
          )}
          {fanPresetSupported(view, services) && (
            <div className="product-fan-control">
              <Caption>Modalità osservata · {productFanPresetLabel(view.preset)}</Caption>
              <OptionPicker
                label={`Modalità di ${label}`}
                value={preset.value}
                options={view.presets.map((value) => ({
                  value,
                  label: productFanPresetLabel(value),
                }))}
                disabled={blocked || preset.pending}
                pending={preset.pending}
                isolateEscape
                onSelect={(value) => {
                  const now = current(),
                    call = fanPresetCall(now.view, now.services, value);
                  if (!now.blocked && call && !preset.pending && value !== now.view.preset)
                    preset.run(value, 'fan', call.service, { entity_id: entityId, ...call.data });
                }}
              />
              <CommandFeedback
                message={preset.message}
                pendingText={
                  preset.pending
                    ? `Modalità richiesta · ${productFanPresetLabel(preset.value)}`
                    : null
                }
              />
            </div>
          )}
          {view.oscillating !== null && fanOscillationCall(view, services, !view.oscillating) && (
            <div className="product-fan-control">
              <div className="product-fan-control__line">
                <Caption>Oscillazione osservata · {view.oscillating ? 'Sì' : 'No'}</Caption>
                <Toggle
                  aria-label={`Oscillazione di ${label}`}
                  checked={oscillation.value ?? view.oscillating}
                  pending={oscillation.pending}
                  error={oscillation.failed}
                  disabled={blocked || oscillation.pending}
                  onClick={() => {
                    const now = current(),
                      call = fanOscillationCall(now.view, now.services, !now.view.oscillating);
                    if (!now.blocked && call && !oscillation.pending)
                      oscillation.run(call.data.oscillating, 'fan', call.service, {
                        entity_id: entityId,
                        ...call.data,
                      });
                  }}
                />
              </div>
              <CommandFeedback
                message={oscillation.message}
                pendingText={oscillation.pending ? 'Oscillazione richiesta' : null}
              />
            </div>
          )}
          {view.direction !== null && fanDirectionCall(view, services, view.direction) && (
            <div className="product-fan-control">
              <Caption>
                Direzione osservata · {view.direction === 'forward' ? 'Avanti' : 'Indietro'}
              </Caption>
              <OptionPicker
                label={`Direzione di ${label}`}
                value={direction.value}
                options={[
                  { value: 'forward', label: 'Avanti' },
                  { value: 'reverse', label: 'Indietro' },
                ]}
                disabled={blocked || direction.pending}
                pending={direction.pending}
                isolateEscape
                onSelect={(value) => {
                  const now = current(),
                    call = fanDirectionCall(now.view, now.services, value);
                  if (!now.blocked && call && !direction.pending && value !== now.view.direction)
                    direction.run(call.data.direction, 'fan', call.service, {
                      entity_id: entityId,
                      ...call.data,
                    });
                }}
              />
              <CommandFeedback
                message={direction.message}
                pendingText={direction.pending ? 'Direzione richiesta' : null}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
