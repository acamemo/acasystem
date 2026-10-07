import { useId, useState } from 'react';
import { Body, Field } from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { CommandFeedback } from '../shared/CommandFeedback';
import { ControlIcon } from '../shared/ControlIcon';
import { EntityHistorySection, EntityInfoSection } from '../shared/EntityHistorySection';
import { entityName } from '../shared/entity';
import { COMMAND_LABELS, COMMON_LABELS } from '../shared/labels';
import { CONFIRM_HINT, LockActions, lockEntityId, lockIcon, lockIconColor } from './LockWidget';
import { useLockControl } from './useLockControl';

/**
 * Sheet content of a lock: state, the three commands with the code field when the lock asks
 * for one (instead of the legacy window.prompt), then activity and attributes.
 */
export function LockDetails({ id, settings }: WidgetDetailsProps) {
  const runtime = useWidgetRuntime();
  const entityId = lockEntityId(id, settings);
  const lock = useLockControl(entityId, false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>(undefined);
  const feedbackId = `serratura-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-esito`;
  const name = entityName(runtime, id, lock.entity, entityId ?? id);

  if (!lock.entity) {
    return (
      <Body tone="muted">
        {COMMON_LABELS.missing}. {COMMON_LABELS.missingHint}
      </Body>
    );
  }

  const hint = lock.confirmUnlock
    ? CONFIRM_HINT
    : lock.command.pending
      ? COMMAND_LABELS.pending
      : null;

  return (
    <div className="ctl-details">
      <section className="ctl-details__section" aria-label="Stato e comandi">
        <div className="ctl-details__row">
          <span className="ctl-inline">
            <ControlIcon name={lockIcon(lock)} size="lg" color={lockIconColor(lock)} />
            <Body as="span" className={lock.command.pending ? 'ctl-value--pending' : undefined}>
              {lock.label}
            </Body>
          </span>
        </div>
        {lock.unavailable && (
          <Body size="sm" tone="muted">
            {COMMON_LABELS.unavailableHint}
          </Body>
        )}
        {!runtime.conn && !lock.unavailable && (
          <Body size="sm" tone="muted">
            Serve la connessione a Home Assistant per comandare la serratura.
          </Body>
        )}
        {lock.requiresCode && (
          <Field
            label={`Codice di ${name}`}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Codice della serratura"
            value={code}
            error={codeError}
            onChange={(event) => {
              setCode(event.target.value);
              setCodeError(undefined);
            }}
          />
        )}
        <LockActions
          lock={lock}
          name={name}
          disabled={false}
          labelled
          set="all"
          code={code}
          onCodeNeeded={() => setCodeError('Inserisci il codice della serratura.')}
        />
        <CommandFeedback id={feedbackId} message={lock.command.message} pendingText={hint} />
      </section>
      <EntityHistorySection entity={lock.entity} />
      <EntityInfoSection entity={lock.entity} />
    </div>
  );
}
