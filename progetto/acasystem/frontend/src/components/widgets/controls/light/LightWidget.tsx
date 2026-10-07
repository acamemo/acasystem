import type { ReactNode } from 'react';
import { Button, Caption, Display, Numeric, Slider, Text } from '@/components/primitives';
import type { WidgetProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { CommandFeedback } from '../shared/CommandFeedback';
import { ControlIcon, aliasIcon } from '../shared/ControlIcon';
import { densityOf, entityName } from '../shared/entity';
import { COMMAND_LABELS, COMMON_LABELS } from '../shared/labels';
import { stateFit } from '../shared/valueFit';
import { WidgetContent, WidgetLoading, WidgetMissing } from '../shared/WidgetContent';
import { BrightnessKnob } from './BrightnessKnob';
import { groupMembers } from './lightModel';
import { useLightControl, type LightControl } from './useLightControl';

/** Status line: unavailable, members on in a group, or on/off. */
export function lightStatusText(
  control: LightControl,
  entities: Record<string, { state?: string } | undefined>
): string {
  if (!control.available) return COMMON_LABELS.unavailable;
  const members = groupMembers(control.entity);
  if (members.length > 0) {
    const on = members.filter((member) => entities[member]?.state === 'on').length;
    return on > 0 ? `${on} di ${members.length} accese` : COMMON_LABELS.off;
  }
  return control.on ? COMMON_LABELS.on : COMMON_LABELS.off;
}

/** Status caption; unavailable gets a warning glyph, so colour is not the only signal. */
function StatusCaption({ control, text }: { control: LightControl; text: string }) {
  return (
    <Caption className="ctl-status">
      {control.available ? (
        text
      ) : (
        <span className="ctl-unavailable">
          <ControlIcon name="warning" size="sm" color="var(--aca-danger-ink-icon)" />
          <span>{text}</span>
        </span>
      )}
    </Caption>
  );
}

/** Width of the warning glyph and its gap before the text, in em. */
const GLYPH_EM = 1.3;

/**
 * 2×2 without a brightness figure (on/off light, or unavailable): the state is the reading of
 * the bottom pole and grows with the tile; unavailable keeps the warning glyph on one line.
 */
function StateReading({ control, text }: { control: LightControl; text: string }) {
  const fit = control.available ? stateFit(text) : stateFit(text, 1, GLYPH_EM);
  return (
    <Text
      className={[
        'ctl-value',
        control.pending && 'ctl-value--pending',
        'ctl-state ctl-fit',
        `ctl-clamp-${fit.lines}`,
      ]
        .filter(Boolean)
        .join(' ')}
      style={fit.style}
    >
      {control.available ? (
        text
      ) : (
        <span className="ctl-unavailable">
          <ControlIcon name="warning" size="sm" color="var(--aca-danger-ink-icon)" />
          <span>{text}</span>
        </span>
      )}
    </Text>
  );
}

/** −/+ buttons: the single-pointer alternative to the brightness gesture (WCAG 2.5.7). */
function BrightnessStepper({
  control,
  name,
  disabled,
}: {
  control: LightControl;
  name: string;
  disabled: boolean;
}) {
  return (
    <div className="ctl-stepper">
      <Button
        variant="control"
        shape="circle"
        size="md"
        aria-label={`Diminuisci la luminosità di ${name}`}
        disabled={disabled || control.percent <= 0}
        onClick={() => control.step(-1)}
      >
        <ControlIcon name="minus" size="md" />
      </Button>
      <Button
        variant="control"
        shape="circle"
        size="md"
        aria-label={`Aumenta la luminosità di ${name}`}
        disabled={disabled || control.percent >= 100}
        onClick={() => control.step(1)}
      >
        <ControlIcon name="add" size="md" />
      </Button>
    </div>
  );
}

/** The light widget: icon knob with the brightness gesture, value, and +/− or slider by size. */
export function LightWidget({ id, size, editMode }: WidgetProps) {
  const runtime = useWidgetRuntime();
  // Legacy cards use the card id as entity id (light.* and light_* alike).
  const control = useLightControl(id, editMode);
  const name = entityName(runtime, id, control.entity);
  const density = densityOf(size);

  if (!runtime.entitiesLoaded) return <WidgetLoading size={size} />;
  if (!control.entity) return <WidgetMissing size={size} name={name} editMode={editMode} />;

  const icon =
    aliasIcon(runtime.customIcons[id]) ?? aliasIcon(control.entity.attributes.icon) ?? 'light';
  const blocked = editMode || !control.available;
  const status = lightStatusText(control, runtime.entities);
  const showPercent = control.available && control.dimmable;
  const valueClass = control.pending ? 'ctl-value ctl-value--pending' : 'ctl-value';
  const figure = (displaySize: 'sm' | 'md'): ReactNode =>
    showPercent ? (
      <Display as="span" size={displaySize} className="ctl-figure">
        <Numeric className={valueClass}>
          {control.percent}
          <span className="ctl-unit">%</span>
        </Numeric>
      </Display>
    ) : null;
  const knob = <BrightnessKnob control={control} name={name} icon={icon} disabled={editMode} />;
  const pendingText = control.pending ? COMMAND_LABELS.pending : null;
  const nameText = <Text className="ctl-name ctl-clamp-2">{name}</Text>;

  let body: ReactNode;
  if (density === 'compact') {
    body = (
      <>
        <div className="ctl-row ctl-row--top">
          {knob}
          {figure('sm')}
        </div>
        <div className="ctl-heading">
          {nameText}
          {(!showPercent || !control.available) && <StatusCaption control={control} text={status} />}
        </div>
        <CommandFeedback message={control.message} />
      </>
    );
  } else if (density === 'wide') {
    body = (
      <>
        <div className="ctl-row ctl-row--top">
          {knob}
          <div className="ctl-heading ctl-grow">
            {nameText}
            <StatusCaption control={control} text={status} />
          </div>
        </div>
        <CommandFeedback message={control.message} pendingText={pendingText} />
        <div className="ctl-row ctl-row--bottom">
          {figure('sm')}
          {control.dimmable && (
            <BrightnessStepper control={control} name={name} disabled={blocked} />
          )}
        </div>
      </>
    );
  } else if (density === 'tall') {
    body = (
      <>
        <div className="ctl-row ctl-row--top">{knob}</div>
        {figure('sm')}
        <div className="ctl-heading">
          {nameText}
          <StatusCaption control={control} text={status} />
        </div>
        <CommandFeedback message={control.message} pendingText={pendingText} />
        {control.dimmable && (
          <div className="ctl-row ctl-row--bottom">
            <BrightnessStepper control={control} name={name} disabled={blocked} />
          </div>
        )}
      </>
    );
  } else {
    // 2×2 (L-19): the name at the top, the reading at the bottom with the slider that changes
    // it. Without a brightness figure, the state itself is the reading and grows with the tile.
    body = (
      <>
        <div className="ctl-row ctl-row--top">
          {knob}
          <div className="ctl-heading ctl-grow">
            {nameText}
            {showPercent && <StatusCaption control={control} text={status} />}
          </div>
        </div>
        <div className="ctl-pole">
          {showPercent ? figure('md') : <StateReading control={control} text={status} />}
          <CommandFeedback message={control.message} pendingText={pendingText} />
          {control.dimmable && (
            <Slider
              className="ctl-slider"
              value={control.percent}
              min={0}
              max={100}
              label={`Luminosità di ${name}`}
              valueText={`${control.percent}%`}
              pending={control.pending}
              error={control.failed}
              disabled={blocked}
              onValueChange={(next) => control.setPercent(next, 'step')}
              data-no-long-press
            />
          )}
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
      className="ctl-light"
    >
      {body}
    </WidgetContent>
  );
}
