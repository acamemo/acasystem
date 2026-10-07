import { useCallback, useId } from 'react';
import {
  Body,
  Button,
  Caption,
  Heading,
  Numeric,
  Slider,
  Toggle,
} from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { CommandFeedback } from '../shared/CommandFeedback';
import { ControlIcon } from '../shared/ControlIcon';
import { entityName } from '../shared/entity';
import { COMMAND_LABELS, COMMON_LABELS } from '../shared/labels';
import { useThrottledCommand } from '../shared/useTrackedCommand';
import {
  currentHue,
  currentKelvin,
  groupMembers,
  kelvinRange,
  supportsColor,
  supportsColorTemp,
} from './lightModel';
import { lightStatusText } from './LightWidget';
import { useLightControl, type LightControl } from './useLightControl';

type ColorField = 'color_temp_kelvin' | 'hs_color';

/** Colour temperature or hue: throttled light.turn_on, requested until HA reports it. */
function useColorChannel(entityId: string, field: ColorField, confirmed: number) {
  const tolerance = field === 'hs_color' ? 3 : 60;
  const matches = useCallback(
    (requested: number, current: number) => Math.abs(requested - current) <= tolerance,
    [tolerance]
  );
  const toCall = useCallback(
    (value: number) => ({
      domain: 'light',
      service: 'turn_on',
      data:
        field === 'hs_color'
          ? { entity_id: entityId, hs_color: [value, 100] }
          : { entity_id: entityId, color_temp_kelvin: value },
    }),
    [entityId, field]
  );
  return useThrottledCommand(confirmed, matches, toCall);
}

function PowerRow({ control, name }: { control: LightControl; name: string }) {
  const runtime = useWidgetRuntime();
  const feedbackId = `luce-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-esito`;
  return (
    <div className="ctl-details__row">
      <div>
        <Body as="span">{lightStatusText(control, runtime.entities)}</Body>
        <CommandFeedback
          id={feedbackId}
          message={control.message}
          pendingText={control.pending ? COMMAND_LABELS.pending : null}
        />
      </div>
      <Toggle
        checked={control.on}
        pending={control.pending}
        error={control.failed}
        disabled={!control.available}
        aria-label={`Accensione di ${name}`}
        aria-describedby={feedbackId}
        onClick={control.toggle}
      />
    </div>
  );
}

function BrightnessSection({ control, name }: { control: LightControl; name: string }) {
  return (
    <section className="ctl-details__section" aria-label="Luminosità">
      <div className="ctl-details__row">
        <Caption>Luminosità</Caption>
        <Numeric className={control.pending ? 'ctl-value--pending' : undefined}>
          {control.percent}%
        </Numeric>
      </div>
      <div className="ctl-details__control">
        <Button
          variant="control"
          shape="circle"
          size="md"
          aria-label={`Diminuisci la luminosità di ${name}`}
          disabled={!control.available || control.percent <= 0}
          onClick={() => control.step(-1)}
        >
          <ControlIcon name="minus" size="md" />
        </Button>
        <Slider
          className="ctl-grow"
          value={control.percent}
          min={0}
          max={100}
          label={`Luminosità di ${name}`}
          valueText={`${control.percent}%`}
          pending={control.pending}
          error={control.failed}
          disabled={!control.available}
          onValueChange={(next) => control.setPercent(next, 'step')}
          data-no-long-press
        />
        <Button
          variant="control"
          shape="circle"
          size="md"
          aria-label={`Aumenta la luminosità di ${name}`}
          disabled={!control.available || control.percent >= 100}
          onClick={() => control.step(1)}
        >
          <ControlIcon name="add" size="md" />
        </Button>
      </div>
    </section>
  );
}

