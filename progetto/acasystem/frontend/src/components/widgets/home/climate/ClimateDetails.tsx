import { useEffect, useId, useRef, useState } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import type { WidgetDetailsProps } from '@/@types/launcher';
import {
  Button,
  Caption,
  Display,
  Heading,
  Numeric,
  Slider,
  Toggle,
} from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { displayName, settingEntity } from '../shared/entity';
import { formatWithUnit, localeFor } from '../shared/format';
import { HomeIcon } from '../shared/HomeIcon';
import { OptionGroup } from '../shared/OptionGroup';
import { systemUnit } from '../shared/units';
import { sameNumber, useRequested } from '../shared/useRequested';
import { CommandError, WidgetNotice } from '../shared/WidgetShell';
import {
  CLIMATE_DEFAULT_TARGET,
  CLIMATE_STEP,
  atLimit,
  clampTarget,
  fanModeLabel,
  favoriteModes,
  hvacActionIcon,
  hvacActionLabel,
  hvacModeIcon,
  hvacModeLabel,
  powerCall,
  presetLabel,
  readClimate,
  setFanModeCall,
  setHvacModeCall,
  setPresetCall,
  setSwingModeCall,
  setTemperatureCall,
  stepTarget,
  swingModeLabel,
  type ClimateCall,
  type ClimateView,
} from './climateModel';

/** The slider sends the value once the gesture pauses, not at every step of the drag. */
export const SLIDER_COMMIT_DELAY_MS = 400;

export function ClimateDetails({ id, settings }: WidgetDetailsProps) {
  const { entities, customNames, haConfig } = useWidgetRuntime();
  const { entityId, entity } = settingEntity(entities, settings, 'climateId');
  const name = displayName(customNames, id, entity, entity && entityId ? entityId : 'Clima');
  if (!entityId || !entity) {
    return (
      <WidgetNotice
        icon="thermostat"
        title={name}
        message={
          entityId
            ? 'Il termostato non è più presente in Home Assistant.'
            : 'Scegli un termostato nelle impostazioni del widget.'
        }
        detail={entityId}
      />
    );
  }
  return (
    <ClimateDetailsContent
      name={name}
      view={readClimate(entityId, entity, systemUnit(haConfig, 'temperature'))}
      settings={settings}
    />
  );
}

