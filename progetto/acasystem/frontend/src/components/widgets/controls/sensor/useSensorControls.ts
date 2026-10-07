import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { CardSettings } from '@/@types/dashboard';
import { useSensorCardAction, type SensorActionStatus } from '@/hooks/useSensorCardAction';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { numberAttr, settingString } from '../shared/entity';
import { COMMAND_LABELS } from '../shared/labels';
import { callSafely } from '../shared/service';
import { useRequestedState } from '../shared/useRequestedState';
import { buildSensorModel, type SensorModel } from './sensorModel';

const sameText = (a: string, b: string) => a === b;

export interface SensorControls {
  entityId: string;
  entity: HassEntity | undefined;
  model: SensorModel | null;
  /** Shown on/off of a toggle entity: the requested one while the action is pending. */
  toggleOn: boolean;
  actionStatus: SensorActionStatus;
  actionPending: boolean;
  actionDisabled: boolean;
  /** Runs the configured action (or the given override, e.g. turn_on). */
  runAction: (override?: string) => void;
  setToggle: (on: boolean) => void;
  /** select / input_select. */
  option: string;
  optionPending: boolean;
  selectOption: (option: string) => void;
  /** input_number. */
  numberValue: number | null;
  numberPending: boolean;
  stepNumber: (direction: 1 | -1) => void;
  numberMin: number;
  numberMax: number;
  /** Failure of the last command, in text. */
  message: string | null;
  /** Short status of the action (pending, sent, confirmed), or null. */
  actionText: string | null;
}

/**
 * Commands of the sensor/entity widget, as in the legacy renderSensorCard/SensorCard:
 * the configured action through useSensorCardAction (requested → confirmed/timeout/error),
 * select_option for selects and increment/decrement for input_number (with a connection).
 */
export function useSensorControls(
  cardId: string,
  settings: CardSettings,
  disabled: boolean
): SensorControls {
  const runtime = useWidgetRuntime();
  const { conn, entities, haConfig } = runtime;
  const entityId = settingString(settings, 'entityId') || cardId;
  const entity: HassEntity | undefined = entities[entityId];
  const model = useMemo(
    () => (entity ? buildSensorModel(settings, entity, entities, haConfig) : null),
    [entities, entity, haConfig, settings]
  );

  const openDetails = useCallback(() => runtime.openDetails(cardId), [cardId, runtime]);
  const feedback = useSensorCardAction({
    conn,
    callService: runtime.callService,
    action: model?.config.action,
    entities,
    onOpen: openDetails,
    disabled,
  });
  const actionDisabled =
    disabled ||
    feedback.pending ||
    !model ||
    (model.config.action.type !== 'more-info' && (!conn || model.actionUnavailable));

  const [requestedOn, setRequestedOn] = useState<boolean | null>(null);
  useEffect(() => {
    if (!feedback.pending) setRequestedOn(null);
  }, [feedback.pending]);

  const runAction = useCallback(
    (override?: string) => {
      if (actionDisabled) return;
      void feedback.execute(override);
    },
    [actionDisabled, feedback]
  );
  const setToggle = useCallback(
    (on: boolean) => {
      if (actionDisabled) return;
      setRequestedOn(on);
      void feedback.execute(on ? 'turn_on' : 'turn_off');
    },
    [actionDisabled, feedback]
  );

  const domain = entityId.split('.')[0] ?? '';
  const select = useRequestedState<string>({ confirmed: entity?.state ?? '', matches: sameText });
  const selectOption = useCallback(
    (option: string) => {
      if (disabled || !conn || !option) return;
      select.request(option);
      select.track(callSafely(runtime, domain, 'select_option', { entity_id: entityId, option }));
      select.settle();
    },
    [conn, disabled, domain, entityId, runtime, select]
  );

  const numberMin = numberAttr(entity, 'min') ?? 0;
  const numberMax = numberAttr(entity, 'max') ?? 100;
  const numberStep = numberAttr(entity, 'step') ?? 1;
  const confirmedNumber = Number.parseFloat(String(entity?.state));
  const numberMatches = useCallback(
    (requested: number, current: number) => Math.abs(requested - current) < numberStep / 2,
    [numberStep]
  );
  const number = useRequestedState<number>({ confirmed: confirmedNumber, matches: numberMatches });
  const stepNumber = useCallback(
    (direction: 1 | -1) => {
      if (disabled || !conn || Number.isNaN(number.value)) return;
      number.request(number.value + direction * numberStep);
      number.track(
        callSafely(runtime, 'input_number', direction > 0 ? 'increment' : 'decrement', {
          entity_id: entityId,
        })
      );
      number.settle();
    },
    [conn, disabled, entityId, number, numberStep, runtime]
  );

  const actionFailed = feedback.status === 'error' || feedback.status === 'timeout';
  const message = actionFailed
    ? COMMAND_LABELS[feedback.status === 'error' ? 'error' : 'timeout']
    : (select.message ?? number.message);
  const actionText =
    feedback.status === 'pending'
      ? COMMAND_LABELS.pending
      : feedback.status === 'sent'
        ? COMMAND_LABELS.sent
        : feedback.status === 'confirmed'
          ? COMMAND_LABELS.confirmed
          : select.pending || number.pending
            ? COMMAND_LABELS.pending
            : null;

  return {
    entityId,
    entity,
    model,
    toggleOn: requestedOn ?? entity?.state === 'on',
    actionStatus: feedback.status,
    actionPending: feedback.pending,
    actionDisabled,
    runAction,
    setToggle,
    option: select.value,
    optionPending: select.pending,
    selectOption,
    numberValue: Number.isNaN(number.value) ? null : number.value,
    numberPending: number.pending,
    stepNumber,
    numberMin,
    numberMax,
    message,
    actionText,
  };
}
