import type { EntityMap, HaHistoryEntry } from '@/@types/ha';
import type { ControlIconName } from '../../controls/shared/ControlIcon';

const binaryLabels = new Map<string, readonly [string, string]>([
  ['battery', ['Batteria bassa', 'Livello non basso']],
  ['battery_charging', ['In carica', 'Non in carica']],
  ['carbon_monoxide', ['Monossido rilevato', 'Nessun monossido rilevato']],
  ['cold', ['Freddo rilevato', 'Freddo non rilevato']],
  ['connectivity', ['Connesso', 'Disconnesso']],
  ['door', ['Aperta', 'Chiusa']],
  ['garage_door', ['Aperta', 'Chiusa']],
  ['gas', ['Gas rilevato', 'Nessun gas rilevato']],
  ['glass_break', ['Rottura vetro rilevata', 'Nessuna rottura rilevata']],
  ['heat', ['Calore rilevato', 'Calore non rilevato']],
  ['light', ['Luce rilevata', 'Luce non rilevata']],
  ['lock', ['Sbloccata', 'Bloccata']],
  ['moisture', ['Bagnato', 'Asciutto']],
  ['motion', ['Movimento rilevato', 'Nessun movimento']],
  ['moving', ['In movimento', 'Fermo']],
  ['occupancy', ['Occupato', 'Non occupato']],
  ['opening', ['Aperto', 'Chiuso']],
  ['plug', ['Collegato', 'Scollegato']],
  ['power', ['Alimentazione rilevata', 'Alimentazione non rilevata']],
  ['presence', ['A casa', 'Fuori casa']],
  ['problem', ['Problema rilevato', 'Nessun problema rilevato']],
  ['running', ['In funzione', 'Non in funzione']],
  ['safety', ['Segnalazione di pericolo', 'Nessuna segnalazione di pericolo']],
  ['smoke', ['Fumo rilevato', 'Nessun fumo rilevato']],
  ['sound', ['Suono rilevato', 'Nessun suono']],
  ['tamper', ['Manomissione rilevata', 'Nessuna manomissione rilevata']],
  ['update', ['Aggiornamento disponibile', 'Nessun aggiornamento disponibile']],
  ['vibration', ['Vibrazione rilevata', 'Nessuna vibrazione']],
  ['window', ['Aperta', 'Chiusa']],
]);
const nonNumericClasses = new Set(['enum', 'date', 'timestamp', 'uptime']);
const icons = new Map<string, ControlIconName>([
  ['temperature', 'thermostat'],
  ['humidity', 'humidity'],
  ['moisture', 'humidity'],
  ['motion', 'motion'],
  ['occupancy', 'presence'],
  ['presence', 'presence'],
  ['opening', 'room'],
  ['door', 'room'],
  ['garage_door', 'room'],
  ['window', 'blinds'],
  ['battery', 'battery'],
  ['battery_charging', 'battery'],
  ['smoke', 'smoke'],
  ['carbon_monoxide', 'smoke'],
  ['gas', 'smoke'],
  ['carbon_dioxide', 'cloud'],
  ['pm25', 'cloud'],
  ['pm10', 'cloud'],
  ['aqi', 'cloud'],
  ['illuminance', 'sun'],
  ['power', 'energy'],
  ['energy', 'energy'],
  ['voltage', 'energy'],
  ['current', 'energy'],
]);

export function finiteSensorNumber(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()))
    return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function sensorTimestamp(value: unknown): Date | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(Math.abs(value) < 1e12 ? value * 1000 : value);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  )
    return null;
  const [year, month, day, hour, minute, second] = value.slice(0, 19).split(/[-T:]/).map(Number);
  const lastDay = new Date(Date.UTC(year!, month!, 0)).getUTCDate();
  if (
    month! < 1 ||
    month! > 12 ||
    day! < 1 ||
    day! > lastDay ||
    hour! > 23 ||
    minute! > 59 ||
    second! > 59
  )
    return null;
  const stamp = Date.parse(value);
  return Number.isFinite(stamp) ? new Date(stamp) : null;
}

export function sensorBinaryLabel(state: string, deviceClass: string): string {
  if (state === 'unknown') return 'Stato sconosciuto';
  if (state === 'unavailable' || !state) return 'Non disponibile';
  if (state !== 'on' && state !== 'off') return 'Stato non valido';
  return (binaryLabels.get(deviceClass) ?? ['Attivo', 'Inattivo'])[state === 'on' ? 0 : 1];
}

