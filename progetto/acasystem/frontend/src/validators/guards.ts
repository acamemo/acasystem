/**
 * Guardie runtime di base per valori di provenienza non controllata
 * (localStorage, file importati, risposte di Home Assistant e del backend).
 */

export type UnknownRecord = Record<string, unknown>;

/** Oggetto non nullo, array compresi: equivale al controllo `value && typeof value === 'object'`. */
export function isObject(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

/** Oggetto non nullo e non array. */
export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/** Stringa con almeno un carattere diverso dagli spazi. */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isBoolean(value: unknown): value is boolean {
  return value === true || value === false;
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** Restituisce la stringa così com'è oppure `undefined`. */
export function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** Restituisce la stringa senza spazi esterni oppure `''`. */
export function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Elementi stringa di un array; `[]` se il valore non è un array. */
export function asStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

/** Lettura sicura di una chiave da un valore sconosciuto. */
export function readKey(value: unknown, key: string): unknown {
  return isObject(value) ? value[key] : undefined;
}

/** Controlla che la chiave sia propria dell'oggetto (non ereditata dal prototipo). */
export function hasOwnKey<T extends object>(target: T, key: PropertyKey): key is keyof T {
  return Object.prototype.hasOwnProperty.call(target, key);
}

/** Converte un errore sconosciuto nel suo messaggio, se presente. */
export function errorMessage(error: unknown): string | undefined {
  const message = readKey(error, 'message');
  return typeof message === 'string' ? message : undefined;
}

/** `new Date(value)` per un valore sconosciuto, con le stesse conversioni del costruttore. */
export function toDate(value: unknown): Date {
  if (value instanceof Date || typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  if (value === null || typeof value === 'boolean') return new Date(Number(value));
  if (value === undefined) return new Date(NaN);
  return new Date(String(value));
}
