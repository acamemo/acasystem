import { isRecord } from '../../helpers/objects.ts';
import { italianText } from './haTexts.ts';
import type { HandlerTranslations, StepTranslations } from './haTexts.ts';
import {
  FLOW_STEP_FALLBACKS,
  STEP_TEXTS,
  genericFieldLabel,
  humanizeName,
  publicEntryTitle,
  resolveAbortReason,
  resolveFormError,
} from './messagesIt.ts';

/**
 * Turns the answer of a Home Assistant configuration flow into what the browser may see.
 *
 * Rules (ADR-0021, point 4, and F4): only the result types and field kinds listed here are
 * drawn; a type or a field that is not known is not guessed, the flow is cancelled instead
 * (RD-10). Nothing from HA is passed through as it is: no `data`, no `context`, no raw error
 * text, and the `description_placeholders` only inside the Italian texts, cleaned of addresses.
 * The texts come from our own dictionary first, then from the Italian translation of HA (when it
 * is not English), then from a generic Italian label.
 */

export type FlowFieldKind =
  'text' | 'password' | 'integer' | 'number' | 'boolean' | 'select' | 'multiselect';

export interface FlowFieldDto {
  name: string;
  kind: FlowFieldKind;
  required: boolean;
  label: string;
  hint?: string;
  default?: string | number | boolean;
  /** A text field that takes several lines. */
  multiline?: boolean;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
}

export interface FlowErrorDto {
  /** Field the error belongs to; null for an error of the whole step. */
  field: string | null;
  code: string;
  message: string;
}

export interface FlowFormDto {
  type: 'form';
  flowId: string;
  handler: string;
  stepId: string;
  title: string;
  description: string | null;
  waitSeconds: number | null;
  fields: FlowFieldDto[];
  errors: FlowErrorDto[];
}

export interface FlowMenuDto {
  type: 'menu';
  flowId: string;
  handler: string;
  stepId: string;
  title: string;
  description: string | null;
  options: { id: string; label: string }[];
}

export interface FlowProgressDto {
  type: 'progress';
  flowId: string;
  handler: string;
  stepId: string;
  title: string;
  /** Italian sentence for the wait. */
  description: string;
  /** Machine key of the task (`progress_action`), for the registry and the tests. */
  progressAction: string | null;
}

/** A step that continues on another site (the login of the maker's cloud, OAuth). */
export interface FlowExternalDto {
  type: 'external';
  flowId: string;
  handler: string;
  stepId: string;
  title: string;
  description: string;
  /** Page to open in a new window; always http or https. */
  url: string;
}

export interface FlowAbortDto {
  type: 'abort';
  handler: string;
  reason: string;
  message: string;
}

export interface FlowCreatedDto {
  type: 'create_entry';
  handler: string;
  entryId: string;
  domain: string;
  title: string;
}

export type FlowOpenStepDto = FlowFormDto | FlowMenuDto | FlowProgressDto | FlowExternalDto;
export type FlowTerminalDto = FlowAbortDto | FlowCreatedDto;

/** Values HA wants in every answer of a step (`constant` fields): kept here, never drawn. */
export type FlowConstants = Record<string, string | number | boolean>;

export type NormalizedFlow =
  | {
      outcome: 'step';
      flowId: string;
      stepId: string;
      dto: FlowOpenStepDto;
      constants: FlowConstants;
    }
  /** `external_done` and `progress_done`: HA has the next step ready; read the flow again. */
  | { outcome: 'continue'; flowId: string }
  | { outcome: 'terminal'; dto: FlowTerminalDto; nextFlowId: string | null }
  | { outcome: 'unsupported'; flowId: string | null; reason: string };

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value ? value : null;

const unsupported = (flowId: string | null, reason: string): NormalizedFlow => ({
  outcome: 'unsupported',
  flowId,
  reason,
});

const primitive = (value: unknown): string | number | boolean | undefined =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? value
    : undefined;

