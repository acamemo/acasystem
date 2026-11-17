export type { FlowFieldKind, QrLevel, FlowFieldDto, FlowErrorDto, FlowFormDto, FlowMenuDto, FlowProgressDto, FlowExternalDto, FlowAbortDto, FlowCreatedStepDto as FlowCreatedDto, FlowOpenStepDto, FlowTerminalDto } from '../../../../contracts/devices.ts';
import type { FlowFieldDto, FlowErrorDto, FlowOpenStepDto, FlowTerminalDto } from '../../../../contracts/devices.ts';
import { isRecord } from '../../helpers/objects.ts';
import { asString } from '../../helpers/text.ts';
import { countryOptions } from './countries.ts';
import { EXTRA_TEXTS, entityLookup, fileAccept, qrConfig, stringList } from './flowExtras.ts';
import { italianText } from './haTexts.ts';
import type { HandlerTranslations, SectionTranslations, StepTranslations } from './haTexts.ts';
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

/** Error correction of a QR code, as the letter the encoder takes. */

/**
 * What the server has to look up in HA to give a field its choices (serial ports, entities):
 * kept next to the constants, never sent to the browser.
 */
export interface EntityFilter {
  domains: string[];
  integrations: string[];
  deviceClasses: string[];
}

export type FlowLookup =
  | { field: string; type: 'serial_port'; recommended: string[] }
  | {
      field: string;
      type: 'entity';
      /** Alternatives (any may match); empty means no filter. Each one needs all its parts. */
      filters: EntityFilter[];
      /** The only entities allowed, when the flow named them. */
      include: string[] | null;
      exclude: string[];
    };

/** A step that continues on another site (the login of the maker's cloud, OAuth). */

/**
 * Values HA wants in every answer of a step (`constant` fields): kept here, never drawn. A
 * constant inside a section is kept as an object under the name of the section.
 */
export type FlowConstants = Record<
  string,
  string | number | boolean | Record<string, string | number | boolean>
>;

export type NormalizedFlow =
  | {
      outcome: 'step';
      flowId: string;
      stepId: string;
      dto: FlowOpenStepDto;
      constants: FlowConstants;
      /** Choices to look up in HA before the step is shown (see `flowExtras.ts`). */
      lookups?: FlowLookup[];
    }
  /** `external_done` and `progress_done`: HA has the next step ready; read the flow again. */
  | { outcome: 'continue'; flowId: string }
  | { outcome: 'terminal'; dto: FlowTerminalDto; nextFlowId: string | null }
  | { outcome: 'unsupported'; flowId: string | null; reason: string };

const unsupported = (flowId: string | null, reason: string): NormalizedFlow => ({
  outcome: 'unsupported',
  flowId,
  reason,
});

const primitive = (value: unknown): string | number | boolean | undefined =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? value
    : undefined;

/** Choices of one field. A longer list is cut; the server validates against what was sent. */
const MAX_OPTIONS = 500;

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
  return options.slice(0, MAX_OPTIONS);
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
  | { kind: 'field'; field: FlowFieldDto; lookup?: FlowLookup }
  | { kind: 'constant'; name: string; value: string | number | boolean }
  | null;

const FIELD_NAME = /^[A-Za-z0-9_.-]{1,64}$/;

/** A section (`expandable`) a field sits in: its name and the texts HA has for it. */
interface SectionScope {
  name: string;
  label: string;
  required: boolean;
  ha: SectionTranslations | undefined;
}

/** `string` fields carry a `format` when the schema used `vol.Email` or `vol.Url`. */
const INPUT_TYPES: Readonly<Record<string, FlowFieldDto['inputType']>> = {
  email: 'email',
  url: 'url',
  fqdnurl: 'url',
  tel: 'tel',
};

/**
 * One entry of `data_schema`, or null when its type is not one Acasystem can draw. Inside a
 * section (`scope`) the name of the field is `section.field`.
 */
