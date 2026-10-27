import { useEffect, useId, useRef, useState } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { localeFor } from '../../shared/format';
import { sameNumber, useRequested } from '../../shared/useRequested';
import {
  CLIMATE_DEFAULT_TARGET,
  favoriteModes,
  powerCall,
  setHvacModeCall,
  setTemperatureCall,
  type ClimateCall,
  type ClimateView,
} from '../climateModel';

/** The slider sends the value once the gesture pauses, not at every step of the drag. */
export const SLIDER_COMMIT_DELAY_MS = 400;

/**
 * State and commands shared by the sections of the climate details (sheet and console): the
 * requested values, the slider draft and the calls to Home Assistant.
 */
export function useClimateDetailsState(name: string, view: ClimateView, settings: CardSettings) {
  const { callService, language, editMode } = useWidgetRuntime();
  const locale = localeFor(language);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const targetHeadingId = `clima-${uid}-obiettivo`;
  const powerErrorId = `clima-${uid}-errore`;
  const disabled = editMode || view.unavailable;

  const power = useRequested(view.isOn);
  const target = useRequested(view.target, sameNumber);
  const mode = useRequested(view.mode);
  const fan = useRequested(view.fanMode);
  const swing = useRequested(view.swingMode);
  const preset = useRequested(view.presetMode);

  const [draft, setDraft] = useState<number | null>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
    },
    []
  );

  const send = (call: ClimateCall) => () => callService(call.domain, call.service, call.data);

  const setTarget = (value: number) => {
    if (disabled) return;
    target.request(value, send(setTemperatureCall(view.entityId, value)));
  };

  const onSlide = (value: number) => {
    setDraft(value);
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      commitTimer.current = null;
      setDraft(null);
      setTarget(value);
    }, SLIDER_COMMIT_DELAY_MS);
  };

  const togglePower = () => {
    if (disabled || power.pending) return;
    const next = !power.value;
    power.request(next, send(powerCall(view, next)));
  };

  const selectMode = (next: string) => {
    if (disabled) return;
    mode.request(next, send(setHvacModeCall(view.entityId, next)));
  };

  return {
    name,
    view,
    locale,
    disabled,
    targetHeadingId,
    powerErrorId,
    power,
    target,
    mode,
    fan,
    swing,
    preset,
    send,
    setTarget,
    onSlide,
    togglePower,
    selectMode,
    favorites: favoriteModes(view, settings.climateFavoriteModes),
    sliderValue: draft ?? target.value ?? CLIMATE_DEFAULT_TARGET,
    shownTarget: draft ?? target.value,
    showTemp: view.target !== null || view.current !== null,
    actionActive: power.value && view.action !== 'idle' && view.action !== 'off',
  };
}

export type ClimateDetailsState = ReturnType<typeof useClimateDetailsState>;
