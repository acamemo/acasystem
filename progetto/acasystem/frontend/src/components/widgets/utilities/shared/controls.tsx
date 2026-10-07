import { useId, useState, type ReactNode } from 'react';
import { Button, Slider, Toggle } from '@/components/primitives';
import type { ServiceData } from '@/@types/ha';
import { isUnavailableState, type MaybeEntity } from './entity';
import { commandNotice, Notice } from './UtilityCard';
import { useCommand } from './useCommand';
import { useRequestedValue, type ValueCall } from './useRequestedValue';
import { UtilityIcon, type UtilityIconName } from './UtilityIcon';

/** True when the entity reports «on» (switch, light, input_boolean, automation, fan). */
export const isOnState = (entity: MaybeEntity) => entity?.state === 'on';

/**
 * On/off switch for an entity with requested-vs-confirmed: the switch moves at once and
 * pulses until Home Assistant reports the new state; failures are explained under it.
 */
export function CommandToggle({
  entity,
  entityId,
  domain,
  label,
  labelledBy,
  isOn = isOnState,
  onService = 'turn_on',
  offService = 'turn_off',
  compact = true,
  disabled = false,
}: {
  entity: MaybeEntity;
  entityId: string;
  domain: string;
  /** Accessible name when no visible label is linked. */
  label?: string;
  labelledBy?: string;
  isOn?: (entity: MaybeEntity) => boolean;
  onService?: string;
  offService?: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  const command = useCommand(entity);
  const [requestedOn, setRequestedOn] = useState(false);
  const noticeId = `esito-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const on = isOn(entity);
  const pending = command.pendingKey === 'toggle';
  const notice = commandNotice(command.errorKey, command.unconfirmedKey);
  const unavailable = !entity || isUnavailableState(entity.state);

  const toggle = () => {
    const next = !on;
    setRequestedOn(next);
    command.run({
      key: 'toggle',
      domain,
      service: next ? onService : offService,
      data: { entity_id: entityId },
      confirm: (current) => isOn(current) === next,
    });
  };

  return (
    <span className="utility-stack">
      <Toggle
        checked={pending ? requestedOn : on}
        compact={compact}
        pending={pending}
        error={Boolean(command.errorKey)}
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        aria-describedby={notice ? noticeId : undefined}
        disabled={disabled || unavailable}
        onClick={toggle}
      />
      {notice && (
        <Notice id={noticeId} tone={notice.tone} icon="warning" live>
          {notice.text}
        </Notice>
      )}
    </span>
  );
}

/** Button for a one-shot service (press, run, lock…), pending until acknowledged or confirmed. */
export function CommandButton({
  entity,
  domain,
  service,
  data,
  confirm,
  icon,
  children,
  label,
  variant = 'control',
  disabled = false,
}: {
  entity: MaybeEntity;
  domain: string;
  service: string;
  data: ServiceData;
  confirm?: (entity: MaybeEntity) => boolean;
  icon?: UtilityIconName;
  children: ReactNode;
  /** Accessible name when the visible text is not enough. */
  label?: string;
  variant?: 'control' | 'primary' | 'secondary';
  disabled?: boolean;
}) {
  const command = useCommand(entity);
  const noticeId = `esito-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const notice = commandNotice(command.errorKey, command.unconfirmedKey);
  return (
    <span className="utility-stack">
      <Button
        variant={variant}
        size="sm"
        loading={command.pendingKey === 'action'}
        aria-label={label}
        aria-describedby={notice ? noticeId : undefined}
        disabled={disabled}
        onClick={() => command.run({ key: 'action', domain, service, data, confirm })}
      >
        {icon && <UtilityIcon name={icon} size="sm" />}
        {children}
      </Button>
      {notice && (
        <Notice id={noticeId} tone={notice.tone} icon="warning" live>
          {notice.text}
        </Notice>
      )}
    </span>
  );
}

/**
 * Numeric setting with − / + steps and a slider (temperatures, limits): sends only the last
 * value and shows it as requested until confirmed.
 */
export function ValueStepper({
  label,
  confirmed,
  min,
  max,
  step,
  format,
  toCall,
  tolerance,
  disabled = false,
}: {
  label: string;
  confirmed: number | null;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  toCall: (value: number) => ValueCall | null;
  tolerance?: number;
  disabled?: boolean;
}) {
  const requested = useRequestedValue({ confirmed, toCall, tolerance: tolerance ?? step / 2 });
  const noticeId = `esito-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const value = requested.value ?? min;
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next / step) * step));
  const notice = requested.error
    ? { tone: 'danger' as const, text: 'Valore non impostato. Riprova.' }
    : requested.unconfirmed
      ? { tone: 'muted' as const, text: 'Nessuna conferma dal dispositivo.' }
      : null;
  return (
    <div className="utility-stack">
      <div className="utility-stepper" data-no-long-press>
        <Button
          variant="control"
          shape="circle"
          size="md"
          aria-label={`Diminuisci ${label.toLocaleLowerCase('it-IT')}`}
          disabled={disabled || value <= min}
          onClick={() => requested.request(clamp(value - step))}
        >
          <UtilityIcon name="minus" size="md" />
        </Button>
        <Slider
          label={label}
          value={value}
          min={min}
          max={max}
          step={step}
          valueText={format(value)}
          pending={requested.pending}
          error={requested.error}
          aria-describedby={notice ? noticeId : undefined}
          disabled={disabled}
          onValueChange={(next) => requested.request(clamp(next))}
        />
        <Button
          variant="control"
          shape="circle"
          size="md"
          aria-label={`Aumenta ${label.toLocaleLowerCase('it-IT')}`}
          disabled={disabled || value >= max}
          onClick={() => requested.request(clamp(value + step))}
        >
          <UtilityIcon name="add" size="md" />
        </Button>
      </div>
      {notice && (
        <Notice id={noticeId} tone={notice.tone} icon="warning" live>
          {notice.text}
        </Notice>
      )}
    </div>
  );
}
