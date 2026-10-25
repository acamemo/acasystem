import { useCallback, useId, type ReactNode } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import {
  Body,
  Caption,
  MaterialLayers,
  Text,
  Toggle,
  materialClass,
} from '@/components/primitives';
import type { WidgetDetailsProps, WidgetProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { CommandFeedback } from '../shared/CommandFeedback';
import { ControlIcon, aliasIcon } from '../shared/ControlIcon';
import { EntityHistorySection, EntityInfoSection } from '../shared/EntityHistorySection';
import { densityOf, entityName, isUnavailableState } from '../shared/entity';
import { formatRelative } from '../shared/format';
import { COMMAND_LABELS, COMMON_LABELS } from '../shared/labels';
import { callSafely } from '../shared/service';
import { useRequestedState } from '../shared/useRequestedState';
import { WidgetContent, WidgetLoading, WidgetMissing } from '../shared/WidgetContent';

const sameFlag = (a: boolean, b: boolean) => a === b;

/** automation.toggle of the legacy automation card, with requested → confirmed. */
export function useAutomationToggle(entityId: string, disabled: boolean) {
  const runtime = useWidgetRuntime();
  const entity: HassEntity | undefined = runtime.entities[entityId];
  const available = !!entity && !isUnavailableState(entity.state);
  const confirmed = entity?.state === 'on';
  const request = useRequestedState<boolean>({ confirmed, matches: sameFlag });
  const { track, settle } = request;
  const toggle = useCallback(() => {
    if (disabled || !available) return;
    request.request(!request.value);
    track(callSafely(runtime, 'automation', 'toggle', { entity_id: entityId }));
    settle();
  }, [available, disabled, entityId, request, runtime, settle, track]);
  return { entity, available, on: request.value, request, toggle };
}

const statusText = (available: boolean, on: boolean) =>
  !available ? COMMON_LABELS.unavailable : on ? 'Attiva' : 'Disattivata';

/** Automation widget: name, state and an Attiva/Disattivata switch. */
export function AutomationWidget({ id, size, editMode }: WidgetProps) {
  const runtime = useWidgetRuntime();
  const { entity, available, on, request, toggle } = useAutomationToggle(id, editMode);
  const density = densityOf(size);
  const name = entityName(runtime, id, entity);
  const lastTriggered: unknown = entity?.attributes.last_triggered;

  if (!runtime.entitiesLoaded) return <WidgetLoading size={size} />;
  if (!entity) return <WidgetMissing size={size} name={name} editMode={editMode} />;

  const icon =
    aliasIcon(runtime.customIcons[id]) ?? aliasIcon(entity.attributes.icon) ?? 'automation';
  const status = statusText(available, on);
  const glyph = (
    <ControlIcon
      name={available ? icon : 'warning'}
      size="md"
      color={
        !available ? 'var(--aca-danger-ink-icon)' : on ? 'var(--aca-orange-ink-icon)' : undefined
      }
    />
  );
  const switchProps = {
    checked: on,
    pending: request.pending,
    error: request.failed,
    disabled: editMode || !available,
    'aria-label': name,
    onClick: toggle,
  };
  const iconBadge = (
    <span
      className={materialClass(
        { behavior: 'static', shape: 'circle', size: 'md' },
        'ctl-badge-icon'
      )}
      aria-hidden="true"
    >
      <MaterialLayers>{glyph}</MaterialLayers>
    </span>
  );
  const heading = (
    <div className="ctl-heading ctl-grow">
      <Text className="ctl-name ctl-clamp-2">{name}</Text>
      <Caption className={request.pending ? 'ctl-status ctl-value--pending' : 'ctl-status'}>
        {status}
      </Caption>
    </div>
  );
  const last =
    typeof lastTriggered === 'string' && (density === 'tall' || density === 'large') ? (
      <Caption as="p">Ultima esecuzione {formatRelative(lastTriggered)}</Caption>
    ) : null;

  // Narrow tiles: the icon itself is the switch (a 44 px target); wider ones get the Toggle.
  const knob = (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-busy={request.pending || undefined}
      aria-invalid={request.failed || undefined}
      aria-label={name}
      disabled={editMode || !available}
      className={materialClass(
        { behavior: 'press', shape: 'circle', size: 'lg' },
        'ctl-knob',
        on && 'ctl-knob--on',
        request.failed && 'aca-m--error'
      )}
      onClick={toggle}
    >
      <MaterialLayers contentClassName="ctl-knob__content">
        <span className="ctl-knob__glow" aria-hidden="true" />
        {glyph}
      </MaterialLayers>
    </button>
  );
  const pendingText = request.pending ? COMMAND_LABELS.pending : null;

  let body: ReactNode;
  if (density === 'compact' || density === 'tall') {
    body = (
      <>
        <div className="ctl-row ctl-row--top">{knob}</div>
        {heading}
        {last}
        <CommandFeedback
          message={request.message}
          pendingText={density === 'tall' ? pendingText : null}
        />
      </>
    );
  } else {
    body = (
      <>
        <div className="ctl-row ctl-row--top">
          {iconBadge}
          {heading}
        </div>
        {last}
        <CommandFeedback message={request.message} pendingText={pendingText} />
        <div className="ctl-row ctl-row--bottom ctl-row--end">
          <Toggle {...switchProps} onLabel="Attiva" offLabel="Spenta" />
        </div>
      </>
    );
  }

  return (
    <WidgetContent
      size={size}
      name={name}
      editMode={editMode}
      onOpen={() => runtime.openDetails(id)}
      className="ctl-automation"
    >
      {body}
    </WidgetContent>
  );
}

/** Sheet content of an automation: switch, last run, activity and attributes. */
export function AutomationDetails({ id }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime();
  const { entity, available, on, request, toggle } = useAutomationToggle(id, false);
  const feedbackId = `automazione-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-esito`;
  const name = entityName(runtime, id, entity);
  if (!entity) {
    return (
      <Body tone="muted">
        {COMMON_LABELS.missing}. {COMMON_LABELS.missingHint}
      </Body>
    );
  }
  const lastTriggered: unknown = entity.attributes.last_triggered;
  return (
    <div className="ctl-details">
      <section className="ctl-details__section" aria-label="Stato">
        <div className="ctl-details__row">
          <div>
            <Body as="span">{statusText(available, on)}</Body>
            {typeof lastTriggered === 'string' && (
              <Caption as="p">Ultima esecuzione {formatRelative(lastTriggered)}</Caption>
            )}
          </div>
          <Toggle
            checked={on}
            pending={request.pending}
            error={request.failed}
            disabled={!available}
            onLabel="Attiva"
            offLabel="Spenta"
            aria-label={name}
            aria-describedby={feedbackId}
            onClick={toggle}
          />
        </div>
        <CommandFeedback
          id={feedbackId}
          message={request.message}
          pendingText={request.pending ? COMMAND_LABELS.pending : null}
        />
      </section>
      <EntityHistorySection entity={entity} />
      <EntityInfoSection entity={entity} />
    </div>
  );
}
