/** Oggetto non nullo (array compresi), su cui si possono leggere proprietà arbitrarie. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Equivalente tipizzato di `value?.[key]`: undefined per null/undefined, altrimenti la
 * proprietà (anche ereditata), con i primitivi trattati come i loro oggetti involucro.
 */
export const readProperty = (value: unknown, key: string): unknown => {
  if (value === null || value === undefined) return undefined;
  const property: unknown = Reflect.get(Object(value), key);
  return property;
};
