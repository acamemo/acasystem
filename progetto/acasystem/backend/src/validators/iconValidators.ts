import type { Validation } from '../@types/http.ts';
import { invalid, valid } from './common.ts';

/** Validatori delle richieste /api/icons. */

const ICON_KEY_PATTERN = /^[a-z0-9-]+$/;

/** Testo di ricerca `q`: minuscolo e rifilato; stringa vuota se assente o non testuale. */
export const normalizeIconQuery = (rawQuery: unknown): string =>
  typeof rawQuery === 'string' ? rawQuery.toLowerCase().trim() : '';

/** Nome MDI in kebab-case (`lightbulb-on`), altrimenti 400. */
export const validateIconName = (rawName: unknown): Validation<string> => {
  const name = String(rawName || '')
    .toLowerCase()
    .trim();
  if (!name || !ICON_KEY_PATTERN.test(name)) {
    return invalid(400, 'Invalid icon name');
  }
  return valid(name);
};
