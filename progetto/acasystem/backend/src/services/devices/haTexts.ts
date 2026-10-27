import { isRecord } from '../../helpers/objects.ts';

/**
 * The texts of the configuration flows that Home Assistant translates (F4, ADR-0024 annotation
 * of 2026-10-27). The facade asks HA for `frontend/get_translations` (category `config`, the
 * handler of the flow, language `it`), keeps the answer per handler for an hour and draws the
 * titles, descriptions, field labels, hints, menu options, progress messages, errors and abort
 * reasons from it. Our own Italian texts (messagesIt.ts) are applied first; a text of HA that is
 * clearly English or missing is replaced by a generic Italian one, never shown.
 *
 * Nothing here logs a text: a description can carry the name of a device.
 */

export interface StepTranslations {
  title?: string;
  description?: string;
  data: Record<string, string>;
  dataDescription: Record<string, string>;
  menuOptions: Record<string, string>;
}

export interface HandlerTranslations {
  steps: Record<string, StepTranslations>;
  errors: Record<string, string>;
  aborts: Record<string, string>;
  progress: Record<string, string>;
}

const emptyStep = (): StepTranslations => ({
  data: {},
  dataDescription: {},
  menuOptions: {},
});

const MAX_KEYS = 4000;

/**
 * Reads `result.resources` of `frontend/get_translations` for one handler. Keys are
 * `component.<handler>.config.<section>...`; anything else is ignored.
 */
export const parseTranslations = (handler: string, raw: unknown): HandlerTranslations => {
  const parsed: HandlerTranslations = { steps: {}, errors: {}, aborts: {}, progress: {} };
  const resources = isRecord(raw) && isRecord(raw.resources) ? raw.resources : null;
  if (!resources) return parsed;

  const prefix = `component.${handler}.config.`;
  let seen = 0;
  for (const [key, value] of Object.entries(resources)) {
    if (++seen > MAX_KEYS) break;
    if (typeof value !== 'string' || !key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length).split('.');

    if (rest[0] === 'step' && rest.length >= 3) {
      const stepId = rest[1] ?? '';
      const step = (parsed.steps[stepId] ??= emptyStep());
      if (rest.length === 3 && rest[2] === 'title') step.title = value;
      else if (rest.length === 3 && rest[2] === 'description') step.description = value;
      else if (rest.length === 4 && rest[2] === 'data') step.data[rest[3] ?? ''] = value;
      else if (rest.length === 4 && rest[2] === 'data_description')
        step.dataDescription[rest[3] ?? ''] = value;
      else if (rest.length === 4 && rest[2] === 'menu_options')
        step.menuOptions[rest[3] ?? ''] = value;
    } else if (rest.length === 2 && rest[0] === 'error') {
      parsed.errors[rest[1] ?? ''] = value;
    } else if (rest.length === 2 && rest[0] === 'abort') {
      parsed.aborts[rest[1] ?? ''] = value;
    } else if (rest.length === 2 && rest[0] === 'progress') {
      parsed.progress[rest[1] ?? ''] = value;
    }
  }
  return parsed;
};

// --- Language -----------------------------------------------------------------------------

const ENGLISH_WORDS: ReadonlySet<string> = new Set([
  'the', 'an', 'your', 'you', 'to', 'of', 'and', 'or', 'is', 'are', 'for', 'with', 'this',
  'that', 'on', 'enter', 'select', 'choose', 'please', 'type', 'shown', 'displayed',
  'press', 'click', 'name', 'username', 'user', 'address', 'key', 'port', 'code', 'device',
  'check', 'if', 'will', 'be', 'it', 'from', 'by', 'not', 'can', 'has', 'have', 'set', 'up',
  'setup', 'connect', 'connection', 'account', 'login', 'sign', 'wait', 'waiting', 'finish',
  'continue', 'confirm', 'submit', 'add', 'required', 'optional', 'secret', 'value', 'language',
  'location', 'region', 'country', 'interval', 'timeout', 'update', 'enable', 'disable',
]);

const ITALIAN_WORDS: ReadonlySet<string> = new Set([
  'il', 'lo', 'la', 'le', 'gli', 'i', 'di', 'del', 'della', 'dei', 'delle', 'che', 'per', 'con',
  'sul', 'sulla', 'nel', 'nella', 'un', 'una', 'uno', 'tuo', 'tua', 'tuoi', 'tue', 'non', 'da',
  'dal', 'al', 'alla', 'nome', 'utente', 'indirizzo', 'porta', 'chiave', 'codice', 'digita',
  'inserisci', 'scegli', 'seleziona', 'premi', 'visualizzato', 'mostrato', 'dispositivo', 'se',
  'è', 'sono', 'puoi', 'devi', 'sei', 'ti', 'tuo', 'prima', 'dopo', 'questo', 'questa', 'password',
  'segreto', 'connessione', 'collegamento', 'attendi', 'aspetta', 'continua', 'conferma',
]);

