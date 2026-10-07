import { useCallback } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import {
  attr,
  clamp,
  featuresOf,
  hasFeature,
  isUnavailableState,
  numberAttr,
  stringAttr,
  stringListAttr,
} from '../shared/entity';
import { useThrottledCommand, useTrackedCommand } from '../shared/useTrackedCommand';

/** FanEntityFeature bits, as in the legacy FanCard and GenericFanModal. */
export const FAN_FEATURE = {
  SET_SPEED: 1,
  OSCILLATE: 2,
  DIRECTION: 4,
  PRESET_MODE: 8,
  TURN_OFF: 16,
  TURN_ON: 32,
} as const;

const near = (a: number, b: number) => Math.abs(a - b) <= 1;

/**
 * Fan commands of the legacy card and modal: fan.turn_on/turn_off (by supported features),
 * set_percentage, oscillate, set_direction and set_preset_mode, each requested until confirmed.
 */
export function useFanControl(entityId: string, disabled: boolean) {
  const runtime = useWidgetRuntime();
  const entity: HassEntity | undefined = runtime.entities[entityId];
  const state = String(entity?.state ?? 'unknown').toLowerCase();
  const available = !!entity && !isUnavailableState(state);
  const features = featuresOf(entity);
  const canTurnOn = hasFeature(features, FAN_FEATURE.TURN_ON);
  const canTurnOff = hasFeature(features, FAN_FEATURE.TURN_OFF);
  const hasSpeed = hasFeature(features, FAN_FEATURE.SET_SPEED);
  const hasOscillation = hasFeature(features, FAN_FEATURE.OSCILLATE);
  const hasDirection = hasFeature(features, FAN_FEATURE.DIRECTION);
  const hasPreset = hasFeature(features, FAN_FEATURE.PRESET_MODE);
  const percentage = clamp(Math.round(numberAttr(entity, 'percentage') ?? 0), 0, 100);
  const stepRaw = numberAttr(entity, 'percentage_step') ?? 1;
  const speedStep = stepRaw > 0 ? stepRaw : 1;
  const oscillating = attr(entity, 'oscillating') === true || attr(entity, 'oscillating') === 'on';
  const direction = stringAttr(entity, 'direction');
  const presetMode = stringAttr(entity, 'preset_mode');
  const presetModes = stringListAttr(entity, 'preset_modes');
  const blocked = disabled || !available;

  const power = useTrackedCommand<boolean>(state === 'on');
  const toCall = useCallback(
    (value: number) => ({
      domain: 'fan',
      service: 'set_percentage',
      data: { entity_id: entityId, percentage: value },
    }),
    [entityId]
  );
  const speed = useThrottledCommand(percentage, near, toCall);
  const oscillation = useTrackedCommand<boolean>(oscillating);
  const turning = useTrackedCommand<string>(direction);
  const preset = useTrackedCommand<string>(presetMode);

  const togglePower = () => {
    if (blocked || !(canTurnOn || canTurnOff)) return;
    if (power.value) {
      if (canTurnOff) power.run(false, 'fan', 'turn_off', { entity_id: entityId });
      return;
    }
    if (canTurnOn) power.run(true, 'fan', 'turn_on', { entity_id: entityId });
  };
  const setSpeed = (value: number) => {
    if (blocked || !hasSpeed) return;
    speed.set(clamp(Math.round(value), 0, 100));
  };
  const toggleOscillation = () => {
    if (blocked || !hasOscillation) return;
    const next = !oscillation.value;
    oscillation.run(next, 'fan', 'oscillate', { entity_id: entityId, oscillating: next });
  };
  const setDirection = (value: string) => {
    if (blocked || !hasDirection) return;
    turning.run(value, 'fan', 'set_direction', { entity_id: entityId, direction: value });
  };
  const reverseDirection = () => setDirection(turning.value === 'forward' ? 'reverse' : 'forward');
  const setPreset = (value: string) => {
    if (blocked || !hasPreset) return;
    preset.run(value, 'fan', 'set_preset_mode', { entity_id: entityId, preset_mode: value });
  };

  const commands = [power, speed, oscillation, turning, preset];
  return {
    entity,
    available,
    on: power.value,
    canTogglePower: canTurnOn || canTurnOff,
    hasSpeed,
    hasOscillation,
    hasDirection,
    hasPreset,
    speed: speed.value,
    speedStep,
    oscillating: oscillation.value,
    direction: turning.value,
    presetMode: preset.value,
    presetModes,
    power,
    speedCommand: speed,
    oscillation,
    turning,
    preset,
    pending: commands.some((command) => command.pending),
    failed: commands.some((command) => command.failed),
    message: commands.find((command) => command.message)?.message ?? null,
    togglePower,
    setSpeed,
    toggleOscillation,
    setDirection,
    reverseDirection,
    setPreset,
  };
}

export type FanControl = ReturnType<typeof useFanControl>;
