import { useCallback } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import {
  clamp,
  featuresOf,
  hasFeature,
  isUnavailableState,
  numberAttr,
  stringAttr,
} from '../shared/entity';
import { COVER_DEVICE_LABELS, COVER_STATE_LABELS } from '../shared/labels';
import { useDebouncedCommand, useTrackedCommand } from '../shared/useTrackedCommand';

/** Feature bits read by the legacy CoverCard/CoverModal. */
export const COVER_FEATURE = {
  OPEN_CLOSE: 3,
  SET_POSITION: 4,
  STOP: 8,
  TILT: 128,
  TILT_POSITION: 256,
} as const;

/** Covers can take a minute to travel: the confirmation waits longer than for a switch. */
const COVER_TIMEOUT_MS = 60_000;

type Motion = 'open' | 'closed' | 'stop';

const motionMatches = (requested: string, state: string) => {
  if (requested === 'open') return state === 'open' || state === 'opening';
  if (requested === 'closed') return state === 'closed' || state === 'closing';
  return state !== 'opening' && state !== 'closing';
};
const near = (a: number, b: number) => Math.abs(a - b) <= 2;

/**
 * Cover commands of the legacy card and modal: open_cover, close_cover, stop_cover,
 * set_cover_position (position) and set_cover_tilt_position (tilt_position).
 */
export function useCoverControl(entityId: string | undefined, disabled: boolean) {
  const runtime = useWidgetRuntime();
  const entity: HassEntity | undefined = entityId ? runtime.entities[entityId] : undefined;
  const state = entity?.state ?? 'unknown';
  const available = !!entity && !isUnavailableState(state);
  const features = featuresOf(entity);
  const supportsPosition = hasFeature(features, COVER_FEATURE.SET_POSITION);
  const supportsOpenClose = hasFeature(features, COVER_FEATURE.OPEN_CLOSE);
  const supportsStop = hasFeature(features, COVER_FEATURE.STOP);
  const supportsTilt =
    hasFeature(features, COVER_FEATURE.TILT) || hasFeature(features, COVER_FEATURE.TILT_POSITION);
  const positionRaw = numberAttr(entity, 'current_position');
  const tiltRaw = numberAttr(entity, 'current_tilt_position');
  const blocked = disabled || !available || !entityId;

  const motion = useTrackedCommand<string>(state, motionMatches, COVER_TIMEOUT_MS);
  const positionCall = useCallback(
    (value: number) => ({
      domain: 'cover',
      service: 'set_cover_position',
      data: { entity_id: entityId, position: value },
    }),
    [entityId]
  );
  const tiltCall = useCallback(
    (value: number) => ({
      domain: 'cover',
      service: 'set_cover_tilt_position',
      data: { entity_id: entityId, tilt_position: value },
    }),
    [entityId]
  );
  const position = useDebouncedCommand(positionRaw ?? 0, near, positionCall, {
    timeoutMs: COVER_TIMEOUT_MS,
  });
  const tilt = useDebouncedCommand(tiltRaw ?? 0, near, tiltCall, { timeoutMs: COVER_TIMEOUT_MS });

  const move = (target: Motion) => {
    if (blocked || !entityId) return;
    const service =
      target === 'open' ? 'open_cover' : target === 'closed' ? 'close_cover' : 'stop_cover';
    motion.run(target, 'cover', service, { entity_id: entityId });
  };
  const setPosition = (value: number) => {
    if (blocked) return;
    position.set(clamp(Math.round(value), 0, 100));
  };
  const setTilt = (value: number) => {
    if (blocked) return;
    tilt.set(clamp(Math.round(value), 0, 100));
  };

  const moving = state === 'opening' || state === 'closing';
  const stateLabel = COVER_STATE_LABELS[state] ?? state;
  const deviceClass = stringAttr(entity, 'device_class') || 'cover';
  const commands = [motion, position, tilt];
  return {
    entityId,
    entity,
    state,
    available,
    moving,
    stateLabel,
    deviceLabel: COVER_DEVICE_LABELS[deviceClass] ?? 'Tapparella',
    supportsPosition,
    supportsOpenClose,
    supportsStop,
    supportsTilt,
    hasPosition: positionRaw !== null,
    hasTilt: tiltRaw !== null,
    /** Shown position: the requested one while pending. */
    position: position.value,
    tilt: tilt.value,
    motion,
    positionCommand: position,
    tiltCommand: tilt,
    pending: commands.some((command) => command.pending),
    failed: commands.some((command) => command.failed),
    message: commands.find((command) => command.message)?.message ?? null,
    open: () => move('open'),
    close: () => move('closed'),
    stop: () => move('stop'),
    setPosition,
    setTilt,
  };
}

export type CoverControl = ReturnType<typeof useCoverControl>;
