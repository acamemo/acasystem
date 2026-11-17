import type { EntityLike } from '@/@types/ha';
import {
  energySourceUnit,
  energyCurrencyOf,
  isEnergyCurrency,
  type EnergyKind,
} from '@/domain/energy/energySources';
export {
  energySourceCandidateIds,
  validatableEnergySourceIds,
} from '@/domain/energy/energySources';
export type { EnergyKind } from '@/domain/energy/energySources';
import { finiteSensorNumber, sensorTimestamp } from '../../home/sensor/productSensorModel';

export type EnergyStatus = 'ready' | 'missing' | 'unavailable' | 'unknown' | 'invalid';
export interface EnergyReading {
  status: EnergyStatus;
  available: boolean;
  reason: string | null;
  value: number | null;
  valueText: string;
  unit: string | null;
  label: string;
}
export interface EnergyPreferences {
  decimals: number;
  currency: string | null;
}

const labels = new Map<EnergyKind, string>([
  ['power', 'Potenza'],
  ['energy', 'Consumo'],
  ['cost', 'Costo'],
  ['price', 'Prezzo'],
]);
const numberFormats = new Map<number, Intl.NumberFormat>();
const own = (value: object, key: string): unknown =>
  Object.hasOwn(value, key) ? (value as Record<string, unknown>)[key] : undefined;
const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const attribute = (entity: EntityLike, key: string): unknown =>
  entity.attributes ? own(entity.attributes, key) : undefined;

/** Currency preferences are retained, never used to convert or supply a missing sensor unit. */
export function energyPreferences(settings: Record<string, unknown>): EnergyPreferences {
  const raw =
    typeof settings.decimals === 'number'
      ? settings.decimals
      : finiteSensorNumber(settings.decimals);
  const code = text(settings.currency).toUpperCase();
  return {
    decimals: raw !== null && Number.isFinite(raw) ? Math.max(0, Math.min(6, Math.round(raw))) : 2,
    currency: isEnergyCurrency(code) ? code : null,
  };
}

export function energyReading(
  entity: EntityLike | null | undefined,
  expected: EnergyKind,
  options: { decimals?: unknown; currency?: unknown } = {}
): EnergyReading {
  const label = entity
    ? text(attribute(entity, 'friendly_name')) ||
      entity.entity_id ||
      labels.get(expected) ||
      'Misura'
    : labels.get(expected) || 'Misura';
  const result = (
    status: EnergyStatus,
    valueText: string,
    reason: string | null = null,
    unit: string | null = null,
    value: number | null = null
  ): EnergyReading => ({
    status,
    available: status === 'ready',
    reason,
    value,
    valueText,
    unit,
    label,
  });
  if (!entity) return result('missing', 'Fonte non presente', 'Sorgente non presente');
  const source = energySourceUnit(entity, expected);
  if (source.reason) return result('invalid', 'Misura non valida', source.reason);
  const state = text(entity.state);
  if (state === 'unknown')
    return result('unknown', 'Stato sconosciuto', 'Il sensore non conosce il valore', source.unit);
  if (!state || state === 'unavailable')
    return result('unavailable', 'Non disponibile', 'Il sensore non è disponibile', source.unit);
  const value = finiteSensorNumber(state);
  if (value === null)
    return result('invalid', 'Valore non valido', 'La lettura non è un numero finito', source.unit);
  const decimals = energyPreferences(options).decimals;
  let formatter = numberFormats.get(decimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    numberFormats.set(decimals, formatter);
  }
  const valueText = formatter.format(value);
  return result('ready', valueText, null, source.unit, value);
}

/** Samples keep their own metadata; the current source is only a compatibility fence. */
export function energyHistoryReading(
  event: { state: string; unit: string | null; deviceClass: string; currency?: unknown },
  currentEntity: EntityLike | null | undefined,
  expected: EnergyKind,
  options: { decimals?: unknown; currency?: unknown } = {}
): EnergyReading {
  const historical: EntityLike = {
    entity_id: currentEntity?.entity_id,
    state: event.state,
    attributes: {
      unit_of_measurement: event.unit,
      device_class: event.deviceClass,
      currency: event.currency,
    },
  };
  const reading = energyReading(historical, expected, options);
  if (!reading.available) return reading;
  const incompatible = (reason: string): EnergyReading => ({
    ...reading,
    available: false,
    status: 'invalid',
    value: null,
    unit: null,
    valueText: 'Lettura storica incompatibile',
    reason,
  });
  if (!currentEntity) return incompatible('Fonte attuale non presente');
  const current = energySourceUnit(currentEntity, expected);
  if (current.reason) return incompatible('Metadati della fonte attuale non validi');
  if (reading.unit !== current.unit)
    return incompatible('Unità storica diversa dalla fonte attuale');
  if (expected === 'cost' || expected === 'price') {
    const token = (unit: string) => (expected === 'price' ? unit.split('/')[0]!.trim() : unit);
    const before = energyCurrencyOf(token(reading.unit!), event.currency);
    const after = energyCurrencyOf(token(current.unit!), attribute(currentEntity, 'currency'));
    if (!before || before !== after)
      return incompatible('Valuta storica diversa dalla fonte attuale');
  }
  return reading;
}

