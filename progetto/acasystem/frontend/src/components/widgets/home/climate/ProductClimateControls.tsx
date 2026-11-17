import { useEffect, useId, useMemo } from 'react';
import { Button, Caption, Icon, Toggle } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { useServiceCatalog } from '../../adaptive/useServiceCatalog';
import { useTrackedCommand } from '../../controls/shared/useTrackedCommand';
import { CommandFeedback } from '../../controls/shared/CommandFeedback';
import { OptionPicker } from '../../utilities/shared/details';
import { fanModeLabel, hvacModeLabel, presetLabel, swingModeLabel } from './climateModel';
import {
  CLIMATE_FEATURE,
  climatePowerCall,
  climateReading,
  climateService,
  climateTargetCall,
  climateUsesRange,
  productClimateView,
  type ProductClimateView,
} from './productClimateModel';

const sameTargets = (a: (number | null)[], b: (number | null)[]) => a.every((v, i) => v === b[i]);
/** Numeric requests share one confirmation so two range handles never overwrite each other. */
export function ProductClimateTargets({
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
  const view = productClimateView(runtime.entities[entityId], runtime.haConfig);
  const confirmed = useMemo(
    () => [view.target, view.low, view.high, view.humidity],
    [view.target, view.low, view.high, view.humidity]
  );
  const command = useTrackedCommand(confirmed, sameTargets);
  const blocked =
    disabled ||
    !runtime.entitiesLoaded ||
    !runtime.conn ||
    runtime.conn.connected === false ||
    !view.available;
  const clear = command.clear;
  useEffect(() => {
    if (blocked) clear();
  }, [blocked, clear]);
  const controls: {
    key: 'temperature' | 'target_temp_low' | 'target_temp_high' | 'humidity';
    index: number;
    title: string;
    value: number | null;
    step: number | null;
    unit: string | null;
  }[] = [];
  if (climateUsesRange(view) && !compact)
    controls.push(
      {
        key: 'target_temp_low',
        index: 1,
        title: 'Temperatura minima desiderata',
        value: view.low,
        step: view.step,
        unit: view.unit,
      },
      {
        key: 'target_temp_high',
        index: 2,
        title: 'Temperatura massima desiderata',
        value: view.high,
        step: view.step,
        unit: view.unit,
      }
    );
  else if (!climateUsesRange(view) && view.has(CLIMATE_FEATURE.temperature))
    controls.push({
      key: 'temperature',
      index: 0,
      title: 'Temperatura desiderata',
      value: view.target,
      step: view.step,
      unit: view.unit,
    });
  if (view.has(CLIMATE_FEATURE.humidity) && !compact)
    controls.push({
      key: 'humidity',
      index: 3,
      title: 'Umidità desiderata',
      value: view.humidity,
      step: view.humidityStep,
      unit: '%',
    });
  if (!controls.length) return null;
  const run = (item: (typeof controls)[number], next: number) => {
    // Revalidate against the latest HA snapshot and current services, not a guessed target.
    const latest = productClimateView(runtime.entities[entityId], runtime.haConfig);
    const call = climateTargetCall(latest, services, item.key, next);
    if (blocked || command.pending || !call) return;
    const targets = [latest.target, latest.low, latest.high, latest.humidity];
    targets[item.index] = next;
    command.run(targets, 'climate', call.service, { entity_id: entityId, ...call.data });
  };
  return (
    <div className="product-climate-targets" data-compact={compact || undefined}>
      {controls.map((item) => {
        const value = command.value[item.index] ?? null;
        const next = (direction: number) =>
          value !== null && item.step !== null
            ? Number((value + direction * item.step).toFixed(6))
            : null;
        const down = next(-1),
          up = next(1);
        return (
          <div className="product-climate-target" key={item.key}>
            {!compact && (
              <Caption>
                {item.title} · {label}
              </Caption>
            )}
            <div className="product-climate-target__line">
              <Button
                variant="control"
                shape="circle"
                size="sm"
                aria-label={`Diminuisci ${item.title.toLowerCase()} di ${label}`}
                disabled={
                  blocked ||
                  command.pending ||
                  down === null ||
                  !climateTargetCall(view, services, item.key, down)
                }
                onClick={() => {
                  if (down !== null) run(item, down);
                }}
              >
                <Icon name="minus" />
              </Button>
              <Caption aria-live="polite">{climateReading(value, item.unit)}</Caption>
              <Button
                variant="control"
                shape="circle"
                size="sm"
                aria-label={`Aumenta ${item.title.toLowerCase()} di ${label}`}
                disabled={
                  blocked ||
                  command.pending ||
                  up === null ||
                  !climateTargetCall(view, services, item.key, up)
                }
                onClick={() => {
                  if (up !== null) run(item, up);
                }}
              >
                <Icon name="add" />
              </Button>
            </div>
          </div>
        );
      })}
      <CommandFeedback
        message={command.message}
        pendingText={command.pending ? 'In attesa di conferma' : null}
      />
    </div>
  );
}
export function ProductClimatePower({
  entityId,
  label,
  disabled = false,
}: {
  entityId: string;
  label: string;
  disabled?: boolean;
}) {
  const runtime = useWidgetRuntime(),
    services = useServiceCatalog();
  const view = productClimateView(runtime.entities[entityId], runtime.haConfig);
  const command = useTrackedCommand(view.available && view.mode !== 'off');
  const feedbackId = `climate-power-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const call = climatePowerCall(view, services, !command.value);
  const blocked =
    disabled ||
    !runtime.entitiesLoaded ||
    !runtime.conn ||
    runtime.conn.connected === false ||
    !view.available;
  const clear = command.clear;
  useEffect(() => {
    if (blocked) clear();
  }, [blocked, clear]);
  // An unavailable or ambiguous mode must not be rendered as an actionable default.
  if (!climatePowerCall(view, services, true) && !climatePowerCall(view, services, false))
    return null;
  return (
    <div className="product-climate-power">
      <Toggle
        aria-label={`Accensione di ${label}`}
        aria-describedby={feedbackId}
        checked={command.value}
        pending={command.pending}
        error={command.failed}
        disabled={blocked || command.pending || !call}
        onClick={() => {
          if (!blocked && !command.pending && call)
            command.run(!command.value, 'climate', call.service, {
              entity_id: entityId,
              ...call.data,
            });
        }}
      />
      <CommandFeedback
        id={feedbackId}
        message={command.message}
        pendingText={command.pending ? 'In attesa di conferma' : null}
      />
    </div>
  );
}
type Choice = {
  title: string;
  value: string | null;
  options: string[];
  service: string;
  field: string;
  feature?: number;
  label: (s: string) => string;
};
function ClimateChoice({
  entityId,
  channel,
  item,
}: {
  entityId: string;
  channel: string;
  item: Choice;
}) {
  const runtime = useWidgetRuntime(),
    services = useServiceCatalog();
  const view = productClimateView(runtime.entities[entityId], runtime.haConfig);
  const request = useTrackedCommand(item.value);
  const disabled =
    !runtime.entitiesLoaded ||
    !runtime.conn ||
    runtime.conn.connected === false ||
    !view.available ||
    !climateService(services, item.service) ||
    (item.feature !== undefined && !view.has(item.feature));
  const clear = request.clear;
  useEffect(() => {
    if (disabled) clear();
  }, [disabled, clear]);
  return (
    <div className="product-climate-choice">
      <OptionPicker
        label={`${item.title} di ${channel}`}
        value={request.value}
        pending={request.pending}
        disabled={disabled || request.pending}
        isolateEscape
        options={item.options.map((value) => ({ value, label: item.label(value) }))}
        onSelect={(value) => {
          if (!disabled && !request.pending && item.options.includes(value))
            request.run(value, 'climate', item.service, {
              entity_id: entityId,
              [item.field]: value,
            });
        }}
      />
      <CommandFeedback
        message={request.message}
        pendingText={request.pending ? 'In attesa di conferma' : null}
      />
    </div>
  );
}
export function ProductClimateChoices({
  entityId,
  label,
  view,
}: {
  entityId: string;
  label: string;
  view: ProductClimateView;
}) {
  const items: Choice[] = [
    {
      title: 'Modalità',
      value: view.mode,
      options: view.modes,
      service: 'set_hvac_mode',
      field: 'hvac_mode',
      label: hvacModeLabel,
    },
    {
      title: 'Ventola',
      value: view.fan,
      options: view.fanModes,
      service: 'set_fan_mode',
      field: 'fan_mode',
      feature: CLIMATE_FEATURE.fan,
      label: fanModeLabel,
    },
    {
      title: 'Preset',
      value: view.preset,
      options: view.presets,
      service: 'set_preset_mode',
      field: 'preset_mode',
      feature: CLIMATE_FEATURE.preset,
      label: presetLabel,
    },
    {
      title: 'Oscillazione verticale',
      value: view.swing,
      options: view.swings,
      service: 'set_swing_mode',
      field: 'swing_mode',
      feature: CLIMATE_FEATURE.swing,
      label: swingModeLabel,
    },
    {
      title: 'Oscillazione orizzontale',
      value: view.horizontalSwing,
      options: view.horizontalSwings,
      service: 'set_swing_horizontal_mode',
      field: 'swing_horizontal_mode',
      feature: CLIMATE_FEATURE.horizontal,
      label: swingModeLabel,
    },
  ];
  return (
    <div className="product-climate-choices">
      {items
        .filter(
          (item) => item.options.length && (item.feature === undefined || view.has(item.feature))
        )
        .map((item) => (
          <ClimateChoice
            key={`${entityId}|${item.field}`}
            entityId={entityId}
            channel={label}
            item={item}
          />
        ))}
    </div>
  );
}
