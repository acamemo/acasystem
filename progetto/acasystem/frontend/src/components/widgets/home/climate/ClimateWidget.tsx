import type { CardSettings } from '@/@types/dashboard';
import type { CellSize, WidgetProps } from '@/@types/launcher';
import { Button, Caption, Display, Heading, Numeric } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { displayName, settingEntity } from '../shared/entity';
import { formatNumber, formatWithUnit, localeFor } from '../shared/format';
import { HomeIcon } from '../shared/HomeIcon';
import { systemUnit } from '../shared/units';
import { sameNumber, useRequested } from '../shared/useRequested';
import { CommandError, WidgetLoading, WidgetNotice, WidgetShell } from '../shared/WidgetShell';
import {
  CLIMATE_STEP,
  atLimit,
  fanModeLabel,
  hvacActionIcon,
  hvacActionLabel,
  powerCall,
  readClimate,
  setTemperatureCall,
  stepTarget,
  type ClimateCall,
  type ClimateView,
} from './climateModel';

export function ClimateWidget({ id, settings, size, editMode }: WidgetProps) {
  const { entities, entitiesLoaded, customNames, haConfig } = useWidgetRuntime();
  const { entityId, entity } = settingEntity(entities, settings, 'climateId');
  const name = displayName(customNames, id, entity, entity && entityId ? entityId : 'Clima');

  if (!entitiesLoaded) {
    return (
      <WidgetShell name={name} size={size} editMode={editMode}>
        <WidgetLoading size={size} label="Caricamento del clima…" />
      </WidgetShell>
    );
  }
  if (!entityId || !entity) {
    return (
      <WidgetShell name={name} size={size} editMode={editMode} state="missing">
        <WidgetNotice
          icon="thermostat"
          title={name}
          message={
            entityId
              ? 'Il termostato non è più presente in Home Assistant.'
              : 'Scegli un termostato nelle impostazioni del widget.'
          }
          detail={entityId}
          compact={size.h < 2}
        />
      </WidgetShell>
    );
  }
  return (
    <ClimateCard
      id={id}
      name={name}
      view={readClimate(entityId, entity, systemUnit(haConfig, 'temperature'))}
      settings={settings}
      size={size}
      editMode={editMode}
    />
  );
}

interface ClimateCardProps {
  id: string;
  name: string;
  view: ClimateView;
  settings: CardSettings;
  size: CellSize;
  editMode: boolean;
}

