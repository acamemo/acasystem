import {
  Button,
  Display,
  Numeric,
  Popover,
  SelectTrigger,
  Text,
  Toggle,
} from '@/components/primitives';
import { ControlIcon } from '../shared/ControlIcon';
import { stringAttr } from '../shared/entity';
import { italianNumber } from '../shared/format';
import { figureFit, stateFit } from '../shared/valueFit';
import type { SensorControls } from './useSensorControls';
import type { SensorModel } from './sensorModel';

/**
 * Main value: number with unit (tabular, never wrapped) or the state wording. With `fit` (the
 * reading alone in the bottom pole of a 2×2), it grows with the widget without being cut.
 */
export function SensorValue({
  model,
  size,
  pending = false,
  fit = false,
}: {
  model: SensorModel;
  size: 'sm' | 'md' | 'lg';
  pending?: boolean;
  fit?: boolean;
}) {
  const text = model.showVariant && model.isRangeVariant ? model.chartDisplay : model.displayState;
  const showUnit = !!model.unit && model.valueMode !== 'percent';
  const className = ['ctl-value', pending && 'ctl-value--pending'].filter(Boolean).join(' ');
  if (model.isNumeric) {
    const figure = fit ? figureFit(text, showUnit ? model.unit : '') : null;
    return (
      <Display
        as="span"
        size={size === 'lg' ? 'md' : 'sm'}
        className={figure ? 'ctl-figure ctl-fit ctl-fit--figure' : 'ctl-figure'}
        style={figure?.style}
      >
        <Numeric className={className}>
          {text}
          {showUnit && <span className="ctl-unit">{` ${model.unit}`}</span>}
        </Numeric>
      </Display>
    );
  }
  const state = fit ? stateFit(text) : null;
  return (
    <Text
      className={[
        className,
        'ctl-state',
        size === 'sm' ? 'ctl-state--sm' : size === 'lg' ? 'ctl-state--lg' : undefined,
        state ? `ctl-fit ctl-clamp-${state.lines}` : 'ctl-clamp-2',
      ]
        .filter(Boolean)
        .join(' ')}
      style={state?.style}
    >
      {text}
    </Text>
  );
}

/** Options of a select entity in a popover menu (aria-pressed marks the current one). */
export function OptionPicker({
  controls,
  name,
  disabled,
}: {
  controls: SensorControls;
  name: string;
  disabled: boolean;
}) {
  const options = controls.model?.selectOptions ?? [];
  return (
    <Popover
      label={`Opzioni di ${name}`}
      placement="bottom-end"
      contentClassName="ctl-menu"
      trigger={(props) => (
        <SelectTrigger
          size="sm"
          label={controls.option || 'Nessuna opzione'}
          aria-haspopup="dialog"
          aria-busy={controls.optionPending || undefined}
          disabled={disabled}
          {...props}
        />
      )}
    >
      {(close) =>
        options.map((option) => (
          <Button
            key={option}
            variant="control"
            size="sm"
            className="ctl-menu__item"
            aria-pressed={option === controls.option}
            onClick={() => {
              controls.selectOption(option);
              close();
            }}
          >
            {option}
          </Button>
        ))
      }
    </Popover>
  );
}

/** input_number: −, value, + (disabled at the limits, like the legacy card). */
export function NumberStepper({
  controls,
  name,
  disabled,
  showValue = true,
}: {
  controls: SensorControls;
  name: string;
  disabled: boolean;
  showValue?: boolean;
}) {
  const value = controls.numberValue;
  // The stepper shows the raw state of the input_number, so its own unit (no conversion).
  const unit = stringAttr(controls.entity, 'unit_of_measurement');
  return (
    <div className="ctl-stepper" aria-busy={controls.numberPending || undefined}>
      <Button
        variant="control"
        shape="circle"
        size="md"
        aria-label={`Diminuisci ${name}`}
        disabled={disabled || value === null || value <= controls.numberMin}
        onClick={() => controls.stepNumber(-1)}
      >
        <ControlIcon name="minus" size="md" />
      </Button>
      {showValue && (
        <Numeric className={controls.numberPending ? 'ctl-value--pending' : undefined}>
          {value === null ? '--' : italianNumber(String(value))}
          {unit ? ` ${unit}` : ''}
        </Numeric>
      )}
      <Button
        variant="control"
        shape="circle"
        size="md"
        aria-label={`Aumenta ${name}`}
        disabled={disabled || value === null || value >= controls.numberMax}
        onClick={() => controls.stepNumber(1)}
      >
        <ControlIcon name="add" size="md" />
      </Button>
    </div>
  );
}

/** Button of the configured action: label and icon, or only the icon when space is short. */
export function ActionButton({
  controls,
  compact,
}: {
  controls: SensorControls;
  compact: boolean;
}) {
  const model = controls.model;
  if (!model) return null;
  const confirmed = controls.actionStatus === 'confirmed' || controls.actionStatus === 'sent';
  const icon = confirmed ? 'ok' : model.actionIcon;
  return (
    <Button
      variant="control"
      shape={compact ? 'circle' : 'pill'}
      size={compact ? 'md' : 'sm'}
      loading={controls.actionPending}
      disabled={controls.actionDisabled && !controls.actionPending}
      aria-label={compact ? model.actionLabel : undefined}
      title={model.actionLabel}
      onClick={() => controls.runAction()}
      contentClassName="ctl-action__content"
    >
      <ControlIcon name={icon} size="md" />
      {!compact && <span className="aca-m__label ctl-clamp-1">{model.actionLabel}</span>}
    </Button>
  );
}

/** Acceso/Spento switch of a toggle entity, through the action hook (turn_on / turn_off). */
export function EntityToggle({
  controls,
  name,
  compact,
  describedBy,
}: {
  controls: SensorControls;
  name: string;
  compact: boolean;
  describedBy?: string;
}) {
  return (
    <Toggle
      checked={controls.toggleOn}
      compact={compact}
      pending={controls.actionPending}
      error={controls.actionStatus === 'error' || controls.actionStatus === 'timeout'}
      disabled={controls.actionDisabled && !controls.actionPending}
      aria-label={name}
      aria-describedby={describedBy}
      onClick={() => controls.setToggle(!controls.toggleOn)}
    />
  );
}
