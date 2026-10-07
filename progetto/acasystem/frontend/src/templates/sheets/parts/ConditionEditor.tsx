import { useMemo, useState } from 'react';
import { Body, Button, Caption, Field, Icon, IconText } from '@/components/primitives';
import type { EntityMap } from '@/@types/ha';
import type { CardSettings } from '@/@types/dashboard';
import {
  evaluateVisibilityConditionConfig,
  normalizeVisibilityConditionConfig,
  resolveConditionEntityId,
  type ConditionRule,
  type NormalizedVisibilityCondition,
} from '@/utils/conditionUtils';
import { ChoiceGroup, FormRow, type Choice } from './Form';
import { EntitySelect, entityName } from './EntityPicker';
import { useDomId } from './hooks';
import '../sheets.css';

type RuleType = 'state' | 'not_state' | 'numeric' | 'attribute';
type Operator = '>' | '<' | '>=' | '<=' | '==';

const RULE_TYPES: ReadonlyArray<Choice<RuleType>> = [
  { value: 'state', label: 'Stato uguale a' },
  { value: 'not_state', label: 'Stato diverso da' },
  { value: 'numeric', label: 'Confronto numerico' },
  { value: 'attribute', label: 'Attributo' },
];

const OPERATORS: ReadonlyArray<Choice<Operator>> = [
  { value: '>', label: 'Maggiore di' },
  { value: '<', label: 'Minore di' },
  { value: '>=', label: 'Almeno' },
  { value: '<=', label: 'Al massimo' },
  { value: '==', label: 'Uguale a' },
];

const isRuleType = (value: unknown): value is RuleType =>
  RULE_TYPES.some((option) => option.value === value);
const isOperator = (value: unknown): value is Operator =>
  OPERATORS.some((option) => option.value === value);

/** Default rule of the legacy builder: the entity is on, with no minimum duration. */
export const createDefaultRule = (): ConditionRule => ({
  type: 'state',
  states: ['on'],
  forSeconds: 0,
});

function withDefaults(condition: unknown): NormalizedVisibilityCondition {
  const normalized = normalizeVisibilityConditionConfig(condition);
  if (normalized.rules.length > 0) return normalized;
  return { entityId: null, logic: 'AND', enabled: true, rules: [createDefaultRule()] };
}

const statesOf = (rule: ConditionRule): string[] =>
  Array.isArray(rule.states) ? rule.states.map((state) => String(state)) : [];

const textOf = (value: unknown): string =>
  value === undefined || value === null ? '' : String(value);

export interface ConditionEditorProps {
  widgetId: string;
  settings: CardSettings;
  condition: unknown;
  entities: EntityMap;
  /** Receives the whole visibilityCondition object (null removes it), as the legacy builder. */
  onChange: (next: unknown) => void;
}

/**
 * Visibility rules of a widget (port of the legacy ConditionBuilder, always enabled): one or two
 * rules on an entity, joined by «tutte» or «almeno una», with the current result shown below.
 */
