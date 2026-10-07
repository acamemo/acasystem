import { useCallback } from 'react';
import type { Translate } from '@/@types/dashboard';
import { en, it } from '@/utils/i18n';

const italian = it as Record<string, string>;
const english = en as Record<string, string>;

/** Italian is fixed (ADR-0007): Italian text, then English, then the key, as the legacy app did. */
export const translateItalian: Translate = (key: string) => italian[key] ?? english[key] ?? key;

export function useItalianTranslate(): Translate {
  return useCallback((key: string) => translateItalian(key), []);
}
