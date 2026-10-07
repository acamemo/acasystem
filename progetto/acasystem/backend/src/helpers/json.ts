/**
 * JSON.parse che restituisce `fallback` in caso di errore.
 * Come nel server originale, `null` viene letto come il testo "null" e dà null
 * (non il fallback): un payload illeggibile risponde quindi con `data: null`.
 */
export const safeParseJson = (raw: string | null, fallback: unknown = null): unknown => {
  try {
    const parsed: unknown = JSON.parse(String(raw));
    return parsed;
  } catch {
    return fallback;
  }
};