function TemperatureSection({ control, name }: { control: LightControl; name: string }) {
  const { min, max } = kelvinRange(control.entity);
  const channel = useColorChannel(
    control.entityId,
    'color_temp_kelvin',
    currentKelvin(control.entity)
  );
  return (
    <section className="ctl-details__section" aria-label="Temperatura del colore">
      <div className="ctl-details__row">
        <Caption>Temperatura del colore</Caption>
        <Numeric className={channel.pending ? 'ctl-value--pending' : undefined}>
          {channel.value} K
        </Numeric>
      </div>
      <Slider
        value={channel.value}
        min={min}
        max={max}
        step={50}
        label={`Temperatura del colore di ${name}`}
        valueText={`${channel.value} kelvin`}
        pending={channel.pending}
        error={channel.failed}
        disabled={!control.available}
        onValueChange={channel.set}
        data-no-long-press
      />
      <div className="ctl-details__row">
        <Caption>Calda</Caption>
        <Caption>Fredda</Caption>
      </div>
      <CommandFeedback message={channel.message} />
    </section>
  );
}

function ColorSection({ control, name }: { control: LightControl; name: string }) {
  const channel = useColorChannel(control.entityId, 'hs_color', currentHue(control.entity));
  return (
    <section className="ctl-details__section" aria-label="Colore">
      <div className="ctl-details__row">
        <Caption>Colore</Caption>
        <span className="ctl-inline">
          {/* The swatch shows the light's own colour: data, not a UI colour. */}
          <span
            className="ctl-swatch"
            aria-hidden="true"
            style={{ backgroundColor: `hsl(${channel.value} 100% 50%)` }}
          />
          <Numeric className={channel.pending ? 'ctl-value--pending' : undefined}>
            {channel.value}°
          </Numeric>
        </span>
      </div>
      <Slider
        value={channel.value}
        min={0}
        max={360}
        label={`Tonalità di ${name}`}
        valueText={`${channel.value} gradi`}
        pending={channel.pending}
        error={channel.failed}
        disabled={!control.available}
        onValueChange={channel.set}
        data-no-long-press
      />
      <CommandFeedback message={channel.message} />
    </section>
  );
}

function MemberRow({ entityId }: { entityId: string }) {
  const runtime = useWidgetRuntime();
  const control = useLightControl(entityId);
  const name = entityName(runtime, entityId, control.entity, entityId);
  return (
    <li className="ctl-details__member">
      <div className="ctl-details__row">
        <Body as="span" className="ctl-clamp-1">
          {name}
        </Body>
        <Toggle
          checked={control.on}
          pending={control.pending}
          error={control.failed}
          disabled={!control.available}
          aria-label={`Accensione di ${name}`}
          onClick={control.toggle}
        />
      </div>
      {control.dimmable && (
        <Slider
          size="sm"
          value={control.percent}
          min={0}
          max={100}
          label={`Luminosità di ${name}`}
          valueText={`${control.percent}%`}
          pending={control.pending}
          error={control.failed}
          disabled={!control.available}
          onValueChange={(next) => control.setPercent(next, 'step')}
          data-no-long-press
        />
      )}
      {!control.available && <Caption>{COMMON_LABELS.unavailable}</Caption>}
      <CommandFeedback message={control.message} />
    </li>
  );
}

/** Sheet content of a light: power, brightness, colour temperature, colour, group members. */
export function LightDetails({ id }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime();
  const control = useLightControl(id);
  const name = entityName(runtime, id, control.entity);

  if (!control.entity) {
    return (
      <Body tone="muted">
        {COMMON_LABELS.missing}. {COMMON_LABELS.missingHint}
      </Body>
    );
  }

  const showColorControls = control.dimmable;
  const members = groupMembers(control.entity);

  return (
    <div className="ctl-details">
      {!control.available && (
        <Body size="sm" tone="muted">
          {COMMON_LABELS.unavailableHint}
        </Body>
      )}
      <PowerRow control={control} name={name} />
      {control.dimmable && <BrightnessSection control={control} name={name} />}
      {showColorControls && supportsColorTemp(control.entity) && (
        <TemperatureSection control={control} name={name} />
      )}
      {showColorControls && supportsColor(control.entity) && (
        <ColorSection control={control} name={name} />
      )}
      {members.length > 0 && (
        <section className="ctl-details__section" aria-labelledby={`${id}-membri`}>
          <Heading level={3} size="sm" id={`${id}-membri`}>
            Luci del gruppo
          </Heading>
          <ul className="ctl-details__members">
            {members.map((member) => (
              <MemberRow key={member} entityId={member} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