const optionList = (value: unknown): { value: string; label: string }[] | null => {
  const items = Array.isArray(value) ? value : isRecord(value) ? Object.entries(value) : null;
  if (!items) return null;

  const options: { value: string; label: string }[] = [];
  for (const item of items) {
    if (typeof item === 'string') {
      options.push({ value: item, label: item });
    } else if (Array.isArray(item) && typeof item[0] === 'string') {
      options.push({ value: item[0], label: typeof item[1] === 'string' ? item[1] : item[0] });
    } else if (isRecord(item) && typeof item.value === 'string') {
      options.push({
        value: item.value,
        label: typeof item.label === 'string' ? item.label : item.value,
      });
    } else {
      return null;
    }
  }
  return options.slice(0, 100);
};

const finiteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

interface TextContext {
  /** Our own texts for this handler and step. */
  own: (typeof STEP_TEXTS)[string][string] | undefined;
  /** HA's Italian translations for this step, when it gave any. */
  ha: StepTranslations | undefined;
  placeholders: unknown;
}

type FieldResult =
  | { kind: 'field'; field: FlowFieldDto }
  | { kind: 'constant'; name: string; value: string | number | boolean }
  | null;

const MAX_FIELDS = 40;

/** One entry of `data_schema`, or null when its type is not one Acasystem can draw. */
const normalizeField = (field: unknown, texts: TextContext): FieldResult => {
  if (!isRecord(field)) return null;
  const name = asString(field.name);
  if (!name || !/^[A-Za-z0-9_.-]{1,64}$/.test(name)) return null;

  if (field.type === 'constant') {
    const value = primitive(field.value);
    return value === undefined ? null : { kind: 'constant', name, value };
  }

  const own = texts.own?.fields?.[name];
  const result: FlowFieldDto = {
    name,
    kind: 'text',
    required: field.required === true,
    label:
      own?.label ??
      italianText(texts.ha?.data[name], texts.placeholders) ??
      genericFieldLabel(name),
  };
  const hint = own?.hint ?? italianText(texts.ha?.dataDescription[name], texts.placeholders);
  if (hint) result.hint = hint;
  const fallback = primitive(field.default);
  if (fallback !== undefined) result.default = fallback;

  const selector = isRecord(field.selector) ? field.selector : null;
  if (selector) {
    const [selectorType] = Object.keys(selector);
    const config = selectorType && isRecord(selector[selectorType]) ? selector[selectorType] : {};
    switch (selectorType) {
      case 'text':
        result.kind = isRecord(config) && config.type === 'password' ? 'password' : 'text';
        if (isRecord(config) && config.multiline === true) result.multiline = true;
        return { kind: 'field', field: result };
      case 'number': {
        result.kind = 'number';
        const min = isRecord(config) ? finiteNumber(config.min) : undefined;
        const max = isRecord(config) ? finiteNumber(config.max) : undefined;
        if (min !== undefined) result.min = min;
        if (max !== undefined) result.max = max;
        return { kind: 'field', field: result };
      }
      case 'boolean':
        result.kind = 'boolean';
        return { kind: 'field', field: result };
      case 'select': {
        const options = isRecord(config) ? optionList(config.options) : null;
        if (!options) return null;
        result.kind = isRecord(config) && config.multiple === true ? 'multiselect' : 'select';
        result.options = options;
        return { kind: 'field', field: result };
      }
      default:
        return null;
    }
  }

  switch (field.type) {
    case 'string':
      result.kind = 'text';
      return { kind: 'field', field: result };
    case 'integer':
    case 'float': {
      result.kind = field.type === 'integer' ? 'integer' : 'number';
      const min = finiteNumber(field.valueMin);
      const max = finiteNumber(field.valueMax);
      if (min !== undefined) result.min = min;
      if (max !== undefined) result.max = max;
      return { kind: 'field', field: result };
    }
    case 'boolean':
      result.kind = 'boolean';
      return { kind: 'field', field: result };
    case 'select':
    case 'multi_select': {
      const options = optionList(field.options);
      if (!options) return null;
      result.kind = field.type === 'select' ? 'select' : 'multiselect';
      result.options = options;
      return { kind: 'field', field: result };
    }
    default:
      return null;
  }
};

