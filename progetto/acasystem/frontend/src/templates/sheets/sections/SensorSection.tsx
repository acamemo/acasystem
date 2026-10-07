import { useMemo } from 'react';
import { Caption, Field } from '@/components/primitives';
import type { CardSettings, SensorActionType } from '@/@types/dashboard';
import type { EntityMap } from '@/@types/ha';
import {
  SENSOR_ACTION_TYPES,
  getSensorActionTargetDomains,
  isSensorStatusMode,
  resolveSensorCardConfig,
  type SensorStatusMode,
} from '@/utils/sensorCardConfig';
import { isRecord } from '@/validators/guards';
import { EntitySelect } from '../parts/EntityPicker';
import { ChoiceGroup, FormRow, SheetSection, ToggleRow, type Choice } from '../parts/Form';

type ActionType = SensorActionType;
type Trigger = 'button' | 'icon' | 'card';

const STATUS_MODES: ReadonlyArray<Choice<SensorStatusMode>> = [
  { value: 'auto', label: 'Automatico' },
  { value: 'text', label: 'Testo' },
  { value: 'entity', label: 'Altra entità' },
  { value: 'attribute', label: 'Attributo' },
  { value: 'hidden', label: 'Nascosto' },
];

const ACTION_LABELS: Record<ActionType, string> = {
  auto: 'Automatica',
  'more-info': 'Mostra i dettagli',
  toggle: 'Accendi o spegni',
  turn_on: 'Accendi',
  turn_off: 'Spegni',
  scene: 'Attiva lo scenario',
  script: 'Esegui lo script',
  press: 'Premi il pulsante',
  service: 'Servizio personalizzato',
  none: 'Nessuna',
};

const TRIGGERS: ReadonlyArray<Choice<Trigger>> = [
  { value: 'button', label: 'Pulsante' },
  { value: 'icon', label: 'Icona' },
  { value: 'card', label: 'Widget' },
];

const hasValue = (value: unknown) => value !== undefined && value !== null && value !== '';

/**
 * Sensor widget (entity_card_*): entity, name and icon visibility, status line and action, with
 * the keys of the legacy SensorCardSettings. Numeric style and custom services are not here yet.
 */
