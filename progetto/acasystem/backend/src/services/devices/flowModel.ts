import { isRecord } from '../../helpers/objects.ts';
import {
  STEP_TEXTS,
  publicEntryTitle,
  translateAbortReason,
  translateFormError,
} from './messagesIt.ts';

/**
 * Turns the answer of a Home Assistant configuration flow into what the browser may see.
 *
 * Rules (ADR-0021, point 4): only the result types and field kinds listed here are drawn; a
 * type or a field that is not known is not guessed, the flow is cancelled instead (RD-10).
 * Nothing from HA is passed through as it is: no `data`, no `context`, no
 * `description_placeholders` (they can carry an address) and no raw error text.
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
  options: { id: string; label: string }[];
}

export interface FlowProgressDto {
  type: 'progress';
  flowId: string;
  handler: string;
  stepId: string;
  title: string;
  progressAction: string | null;
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

export type FlowOpenStepDto = FlowFormDto | FlowMenuDto | FlowProgressDto;
export type FlowTerminalDto = FlowAbortDto | FlowCreatedDto;

export type NormalizedFlow =
  | { outcome: 'step'; flowId: string; stepId: string; dto: FlowOpenStepDto }
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

/** One entry of `data_schema`, or null when its type is not one Acasystem can draw. */
const normalizeField = (
  field: unknown,
  texts: Readonly<Record<string, { label: string; hint?: string }>> | undefined
): FlowFieldDto | null => {
  if (!isRecord(field)) return null;
  const name = asString(field.name);
  if (!name) return null;

  const dictionary = texts?.[name];
  const result: FlowFieldDto = {
    name,
    kind: 'text',
    required: field.required === true,
    label: dictionary?.label ?? name,
  };
  if (dictionary?.hint) result.hint = dictionary.hint;
  const fallback = primitive(field.default);
  if (fallback !== undefined) result.default = fallback;

  const selector = isRecord(field.selector) ? field.selector : null;
  if (selector) {
    const [selectorType] = Object.keys(selector);
    const config = selectorType && isRecord(selector[selectorType]) ? selector[selectorType] : {};
    switch (selectorType) {
      case 'text':
        result.kind = isRecord(config) && config.type === 'password' ? 'password' : 'text';
        return result;
      case 'number': {
        result.kind = 'number';
        const min = isRecord(config) ? finiteNumber(config.min) : undefined;
        const max = isRecord(config) ? finiteNumber(config.max) : undefined;
        if (min !== undefined) result.min = min;
        if (max !== undefined) result.max = max;
        return result;
      }
      case 'boolean':
        result.kind = 'boolean';
        return result;
      case 'select': {
        const options = isRecord(config) ? optionList(config.options) : null;
        if (!options) return null;
        result.kind = isRecord(config) && config.multiple === true ? 'multiselect' : 'select';
        result.options = options;
        return result;
      }
      default:
        return null;
    }
  }

  switch (field.type) {
    case 'string':
      result.kind = 'text';
      return result;
    case 'integer':
    case 'float': {
      result.kind = field.type === 'integer' ? 'integer' : 'number';
      const min = finiteNumber(field.valueMin);
      const max = finiteNumber(field.valueMax);
      if (min !== undefined) result.min = min;
      if (max !== undefined) result.max = max;
      return result;
    }
    case 'boolean':
      result.kind = 'boolean';
      return result;
    case 'select':
    case 'multi_select': {
      const options = optionList(field.options);
      if (!options) return null;
      result.kind = field.type === 'select' ? 'select' : 'multiselect';
      result.options = options;
      return result;
    }
    default:
      return null;
  }
};

const normalizeErrors = (errors: unknown): FlowErrorDto[] => {
  if (!isRecord(errors)) return [];

  const list: FlowErrorDto[] = [];
  for (const [field, value] of Object.entries(errors)) {
    const code = typeof value === 'string' ? value : null;
    if (!code) continue;
    list.push({
      field: field === 'base' ? null : field,
      code,
      message: translateFormError(code),
    });
  }
  return list.slice(0, 10);
};

const titleFor = (handler: string, stepId: string): string =>
  STEP_TEXTS[handler]?.[stepId]?.title ?? 'Aggiungi un dispositivo';

/**
 * `handler` is the one the flow was started for (a trusted value kept by the facade), not the
 * one HA reports back.
 */
export const normalizeFlowResult = (raw: unknown, handler: string): NormalizedFlow => {
  if (!isRecord(raw)) return unsupported(null, 'not_an_object');

  const flowId = asString(raw.flow_id);
  const type = raw.type;

  if (type === 'form') {
    const stepId = asString(raw.step_id);
    if (!flowId || !stepId) return unsupported(flowId, 'missing_step');

    const texts = STEP_TEXTS[handler]?.[stepId];
    const schema = Array.isArray(raw.data_schema) ? raw.data_schema : [];
    const fields: FlowFieldDto[] = [];
    for (const entry of schema) {
      const field = normalizeField(entry, texts?.fields);
      if (!field) return unsupported(flowId, 'unsupported_field');
      fields.push(field);
    }

    return {
      outcome: 'step',
      flowId,
      stepId,
      dto: {
        type: 'form',
        flowId,
        handler,
        stepId,
        title: titleFor(handler, stepId),
        description: texts?.description ?? null,
        waitSeconds: texts?.waitSeconds ?? null,
        fields,
        errors: normalizeErrors(raw.errors),
      },
    };
  }

  if (type === 'menu') {
    const stepId = asString(raw.step_id);
    if (!flowId || !stepId) return unsupported(flowId, 'missing_step');
    const options = optionList(raw.menu_options);
    if (!options) return unsupported(flowId, 'unsupported_menu');
    return {
      outcome: 'step',
      flowId,
      stepId,
      dto: {
        type: 'menu',
        flowId,
        handler,
        stepId,
        title: titleFor(handler, stepId),
        options: options.map((option) => ({ id: option.value, label: option.label })),
      },
    };
  }

  if (type === 'progress') {
    const stepId = asString(raw.step_id);
    if (!flowId || !stepId) return unsupported(flowId, 'missing_step');
    return {
      outcome: 'step',
      flowId,
      stepId,
      dto: {
        type: 'progress',
        flowId,
        handler,
        stepId,
        title: titleFor(handler, stepId),
        progressAction: asString(raw.progress_action),
      },
    };
  }

  if (type === 'abort') {
    const reason = asString(raw.reason) ?? 'unknown';
    return {
      outcome: 'terminal',
      nextFlowId: null,
      dto: { type: 'abort', handler, reason, message: translateAbortReason(reason) },
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

  // `external` (login on another site), `external_done` and any type added by a later HA.
  return unsupported(
    flowId,
    typeof type === 'string' ? `unsupported_type_${type}` : 'unknown_type'
  );
};

/** Errors of a rejected step (HTTP 400 with `{errors: {...}}`), translated. */
export const flowErrorsFromBadRequest = (body: unknown): FlowErrorDto[] => {
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
    list.push({ field: field === 'base' ? null : field, code, message: translateFormError(code) });
  }
  return list.slice(0, 10);
};
