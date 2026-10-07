import { useEffect, useId, useState } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { Button, Caption, Display, Heading } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { attributeString, displayName, isUnavailableState, settingEntity } from '../shared/entity';
import { HomeIcon } from '../shared/HomeIcon';
import { CommandError, WidgetNotice } from '../shared/WidgetShell';
import {
  alarmStateIcon,
  alarmStateLabel,
  detailActions,
  requiresCode,
  unsupportedCode,
  type AlarmActionKey,
} from './alarmModel';
import { clearAlarmAction, peekAlarmAction } from './alarmRequests';
import { alarmTone } from './AlarmWidget';
import { PinPad } from './PinPad';
import { useAlarmCommand } from './useAlarmCommand';

const TEXT_CODE_HINT =
  'Questo allarme usa un codice testuale: il tastierino accetta solo PIN numerici.';

export function AlarmDetails({ id, settings, onClose }: WidgetDetailsProps) {
  const { entities, customNames } = useWidgetRuntime();
  const { entityId, entity } = settingEntity(entities, settings, 'alarmId');
  const name = displayName(customNames, id, entity, entity && entityId ? entityId : 'Allarme');
  if (!entityId || !entity) {
    return (
      <WidgetNotice
        icon="shieldSecurity"
        title={name}
        message={
          entityId
            ? 'La centrale d’allarme non è più presente in Home Assistant.'
            : 'Scegli una centrale d’allarme nelle impostazioni del widget.'
        }
        detail={entityId}
      />
    );
  }
  return (
    <AlarmDetailsContent
      id={id}
      name={name}
      entityId={entityId}
      entity={entity}
      onClose={onClose}
    />
  );
}

interface AlarmDetailsContentProps {
  id: string;
  name: string;
  entityId: string;
  entity: HassEntity;
  onClose: () => void;
}

function AlarmDetailsContent({ id, name, entityId, entity, onClose }: AlarmDetailsContentProps) {
  const { editMode } = useWidgetRuntime();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const actionsId = `allarme-${uid}-azioni`;
  // Action chosen on the card (PIN needed): selected here; the sheet closes once it is sent.
  const [preselected] = useState(() => peekAlarmAction(id));
  useEffect(() => clearAlarmAction(id), [id]);

  const command = useAlarmCommand(entityId, entity);
  const [selectedKey, setSelectedKey] = useState<AlarmActionKey | undefined>(preselected);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | undefined>(undefined);

  const state = entity.state;
  const unavailable = isUnavailableState(state);
  const actions = detailActions(entity);
  const selected =
    actions.find((action) => action.key === selectedKey) ??
    actions.find((action) => action.key === 'disarm') ??
    actions[0];
  const textCode = unsupportedCode(entity);
  const needsCode = selected ? requiresCode(selected.key, entity) : false;
  const busy = Boolean(command.pendingAction);
  const changedBy = attributeString(entity, 'changed_by');
  const tone = alarmTone(state);

  const submit = () => {
    if (!selected || busy || unavailable || editMode) return;
    if (needsCode && textCode) {
      setPinError(TEXT_CODE_HINT);
      return;
    }
    if (needsCode && !pin.trim()) {
      setPinError('Inserisci il PIN');
      return;
    }
    const code = needsCode ? pin : undefined;
    // The code is cleared at once: it only travels in this service call.
    setPin('');
    setPinError(undefined);
    command.run(selected, code, preselected ? onClose : undefined);
  };

  return (
    <div className="home-details">
      <div className="home-row">
        <HomeIcon name={alarmStateIcon(state)} size="lg" tone={tone} className="home-alarm__icon" />
        <div className="home-stack home-grow">
          <Caption as="p">{name}</Caption>
          <Display as="p" size="sm" tone={tone === 'danger' ? 'danger' : undefined}>
            {alarmStateLabel(state)}
          </Display>
          {command.pendingAction ? (
            <Caption as="p">
              In attesa di conferma: {command.pendingAction.label.toLowerCase()}
            </Caption>
          ) : (
            changedBy && <Caption as="p">Modificato da {changedBy}</Caption>
          )}
        </div>
      </div>
      {command.error && (
        <CommandError>
          Comando non riuscito. Controlla il PIN e i permessi di Home Assistant.
        </CommandError>
      )}

      <section className="home-section" aria-labelledby={actionsId}>
        <Heading level={3} size="sm" id={actionsId}>
          Azioni
        </Heading>
        {actions.length === 0 ? (
          <Caption as="p">
            {unavailable
              ? 'La centrale non è disponibile.'
              : 'Nessuna azione disponibile per questo allarme.'}
          </Caption>
        ) : (
          <div role="group" aria-labelledby={actionsId} className="home-alarm__actions">
            {actions.map((action) => {
              const actionNeedsCode = requiresCode(action.key, entity);
              return (
                <Button
                  key={action.key}
                  variant="control"
                  size="md"
                  aria-pressed={selected?.key === action.key}
                  disabled={busy || unavailable || editMode || (textCode && actionNeedsCode)}
                  contentClassName="home-alarm__action"
                  onClick={() => {
                    setSelectedKey(action.key);
                    setPinError(undefined);
                    command.clearError();
                  }}
                >
                  <HomeIcon name={action.icon} size="md" />
                  {action.label}
                  {actionNeedsCode && <Caption className="home-alarm__hint">PIN richiesto</Caption>}
                </Button>
              );
            })}
          </div>
        )}
        {textCode && <Caption as="p">{TEXT_CODE_HINT}</Caption>}
      </section>

      {selected &&
        (needsCode ? (
          <section className="home-section" aria-label={`PIN per ${selected.label.toLowerCase()}`}>
            <PinPad
              pin={pin}
              onPinChange={(next) => {
                setPin(next);
                if (pinError) setPinError(undefined);
              }}
              onSubmit={submit}
              submitLabel={`Conferma: ${selected.label}`}
              busy={busy}
              disabled={unavailable || editMode || textCode}
              error={pinError}
            />
          </section>
        ) : (
          <Button
            variant="primary"
            size="md"
            loading={busy}
            disabled={unavailable || editMode}
            onClick={submit}
          >
            <HomeIcon name={selected.icon} size="md" />
            {selected.label}
          </Button>
        ))}
    </div>
  );
}
