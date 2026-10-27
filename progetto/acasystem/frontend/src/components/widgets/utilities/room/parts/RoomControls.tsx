import type { ReactNode } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import { Body, Button, Caption, Heading } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import {
  isUnavailableState,
  friendlyName,
  listAttr,
  numberAttr,
  stringAttr,
} from '../../shared/entity';
import { formatCompact, humanizeState } from '../../shared/format';
import { ValueStepper } from '../../shared/controls';
import { CollapseButton } from '../../shared/details';
import { Notice, commandNotice } from '../../shared/UtilityCard';
import { UtilityIcon, type UtilityIconName } from '../../shared/UtilityIcon';
import { useCommand } from '../../shared/useCommand';
import { haUnit } from '../../shared/units';

const HVAC_LABEL: Record<string, string> = {
  off: 'Spento',
  heat: 'Caldo',
  cool: 'Freddo',
  heat_cool: 'Caldo e freddo',
  auto: 'Automatico',
  dry: 'Deumidifica',
  fan_only: 'Solo ventola',
};

export function RoomSection({
  id,
  title,
  icon,
  collapsed,
  onToggle,
  aside,
  children,
}: {
  id: string;
  title: string;
  icon: UtilityIconName;
  collapsed: boolean;
  onToggle: () => void;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const bodyId = `${id}-contenuto`;
  return (
    <section className="utility-section" aria-labelledby={`${id}-titolo`}>
      <div className="utility-section__head">
        <Heading level={3} size="sm" tone="ink" id={`${id}-titolo`}>
          <CollapseButton expanded={!collapsed} onToggle={onToggle} controls={bodyId}>
            <UtilityIcon name={icon} size="md" color="var(--aca-ink-muted)" />
            <span>{title}</span>
          </CollapseButton>
        </Heading>
        {!collapsed && aside && <div className="utility-toolbar">{aside}</div>}
      </div>
      <div id={bodyId} hidden={collapsed} className="utility-stack">
        {children}
      </div>
    </section>
  );
}

export function ClimateControl({ climateId, entity }: { climateId: string; entity: HassEntity }) {
  const { haConfig } = useWidgetRuntime();
  const command = useCommand(entity);
  const target = numberAttr(entity, 'temperature');
  // Climate entities report in the unit of Home Assistant: label only, no conversion.
  const unit = haUnit(
    'temperature',
    haConfig,
    stringAttr(entity, 'temperature_unit') ?? stringAttr(entity, 'unit_of_measurement') ?? '°C'
  );
  const current = numberAttr(entity, 'current_temperature');
  const modes = listAttr(entity, 'hvac_modes');
  const action = stringAttr(entity, 'hvac_action') ?? entity.state ?? 'idle';
  const unavailable = isUnavailableState(entity.state);
  const notice = commandNotice(command.errorKey, command.unconfirmedKey);
  return (
    <div className="utility-stack">
      <div className="utility-split">
        <div className="utility-stack">
          <Body as="span" size="sm" tone="ink">
            {friendlyName(entity, climateId)}
          </Body>
          <Caption>{HVAC_LABEL[action] ?? humanizeState(action)}</Caption>
        </div>
        <Caption>
          Attuale {current === null ? '--' : `${formatCompact(current, 1)} ${unit}`}
        </Caption>
      </div>
      {target !== null && (
        <ValueStepper
          label="Temperatura desiderata"
          confirmed={target}
          min={numberAttr(entity, 'min_temp') ?? 16}
          max={numberAttr(entity, 'max_temp') ?? 30}
          step={0.5}
          disabled={unavailable || !((numberAttr(entity, 'supported_features') ?? 0) & 1)}
          format={(value) => `${formatCompact(value, 1)} ${unit}`}
          toCall={(value) => ({
            domain: 'climate',
            service: 'set_temperature',
            data: { entity_id: climateId, temperature: value },
          })}
        />
      )}
      {target !== null && (
        <Caption>
          Desiderata {formatCompact(target, 1)} {unit}
        </Caption>
      )}
      {modes.length > 0 && (
        <div className="utility-toolbar" role="group" aria-label="Modalità del clima">
          {modes.map((mode) => (
            <Button
              key={mode}
              variant="control"
              size="sm"
              aria-pressed={entity.state === mode}
              loading={command.pendingKey === mode}
              disabled={unavailable}
              onClick={() =>
                command.run({
                  key: mode,
                  domain: 'climate',
                  service: 'set_hvac_mode',
                  data: { entity_id: climateId, hvac_mode: mode },
                  confirm: (current) => current?.state === mode,
                })
              }
            >
              {HVAC_LABEL[mode] ?? humanizeState(mode)}
            </Button>
          ))}
        </div>
      )}
      {target === null && modes.length === 0 && <Caption>Solo lettura della temperatura.</Caption>}
      {notice && (
        <Notice tone={notice.tone} icon="warning" live>
          {notice.text}
        </Notice>
      )}
    </div>
  );
}
