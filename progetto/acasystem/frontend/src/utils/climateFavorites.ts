import { isNonEmptyString } from '@/validators/guards';

export const DEFAULT_CLIMATE_FAVORITE_MODES = ['off', 'heat'];
export const MAX_CLIMATE_FAVORITE_MODES = 2;

export function resolveClimateFavoriteModes(
  configuredModes: unknown,
  availableModes: unknown
): string[] {
  if (!Array.isArray(availableModes)) return [];

  const available = new Set(availableModes.filter(isNonEmptyString));
  const candidates: unknown[] = Array.isArray(configuredModes)
    ? configuredModes
    : DEFAULT_CLIMATE_FAVORITE_MODES;

  return Array.from(
    new Set(
      candidates.filter((mode): mode is string => isNonEmptyString(mode) && available.has(mode))
    )
  ).slice(0, MAX_CLIMATE_FAVORITE_MODES);
}

const listIncludes = (list: unknown, value: string): boolean =>
  (Array.isArray(list) || typeof list === 'string') && list.includes(value);

export function toggleClimateFavoriteMode(
  configuredModes: unknown,
  mode: unknown,
  availableModes: unknown
): string[] {
  if (typeof mode !== 'string' || !listIncludes(availableModes, mode)) {
    return resolveClimateFavoriteModes(configuredModes, availableModes);
  }

  const current = resolveClimateFavoriteModes(configuredModes, availableModes);
  if (current.includes(mode)) return current.filter((candidate) => candidate !== mode);
  if (current.length >= MAX_CLIMATE_FAVORITE_MODES) return current;
  return [...current, mode];
}
