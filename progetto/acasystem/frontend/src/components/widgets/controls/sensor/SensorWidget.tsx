import { useEffect, useState, type ReactNode } from 'react';
import { Button, Caption, MaterialLayers, Text, materialClass } from '@/components/primitives';
import type { WidgetProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { CommandFeedback } from '../shared/CommandFeedback';
import { ControlIcon, aliasIcon, type ControlIconName } from '../shared/ControlIcon';
import { densityOf, entityName, type Density } from '../shared/entity';
import { COMMON_LABELS } from '../shared/labels';
import { Sparkline } from '../shared/HistoryChart';
import { useEntityHistory } from '../shared/useEntityHistory';
import { WidgetContent, WidgetLoading, WidgetMissing } from '../shared/WidgetContent';
import {
  ActionButton,
  EntityToggle,
  NumberStepper,
  OptionPicker,
  SensorValue,
} from './SensorParts';
import { SensorVisual } from './SensorVisual';
import { useSensorControls, type SensorControls } from './useSensorControls';

/** Starts loading the sparkline only when the widget is (almost) on screen, as in the legacy card. */
function useNearViewport() {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (visible || !node || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, visible]);
  return { ref: setNode, visible };
}

function SensorIcon({
  controls,
  icon,
  name,
  editMode,
  asToggle,
}: {
  controls: SensorControls;
  icon: ControlIconName;
  name: string;
  editMode: boolean;
  asToggle: boolean;
}) {
  const model = controls.model;
  if (!model) return null;
  const actionIcon = model.config.action.trigger === 'icon' && model.config.action.type !== 'none';
  const active = asToggle ? controls.toggleOn : model.isBinaryLike && model.isActiveState;
  const glyph = (
    <ControlIcon
      name={model.isUnavailable ? 'warning' : icon}
      size="md"
      color={
        model.isUnavailable
          ? 'var(--aca-danger-ink-icon)'
          : active || (actionIcon && model.actionActive)
            ? 'var(--aca-orange-ink-icon)'
            : undefined
      }
    />
  );
  if (actionIcon || asToggle) {
    const failed = controls.actionStatus === 'error' || controls.actionStatus === 'timeout';
    return (
      <button
        type="button"
        role={asToggle ? 'switch' : undefined}
        aria-checked={asToggle ? controls.toggleOn : undefined}
        aria-label={asToggle ? name : model.actionLabel}
        aria-busy={controls.actionPending || undefined}
        aria-invalid={failed || undefined}
        disabled={editMode || (controls.actionDisabled && !controls.actionPending)}
        className={materialClass(
          { behavior: 'press', shape: 'circle', size: 'md' },
          'ctl-icon-button',
          active && 'ctl-knob--on',
          failed && 'aca-m--error'
        )}
        onClick={() => {
          if (controls.actionPending) return;
          if (asToggle) controls.setToggle(!controls.toggleOn);
          else controls.runAction();
        }}
      >
        <MaterialLayers>{glyph}</MaterialLayers>
      </button>
    );
  }
  return (
    <span
      className={materialClass(
        { behavior: 'static', shape: 'circle', size: 'md' },
        'ctl-badge-icon'
      )}
      aria-hidden="true"
    >
      <MaterialLayers>{glyph}</MaterialLayers>
    </span>
  );
}

function controlFor(
  controls: SensorControls,
  density: Density,
  name: string,
  editMode: boolean
): ReactNode {
  const model = controls.model;
  if (!model) return null;
  const disabled = editMode || model.isUnavailable;
  if (model.managedAction) {
    const action = model.config.action;
    return model.showControls && action.type !== 'none' && action.trigger === 'button' ? (
      <ActionButton controls={controls} compact={density === 'compact'} />
    ) : null;
  }
  if (model.isSelectDomain && model.selectOptions.length > 0) {
    return density === 'compact' ? null : (
      <OptionPicker controls={controls} name={name} disabled={disabled} />
    );
  }
  if (!model.showControls) return null;
  if (model.isToggleDomain) {
    // Narrow tiles use the icon as the switch (see asToggle).
    return density === 'compact' || density === 'tall' ? null : (
      <EntityToggle controls={controls} name={name} compact={false} />
    );
  }
  if (model.primaryDomain === 'input_number') {
    return density === 'compact' ? null : (
      <NumberStepper controls={controls} name={name} disabled={disabled} showValue={false} />
    );
  }
  return null;
}