function ClimateDetailsContent({
  name,
  view,
  settings,
}: {
  name: string;
  view: ClimateView;
  settings: CardSettings;
}) {
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

  const favorites = favoriteModes(view, settings.climateFavoriteModes);
  const sliderValue = draft ?? target.value ?? CLIMATE_DEFAULT_TARGET;
  const shownTarget = draft ?? target.value;
  const showTemp = view.target !== null || view.current !== null;
  const actionActive = power.value && view.action !== 'idle' && view.action !== 'off';
  const modeError = mode.error ? 'Modalità non impostata. Riprova.' : null;

  return (
    <div className="home-details">
      <div className="home-row home-row--between home-row--wrap">
        <div className="home-stack">
          <Caption as="p">{name}</Caption>
          <Display as="p" size="md">
            <Numeric>{formatWithUnit(view.current, view.unit, locale)}</Numeric>
          </Display>
          <span className="home-status">
            <HomeIcon
              name={view.unavailable ? 'warning' : hvacActionIcon(view.action)}
              size="sm"
              tone={view.unavailable ? 'danger' : actionActive ? 'active' : 'muted'}
            />
            <Caption tone={view.unavailable ? 'danger' : 'muted'}>
              {view.unavailable
                ? 'Non disponibile'
                : `Temperatura attuale · ${hvacActionLabel(power.value ? view.action : 'off')}`}
            </Caption>
          </span>
        </div>
        <div className="home-stack home-stack--end">
          <Toggle
            checked={power.value}
            pending={power.pending}
            error={power.error}
            disabled={disabled}
            aria-label="Accensione"
            aria-describedby={power.error ? powerErrorId : undefined}
            onClick={togglePower}
          />
          {power.pending && <Caption>In attesa di conferma</Caption>}
        </div>
      </div>
      {power.error && (
        <CommandError id={powerErrorId}>
          Home Assistant non ha eseguito il comando. Riprova.
        </CommandError>
      )}

      {showTemp && (
        <section className="home-section" aria-labelledby={targetHeadingId}>
          <div className="home-row home-row--between">
            <Heading level={3} size="sm" id={targetHeadingId}>
              Temperatura desiderata
            </Heading>
            {target.pending && <Caption>In attesa di conferma</Caption>}
          </div>
          <Display as="p" size="lg" aria-live="polite">
            <Numeric aria-busy={target.pending || undefined}>
              {formatWithUnit(shownTarget, view.unit, locale)}
            </Numeric>
          </Display>
          {/* The slider holds the pointer: no long press (edit mode) from this row. */}
          <div className="home-row" data-no-long-press="">
            <Button
              variant="control"
              shape="circle"
              size="md"
              aria-label="Diminuisci di mezzo grado"
              disabled={disabled || atLimit(view, target.value, -CLIMATE_STEP)}
              onClick={() => setTarget(stepTarget(view, target.value, -CLIMATE_STEP))}
            >
              <HomeIcon name="minus" />
            </Button>
            <Slider
              className="home-grow"
              value={sliderValue}
              min={view.min}
              max={view.max}
              step={CLIMATE_STEP}
              label="Temperatura desiderata"
              valueText={formatWithUnit(sliderValue, view.unit, locale)}
              pending={target.pending}
              error={target.error}
              disabled={disabled}
              onValueChange={(value) => onSlide(clampTarget(view, value))}
            />
            <Button
              variant="control"
              shape="circle"
              size="md"
              aria-label="Aumenta di mezzo grado"
              disabled={disabled || atLimit(view, target.value, CLIMATE_STEP)}
              onClick={() => setTarget(stepTarget(view, target.value, CLIMATE_STEP))}
            >
              <HomeIcon name="add" />
            </Button>
          </div>
          <div className="home-row home-row--between">
            <Caption>
              <Numeric>{formatWithUnit(view.min, view.unit, locale)}</Numeric>
            </Caption>
            <Caption>
              <Numeric>{formatWithUnit(view.max, view.unit, locale)}</Numeric>
            </Caption>
          </div>
          {target.error && <CommandError>Temperatura non impostata. Riprova.</CommandError>}
        </section>
      )}

      {favorites.length > 0 && (
        <OptionGroup
          label="Scorciatoie"
          options={favorites}
          value={mode.value}
          pendingValue={mode.requested}
          labelFor={hvacModeLabel}
          iconFor={hvacModeIcon}
          onSelect={selectMode}
          disabled={disabled}
        />
      )}
      {view.hvacModes.length > 0 && (
        <OptionGroup
          label={favorites.length > 0 ? 'Tutte le modalità' : 'Modalità'}
          options={view.hvacModes}
          value={mode.value}
          pendingValue={mode.requested}
          labelFor={hvacModeLabel}
          iconFor={hvacModeIcon}
          onSelect={selectMode}
          disabled={disabled}
          error={modeError}
        />
      )}
      {view.presetModes.length > 0 && (
        <OptionGroup
          label="Preset"
          options={view.presetModes}
          value={preset.value}
          pendingValue={preset.requested}
          labelFor={presetLabel}
          onSelect={(next) => preset.request(next, send(setPresetCall(view.entityId, next)))}
          disabled={disabled}
          error={preset.error ? 'Preset non impostato. Riprova.' : null}
        />
      )}
      {view.fanModes.length > 0 && (
        <OptionGroup
          label="Ventola"
          options={view.fanModes}
          value={fan.value}
          pendingValue={fan.requested}
          labelFor={fanModeLabel}
          onSelect={(next) => fan.request(next, send(setFanModeCall(view.entityId, next)))}
          disabled={disabled}
          error={fan.error ? 'Velocità non impostata. Riprova.' : null}
        />
      )}
      {view.swingModes.length > 0 && (
        <OptionGroup
          label="Oscillazione"
          options={view.swingModes}
          value={swing.value}
          pendingValue={swing.requested}
          labelFor={swingModeLabel}
          onSelect={(next) => swing.request(next, send(setSwingModeCall(view.entityId, next)))}
          disabled={disabled}
          error={swing.error ? 'Oscillazione non impostata. Riprova.' : null}
        />
      )}
    </div>
  );
}