export function ConditionEditor({
  widgetId,
  settings,
  condition,
  entities,
  onChange,
}: ConditionEditorProps) {
  const defaultEntityId = resolveConditionEntityId(widgetId, settings, entities);
  const config = withDefaults(condition);
  const allIds = useMemo(() => Object.keys(entities), [entities]);

  const save = (next: NormalizedVisibilityCondition) => {
    const rules = next.rules.filter((rule) => Boolean(rule?.type)).slice(0, 2);
    if (rules.length === 0) {
      onChange(null);
      return;
    }
    onChange({
      ...next,
      logic: next.logic === 'OR' ? 'OR' : 'AND',
      enabled: next.enabled !== false,
      rules: rules.map((rule) => ({
        ...rule,
        entityId:
          typeof rule.entityId === 'string' && rule.entityId.trim()
            ? rule.entityId.trim()
            : defaultEntityId,
      })),
    });
  };

  const updateRule = (index: number, partial: Partial<ConditionRule>) => {
    const rules = [...config.rules];
    rules[index] = { ...(rules[index] ?? createDefaultRule()), ...partial };
    save({ ...config, rules });
  };

  const setType = (index: number, type: RuleType) => {
    const current = config.rules[index] ?? createDefaultRule();
    const presets: Record<RuleType, Partial<ConditionRule>> = {
      state: { type, states: ['on'] },
      not_state: { type, states: ['off'] },
      numeric: { type, operator: '>', value: 0 },
      attribute: { type, attribute: '', value: '' },
    };
    const rules = [...config.rules];
    rules[index] = { ...current, ...presets[type] };
    save({ ...config, rules });
  };

  const ruleEntityId = (index: number): string | null => {
    const explicit = config.rules[index]?.entityId;
    if (typeof explicit === 'string' && explicit.trim()) return explicit.trim();
    return defaultEntityId;
  };

  const visibleNow = evaluateVisibilityConditionConfig({
    condition: config,
    entity: defaultEntityId ? entities[defaultEntityId] : null,
    entities,
    fallbackEntityId: defaultEntityId,
  });

  return (
    <div className="aca-condition">
      {config.rules.map((rule, index) => (
        <RuleEditor
          key={index}
          index={index}
          rule={rule}
          entityId={ruleEntityId(index)}
          entities={entities}
          entityIds={allIds}
          onEntity={(id) => updateRule(index, { entityId: id })}
          onType={(type) => setType(index, type)}
          onUpdate={(partial) => updateRule(index, partial)}
        />
      ))}

      {config.rules.length > 1 && (
        <ChoiceGroup<'AND' | 'OR'>
          label="Le due regole"
          options={[
            { value: 'AND', label: 'Tutte e due' },
            { value: 'OR', label: 'Almeno una' },
          ]}
          value={config.logic === 'OR' ? 'OR' : 'AND'}
          onChange={(logic) => save({ ...config, logic })}
        />
      )}

      <div className="aca-condition__actions">
        {config.rules.length < 2 ? (
          <Button
            variant="control"
            size="sm"
            onClick={() => save({ ...config, rules: [...config.rules, createDefaultRule()] })}
          >
            <IconText icon="add">Aggiungi una seconda regola</IconText>
          </Button>
        ) : (
          <Button
            variant="control"
            size="sm"
            onClick={() => save({ ...config, rules: [config.rules[0]] })}
          >
            <IconText icon="close">Rimuovi la seconda regola</IconText>
          </Button>
        )}
      </div>

      <div className="aca-condition__summary" role="status">
        <IconText
          icon={visibleNow ? 'done' : 'info'}
          iconTone={visibleNow ? 'active' : 'info'}
          tone="ink"
        >
          {visibleNow ? 'Adesso il widget è visibile.' : 'Adesso il widget è nascosto.'}
        </IconText>
        {config.rules.map((_, index) => {
          const id = ruleEntityId(index);
          if (!id) return null;
          return (
            <Caption as="p" key={`${id}-${index}`}>
              {entityName(entities, id)}: {entities[id]?.state ?? 'stato sconosciuto'}
            </Caption>
          );
        })}
      </div>
    </div>
  );
}

