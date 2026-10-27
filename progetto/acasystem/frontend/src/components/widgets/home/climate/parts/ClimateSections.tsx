import {
  Button,
  Caption,
  Display,
  Heading,
  Numeric,
  Slider,
  Toggle,
} from '@/components/primitives';
import { formatWithUnit } from '../../shared/format';
import { HomeIcon } from '../../shared/HomeIcon';
import { OptionGroup } from '../../shared/OptionGroup';
import { CommandError } from '../../shared/WidgetShell';
import {
  CLIMATE_STEP,
  atLimit,
  clampTarget,
  fanModeLabel,
  hvacActionIcon,
  hvacActionLabel,
  hvacModeIcon,
  hvacModeLabel,
  presetLabel,
  setFanModeCall,
  setPresetCall,
  setSwingModeCall,
  stepTarget,
  swingModeLabel,
} from '../climateModel';
import type { ClimateDetailsState } from './useClimateDetailsState';

/** Name, current temperature, action and power switch (with its error). */
export function ClimateHeadSection({
  state,
  large = false,
}: {
  state: ClimateDetailsState;
  /** The console shows the current temperature at the size of the target. */
  large?: boolean;
}) {
  const { name, view, locale, disabled, power, powerErrorId, actionActive, togglePower } = state;
  return (
    <>
      <div className="home-row home-row--between home-row--wrap">
        <div className="home-stack">
          <Caption as="p">{name}</Caption>
          <Display as="p" size={large ? 'lg' : 'md'}>
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
    </>
  );
}

/** Target temperature: figure, stepper buttons and slider. */
export function ClimateTargetSection({ state }: { state: ClimateDetailsState }) {
  const {
    view,
    locale,
    disabled,
    target,
    targetHeadingId,
    shownTarget,
    sliderValue,
    showTemp,
    setTarget,
    onSlide,
  } = state;
  if (!showTemp) return null;
  return (
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
  );
}

/** HVAC modes: the favourite shortcuts and the full list. */
export function ClimateModesSection({ state }: { state: ClimateDetailsState }) {
  const { view, disabled, mode, favorites, selectMode } = state;
  const modeError = mode.error ? 'Modalità non impostata. Riprova.' : null;
  return (
    <>
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
    </>
  );
}

/** Preset, fan and swing choices. */
export function ClimateChoicesSection({ state }: { state: ClimateDetailsState }) {
  const { view, disabled, preset, fan, swing, send } = state;
  return (
    <>
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
    </>
  );
}