export interface EnergyPriceSlot {
  start: Date;
  end: Date;
  value: number;
  source: 'today' | 'tomorrow';
}
export interface EnergyPriceSlots {
  status: EnergyStatus;
  reason: string | null;
  unit: string | null;
  slots: EnergyPriceSlot[];
  today: EnergyPriceSlot[];
  tomorrow: EnergyPriceSlot[];
  activeIndex: number;
}

/** Published timestamped slots only; no duration inferred from array length or local wall-clock time. */
export function parseEnergyPriceSlots(
  entity: EntityLike | null | undefined,
  now = new Date(),
  timezone?: string
): EnergyPriceSlots {
  const empty = (
    status: EnergyStatus,
    reason: string,
    unit: string | null = null
  ): EnergyPriceSlots => ({
    status,
    reason,
    unit,
    slots: [],
    today: [],
    tomorrow: [],
    activeIndex: -1,
  });
  if (!entity) return empty('missing', 'Sorgente dei prezzi non presente');
  const unit = energySourceUnit(entity, 'price');
  if (unit.reason) return empty('invalid', unit.reason);
  if (!Number.isFinite(now.getTime()))
    return empty('invalid', 'Istante corrente non valido', unit.unit);
  if (timezone) {
    try {
      new Intl.DateTimeFormat('it-IT', { timeZone: timezone }).format(now);
    } catch {
      return empty('invalid', 'Fuso orario non valido', unit.unit);
    }
  }
  const all: EnergyPriceSlot[] = [];
  for (const source of ['today', 'tomorrow'] as const) {
    // Explicit false means unpublished, rather than a forecast to promote to an observed current price.
    if (source === 'tomorrow' && attribute(entity, 'tomorrow_valid') === false) continue;
    const raw = attribute(entity, source === 'today' ? 'raw_today' : 'raw_tomorrow');
    if (raw === undefined || raw === null) continue;
    if (!Array.isArray(raw)) return empty('invalid', 'Fasce prezzo non valide', unit.unit);
    for (const item of raw) {
      if (!item || typeof item !== 'object' || Array.isArray(item))
        return empty('invalid', 'Fascia prezzo non valida', unit.unit);
      const startRaw = own(item, 'start'),
        endRaw = own(item, 'end'),
        rawValue = own(item, 'value');
      const start =
        typeof startRaw === 'number' || typeof startRaw === 'string'
          ? sensorTimestamp(startRaw)
          : null;
      const end =
        typeof endRaw === 'number' || typeof endRaw === 'string' ? sensorTimestamp(endRaw) : null;
      const value =
        typeof rawValue === 'number'
          ? Number.isFinite(rawValue)
            ? rawValue
            : null
          : finiteSensorNumber(rawValue);
      if (!start || !end || start >= end || value === null)
        return empty('invalid', 'Intervallo o prezzo non valido', unit.unit);
      all.push({ start, end, value, source });
    }
  }
  all.sort((a, b) => a.start.getTime() - b.start.getTime());
  if (all.some((slot, i) => i > 0 && slot.start < all[i - 1]!.end))
    return empty('invalid', 'Fasce prezzo duplicate o sovrapposte', unit.unit);
  if (!all.length) return empty('missing', 'Nessuna fascia prezzo pubblicata', unit.unit);
  return {
    status: 'ready',
    reason: null,
    unit: unit.unit,
    slots: all,
    today: all.filter((slot) => slot.source === 'today'),
    tomorrow: all.filter((slot) => slot.source === 'tomorrow'),
    activeIndex: all.findIndex((slot) => now >= slot.start && now < slot.end),
  };
}