function RuleEditor({
  index,
  rule,
  entityId,
  entities,
  entityIds,
  onEntity,
  onType,
  onUpdate,
}: {
  index: number;
  rule: ConditionRule;
  entityId: string | null;
  entities: EntityMap;
  entityIds: readonly string[];
  onEntity: (id: string) => void;
  onType: (type: RuleType) => void;
  onUpdate: (partial: Partial<ConditionRule>) => void;
}) {
  const headingId = useDomId('regola');
  const type: RuleType = isRuleType(rule.type) ? rule.type : 'state';
  const seconds = Number(rule.forSeconds);
  return (
    <div className="aca-condition__rule" role="group" aria-labelledby={headingId}>
      <Body as="span" size="sm" id={headingId} className="aca-form-row__label">
        Regola {index + 1}
      </Body>
      <EntitySelect
        label="Entità"
        value={entityId}
        entities={entities}
        ids={entityIds}
        allowNone={false}
        onChange={(id) => {
          if (id) onEntity(id);
        }}
      />
      <ChoiceGroup<RuleType>
        label="Condizione"
        options={RULE_TYPES}
        value={type}
        onChange={onType}
      />
      {(type === 'state' || type === 'not_state') && (
        <StatesInput states={statesOf(rule)} onChange={(states) => onUpdate({ states })} />
      )}
      {type === 'numeric' && (
        <>
          <ChoiceGroup<Operator>
            label="Confronto"
            options={OPERATORS}
            value={isOperator(rule.operator) ? rule.operator : '>'}
            onChange={(operator) => onUpdate({ operator })}
          />
          <FormRow label="Valore">
            {({ labelId }) => (
              <Field
                label="Valore"
                aria-labelledby={labelId}
                type="number"
                inputMode="decimal"
                value={textOf(rule.value)}
                onChange={(event) => onUpdate({ value: event.target.value })}
              />
            )}
          </FormRow>
          <FormRow label="Attributo, facoltativo" hint="Vuoto confronta lo stato dell’entità.">
            {({ labelId, hintId }) => (
              <Field
                label="Attributo"
                aria-labelledby={labelId}
                aria-describedby={hintId}
                placeholder="Per esempio temperature"
                value={textOf(rule.attribute)}
                onChange={(event) => onUpdate({ attribute: event.target.value })}
              />
            )}
          </FormRow>
        </>
      )}
      {type === 'attribute' && (
        <>
          <FormRow label="Nome dell’attributo">
            {({ labelId }) => (
              <Field
                label="Nome dell’attributo"
                aria-labelledby={labelId}
                value={textOf(rule.attribute)}
                onChange={(event) => onUpdate({ attribute: event.target.value })}
              />
            )}
          </FormRow>
          <FormRow
            label="Valore, facoltativo"
            hint="Vuoto controlla soltanto che l’attributo esista."
          >
            {({ labelId, hintId }) => (
              <Field
                label="Valore dell’attributo"
                aria-labelledby={labelId}
                aria-describedby={hintId}
                value={textOf(rule.value)}
                onChange={(event) => onUpdate({ value: event.target.value })}
              />
            )}
          </FormRow>
        </>
      )}
      <FormRow label="Da almeno, in secondi" hint="0 applica la regola subito.">
        {({ labelId, hintId }) => (
          <Field
            label="Durata minima in secondi"
            aria-labelledby={labelId}
            aria-describedby={hintId}
            type="number"
            min={0}
            inputMode="numeric"
            value={Number.isFinite(seconds) ? String(seconds) : '0'}
            onChange={(event) =>
              onUpdate({ forSeconds: Math.max(0, Number(event.target.value || 0)) })
            }
          />
        )}
      </FormRow>
    </div>
  );
}

/** Expected states as removable chips plus a field («on», «playing», «home»). */
function StatesInput({
  states,
  onChange,
}: {
  states: string[];
  onChange: (states: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const value = draft.trim();
    if (!value) return;
    if (!states.includes(value)) onChange([...states, value]);
    setDraft('');
  };
  return (
    <FormRow label="Stati" hint="Premi Invio o la virgola dopo ogni stato.">
      {({ labelId, hintId }) => (
        <>
          {states.length > 0 && (
            <div className="aca-chips" role="list" aria-labelledby={labelId}>
              {states.map((state) => (
                <span role="listitem" key={state}>
                  <Button
                    variant="control"
                    size="sm"
                    aria-label={`Rimuovi lo stato ${state}`}
                    onClick={() => onChange(states.filter((item) => item !== state))}
                  >
                    <span className="aca-chip__text">{state}</span>
                    <Icon name="close" size="sm" />
                  </Button>
                </span>
              ))}
            </div>
          )}
          <div className="aca-inline-field">
            <Field
              label="Nuovo stato"
              aria-describedby={hintId}
              placeholder="on, playing, home"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ',') {
                  event.preventDefault();
                  add();
                }
              }}
              containerClassName="aca-inline-field__input"
            />
            <Button variant="control" size="sm" onClick={add} disabled={!draft.trim()}>
              Aggiungi
            </Button>
          </div>
        </>
      )}
    </FormRow>
  );
}
