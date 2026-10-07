import {
  Body,
  Button,
  Caption,
  Numeric,
  Popover,
  Segmented,
  SelectTrigger,
  Slider,
  Toggle,
} from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { CommandFeedback } from '../shared/CommandFeedback';
import { ControlIcon } from '../shared/ControlIcon';
import { entityName } from '../shared/entity';
import {
  COMMAND_LABELS,
  COMMON_LABELS,
  FAN_DIRECTION_LABELS,
  fanPresetLabel,
} from '../shared/labels';
import { fanStatusText } from './FanWidget';
import { useFanControl } from './useFanControl';

type Direction = 'forward' | 'reverse';

/** Sheet content of a fan (legacy GenericFanModal): power, oscillation, speed, direction, preset. */
export function FanDetails({ id }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime();
  const fan = useFanControl(id, false);
  const name = entityName(runtime, id, fan.entity);
  if (!fan.entity) {
    return (
      <Body tone="muted">
        {COMMON_LABELS.missing}. {COMMON_LABELS.missingHint}
      </Body>
    );
  }
  const blocked = !fan.available;
  const direction: Direction = fan.direction === 'reverse' ? 'reverse' : 'forward';

  return (
    <div className="ctl-details">
      <section className="ctl-details__section" aria-label="Accensione">
        <div className="ctl-details__row">
          <Body as="span">{fanStatusText(fan)}</Body>
          {fan.canTogglePower && (
            <Button
              variant={fan.on ? 'secondary' : 'primary'}
              size="md"
              loading={fan.power.pending}
              disabled={blocked}
              onClick={fan.togglePower}
              contentClassName="ctl-action__content"
            >
              <ControlIcon name="power" size="md" />
              <span className="aca-m__label">{fan.on ? 'Spegni' : 'Accendi'}</span>
            </Button>
          )}
        </div>
        {fan.hasOscillation && (
          <div className="ctl-details__row">
            <Caption>Oscillazione</Caption>
            <Toggle
              checked={fan.oscillating}
              pending={fan.oscillation.pending}
              error={fan.oscillation.failed}
              disabled={blocked}
              aria-label={`Oscillazione di ${name}`}
              onClick={fan.toggleOscillation}
            />
          </div>
        )}
        <CommandFeedback
          message={fan.message}
          pendingText={fan.pending ? COMMAND_LABELS.pending : null}
        />
        {!fan.available && (
          <Body size="sm" tone="muted">
            {COMMON_LABELS.unavailableHint}
          </Body>
        )}
      </section>

      {fan.hasSpeed && (
        <section className="ctl-details__section" aria-label="Velocità">
          <div className="ctl-details__row">
            <Caption>Velocità</Caption>
            <Numeric className={fan.speedCommand.pending ? 'ctl-value--pending' : undefined}>
              {fan.speed}%
            </Numeric>
          </div>
          <Slider
            value={fan.speed}
            min={0}
            max={100}
            step={fan.speedStep}
            label={`Velocità di ${name}`}
            valueText={`${fan.speed}%`}
            pending={fan.speedCommand.pending}
            error={fan.speedCommand.failed}
            disabled={blocked}
            onValueChange={fan.setSpeed}
            data-no-long-press
          />
        </section>
      )}

      {fan.hasDirection && (
        <div className="ctl-details__row">
          <Caption>Direzione</Caption>
          <Segmented<Direction>
            label={`Direzione di ${name}`}
            size="sm"
            value={direction}
            disabled={blocked}
            onChange={fan.setDirection}
            options={[
              { value: 'forward', label: FAN_DIRECTION_LABELS.forward ?? 'Avanti' },
              { value: 'reverse', label: FAN_DIRECTION_LABELS.reverse ?? 'Indietro' },
            ]}
          />
        </div>
      )}

      {fan.hasPreset && fan.presetModes.length > 0 && (
        <div className="ctl-details__row">
          <Caption>Modalità</Caption>
          <Popover
            label={`Modalità di ${name}`}
            placement="bottom-end"
            contentClassName="ctl-menu"
            trigger={(props) => (
              <SelectTrigger
                size="sm"
                label={fan.presetMode ? fanPresetLabel(fan.presetMode) : 'Nessuna'}
                aria-haspopup="dialog"
                aria-busy={fan.preset.pending || undefined}
                disabled={blocked}
                {...props}
              />
            )}
          >
            {(close) =>
              fan.presetModes.map((mode) => (
                <Button
                  key={mode}
                  variant="control"
                  size="sm"
                  className="ctl-menu__item"
                  aria-pressed={mode === fan.presetMode}
                  onClick={() => {
                    fan.setPreset(mode);
                    close();
                  }}
                >
                  {fanPresetLabel(mode)}
                </Button>
              ))
            }
          </Popover>
        </div>
      )}
    </div>
  );
}
