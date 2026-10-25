import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { clamp, isUnavailableState } from '../shared/entity';
import { callSafely } from '../shared/service';
import { useRequestedState, type RequestStatus } from '../shared/useRequestedState';
import { useThrottledSender } from '../shared/useThrottledSender';
import {
  BRIGHTNESS_STEP,
  isDimmable,
  lightMatches,
  lightReading,
  toBrightness,
  toPercent,
  type LightReading,
} from './lightModel';

/** Phase of a brightness change: during a gesture, at its end, or a single step. */
export type BrightnessPhase = 'move' | 'end' | 'step';

export interface LightControl {
  entityId: string;
  entity: HassEntity | undefined;
  /** False when the entity is missing, unavailable or unknown. */
  available: boolean;
  dimmable: boolean;
  /** Shown state: the requested one while pending. */
  on: boolean;
  /** Shown brightness in percent (0 when off). */
  percent: number;
  /** Brightness confirmed by Home Assistant, in percent. */
  confirmedPercent: number;
  status: RequestStatus;
  pending: boolean;
  failed: boolean;
  message: string | null;
  toggle: () => void;
  setPercent: (percent: number, phase: BrightnessPhase) => void;
  /** +/− alternative to the gesture (WCAG 2.5.7). */
  step: (direction: 1 | -1) => void;
}

/**
 * Light commands with the microinteraction of design.md: the brightness follows the gesture
 * at once, the real light changes during it with throttled sends plus the final one, and the
 * value stays «requested» until Home Assistant confirms it.
 * Service calls are those of the legacy LightCard: light.toggle and light.turn_on/brightness.
 */
export function useLightControl(entityId: string, disabled = false): LightControl {
  const runtime = useWidgetRuntime();
  const entity: HassEntity | undefined = runtime.entities[entityId];
  const available = !!entity && !isUnavailableState(entity.state);
  const dimmable = isDimmable(entity);
  const confirmed = useMemo(() => lightReading(entity), [entity]);
  const request = useRequestedState<LightReading>({ confirmed, matches: lightMatches });
  const { track, settle, hold } = request;
  const blocked = disabled || !available;

  // Last brightness seen while on: shown while a «turn on» request is pending.
  const lastOnBrightness = useRef<number | null>(null);
  useEffect(() => {
    if (confirmed.on && confirmed.brightness !== null)
      lastOnBrightness.current = confirmed.brightness;
  }, [confirmed]);

  const sendBrightness = useCallback(
    (brightness: number) =>
      track(callSafely(runtime, 'light', 'turn_on', { entity_id: entityId, brightness })),
    [entityId, runtime, track]
  );
  const sender = useThrottledSender(sendBrightness);

  const shown = request.value;
  const shownBrightness =
    shown.brightness ?? (shown.on ? (confirmed.brightness ?? lastOnBrightness.current) : 0) ?? 0;
  const percent = shown.on ? toPercent(shownBrightness) : 0;
  const confirmedPercent = confirmed.on ? toPercent(confirmed.brightness ?? 0) : 0;

  const toggle = useCallback(() => {
    if (blocked) return;
    sender.cancel();
    hold(false);
    request.request({ on: !shown.on, brightness: null });
    track(callSafely(runtime, 'light', 'toggle', { entity_id: entityId }));
    settle();
  }, [blocked, entityId, hold, request, runtime, sender, settle, shown.on, track]);

  const setPercent = useCallback(
    (value: number, phase: BrightnessPhase) => {
      if (blocked || !dimmable) return;
      const brightness = toBrightness(clamp(Math.round(value), 0, 100));
      request.request({ on: brightness > 0, brightness });
      if (phase === 'move') {
        hold(true);
        sender.push(brightness);
        return;
      }
      if (phase === 'end') {
        sender.flush(brightness);
        hold(false);
      } else {
        sender.push(brightness);
      }
      settle();
    },
    [blocked, dimmable, hold, request, sender, settle]
  );

  const step = useCallback(
    (direction: 1 | -1) => setPercent(percent + direction * BRIGHTNESS_STEP, 'step'),
    [percent, setPercent]
  );

  return {
    entityId,
    entity,
    available,
    dimmable,
    on: shown.on,
    percent,
    confirmedPercent,
    status: request.status,
    pending: request.pending,
    failed: request.failed,
    message: request.message,
    toggle,
    setPercent,
    step,
  };
}
