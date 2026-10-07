export const DEFAULT_LANGUAGE = 'it';
export type SupportedLanguage = 'it' | 'en' | 'nb' | 'nn' | 'sv' | 'de' | 'zh' | 'fr';
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  'it',
  'en',
  'nb',
  'nn',
  'sv',
  'de',
  'zh',
  'fr',
];
export const LEGACY_NN_MIGRATION_FLAG = 'tunet_language_migrated_to_nb';

export function isSupportedLanguage(language: unknown): language is SupportedLanguage {
  return SUPPORTED_LANGUAGES.some((supported) => supported === language);
}

export function normalizeLanguage(language: unknown): SupportedLanguage {
  return isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE;
}

export function getLocaleForLanguage(language: unknown): string {
  if (language === 'it') return 'it-IT';
  if (language === 'nb') return 'nb-NO';
  if (language === 'nn') {
    const supportsNynorsk =
      typeof Intl !== 'undefined' &&
      typeof Intl.DateTimeFormat?.supportedLocalesOf === 'function' &&
      Intl.DateTimeFormat.supportedLocalesOf('nn-NO').length > 0;
    return supportsNynorsk ? 'nn-NO' : 'nb-NO';
  }
  if (language === 'sv') return 'sv-SE';
  if (language === 'de') return 'de-DE';
  if (language === 'zh') return 'zh-CN';
  if (language === 'fr') return 'fr-FR';
  return 'en-US';
}
