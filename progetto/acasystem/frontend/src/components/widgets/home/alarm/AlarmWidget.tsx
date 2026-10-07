import type { HassEntity } from 'home-assistant-js-websocket';
import type { CellSize, WidgetProps } from '@/@types/launcher';
import { Button, Caption, Display, Heading } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { attributeString, displayName, isUnavailableState, settingEntity } from '../shared/entity';
import { HomeIcon, type HomeIconTone } from '../shared/HomeIcon';
import { CommandError, WidgetLoading, WidgetNotice, WidgetShell } from '../shared/WidgetShell';
import {
  TRANSITION_STATES,
  alarmStateIcon,
  alarmStateLabel,
  quickActions,
  requiresCode,
  unsupportedCode,
  type AlarmAction,
} from './alarmModel';
import { requestAlarmAction } from './alarmRequests';
import { useAlarmCommand } from './useAlarmCommand';

export function alarmTone(state: string): HomeIconTone {
  if (state === 'triggered' || isUnavailableState(state)) return 'danger';
  if (state === 'disarmed') return 'muted';
  if (TRANSITION_STATES.has(state)) return 'info';
  return 'active';
}

export function AlarmWidget({ id, settings, size, editMode }: WidgetProps) {
  const { entities, entitiesLoaded, customNames } = useWidgetRuntime();
  const { entityId, entity } = settingEntity(entities, settings, 'alarmId');
  const name = displayName(customNames, id, entity, entity && entityId ? entityId : 'Allarme');

  if (!entitiesLoaded) {
    return (
      <WidgetShell name={name} size={size} editMode={editMode}>
        <WidgetLoading size={size} label="Caricamento dell’allarme…" />
      </WidgetShell>
    );
  }
  if (!entityId || !entity) {
    return (
      <WidgetShell name={name} size={size} editMode={editMode} state="missing">
        <WidgetNotice
          icon="shieldSecurity"
          title={name}
          message={
            entityId
              ? 'La centrale d’allarme non è più presente in Home Assistant.'
              : 'Scegli una centrale d’allarme nelle impostazioni del widget.'
          }
          detail={entityId}
          compact={size.h < 2}
        />
      </WidgetShell>
    );
  }
  return (
    <AlarmCard
      id={id}
      name={name}
      entityId={entityId}
      entity={entity}
      size={size}
      editMode={editMode}
    />
  );
}

interface AlarmCardProps {
  id: string;
  name: string;
  entityId: string;
  entity: HassEntity;
  size: CellSize;
  editMode: boolean;
}

function AlarmCard({ id, name, entityId, entity, size, editMode }: AlarmCardProps) {
  const { openDetails } = useWidgetRuntime();
  const command = useAlarmCommand(entityId, entity);
  const state = entity.state;
  const unavailable = isUnavailableState(state);
  const inTransition = TRANSITION_STATES.has(state);
  const compact = size.h < 2;
  const actions = quickActions(entity, compact ? 1 : 2);
  const textCode = unsupportedCode(entity);
  const changedBy = attributeString(entity, 'changed_by');
  const tone = alarmTone(state);

  const runQuick = (action: AlarmAction) => {
    if (editMode || unavailable || inTransition || command.pendingAction) return;
    if (textCode || requiresCode(action.key, entity)) {
      // The PIN is typed in the detail sheet, never on the card.
      requestAlarmAction(id, action.key);
      openDetails(id);
      return;
    }
    command.run(action);
  };

  const stateText = command.pendingAction
    ? `${alarmStateLabel(state)} · in attesa di conferma`
    : alarmStateLabel(state);

  const actionButtons = actions.map((action) => (
    <Button
      key={action.key}
      variant="control"
      size="sm"
      className="home-quick__action"
      loading={command.pendingAction?.key === action.key}
      disabled={editMode || unavailable || inTransition}
      aria-haspopup={textCode || requiresCode(action.key, entity) ? 'dialog' : undefined}
      onClick={() => runQuick(action)}
    >
      <HomeIcon name={action.icon} size="sm" />
      {action.label}
    </Button>
  ));

  return (
    <WidgetShell
      name={name}
      size={size}
      editMode={editMode}
      error={command.error || state === 'triggered'}
      state={state}
      onPress={() => openDetails(id)}
      pressLabel={`Apri l’allarme ${name}`}
    >
      {compact ? (
        <>
          <div className="home-row">
            <HomeIcon name={alarmStateIcon(state)} size="lg" tone={tone} />
            <div className="home-stack home-grow">
              <Heading level={3} size="sm" className="home-truncate">
                {name}
              </Heading>
              {command.error ? (
                <CommandError>Comando non riuscito</CommandError>
              ) : (
                <Caption tone={tone === 'danger' ? 'danger' : 'muted'} className="home-truncate">
                  {stateText}
                </Caption>
              )}
            </div>
          </div>
          {actionButtons.length > 0 && (
            <div className="home-quick home-push home-hide-short">{actionButtons}</div>
          )}
        </>
      ) : (
        <>
          <div className="home-row home-row--between">
            <HomeIcon name={alarmStateIcon(state)} size="lg" tone={tone} />
            <Caption>Allarme</Caption>
          </div>
          <div className="home-stack">
            <Display
              as="p"
              size="sm"
              tone={tone === 'danger' ? 'danger' : undefined}
              className="home-alarm__state"
            >
              {alarmStateLabel(state)}
            </Display>
            <Heading level={3} size="sm" className="home-truncate">
              {name}
            </Heading>
            {command.pendingAction && <Caption>In attesa di conferma</Caption>}
            {command.error && (
              <CommandError>Comando non riuscito. Riprova dal dettaglio.</CommandError>
            )}
            {!command.error && changedBy && (
              <Caption className="home-truncate home-hide-low">Modificato da {changedBy}</Caption>
            )}
            {textCode && (
              <Caption className="home-hide-low">Codice testuale: usa il dettaglio.</Caption>
            )}
          </div>
          {actionButtons.length > 0 && <div className="home-quick home-push">{actionButtons}</div>}
        </>
      )}
    </WidgetShell>
  );
}