/**
 * True when the text is clearly English: more English function words than Italian ones. A short
 * label with no marker at all («Host», «Password», «PIN») is accepted as it is.
 */
export const looksEnglish = (text: string): boolean => {
  const words = text.toLowerCase().match(/[a-zà-ú']+/g) ?? [];
  let english = 0;
  let italian = 0;
  for (const word of words) {
    if (ENGLISH_WORDS.has(word)) english += 1;
    if (ITALIAN_WORDS.has(word)) italian += 1;
  }
  return english > 0 && english > italian;
};

// --- Cleaning and placeholders ------------------------------------------------------------

const IPV4_TEXT = /\b\d{1,3}(?:\.\d{1,3}){3}\b/g;
const MAC_TEXT = /\b[0-9a-f]{2}(?:[:-][0-9a-f]{2}){5}\b/gi;
const URL_TEXT = /\bhttps?:\/\/\S+/gi;
// eslint-disable-next-line no-control-regex
const CONTROL_RUN = /[\x00-\x1f\x7f]+/g;

/** A value for a `{placeholder}`: never an address, a MAC or a link; a short plain text. */
const placeholderValue = (value: unknown): string => {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  const text = String(value)
    .replace(URL_TEXT, '')
    .replace(MAC_TEXT, '')
    .replace(IPV4_TEXT, '')
    .replace(CONTROL_RUN, ' ')
    .replace(/\(\s*\)|\[\s*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return text;
};

const MAX_TEXT = 600;

/**
 * A text of HA made fit for a person: placeholders replaced (an empty value becomes «questo
 * dispositivo»), Markdown links, emphasis, code and HTML removed, one line, cut. Null if nothing
 * is left.
 */
export const cleanHaText = (template: unknown, placeholders?: unknown): string | null => {
  if (typeof template !== 'string' || !template.trim()) return null;
  const values = isRecord(placeholders) ? placeholders : {};

  const substituted = template
    .slice(0, 2000)
    .replace(/\{([a-zA-Z0-9_]{1,40})\}/g, (_match, name: string) => {
      const value = placeholderValue(values[name]);
      return value || 'questo dispositivo';
    });

  const text = substituted
    .replace(/<[^>]{0,200}>/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(URL_TEXT, '')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/[*_`]/g, '')
    .replace(CONTROL_RUN, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.slice(0, MAX_TEXT) : null;
};

/**
 * The Italian text for a translation key, or null: missing, clearly English, or empty after
 * cleaning. `placeholders` are the `description_placeholders` of the step.
 */
export const italianText = (template: string | undefined, placeholders?: unknown): string | null => {
  if (template === undefined || looksEnglish(template)) return null;
  return cleanHaText(template, placeholders);
};

// --- Cache --------------------------------------------------------------------------------

export interface TranslationCache {
  /**
   * Translations of a handler, or null when HA cannot give them (never throws). `load` reads the
   * raw answer from HA and is called only when nothing fresh is cached.
   */
  get(handler: string, load: () => Promise<unknown>): Promise<HandlerTranslations | null>;
  clear(): void;
}

/** A failed read is not repeated for this long, so a HA without the command is asked once. */
const FAILURE_RETRY_MS = 60_000;
export const TRANSLATIONS_CACHE_MS = 3_600_000;
const MAX_CACHED_HANDLERS = 200;

export const createTranslationCache = (options: {
  now: () => number;
  ttlMs?: number;
}): TranslationCache => {
  const ttlMs = options.ttlMs ?? TRANSLATIONS_CACHE_MS;
  const cache = new Map<string, { at: number; ok: boolean; value: HandlerTranslations | null }>();
  const pending = new Map<string, Promise<HandlerTranslations | null>>();

  return {
    async get(handler, load) {
      const cached = cache.get(handler);
      if (cached && options.now() - cached.at < (cached.ok ? ttlMs : FAILURE_RETRY_MS)) {
        return cached.value;
      }
      const running = pending.get(handler);
      if (running) return running;

      const job = (async (): Promise<HandlerTranslations | null> => {
        try {
          const value = parseTranslations(handler, await load());
          if (cache.size >= MAX_CACHED_HANDLERS) cache.clear();
          cache.set(handler, { at: options.now(), ok: true, value });
          return value;
        } catch {
          cache.set(handler, { at: options.now(), ok: false, value: null });
          return null;
        } finally {
          pending.delete(handler);
        }
      })();
      pending.set(handler, job);
      return job;
    },
    clear() {
      cache.clear();
    },
  };
};