export function SensorSection({
  widgetId,
  settings,
  entities,
  save,
}: {
  widgetId: string;
  settings: CardSettings;
  entities: EntityMap;
  save: (key: string, value: unknown) => void;
}) {
  const primaryId =
    typeof settings.entityId === 'string' && settings.entityId ? settings.entityId : widgetId;
  const primaryDomain = primaryId.split('.')[0];
  const config = resolveSensorCardConfig(settings, entities[primaryId], entities);
  const action = isRecord(settings.sensorAction) ? settings.sensorAction : {};
  const actionType = config.action.configuredType;
  const allIds = useMemo(() => Object.keys(entities), [entities]);

  const rawStatusMode = settings.sensorStatusMode;
  const statusMode: SensorStatusMode =
    settings.showStatus === false
      ? 'hidden'
      : isSensorStatusMode(rawStatusMode)
        ? rawStatusMode
        : primaryDomain === 'script' && hasValue(settings.scriptStatusText)
          ? 'text'
          : 'auto';

  const updateAction = (patch: Record<string, unknown>) =>
    save('sensorAction', { ...action, ...patch });

  const supportsTarget = (type: string, id: string | null | undefined) => {
    const domains = getSensorActionTargetDomains(type);
    return !domains || (Boolean(id) && domains.includes(String(id).split('.')[0]));
  };

  const changeActionType = (type: ActionType) => {
    const current = typeof action.entityId === 'string' ? action.entityId : null;
    const keepTarget = Boolean(current) && supportsTarget(type, current);
    updateAction({
      type,
      entityId: keepTarget ? current : null,
      service: null,
      data: {},
      targetMode: 'entity',
    });
  };

  const targetDomains = getSensorActionTargetDomains(actionType);
  const targetIds = targetDomains
    ? allIds.filter((id) => targetDomains.includes(id.split('.')[0]))
    : allIds;
  const showTarget =
    !['auto', 'none', 'service'].includes(actionType) ||
    (actionType === 'auto' && hasValue(action.entityId));
  const targetValue =
    (typeof action.entityId === 'string' && action.entityId) ||
    (supportsTarget(actionType, primaryId) ? primaryId : null);
  const hasAction = config.action.type !== 'none';
  const actionOptions = SENSOR_ACTION_TYPES.filter(
    (type) => type !== 'service' || actionType === 'service'
  ).map((type) => ({
    value: type,
    label:
      type === 'auto'
        ? `Automatica: ${ACTION_LABELS[hasAction ? config.action.type : 'more-info'].toLowerCase()}`
        : ACTION_LABELS[type],
  }));
  const statusEntityId =
    typeof settings.sensorStatusEntityId === 'string' && settings.sensorStatusEntityId
      ? settings.sensorStatusEntityId
      : primaryId;
  const statusAttributes = Object.keys(entities[statusEntityId]?.attributes ?? {});

  return (
    <>
      <SheetSection title="Contenuto">
        <EntitySelect
          label="Entità"
          value={primaryId}
          entities={entities}
          ids={allIds}
          allowNone={false}
          onChange={(id) => {
            if (id) save('entityId', id);
          }}
        />
        <ToggleRow
          label="Mostra il nome"
          checked={settings.showName !== false}
          onChange={(value) => save('showName', value)}
        />
        <ToggleRow
          label="Mostra l’icona"
          checked={settings.showIcon !== false}
          onChange={(value) => save('showIcon', value)}
        />
      </SheetSection>

      <SheetSection title="Riga di stato">
        <ChoiceGroup<SensorStatusMode>
          label="Che cosa mostra"
          options={STATUS_MODES}
          value={statusMode}
          onChange={(mode) => {
            save('sensorStatusMode', mode);
            save('showStatus', true);
          }}
        />
        {statusMode === 'text' && (
          <FormRow label="Testo dello stato">
            {({ labelId }) => (
              <Field
                label="Testo dello stato"
                aria-labelledby={labelId}
                placeholder="Automatico"
                value={String(settings.sensorStatusText ?? settings.scriptStatusText ?? '')}
                onChange={(event) => {
                  save('sensorStatusText', event.target.value || null);
                  if (settings.scriptStatusText) save('scriptStatusText', null);
                }}
              />
            )}
          </FormRow>
        )}
        {(statusMode === 'entity' || statusMode === 'attribute') && (
          <EntitySelect
            label="Entità dello stato"
            value={statusEntityId}
            entities={entities}
            ids={allIds}
            onChange={(id) => save('sensorStatusEntityId', id || null)}
            noneLabel="La stessa del widget"
          />
        )}
        {statusMode === 'attribute' &&
          (statusAttributes.length > 0 ? (
            <ChoiceGroup<string>
              label="Attributo"
              options={statusAttributes.map((name) => ({ value: name, label: name }))}
              value={
                typeof settings.sensorStatusAttribute === 'string'
                  ? settings.sensorStatusAttribute
                  : ''
              }
              onChange={(name) => save('sensorStatusAttribute', name)}
            />
          ) : (
            <Caption as="p">L’entità non ha attributi da mostrare.</Caption>
          ))}
      </SheetSection>

      <SheetSection title="Azione">
        <ChoiceGroup<ActionType>
          label="Al tocco"
          options={actionOptions}
          value={actionType}
          onChange={changeActionType}
        />
        {actionType === 'service' && (
          <Caption as="p">
            Servizio e dati restano quelli salvati: per ora si modificano solo dall’interfaccia
            precedente.
          </Caption>
        )}
        {showTarget && (
          <EntitySelect
            label="Entità comandata"
            value={targetValue}
            entities={entities}
            ids={targetIds}
            onChange={(id) => updateAction({ entityId: id || null })}
            noneLabel="La stessa del widget"
          />
        )}
        {hasAction && (
          <>
            <ChoiceGroup<Trigger>
              label="Dove si tocca"
              options={TRIGGERS}
              value={config.action.trigger}
              onChange={(trigger) => updateAction({ trigger })}
            />
            <FormRow
              label={config.action.trigger === 'button' ? 'Testo del pulsante' : 'Testo sul widget'}
            >
              {({ labelId }) => (
                <Field
                  label="Testo dell’azione"
                  aria-labelledby={labelId}
                  placeholder={config.action.trigger === 'button' ? 'Automatico' : ''}
                  value={typeof action.label === 'string' ? action.label : ''}
                  onChange={(event) => {
                    const next: Record<string, unknown> = {
                      ...action,
                      label: event.target.value || null,
                    };
                    delete next.labelOn;
                    delete next.labelOff;
                    save('sensorAction', next);
                  }}
                />
              )}
            </FormRow>
          </>
        )}
      </SheetSection>
    </>
  );
}