export function productSensorView(entity: EntityMap[string] | undefined) {
  const state = typeof entity?.state === 'string' ? entity.state : '';
  const deviceClass =
    typeof entity?.attributes.device_class === 'string' ? entity.attributes.device_class : '';
  const unit =
    typeof entity?.attributes.unit_of_measurement === 'string'
      ? entity.attributes.unit_of_measurement
      : '';
  const binary = entity?.entity_id.startsWith('binary_sensor.') ?? false;
  const numeric = !binary && !nonNumericClasses.has(deviceClass) ? finiteSensorNumber(state) : null;
  const unavailable = !state || state === 'unknown' || state === 'unavailable';
  const invalidNumber =
    !binary &&
    !nonNumericClasses.has(deviceClass) &&
    !unavailable &&
    numeric === null &&
    (unit !== '' ||
      ['NaN', 'Infinity', '-Infinity', '+Infinity'].includes(state) ||
      (typeof entity?.attributes.state_class === 'string' &&
        ['measurement', 'total', 'total_increasing'].includes(entity.attributes.state_class)));
  const invalidBattery =
    deviceClass === 'battery' && unit === '%' && numeric !== null && (numeric < 0 || numeric > 100);
  const invalidBinary = binary && !unavailable && state !== 'on' && state !== 'off';
  const available = !unavailable && !invalidNumber && !invalidBattery && !invalidBinary;
  const formatted =
    numeric !== null
      ? state
          .trim()
          .replace(/^([+-]?)\./, (_, sign: string) => `${sign}0.`)
          .replace('.', ',')
      : state;
  const value =
    !state || state === 'unavailable'
      ? 'Non disponibile'
      : state === 'unknown'
        ? 'Stato sconosciuto'
        : invalidNumber || invalidBattery
          ? 'Valore non valido'
          : binary
            ? sensorBinaryLabel(state, deviceClass)
            : formatted;
  return {
    state,
    deviceClass,
    numeric: available ? numeric : null,
    numericKind: !binary && !nonNumericClasses.has(deviceClass) && numeric !== null,
    value,
    unit: available && !binary ? unit : '',
    available,
    binary,
    icon: icons.get(deviceClass) ?? 'activity',
    updated: sensorTimestamp(entity?.last_updated),
    changed: sensorTimestamp(entity?.last_changed),
  };
}

export function sensorEntityName(id: string, entities: EntityMap): string {
  const name = entities[id]?.attributes.friendly_name;
  return typeof name === 'string' && name.trim() ? name : id;
}

/** Own explicit battery measurement only. Two batteries remain ambiguous even if only one answers. */
export function sensorBattery(
  ids: readonly string[],
  entities: EntityMap
): { entityId: string; value: string } | null {
  const candidates = [...new Set(ids)].filter(
    (id) =>
      id.startsWith('sensor.') &&
      entities[id]?.attributes.device_class === 'battery' &&
      entities[id]?.attributes.unit_of_measurement === '%'
  );
  if (candidates.length !== 1) return null;
  const id = candidates[0]!,
    view = productSensorView(entities[id]);
  return view.numeric !== null && view.numeric >= 0 && view.numeric <= 100
    ? { entityId: id, value: view.value }
    : null;
}

export interface ProductSensorEvent {
  time: Date;
  state: string;
  numeric: number | null;
  unit: string | null;
  deviceClass: string;
  currency?: unknown;
}
export function sensorHistoryEvents(entries: readonly HaHistoryEntry[]): ProductSensorEvent[] {
  const seen = new Set<string>();
  return entries
    .flatMap((entry) => {
      const state = entry.state ?? entry.s;
      const stamp =
        entry.last_changed ??
        entry.last_updated ??
        entry.last_reported ??
        entry.timestamp ??
        entry.lc ??
        entry.lu ??
        entry.l;
      const time = sensorTimestamp(stamp);
      if (typeof state !== 'string' || !time) return [];
      const attributes = entry.attributes ?? entry.a;
      const unit = attributes
        ? typeof attributes.unit_of_measurement === 'string'
          ? attributes.unit_of_measurement
          : ''
        : null;
      const deviceClass =
        typeof attributes?.device_class === 'string' ? attributes.device_class : '';
      const hasCurrency = attributes && Object.hasOwn(attributes, 'currency');
      const currency = hasCurrency ? attributes.currency : undefined;
      const key = JSON.stringify([time.getTime(), state, unit, deviceClass, currency]);
      if (seen.has(key)) return [];
      seen.add(key);
      const parsed = nonNumericClasses.has(deviceClass) ? null : finiteSensorNumber(state);
      const numeric =
        deviceClass === 'battery' && unit === '%' && parsed !== null && (parsed < 0 || parsed > 100)
          ? null
          : parsed;
      return [{ state, time, numeric, unit, deviceClass, ...(hasCurrency ? { currency } : {}) }];
    })
    .sort((a, b) => a.time.getTime() - b.time.getTime());
}

export const SENSOR_HISTORY_HOURS = [6, 12, 24, 48, 72, 168] as const;
export function sensorHistoryHours(value: unknown): number {
  return typeof value === 'number' && SENSOR_HISTORY_HOURS.some((hours) => hours === value)
    ? value
    : 24;
}

/** Bound SVG geometry with real samples and extremes, never averages or invented timestamps. */
export function sensorHistoryChartSamples(events: readonly ProductSensorEvent[]) {
  const points = events.flatMap((event) =>
    event.numeric === null ? [] : [{ time: event.time, value: event.numeric }]
  );
  if (points.length <= 300) return points;
  const selected = new Set([0, points.length - 1]);
  const step = Math.ceil(points.length / 149);
  for (let start = 0; start < points.length; start += step) {
    let min = start,
      max = start;
    for (let index = start + 1; index < Math.min(points.length, start + step); index++) {
      if (points[index]!.value < points[min]!.value) min = index;
      if (points[index]!.value > points[max]!.value) max = index;
    }
    selected.add(min);
    selected.add(max);
  }
  return [...selected].sort((a, b) => a - b).map((index) => points[index]!);
}