function ClimateCard({ id, name, view, settings, size, editMode }: ClimateCardProps) {
  const { callService, openDetails, language } = useWidgetRuntime();
  const locale = localeFor(language);
  const power = useRequested(view.isOn);
  const target = useRequested(view.target, sameNumber);
  const disabled = editMode || view.unavailable;
  const compact = size.h < 2;
  const tapToggles = settings.tapAction === 'toggle';

  const send = (call: ClimateCall) => () => callService(call.domain, call.service, call.data);

  const togglePower = () => {
    if (disabled || power.pending) return;
    const next = !power.value;
    power.request(next, send(powerCall(view, next)));
  };

  const step = (delta: number) => {
    if (disabled) return;
    const next = stepTarget(view, target.value, delta);
    target.request(next, send(setTemperatureCall(view.entityId, next)));
  };

  const currentText = formatWithUnit(view.current, view.unit, locale);
  const targetText = formatWithUnit(target.value, view.unit, locale);
  const on = power.value;
  const actionText = view.unavailable
    ? 'Non disponibile'
    : power.pending
      ? on
        ? 'Accensione…'
        : 'Spegnimento…'
      : hvacActionLabel(on ? view.action : 'off');
  const actionActive = on && !view.unavailable && view.action !== 'idle' && view.action !== 'off';
  const errorText = power.error
    ? 'Accensione non riuscita'
    : target.error
      ? 'Temperatura non impostata'
      : null;
  const fanText =
    view.fanModes.length > 0 && view.fanMode
      ? `Ventola ${fanModeLabel(view.fanMode).toLowerCase()}`
      : null;

  const powerButton = (
    <Button
      variant={on && !view.unavailable ? 'primary' : 'control'}
      shape="circle"
      size="md"
      role="switch"
      aria-checked={on}
      aria-label={`Accensione di ${name}`}
      loading={power.pending}
      disabled={disabled}
      className="home-power"
      onClick={togglePower}
    >
      <HomeIcon name="power" />
    </Button>
  );

  const stepper = (
    <div className="home-stepper" role="group" aria-label={`Temperatura desiderata di ${name}`}>
      <Button
        variant="control"
        shape="circle"
        size="md"
        aria-label="Diminuisci di mezzo grado"
        disabled={disabled || atLimit(view, target.value, -CLIMATE_STEP)}
        onClick={() => step(-CLIMATE_STEP)}
      >
        <HomeIcon name="minus" />
      </Button>
      <div className="home-stepper__value" aria-live="polite">
        <Numeric className="home-stepper__number" aria-busy={target.pending || undefined}>
          {target.value === null ? (
            targetText
          ) : (
            <>
              {formatNumber(target.value, locale)}
              {/* Visually dropped on narrow cards, still read by screen readers. */}
              <span className="home-unit"> {view.unit}</span>
            </>
          )}
        </Numeric>
        <Caption>{target.pending ? 'In attesa di conferma' : 'Obiettivo'}</Caption>
      </div>
      <Button
        variant="control"
        shape="circle"
        size="md"
        aria-label="Aumenta di mezzo grado"
        disabled={disabled || atLimit(view, target.value, CLIMATE_STEP)}
        onClick={() => step(CLIMATE_STEP)}
      >
        <HomeIcon name="add" />
      </Button>
    </div>
  );

  const status = (
    <span className="home-status">
      <HomeIcon
        name={view.unavailable ? 'warning' : hvacActionIcon(view.action)}
        size="sm"
        tone={view.unavailable ? 'danger' : actionActive ? 'active' : 'muted'}
      />
      <Caption tone={view.unavailable ? 'danger' : 'muted'}>{actionText}</Caption>
    </span>
  );

  const detailsButton = tapToggles && !editMode && (
    <Button
      variant="control"
      shape="circle"
      size="md"
      aria-label={`Dettagli di ${name}`}
      aria-haspopup="dialog"
      onClick={() => openDetails(id)}
    >
      <HomeIcon name="chevronRight" />
    </Button>
  );

  return (
    <WidgetShell
      name={name}
      size={size}
      editMode={editMode}
      error={Boolean(errorText)}
      state={view.unavailable ? 'unavailable' : on ? 'on' : 'off'}
      onPress={tapToggles ? (disabled ? undefined : togglePower) : () => openDetails(id)}
      pressLabel={tapToggles ? `Accendi o spegni ${name}` : `Apri i dettagli di ${name}`}
      pressOpensDetails={!tapToggles}
    >
      {compact ? (
        <>
          <div className="home-row">
            {powerButton}
            <div className="home-stack home-grow">
              <Heading level={3} size="sm" className="home-truncate">
                {name}
              </Heading>
              {errorText ? (
                <CommandError>{errorText}</CommandError>
              ) : (
                <Caption className="home-truncate">
                  <Numeric>{currentText}</Numeric> · {actionText}
                </Caption>
              )}
            </div>
            {detailsButton}
          </div>
          <div className="home-hide-short">{stepper}</div>
        </>
      ) : (
        <>
          <div className="home-row home-row--between">
            {powerButton}
            {status}
            {detailsButton}
          </div>
          <div className="home-stack">
            <Display as="p" size="sm">
              <Numeric>{currentText}</Numeric>
            </Display>
            <Heading level={3} size="sm" className="home-truncate">
              {name}
            </Heading>
            {errorText ? (
              <CommandError>{errorText}</CommandError>
            ) : (
              fanText && <Caption className="home-truncate home-hide-low">{fanText}</Caption>
            )}
          </div>
          <div className="home-push">{stepper}</div>
        </>
      )}
    </WidgetShell>
  );
}
