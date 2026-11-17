import type { EntityLike, EntityLikeMap } from '@/@types/ha';

export type EnergyKind = 'power' | 'energy' | 'cost' | 'price';

// HA2026.10.4 sensor/const.py: native units only, without conversion or guessing.
const powerUnits = new Set(['mW', 'W', 'kW', 'MW', 'GW', 'TW', 'BTU/h']);
const energyUnits = new Set([
  'J',
  'kJ',
  'MJ',
  'GJ',
  'mWh',
  'Wh',
  'kWh',
  'MWh',
  'GWh',
  'TWh',
  'cal',
  'kcal',
  'Mcal',
  'Gcal',
  'thm',
]);
const currencyCodes = new Set(
  typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('currency')
    : [
        'EUR',
        'USD',
        'GBP',
        'NOK',
        'SEK',
        'DKK',
        'CHF',
        'CAD',
        'AUD',
        'NZD',
        'JPY',
        'CNY',
        'HKD',
        'SGD',
        'INR',
        'BRL',
        'MXN',
        'PLN',
        'CZK',
        'HUF',
        'RON',
        'ISK',
      ]
);
const own = (value: object, key: string): unknown =>
  Object.hasOwn(value, key) ? (value as Record<string, unknown>)[key] : undefined;
const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const attribute = (entity: EntityLike, key: string): unknown =>
  entity.attributes ? own(entity.attributes, key) : undefined;

export const isEnergyCurrency = (value: string): boolean => currencyCodes.has(value);

export function energyCurrencyOf(unit: string, declared: unknown): string | null {
  if (declared !== undefined && declared !== null && typeof declared !== 'string') return null;
  const code = unit.toUpperCase(),
    metadata = text(declared).toUpperCase();
  if (metadata && !currencyCodes.has(metadata)) return null;
  if (currencyCodes.has(code)) return !metadata || metadata === code ? code : null;
  if (unit === '€') return !metadata || metadata === 'EUR' ? 'EUR' : null;
  // An unqualified dollar sign is ambiguous; only the entity's own currency can resolve it.
  if (
    unit === '$' &&
    metadata &&
    ['USD', 'CAD', 'AUD', 'NZD', 'SGD', 'HKD', 'MXN', 'ARS', 'CLP', 'COP'].includes(metadata)
  )
    return metadata;
  return null;
}

export function energySourceUnit(
  entity: EntityLike,
  expected: EnergyKind
): { unit: string | null; reason: string | null } {
  const unit = text(attribute(entity, 'unit_of_measurement'));
  if (!unit) return { unit: null, reason: 'Unità di misura mancante' };
  const deviceClass = text(attribute(entity, 'device_class'));
  const compatibleClass = expected === 'cost' || expected === 'price' ? 'monetary' : expected;
  if (deviceClass && deviceClass !== compatibleClass)
    return { unit: null, reason: 'Classe della misura incompatibile' };
  if (expected === 'power' || expected === 'energy')
    return (expected === 'power' ? powerUnits : energyUnits).has(unit)
      ? { unit, reason: null }
      : { unit: null, reason: 'Unità di misura incompatibile' };
  if (expected === 'cost')
    return energyCurrencyOf(unit, attribute(entity, 'currency'))
      ? { unit, reason: null }
      : { unit: null, reason: 'Valuta o unità del costo incompatibile' };
  const parts = unit.split('/').map((part) => part.trim());
  return parts.length === 2 &&
    energyUnits.has(parts[1]!) &&
    energyCurrencyOf(parts[0]!, attribute(entity, 'currency'))
    ? { unit, reason: null }
    : { unit: null, reason: 'Il prezzo richiede una valuta per unità di energia coerente' };
}

/** Semantic validation is independent of availability, so unavailable valid sources remain selectable. */
export function energySourceCandidateIds(entities: EntityLikeMap, expected: EnergyKind): string[] {
  return Object.keys(entities)
    .filter((id) => {
      const entity = entities[id];
      return (
        /^(sensor|input_number)\.[A-Za-z0-9_]+$/.test(id) &&
        entity &&
        !energySourceUnit(entity, expected).reason
      );
    })
    .sort();
}

/** Syntactic references only. Consumers must preserve and show incompatible raw legacy settings. */
export function validatableEnergySourceIds(settings: Record<string, unknown>) {
  const id = (key: string): string | null => {
    const value = own(settings, key);
    return typeof value === 'string' && /^(sensor|input_number)\.[A-Za-z0-9_]+$/.test(value)
      ? value
      : null;
  };
  return {
    powerId: id('powerId'),
    consumptionId: id('consumptionId'),
    todayId: id('todayId'),
    monthId: id('monthId'),
    nordpoolId: id('nordpoolId'),
  };
}
