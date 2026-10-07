import { useId } from 'react';
import { Body, Button, Caption, Heading, Numeric, Slider } from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { CommandFeedback } from '../shared/CommandFeedback';
import { ControlIcon } from '../shared/ControlIcon';
import { entityName, settingString } from '../shared/entity';
import { COMMAND_LABELS, COMMON_LABELS } from '../shared/labels';
import { useCoverControl } from './useCoverControl';

const POSITION_PRESETS = [
  { label: 'Chiusa', value: 0 },
  { label: '25%', value: 25 },
  { label: '50%', value: 50 },
  { label: '75%', value: 75 },
  { label: 'Aperta', value: 100 },
];
const TILT_PRESETS = [
  { label: 'Chiuse', value: 0 },
  { label: '50%', value: 50 },
  { label: 'Aperte', value: 100 },
];

/** Sheet content of a cover (legacy CoverModal): commands, position, tilt and information. */
export function CoverDetails({ id, settings }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime();
  const entityId = settingString(settings, 'coverId') || undefined;
  const cover = useCoverControl(entityId, false);
  const name = entityName(runtime, id, cover.entity, entityId ?? id);
  const infoId = `tapparella-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-info`;

  if (!cover.entity) {
    return (
      <Body tone="muted">
        {COMMON_LABELS.missing}. {COMMON_LABELS.missingHint}
      </Body>
    );
  }
  const blocked = !cover.available;

  return (
    <div className="ctl-details">
      <section className="ctl-details__section" aria-label="Comandi">
        <div className="ctl-details__row">
          <Body as="span" className={cover.moving ? 'ctl-value--pending' : undefined}>
            {cover.stateLabel}
          </Body>
          {cover.hasPosition && <Numeric>{cover.position}%</Numeric>}
        </div>
        {(cover.supportsOpenClose || cover.supportsStop) && (
          <div className="ctl-details__actions">
            {cover.supportsOpenClose && (
              <Button
                variant="control"
                size="sm"
                aria-pressed={cover.state === 'open'}
                aria-busy={cover.motion.pending && cover.motion.value === 'open' ? true : undefined}
                disabled={blocked}
                onClick={cover.open}
                contentClassName="ctl-action__content"
              >
                <ControlIcon name="arrowUp" size="md" />
                <span className="aca-m__label">Apri</span>
              </Button>
            )}
            {cover.supportsStop && (
              <Button
                variant="control"
                size="sm"
                aria-busy={cover.motion.pending && cover.motion.value === 'stop' ? true : undefined}
                disabled={blocked}
                onClick={cover.stop}
                contentClassName="ctl-action__content"
              >
                <ControlIcon name="stop" size="md" />
                <span className="aca-m__label">Ferma</span>
              </Button>
            )}
            {cover.supportsOpenClose && (
              <Button
                variant="control"
                size="sm"
                aria-pressed={cover.state === 'closed'}
                aria-busy={cover.motion.pending && cover.motion.value === 'closed' ? true : undefined}
                disabled={blocked}
                onClick={cover.close}
                contentClassName="ctl-action__content"
              >
                <ControlIcon name="chevronDown" size="md" />
                <span className="aca-m__label">Chiudi</span>
              </Button>
            )}
          </div>
        )}
        <CommandFeedback
          message={cover.message}
          pendingText={cover.pending ? COMMAND_LABELS.pending : null}
        />
        {blocked && (
          <Body size="sm" tone="muted">
            {COMMON_LABELS.unavailableHint}
          </Body>
        )}
      </section>

      {cover.supportsPosition && (
        <section className="ctl-details__section" aria-label="Apertura">
          <div className="ctl-details__row">
            <Caption>Apertura</Caption>
            <Numeric className={cover.positionCommand.pending ? 'ctl-value--pending' : undefined}>
              {cover.position}%
            </Numeric>
          </div>
          <Slider
            value={cover.position}
            min={0}
            max={100}
            label={`Apertura di ${name}`}
            valueText={`${cover.position}% aperta`}
            pending={cover.positionCommand.pending}
            error={cover.positionCommand.failed}
            disabled={blocked}
            onValueChange={cover.setPosition}
            data-no-long-press
          />
          <div className="ctl-details__actions" role="group" aria-label="Posizioni rapide">
            {POSITION_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                variant="control"
                size="sm"
                aria-pressed={cover.position === preset.value}
                disabled={blocked}
                onClick={() => cover.setPosition(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </section>
      )}

      {cover.supportsTilt && (
        <section className="ctl-details__section" aria-label="Inclinazione">
          <div className="ctl-details__row">
            <Caption>Inclinazione delle lamelle</Caption>
            <Numeric className={cover.tiltCommand.pending ? 'ctl-value--pending' : undefined}>
              {cover.tilt}%
            </Numeric>
          </div>
          <Slider
            value={cover.tilt}
            min={0}
            max={100}
            label={`Inclinazione di ${name}`}
            valueText={`${cover.tilt}%`}
            pending={cover.tiltCommand.pending}
            error={cover.tiltCommand.failed}
            disabled={blocked}
            onValueChange={cover.setTilt}
            data-no-long-press
          />
          <div className="ctl-details__actions" role="group" aria-label="Inclinazioni rapide">
            {TILT_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                variant="control"
                size="sm"
                aria-pressed={cover.tilt === preset.value}
                disabled={blocked}
                onClick={() => cover.setTilt(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </section>
      )}

      <section className="ctl-details__section" aria-labelledby={infoId}>
        <Heading level={3} size="sm" id={infoId}>
          Informazioni
        </Heading>
        <dl className="ctl-facts">
          <div className="ctl-facts__item">
            <dt>
              <Caption>Stato</Caption>
            </dt>
            <dd>
              <Body as="span" size="sm">
                {cover.stateLabel}
              </Body>
            </dd>
          </div>
          {cover.hasPosition && (
            <div className="ctl-facts__item">
              <dt>
                <Caption>Posizione</Caption>
              </dt>
              <dd>
                <Body as="span" size="sm">
                  {cover.positionCommand.pending ? `${cover.position}% richiesta` : `${cover.position}%`}
                </Body>
              </dd>
            </div>
          )}
          {cover.hasTilt && (
            <div className="ctl-facts__item">
              <dt>
                <Caption>Inclinazione</Caption>
              </dt>
              <dd>
                <Body as="span" size="sm">
                  {cover.tilt}%
                </Body>
              </dd>
            </div>
          )}
          <div className="ctl-facts__item">
            <dt>
              <Caption>Tipo di dispositivo</Caption>
            </dt>
            <dd>
              <Body as="span" size="sm">
                {cover.deviceLabel}
              </Body>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