const normalizeField = (field: unknown, texts: TextContext, scope?: SectionScope): FieldResult => {
  if (!isRecord(field)) return null;
  const inner = asString(field.name);
  if (!inner || !FIELD_NAME.test(inner)) return null;
  const name = scope ? `${scope.name}.${inner}` : inner;

  const selector = isRecord(field.selector) ? field.selector : null;
  const [selectorType] = selector ? Object.keys(selector) : [];
  const config: Record<string, unknown> =
    selector && selectorType && isRecord(selector[selectorType]) ? selector[selectorType] : {};

  if (field.type === 'constant' || selectorType === 'constant') {
    const value = primitive(field.type === 'constant' ? field.value : config.value);
    return value === undefined ? null : { kind: 'constant', name, value };
  }

  const own = texts.own?.fields?.[inner];
  const haLabel = scope ? scope.ha?.data[inner] : texts.ha?.data[inner];
  const haHint = scope ? scope.ha?.dataDescription[inner] : texts.ha?.dataDescription[inner];
  const result: FlowFieldDto = {
    name,
    kind: 'text',
    required: field.required === true,
    label: own?.label ?? italianText(haLabel, texts.placeholders) ?? genericFieldLabel(inner),
  };
  const hint = own?.hint ?? italianText(haHint, texts.placeholders);
  if (hint) result.hint = hint;
  if (scope) {
    result.section = scope.name;
    result.sectionLabel = scope.label;
    if (scope.required) result.sectionRequired = true;
  }
  const fallback = primitive(field.default);
  if (fallback !== undefined) result.default = fallback;
  // A value HA suggests (the one a discovery already knows) is shown as the default.
  const description = isRecord(field.description) ? field.description : null;
  const suggested = description ? primitive(description.suggested_value) : undefined;
  if (result.default === undefined && suggested !== undefined) result.default = suggested;

  if (selector) {
    switch (selectorType) {
      case 'text': {
        // A list of texts is not drawn; one text is, with the keyboard of its type.
        if (config.multiple === true) return null;
        result.kind = config.type === 'password' ? 'password' : 'text';
        const inputType = typeof config.type === 'string' ? INPUT_TYPES[config.type] : undefined;
        if (inputType) result.inputType = inputType;
        if (config.multiline === true) result.multiline = true;
        return { kind: 'field', field: result };
      }
      case 'number': {
        result.kind = 'number';
        const min = finiteNumber(config.min);
        const max = finiteNumber(config.max);
        if (min !== undefined) result.min = min;
        if (max !== undefined) result.max = max;
        return { kind: 'field', field: result };
      }
      case 'boolean':
        result.kind = 'boolean';
        return { kind: 'field', field: result };
      case 'select': {
        const options = optionList(config.options);
        if (!options) return null;
        result.kind = config.multiple === true ? 'multiselect' : 'select';
        result.options = readableOptions(options);
        if (config.custom_value === true) result.allowCustom = true;
        return { kind: 'field', field: result };
      }
      case 'country': {
        const allowed = Array.isArray(config.countries)
          ? config.countries.filter((code): code is string => typeof code === 'string')
          : null;
        result.kind = 'select';
        result.options = countryOptions(allowed, config.no_sort !== true);
        return { kind: 'field', field: result };
      }
      // The four selectors below get their choices or their picture in `flowExtras.ts`.
      case 'serial_port': {
        result.kind = 'select';
        result.options = [];
        // HA lets the person type a path when the port is not listed.
        result.allowCustom = true;
        result.hint ??= EXTRA_TEXTS.serialPortHint;
        return {
          kind: 'field',
          field: result,
          lookup: { field: name, type: 'serial_port', recommended: stringList(config.extra_recommended_domains) },
        };
      }
      case 'entity': {
        const entity = entityLookup(name, config);
        if (!entity) return null;
        result.kind = config.multiple === true ? 'multiselect' : 'select';
        result.options = entity.options;
        return { kind: 'field', field: result, lookup: entity.lookup };
      }
      case 'file': {
        const accept = fileAccept(config.accept);
        if (accept === null) return null;
        result.kind = 'file';
        if (accept) result.accept = accept;
        return { kind: 'field', field: result };
      }
      case 'qr_code': {
        const qr = qrConfig(config);
        if (!qr) return null;
        result.kind = 'qr';
        result.qr = qr;
        result.required = false;
        return { kind: 'field', field: result };
      }
      default:
        return null;
    }
  }

  switch (field.type) {
    case 'string': {
      result.kind = inner === 'password' ? 'password' : 'text';
      const inputType = typeof field.format === 'string' ? INPUT_TYPES[field.format] : undefined;
      if (inputType) result.inputType = inputType;
      return { kind: 'field', field: result };
    }
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
      result.options = readableOptions(options);
      return { kind: 'field', field: result };
    }
    default:
      return null;
  }
};

/**
 * A choice that HA translates by key (`translation_key`) reaches us as its bare value
 * («auto_off»): shown as a readable word. A label HA sent is kept as it is.
 */
const readableOptions = (
  options: { value: string; label: string }[]
): { value: string; label: string }[] =>
  options.map((option) =>
    option.label === option.value && /^[a-z][a-z0-9_]*$/.test(option.value)
      ? { value: option.value, label: humanizeName(option.value) }
      : option
  );

type SchemaResult =
  | { ok: true; fields: FlowFieldDto[]; constants: FlowConstants; lookups: FlowLookup[] }
  | { ok: false };

/**
 * The fields of a whole `data_schema`. A section (`expandable`) is flattened into its fields,
 * marked with the section; sections do not nest in HA, so a section inside one is refused.
 */
const normalizeSchema = (schema: readonly unknown[], texts: TextContext): SchemaResult => {
  const fields: FlowFieldDto[] = [];
  const constants: FlowConstants = {};
  const lookups: FlowLookup[] = [];

  const take = (entry: unknown, scope?: SectionScope): boolean => {
    const field = normalizeField(entry, texts, scope);
    if (!field) return false;
    if (field.kind === 'field') {
      fields.push(field.field);
      if (field.lookup) lookups.push(field.lookup);
    } else if (scope) {
      const inner = field.name.slice(scope.name.length + 1);
      const group = constants[scope.name];
      constants[scope.name] = { ...(typeof group === 'object' ? group : {}), [inner]: field.value };
    } else {
      constants[field.name] = field.value;
    }
    return true;
  };

  for (const entry of schema) {
    if (!isRecord(entry) || entry.type !== 'expandable') {
      if (!take(entry)) return { ok: false };
      continue;
    }

    const name = asString(entry.name);
    if (!name || !FIELD_NAME.test(name) || !Array.isArray(entry.schema)) return { ok: false };
    const ha = texts.ha?.sections[name];
    const scope: SectionScope = {
      name,
      label: italianText(ha?.name, texts.placeholders) ?? genericFieldLabel(name),
      required: entry.required === true,
      ha,
    };
    const before = fields.length;
    for (const inner of entry.schema) {
      if (isRecord(inner) && inner.type === 'expandable') return { ok: false };
      if (!take(inner, scope)) return { ok: false };
    }
    // A required section with nothing to ask is still sent, empty.
    if (scope.required && fields.length === before && !(name in constants)) constants[name] = {};
  }
  return { ok: true, fields, constants, lookups };
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
    const schema = normalizeSchema(Array.isArray(raw.data_schema) ? raw.data_schema : [], texts);
    if (!schema.ok) return unsupported(flowId, 'unsupported_field');
    const { fields, constants, lookups } = schema;

    return {
      outcome: 'step',
      flowId,
      stepId,
      constants,
      lookups,
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
