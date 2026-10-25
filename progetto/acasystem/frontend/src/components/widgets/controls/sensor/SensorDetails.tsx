import { useId } from 'react';
import { Body, Caption } from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { CommandFeedback } from '../shared/CommandFeedback';
import { EntityHistorySection, EntityInfoSection } from '../shared/EntityHistorySection';
import { entityName, stringAttr } from '../shared/entity';
import { COMMON_LABELS } from '../shared/labels';
import {
  ActionButton,
  EntityToggle,
  NumberStepper,
  OptionPicker,
  SensorValue,
} from './SensorParts';
import { useSensorControls } from './useSensorControls';

/** Sheet content of the sensor/entity widget (legacy SensorModal): value, commands, history. */
export function SensorDetails({ id, settings }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime();
  const controls = useSensorControls(id, settings, false);
  const { model, entity } = controls;
  const feedbackId = `sensore-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-esito`;
  const name = entityName(runtime, id, entity, controls.entityId);

  if (!entity || !model) {
    return (
      <Body tone="muted">
        {COMMON_LABELS.missing}. {COMMON_LABELS.missingHint}
      </Body>
    );
  }

  const historyEntity =
    model.displayEntity?.entity_id && runtime.entities[model.displayEntity.entity_id]
      ? runtime.entities[model.displayEntity.entity_id]
      : entity;
  const action = model.config.action;
  const disabled = model.isUnavailable;

  return (
    <div className="ctl-details">
      <section className="ctl-details__section" aria-label="Stato attuale">
        <div className="ctl-details__row">
          <SensorValue
            model={model}
            size="lg"
            pending={controls.actionPending || controls.optionPending || controls.numberPending}
          />
          {model.isToggleDomain && (
            <EntityToggle
              controls={controls}
              name={name}
              compact={false}
              describedBy={feedbackId}
            />
          )}
        </div>
        {model.isUnavailable && (
          <Body size="sm" tone="muted">
            {COMMON_LABELS.unavailableHint}
          </Body>
        )}
        {model.isSelectDomain && model.selectOptions.length > 0 && (
          <div className="ctl-details__row">
            <Caption>Opzione</Caption>
            <OptionPicker controls={controls} name={name} disabled={disabled} />
          </div>
        )}
        {model.primaryDomain === 'input_number' && (
          <div className="ctl-details__row">
            <Caption>Valore</Caption>
            <NumberStepper controls={controls} name={name} disabled={disabled} />
          </div>
        )}
        {model.managedAction && action.type !== 'none' && action.type !== 'more-info' && (
          <div className="ctl-details__row">
            <Caption>Azione</Caption>
            <ActionButton controls={controls} compact={false} />
          </div>
        )}
        <CommandFeedback
          id={feedbackId}
          message={controls.message}
          pendingText={controls.actionText}
        />
      </section>
      {historyEntity && (
        <EntityHistorySection
          entity={historyEntity}
          unit={stringAttr(historyEntity, 'unit_of_measurement')}
          deviceClass={model.deviceClass}
        />
      )}
      <EntityInfoSection entity={entity} />
    </div>
  );
}
