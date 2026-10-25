import type { ReactNode } from 'react';
import {
  Button,
  Caption,
  Display,
  MaterialLayers,
  Numeric,
  Slider,
  Text,
  materialClass,
} from '@/components/primitives';
import type { WidgetProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { CommandFeedback } from '../shared/CommandFeedback';
import { ControlIcon, aliasIcon, type ControlIconName } from '../shared/ControlIcon';
import { densityOf, entityName } from '../shared/entity';
import {
  COMMAND_LABELS,
  COMMON_LABELS,
  FAN_DIRECTION_LABELS,
  fanPresetLabel,
} from '../shared/labels';
import { stateFit } from '../shared/valueFit';
import { WidgetContent, WidgetLoading, WidgetMissing } from '../shared/WidgetContent';
import { useFanControl, type FanControl } from './useFanControl';

/** Status of the legacy FanCard: preset, speed or on/off. */
export function fanStatusText(fan: FanControl): string {
  if (!fan.available) return COMMON_LABELS.unavailable;
  if (!fan.on) return COMMON_LABELS.off;
  if (fan.hasPreset && fan.presetMode) return fanPresetLabel(fan.presetMode);
  if (fan.hasSpeed) return `${fan.speed}%`;
  return COMMON_LABELS.on;
}

/** Power knob: switch with the fan glyph (no endless spin: the state is in text and colour). */
export function FanPowerKnob({
  fan,
  name,
  icon,
  disabled,
}: {
  fan: FanControl;
  name: string;
  icon: ControlIconName;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={fan.on}
      aria-busy={fan.power.pending || undefined}
      aria-invalid={fan.power.failed || undefined}
      aria-label={name}
      disabled={disabled || !fan.available || !fan.canTogglePower}
      className={materialClass(
        { behavior: 'press', shape: 'circle', size: 'lg' },
        'ctl-knob',
        fan.on && 'ctl-knob--on',
        fan.power.failed && 'aca-m--error'
      )}
      onClick={fan.togglePower}
    >
      <MaterialLayers contentClassName="ctl-knob__content">
        <span className="ctl-knob__glow" aria-hidden="true" />
        <ControlIcon name={fan.available ? icon : 'warning'} size="md" />
      </MaterialLayers>
    </button>
  );
}

/** Oscillation and direction toggles (aria-pressed), when the fan supports them. */
export function FanModeButtons({
  fan,
  name,
  disabled,
}: {
  fan: FanControl;
  name: string;
  disabled: boolean;
}) {
  if (!fan.hasOscillation && !fan.hasDirection) return null;
  const blocked = disabled || !fan.available;
  return (
    <div className="ctl-stepper">
      {fan.hasDirection && (
        <Button
          variant="control"
          shape="circle"
          size="md"
          aria-pressed={fan.direction === 'reverse'}
          aria-busy={fan.turning.pending || undefined}
          aria-label={`Direzione di ${name}: ${FAN_DIRECTION_LABELS[fan.direction] ?? 'non indicata'}`}
          disabled={blocked}
          onClick={fan.reverseDirection}
        >
          <ControlIcon
            name={fan.direction === 'reverse' ? 'rotateLeft' : 'rotateRight'}
            size="md"
          />
        </Button>
      )}
      {fan.hasOscillation && (
        <Button
          variant="control"
          shape="circle"
          size="md"
          aria-pressed={fan.oscillating}
          aria-busy={fan.oscillation.pending || undefined}
          aria-label={`Oscillazione di ${name}`}
          disabled={blocked}
          onClick={fan.toggleOscillation}
        >
          <ControlIcon name="oscillate" size="md" />
        </Button>
      )}
    </div>
  );
}

/** Fan widget (legacy FanCard): power, speed and modes by size. */
export function FanWidget({ id, size, editMode }: WidgetProps) {
  const runtime = useWidgetRuntime();
  const fan = useFanControl(id, editMode);
  const density = densityOf(size);
  const name = entityName(runtime, id, fan.entity);

  if (!runtime.entitiesLoaded) return <WidgetLoading size={size} />;
  if (!fan.entity) return <WidgetMissing size={size} name={name} editMode={editMode} />;

  const icon = aliasIcon(runtime.customIcons[id]) ?? aliasIcon(fan.entity.attributes.icon) ?? 'fan';
  const status = fanStatusText(fan);
  const valueClass = fan.pending ? 'ctl-value ctl-value--pending' : 'ctl-value';
  const knob = <FanPowerKnob fan={fan} name={name} icon={icon} disabled={editMode} />;
  const stateWord = fan.available ? (fan.on ? 'Acceso' : 'Spento') : '--';
  // `fit`: the state alone in the bottom pole of a 2×2 grows with the tile (L-19).
  const figure = (displaySize: 'sm' | 'md', fit = false) => {
    const sized = fit && !(fan.available && fan.hasSpeed) ? stateFit(stateWord, 1) : null;
    return (
      <Display
        as="span"
        size={displaySize}
        className={sized ? 'ctl-figure ctl-fit' : 'ctl-figure'}
        style={sized?.style}
      >
        {fan.available && fan.hasSpeed ? (
          <Numeric className={valueClass}>
            {fan.speed}
            <span className="ctl-unit">%</span>
          </Numeric>
        ) : (
          <span className={valueClass}>{stateWord}</span>
        )}
      </Display>
    );
  };
  const slider = fan.hasSpeed ? (
    <Slider
      className="ctl-slider"
      size="sm"
      value={fan.speed}
      min={0}
      max={100}
      step={fan.speedStep}
      label={`Velocità di ${name}`}
      valueText={`${fan.speed}%`}
      pending={fan.speedCommand.pending}
      error={fan.speedCommand.failed}
      disabled={editMode || !fan.available}
      onValueChange={fan.setSpeed}
      data-no-long-press
    />
  ) : null;
  const heading = (
    <div className="ctl-heading ctl-grow">
      <Text className="ctl-name ctl-clamp-2">{name}</Text>
      <Caption className="ctl-status">{status}</Caption>
    </div>
  );
  const pendingText = fan.pending ? COMMAND_LABELS.pending : null;

  let body: ReactNode;
  if (density === 'compact') {
    body = (
      <>
        <div className="ctl-row ctl-row--top">
          {knob}
          {fan.hasSpeed && figure('sm')}
        </div>
        <div className="ctl-heading">
          <Text className="ctl-name ctl-clamp-2">{name}</Text>
          {!fan.hasSpeed && <Caption className="ctl-status">{status}</Caption>}
        </div>
        <CommandFeedback message={fan.message} />
      </>
    );
  } else if (density === 'wide') {
    body = (
      <>
        <div className="ctl-row ctl-row--top">
          {knob}
          {heading}
        </div>
        <CommandFeedback message={fan.message} pendingText={pendingText} />
        <div className="ctl-row ctl-row--bottom">
          <div className="ctl-grow">{slider}</div>
          <FanModeButtons fan={fan} name={name} disabled={editMode} />
        </div>
      </>
    );
  } else if (density === 'tall') {
    body = (
      <>
        <div className="ctl-row ctl-row--top">{knob}</div>
        {figure('sm')}
        {heading}
        <CommandFeedback message={fan.message} pendingText={pendingText} />
        <div className="ctl-row ctl-row--bottom">{slider}</div>
      </>
    );
  } else {
    body = (
      <>
        <div className="ctl-row ctl-row--top">
          {knob}
          {heading}
          <FanModeButtons fan={fan} name={name} disabled={editMode} />
        </div>
        {/* 2×2 (L-19): the reading at the bottom, with the speed slider that changes it. */}
        <div className="ctl-pole">
          {figure('md', !slider)}
          <CommandFeedback message={fan.message} pendingText={pendingText} />
          {slider}
        </div>
      </>
    );
  }

  return (
    <WidgetContent
      size={size}
      name={name}
      editMode={editMode}
      onOpen={() => runtime.openDetails(id)}
      className="ctl-fan"
    >
      {body}
    </WidgetContent>
  );
}