const normalizeErrors = (
  errors: unknown,
  handler: string,
  translations: HandlerTranslations | null,
  placeholders: unknown
): FlowErrorDto[] => {
  if (!isRecord(errors)) return [];

  const list: FlowErrorDto[] = [];
  for (const [field, value] of Object.entries(errors)) {
    const code = typeof value === 'string' ? value : null;
    if (!code) continue;
    list.push({
      field: field === 'base' ? null : field,
      code,
      message: resolveFormError(
        code,
        handler,
        italianText(translations?.errors[code], placeholders)
      ),
    });
  }
  return list.slice(0, 10);
};

const MAX_URL = 2048;

/** The page of an `external` step: http or https only, no credentials in it. */
const externalUrl = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.length > MAX_URL) return null;
  try {
    const url = new URL(value);
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
};

/**
 * `handler` is the one the flow was started for (a trusted value kept by the facade), not the
 * one HA reports back. `translations` are the Italian ones of HA for that handler (F4), or null.
 */
export const normalizeFlowResult = (
  raw: unknown,
  handler: string,
  translations: HandlerTranslations | null = null
): NormalizedFlow => {
  if (!isRecord(raw)) return unsupported(null, 'not_an_object');

  const flowId = asString(raw.flow_id);
  const type = raw.type;
  const placeholders = raw.description_placeholders;
  const stepIdOf = asString(raw.step_id);
  const textsFor = (stepId: string | null): TextContext => ({
    own: stepId ? STEP_TEXTS[handler]?.[stepId] : undefined,
    ha: stepId ? translations?.steps[stepId] : undefined,
    placeholders,
  });
  const titleOf = (texts: TextContext, fallback: string): string =>
    texts.own?.title ?? italianText(texts.ha?.title, placeholders) ?? fallback;
  const descriptionOf = (texts: TextContext): string | null =>
    texts.own?.description ?? italianText(texts.ha?.description, placeholders);

  if (type === 'form') {
    const stepId = stepIdOf;
    if (!flowId || !stepId) return unsupported(flowId, 'missing_step');

    const texts = textsFor(stepId);
    const schema = Array.isArray(raw.data_schema) ? raw.data_schema : [];
    if (schema.length > MAX_FIELDS) return unsupported(flowId, 'too_many_fields');
    const fields: FlowFieldDto[] = [];
    const constants: FlowConstants = {};
    for (const entry of schema) {
      const field = normalizeField(entry, texts);
      if (!field) return unsupported(flowId, 'unsupported_field');
      if (field.kind === 'constant') constants[field.name] = field.value;
      else fields.push(field.field);
    }

    return {
      outcome: 'step',
      flowId,
      stepId,
      constants,
      dto: {
        type: 'form',
        flowId,
        handler,
        stepId,
        title: titleOf(texts, 'Aggiungi un dispositivo'),
        description: descriptionOf(texts),
        waitSeconds: texts.own?.waitSeconds ?? null,
        fields,
        errors: normalizeErrors(raw.errors, handler, translations, placeholders),
      },
    };
  }

  if (type === 'menu') {
    const stepId = stepIdOf;
    if (!flowId || !stepId) return unsupported(flowId, 'missing_step');
    const options = optionList(raw.menu_options);
    if (!options || options.length === 0) return unsupported(flowId, 'unsupported_menu');
    const texts = textsFor(stepId);
    return {
      outcome: 'step',
      flowId,
      stepId,
      constants: {},
      dto: {
        type: 'menu',
        flowId,
        handler,
        stepId,
        title: titleOf(texts, FLOW_STEP_FALLBACKS.menuTitle),
        description: descriptionOf(texts),
        options: options.map((option) => ({
          id: option.value,
          // Our wording is not defined for menus: HA's Italian text, then the label HA sent when
          // it is Italian too, then the id made readable.
          label:
            italianText(texts.ha?.menuOptions[option.value], placeholders) ??
            (option.label !== option.value ? italianText(option.label, placeholders) : null) ??
            humanizeName(option.value),
        })),
      },
    };
  }

  if (type === 'progress') {
    const stepId = stepIdOf;
    if (!flowId || !stepId) return unsupported(flowId, 'missing_step');
    const texts = textsFor(stepId);
    const action = asString(raw.progress_action);
    return {
      outcome: 'step',
      flowId,
      stepId,
      constants: {},
      dto: {
        type: 'progress',
        flowId,
        handler,
        stepId,
        title: titleOf(texts, FLOW_STEP_FALLBACKS.progressTitle),
        description:
          (action ? italianText(translations?.progress[action], placeholders) : null) ??
          descriptionOf(texts) ??
          FLOW_STEP_FALLBACKS.progressWaiting,
        progressAction: action,
      },
    };
  }

  if (type === 'external') {
    const stepId = stepIdOf;
    if (!flowId || !stepId) return unsupported(flowId, 'missing_step');
    const url = externalUrl(raw.url);
    if (!url) return unsupported(flowId, 'bad_external_url');
    const texts = textsFor(stepId);
    return {
      outcome: 'step',
      flowId,
      stepId,
      constants: {},
      dto: {
        type: 'external',
        flowId,
        handler,
        stepId,
        title: titleOf(texts, FLOW_STEP_FALLBACKS.externalTitle),
        description: descriptionOf(texts) ?? FLOW_STEP_FALLBACKS.externalDescription,
        url,
      },
    };
  }

  if (type === 'external_done' || type === 'progress_done') {
    return flowId ? { outcome: 'continue', flowId } : unsupported(null, 'missing_step');
  }

  if (type === 'abort') {
    const reason = asString(raw.reason) ?? 'unknown';
    return {
      outcome: 'terminal',
      nextFlowId: null,
      dto: {
        type: 'abort',
        handler,
        reason,
        message: resolveAbortReason(
          reason,
          italianText(translations?.aborts[reason], placeholders)
        ),
      },
    };
  }

  if (type === 'create_entry') {
    const result = isRecord(raw.result) ? raw.result : null;
    const entryId = result ? asString(result.entry_id) : null;
    if (!entryId) return unsupported(flowId, 'missing_entry');
    const domain = (result ? asString(result.domain) : null) ?? handler;
    const rawTitle = (result ? asString(result.title) : null) ?? asString(raw.title) ?? '';

    // `next_flow` is not followed in D1; a flow that HA opened for it is cancelled by the caller.
    const nextFlow = Array.isArray(raw.next_flow) ? raw.next_flow : null;
    const nextFlowId = nextFlow && typeof nextFlow[1] === 'string' ? nextFlow[1] : null;

    return {
      outcome: 'terminal',
      nextFlowId,
      dto: {
        type: 'create_entry',
        handler,
        entryId,
        domain,
        title: publicEntryTitle(domain, rawTitle),
      },
    };
  }

  // Any type added by a later HA.
  return unsupported(
    flowId,
    typeof type === 'string' ? `unsupported_type_${type}` : 'unknown_type'
  );
};

/** Errors of a rejected step (HTTP 400 with `{errors: {...}}`), translated. */
export const flowErrorsFromBadRequest = (
  body: unknown,
  handler = '',
  translations: HandlerTranslations | null = null
): FlowErrorDto[] => {
  if (!isRecord(body)) return [];
  const errors = body.errors;
  if (!isRecord(errors)) return [];

  const list: FlowErrorDto[] = [];
  for (const [field, value] of Object.entries(errors)) {
    const code =
      typeof value === 'string'
        ? value
        : Array.isArray(value) && typeof value[0] === 'string'
          ? value[0]
          : 'unknown';
    list.push({
      field: field === 'base' ? null : field,
      code,
      message: resolveFormError(code, handler, italianText(translations?.errors[code])),
    });
  }
  return list.slice(0, 10);
};