/** Sensor / entity widget (legacy SensorCard): value, state, controls and trend by size. */
export function SensorWidget({ id, settings, size, editMode }: WidgetProps) {
  const runtime = useWidgetRuntime();
  const controls = useSensorControls(id, settings, editMode);
  const { model, entity } = controls;
  const density = densityOf(size);
  const near = useNearViewport();
  const visible = usePageVisible();
  const graphWanted = !!model?.graphAllowed && density !== 'compact';
  const history = useEntityHistory(model?.displayEntity?.entity_id, 24, {
    enabled: graphWanted && near.visible && visible,
  });
  const name = entityName(runtime, id, entity, controls.entityId);

  if (!runtime.entitiesLoaded) return <WidgetLoading size={size} />;
  if (!entity || !model) return <WidgetMissing size={size} name={name} editMode={editMode} />;

  const action = model.config.action;
  const cardAction = action.trigger === 'card' && action.type !== 'none';
  const icon: ControlIconName =
    (action.trigger === 'icon' ? aliasIcon(action.icon) : null) ??
    aliasIcon(runtime.customIcons[id]) ??
    aliasIcon(entity.attributes.icon) ??
    model.icon;
  const asToggle =
    (density === 'compact' || density === 'tall') && model.isToggleDomain && model.showControls;
  const control = controlFor(controls, density, name, editMode);
  const feedback = <CommandFeedback message={controls.message} pendingText={controls.actionText} />;
  const sparkline =
    graphWanted && history.points.length > 1 ? (
      <div className="ctl-widget__spark">
        <Sparkline points={history.points} />
      </div>
    ) : null;
  const visual =
    model.showVariant && model.isRangeVariant && model.numericValue !== null ? (
      <SensorVisual
        kind={model.variant === 'gauge' ? 'gauge' : model.variant === 'donut' ? 'donut' : 'bar'}
        value={model.numericValue}
        min={model.chartMin}
        max={model.chartMax}
        tone={model.thresholdTone}
        label={`${name}: ${model.chartDisplay}${model.unit && model.valueMode !== 'percent' ? ` ${model.unit}` : ''}, da ${model.chartMin} a ${model.chartMax}`}
        compact={density !== 'large'}
      />
    ) : null;
  const status = model.showStatus ? (
    <SensorValue
      model={model}
      size={density === 'large' ? 'lg' : density === 'compact' ? 'sm' : 'md'}
      pending={controls.actionPending || controls.optionPending || controls.numberPending}
    />
  ) : null;
  const nameText = model.showName ? (
    <Text className="ctl-name ctl-clamp-2" title={name}>
      {name}
    </Text>
  ) : null;
  const iconEl = model.showIcon ? (
    <SensorIcon
      controls={controls}
      icon={icon}
      name={name}
      editMode={editMode}
      asToggle={asToggle}
    />
  ) : null;
  const detailsButton = cardAction && action.type !== 'more-info' && (
    <Button
      variant="control"
      shape="circle"
      size="md"
      aria-label={`${COMMON_LABELS.details}: ${name}`}
      disabled={editMode}
      onClick={() => runtime.openDetails(id)}
    >
      <ControlIcon name="chevronRight" size="md" />
    </Button>
  );
  const unavailable = model.isUnavailable && (
    <Caption className="ctl-status">{COMMON_LABELS.unavailable}</Caption>
  );

  let body: ReactNode;
  if (density === 'compact') {
    // 1×1: icon (and a control or visual), then the value, then the name on one line.
    body = (
      <>
        <div className="ctl-row ctl-row--top">
          {iconEl}
          {visual ?? control ?? detailsButton}
        </div>
        {status}
        {model.showName && (
          <Text className="ctl-name ctl-clamp-1" title={name}>
            {name}
          </Text>
        )}
        <CommandFeedback message={controls.message} />
      </>
    );
  } else if (density === 'wide') {
    // 2×1: name on the first line, value and command on the second.
    body = (
      <>
        <div className="ctl-row ctl-row--top">
          {iconEl}
          <div className="ctl-heading ctl-grow">
            {nameText}
            {unavailable}
          </div>
          {detailsButton}
        </div>
        {feedback}
        <div className="ctl-row ctl-row--bottom">
          {status}
          {visual}
          {control}
        </div>
      </>
    );
  } else if (density === 'tall') {
    body = (
      <>
        <div className="ctl-row ctl-row--top">
          {iconEl}
          {detailsButton}
        </div>
        {status}
        {nameText}
        {unavailable}
        {visual}
        <div className="ctl-row ctl-row--bottom">{control}</div>
        {feedback}
      </>
    );
  } else {
    // 2×2: the name at the top. With a trend line the value stays under the name (the line
    // fills the bottom); otherwise the reading sits at the bottom with its command (L-19) and,
    // alone, grows with the widget. No empty row for a missing command.
    const commandRow = control ? <div className="ctl-row ctl-row--bottom">{control}</div> : null;
    const reading = model.showStatus ? (
      <SensorValue
        model={model}
        size="lg"
        pending={controls.actionPending || controls.optionPending || controls.numberPending}
        fit={!graphWanted && !control && !visual}
      />
    ) : null;
    const lower = (
      <>
        {reading}
        {visual}
        {commandRow}
        {feedback}
      </>
    );
    body = (
      <>
        <div className="ctl-row ctl-row--top">
          {iconEl}
          <div className="ctl-heading ctl-grow">
            {nameText}
            {unavailable}
          </div>
          {detailsButton}
        </div>
        {graphWanted || (!reading && !visual && !commandRow) ? (
          lower
        ) : (
          <div className="ctl-pole">{lower}</div>
        )}
      </>
    );
  }

  return (
    <WidgetContent
      size={size}
      name={name}
      editMode={editMode}
      onOpen={cardAction ? () => controls.runAction() : () => runtime.openDetails(id)}
      openLabel={cardAction ? model.actionLabel : undefined}
      className="ctl-sensor"
      backdrop={sparkline}
      bodyRef={near.ref}
    >
      {body}
    </WidgetContent>
  );
}
