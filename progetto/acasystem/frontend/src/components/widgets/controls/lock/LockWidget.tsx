import type { ReactNode } from 'react';
import {
  Button,
  Caption,
  MaterialLayers,
  Text,
  materialClass,
} from '@/components/primitives';
import type { WidgetProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { CommandFeedback } from '../shared/CommandFeedback';
import { ControlIcon, aliasIcon, type ControlIconName } from '../shared/ControlIcon';
import { densityOf, entityName, settingString } from '../shared/entity';
import { COMMAND_LABELS } from '../shared/labels';
import { WidgetContent, WidgetLoading, WidgetMissing } from '../shared/WidgetContent';
import { useLockControl, type LockControl } from './useLockControl';

/** Entity of a lock card: the card id for `lock.*`, the `lockId` setting for `lock_card_*`. */
export function lockEntityId(cardId: string, settings: unknown): string | undefined {
  return cardId.startsWith('lock.') ? cardId : settingString(settings, 'lockId') || undefined;
}

export const CONFIRM_HINT = 'Tocca di nuovo per sbloccare.';

/** Lock, unlock (two taps) and open buttons; labels are shown when `labelled`. */
export function LockActions({
  lock,
  name,
  disabled,
  labelled,
  set = 'all',
  code,
  onCodeNeeded,
}: {
  lock: LockControl;
  name: string;
  disabled: boolean;
  labelled: boolean;
  /** primary: only the action that changes the state; pair: lock and unlock; all: with open. */
  set?: 'primary' | 'pair' | 'all';
  code?: string;
  onCodeNeeded: () => void;
}) {
  const run = (action: (code?: string) => boolean) => {
    if (!action(code)) onCodeNeeded();
  };
  const pending = (target: string) =>
    lock.command.pending && lock.command.value === target ? true : undefined;
  const button = (
    key: string,
    icon: ControlIconName,
    label: string,
    action: (code?: string) => boolean,
    blocked: boolean,
    target: string,
    pressed?: boolean
  ) => (
    <Button
      key={key}
      variant="control"
      shape={labelled ? 'pill' : 'circle'}
      size={labelled ? 'sm' : 'md'}
      aria-label={labelled ? undefined : `${label}: ${name}`}
      aria-pressed={pressed}
      aria-busy={pending(target)}
      disabled={disabled || blocked}
      onClick={() => run(action)}
      contentClassName="ctl-action__content"
    >
      <ControlIcon name={icon} size="md" />
      {labelled && <span className="aca-m__label">{label}</span>}
    </Button>
  );
  const lockButton = button('lock', 'lock', 'Blocca', lock.lock, lock.lockDisabled, 'locked');
  const unlockButton = button(
    'unlock',
    lock.confirmUnlock ? 'key' : 'unlock',
    lock.confirmUnlock ? 'Conferma' : 'Sblocca',
    lock.unlock,
    lock.unlockDisabled,
    'unlocked',
    lock.confirmUnlock || undefined
  );
  const openButton =
    lock.supportsOpen && set === 'all'
      ? button('open', 'key', 'Apri', lock.open, lock.openDisabled, 'open')
      : null;
  if (set === 'primary') {
    return (
      <div className="ctl-stepper">{lock.isUnlocked || lock.isOpen ? lockButton : unlockButton}</div>
    );
  }
  return (
    <div className="ctl-stepper" role="group" aria-label={`Comandi di ${name}`}>
      {lockButton}
      {unlockButton}
      {openButton}
    </div>
  );
}

export function lockIcon(lock: LockControl): ControlIconName {
  if (lock.unavailable || lock.isJammed) return 'warning';
  return lock.isUnlocked || lock.isOpen ? 'unlock' : 'lock';
}

export function lockIconColor(lock: LockControl): string | undefined {
  if (lock.unavailable || lock.isJammed) return 'var(--aca-danger-ink-icon)';
  return lock.isUnlocked || lock.isOpen ? 'var(--aca-orange-ink-icon)' : undefined;
}

/** Lock widget (legacy LockCard): state, lock/unlock/open; a needed code opens the details. */
export function LockWidget({ id, settings, size, editMode }: WidgetProps) {
  const runtime = useWidgetRuntime();
  const entityId = lockEntityId(id, settings);
  const lock = useLockControl(entityId, editMode);
  const density = densityOf(size);
  const name =
    runtime.customNames[id] ||
    (entityId ? runtime.customNames[entityId] : undefined) ||
    entityName(runtime, id, lock.entity, entityId ?? id);

  if (!runtime.entitiesLoaded) return <WidgetLoading size={size} />;
  if (!lock.entity) return <WidgetMissing size={size} name={name} editMode={editMode} />;

  const custom = aliasIcon(runtime.customIcons[entityId ?? id]) ?? aliasIcon(lock.entity.attributes.icon);
  const icon = lock.unavailable || lock.isJammed ? 'warning' : (custom ?? lockIcon(lock));
  const openDetails = () => runtime.openDetails(id);
  const badge = (
    <span
      className={materialClass(
        { behavior: 'static', shape: 'circle', size: 'md' },
        'ctl-badge-icon',
        (lock.command.failed || lock.isJammed) && 'aca-m--error'
      )}
      aria-hidden="true"
    >
      <MaterialLayers>
        <ControlIcon name={icon} size="md" color={lockIconColor(lock)} />
      </MaterialLayers>
    </span>
  );
  const stateText = (
    <Text
      className={[
        'ctl-state',
        density === 'large' ? 'ctl-state--lg' : undefined,
        lock.command.pending && 'ctl-value--pending',
        'ctl-clamp-1',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {lock.label}
    </Text>
  );
  const nameText = <Text className="ctl-name ctl-clamp-2">{name}</Text>;
  const hint = lock.confirmUnlock ? CONFIRM_HINT : lock.command.pending ? COMMAND_LABELS.pending : null;
  const feedback = <CommandFeedback message={lock.command.message} pendingText={hint} />;
  const actions = (labelled: boolean, set: 'primary' | 'pair' | 'all') => (
    <LockActions
      lock={lock}
      name={name}
      disabled={editMode}
      labelled={labelled}
      set={set}
      onCodeNeeded={openDetails}
    />
  );

  let body: ReactNode;
  if (density === 'compact') {
    body = (
      <>
        <div className="ctl-row ctl-row--top">
          {badge}
          {actions(false, 'primary')}
        </div>
        {stateText}
        {nameText}
        {feedback}
      </>
    );
  } else if (density === 'wide') {
    body = (
      <>
        <div className="ctl-row ctl-row--top">
          {badge}
          <div className="ctl-heading ctl-grow">
            {nameText}
            <Caption className="ctl-status">{lock.label}</Caption>
          </div>
        </div>
        {feedback}
        <div className="ctl-row ctl-row--bottom ctl-row--end">{actions(false, 'all')}</div>
      </>
    );
  } else if (density === 'tall') {
    body = (
      <>
        <div className="ctl-row ctl-row--top">{badge}</div>
        {stateText}
        {nameText}
        {feedback}
        <div className="ctl-row ctl-row--bottom">{actions(false, 'primary')}</div>
      </>
    );
  } else {
    body = (
      <>
        <div className="ctl-row ctl-row--top">
          {badge}
          <div className="ctl-heading ctl-grow">{nameText}</div>
        </div>
        {/* 2×2 (L-19): the state at the bottom, right above the commands that change it. */}
        <div className="ctl-pole">
          {stateText}
          {feedback}
          <div className="ctl-row ctl-row--bottom">{actions(false, 'all')}</div>
        </div>
      </>
    );
  }

  return (
    <WidgetContent
      size={size}
      name={name}
      editMode={editMode}
      onOpen={openDetails}
      className="ctl-lock"
    >
      {body}
    </WidgetContent>
  );
}
