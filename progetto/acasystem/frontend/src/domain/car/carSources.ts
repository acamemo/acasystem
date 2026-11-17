import type { EntityLike, EntityLikeMap } from '@/@types/ha';

/** Explicit manual roles, not a vehicle classifier or a source of suggested names. */
export const CAR_SOURCE_FIELDS = [
  { key: 'batteryId', label: 'Batteria', section: 'Batteria e viaggio' },
  { key: 'rangeId', label: 'Autonomia', section: 'Batteria e viaggio' },
  { key: 'odometerId', label: 'Contachilometri', section: 'Batteria e viaggio' },
  { key: 'fuelLevelId', label: 'Carburante', section: 'Batteria e viaggio' },
  { key: 'chargingStateId', label: 'Stato della ricarica', section: 'Ricarica' },
  { key: 'pluggedId', label: 'Cavo collegato', section: 'Ricarica' },
  { key: 'chargingPowerId', label: 'Potenza di ricarica', section: 'Ricarica' },
  { key: 'chargeRateId', label: 'Velocità di ricarica', section: 'Ricarica' },
  { key: 'timeToFullId', label: 'Tempo alla carica completa', section: 'Ricarica' },
  { key: 'chargeEndTimeId', label: 'Fine della ricarica', section: 'Ricarica' },
  { key: 'chargeControlId', label: 'Comando di ricarica', section: 'Ricarica' },
  { key: 'chargeLimitNumberId', label: 'Limite di ricarica', section: 'Ricarica' },
  { key: 'chargeLimitSelectId', label: 'Opzioni di ricarica', section: 'Ricarica' },
  { key: 'locationId', label: 'Posizione', section: 'Posizione' },
  { key: 'latitudeId', label: 'Latitudine', section: 'Posizione' },
  { key: 'longitudeId', label: 'Longitudine', section: 'Posizione' },
  { key: 'tempId', label: 'Temperatura interna', section: 'Clima' },
  { key: 'climateId', label: 'Clima', section: 'Clima' },
  { key: 'lockId', label: 'Serratura', section: 'Veicolo' },
  { key: 'ignitionSwitchId', label: 'Accensione', section: 'Veicolo' },
  { key: 'engineStatusId', label: 'Stato del motore', section: 'Veicolo' },
  { key: 'lastUpdatedId', label: 'Ultimo aggiornamento', section: 'Tecnica' },
  { key: 'apiStatusId', label: 'Stato del servizio', section: 'Tecnica' },
  { key: 'updateButtonId', label: 'Aggiorna dati', section: 'Tecnica' },
] as const;
export type CarSourceField = (typeof CAR_SOURCE_FIELDS)[number]['key'] | 'chargingId';
const own = (value: object, key: string): unknown =>
  Object.hasOwn(value, key) ? (value as Record<string, unknown>)[key] : undefined;
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const attr = (entity: EntityLike, key: string) =>
  entity.attributes ? own(entity.attributes, key) : undefined;
export function carFiniteNumber(value: unknown): number | null {
  return (typeof value === 'number' ||
    (typeof value === 'string' &&
      /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim()))) &&
    Number.isFinite(Number(value))
    ? Number(value)
    : null;
}
const canonical = (field: CarSourceField) => (field === 'chargingId' ? 'chargingStateId' : field);
const numeric: Partial<Record<CarSourceField, { classes: string[]; units: string[] }>> = {
  batteryId: { classes: ['battery'], units: ['%'] },
  fuelLevelId: {
    classes: ['volume', 'volume_storage'],
    units: ['%', 'mL', 'L', 'm³', 'ft³', 'CCF', 'MCF', 'fl. oz.', 'gal'],
  },
  rangeId: { classes: ['distance'], units: ['mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mi', 'nmi'] },
  odometerId: {
    classes: ['distance'],
    units: ['mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mi', 'nmi'],
  },
  chargingPowerId: { classes: ['power'], units: ['mW', 'W', 'kW', 'MW', 'GW', 'TW', 'BTU/h'] },
  chargeRateId: { classes: ['speed'], units: ['m/s', 'km/h', 'mph', 'mi/h', 'ft/s', 'kn'] },
  timeToFullId: { classes: ['duration'], units: ['d', 'h', 'min', 's', 'ms', 'µs'] },
  tempId: { classes: ['temperature'], units: ['°C', '°F', 'K'] },
  latitudeId: { classes: [], units: ['', '°'] },
  longitudeId: { classes: [], units: ['', '°'] },
  chargeLimitNumberId: { classes: ['battery'], units: ['%'] },
};
const domain = (entity: EntityLike) => text(entity.entity_id).split('.')[0];

/** Availability never removes a valid association from the list of manual choices. */
export function carSourceMetadata(entity: EntityLike | null | undefined, field: CarSourceField) {
  const fail = (reason: string) => ({ compatible: false, reason, unit: null });
  if (!entity) return fail('Fonte non presente');
  if (!/^[a-z_]+\.[A-Za-z0-9_]+$/.test(entity.entity_id ?? ''))
    return fail('Identificativo della fonte non valido');
  const key = canonical(field),
    unit = text(attr(entity, 'unit_of_measurement')),
    cls = text(attr(entity, 'device_class')),
    dom = domain(entity),
    spec = numeric[key];
  if (spec) {
    if (
      !(key === 'chargeLimitNumberId' ? dom === 'number' : ['sensor', 'input_number'].includes(dom))
    )
      return fail('Dominio incompatibile');
    if (cls && !spec.classes.includes(cls)) return fail('Classe della misura incompatibile');
    if (key === 'fuelLevelId' && unit === '%' && cls)
      return fail('Classe della misura incompatibile');
    if (!spec.units.includes(unit))
      return fail(unit ? 'Unità di misura incompatibile' : 'Unità di misura mancante');
    return { compatible: true, reason: null, unit: unit || null };
  }
  const domains: Partial<Record<CarSourceField, string[]>> = {
    locationId: ['device_tracker'],
    climateId: ['climate'],
    lockId: ['lock', 'binary_sensor'],
    ignitionSwitchId: ['switch'],
    chargeLimitSelectId: ['select'],
    updateButtonId: ['button', 'input_button'],
    chargeControlId: ['switch', 'button', 'input_button', 'script'],
    pluggedId: ['binary_sensor', 'sensor'],
    chargingStateId: ['binary_sensor', 'sensor'],
    engineStatusId: ['sensor', 'binary_sensor'],
    apiStatusId: ['sensor', 'binary_sensor'],
    chargeEndTimeId: ['sensor', 'input_datetime'],
    lastUpdatedId: ['sensor', 'input_datetime'],
  };
  if (!domains[key]?.includes(dom)) return fail('Dominio incompatibile');
  if (dom === 'binary_sensor') {
    const expected =
      key === 'lockId'
        ? 'lock'
        : key === 'pluggedId'
          ? 'plug'
          : key === 'chargingStateId'
            ? 'battery_charging'
            : null;
    if ((key === 'lockId' && cls !== 'lock') || (expected && cls && cls !== expected))
      return fail('Classe dello stato incompatibile');
  }
  if (['chargeEndTimeId', 'lastUpdatedId'].includes(key) && cls && cls !== 'timestamp')
    return fail('Classe della data incompatibile');
  if (['pluggedId', 'chargingStateId'].includes(key) && dom === 'sensor' && cls && cls !== 'enum')
    return fail('Classe dello stato incompatibile');
  return { compatible: true, reason: null, unit: unit || null };
}
export function candidateCarSourceIds(entities: EntityLikeMap, field: CarSourceField): string[] {
  return Object.keys(entities)
    .filter(
      (id) =>
        Object.hasOwn(entities, id) &&
        entities[id] &&
        carSourceMetadata({ ...entities[id], entity_id: id }, field).compatible
    )
    .sort();
}

/** Same scalar values, aliases and array order as the existing readCarSettings. */
export function configuredCarSources(settings: Record<string, unknown>) {
  const ids: Partial<Record<CarSourceField, string>> = {};
  const id = (key: string) => {
    const value = own(settings, key);
    return typeof value === 'string' && value.trim() ? value : undefined;
  };
  for (const { key } of CAR_SOURCE_FIELDS) {
    const value = id(key);
    if (value) ids[key] = value;
  }
  const charging = id('chargingStateId') ?? id('chargingId');
  if (charging) {
    ids.chargingStateId = charging;
    ids.chargingId = id('chargingId') ?? charging;
  }
  const raw = own(settings, 'chargeControlIds');
  const controls = Array.isArray(raw)
    ? raw.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  return {
    ids,
    chargeControlIds: [
      ...new Set(ids.chargeControlId ? [...controls, ids.chargeControlId] : controls),
    ],
    imageUrl: id('imageUrl') ?? null,
  };
}

/** A configured image is never fetched by the model; unsafe legacy text remains recoverable. */
export function carImageSource(value: unknown): string | null {
  const source = text(value);
  if (
    !source ||
    source.includes('\\') ||
    [...source].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 32 || code === 127;
    })
  )
    return null;
  if (/(?:^|\/)(?:\.{1,2}|%2e(?:%2e)?)(?:\/|$|\?)/i.test(source)) return null;
  if (/^\/(?:local|api)\/[^/]/.test(source)) return source;
  try {
    const url = new URL(source);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? source
      : null;
  } catch {
    return null;
  }
}

export interface CarReading {
  status: 'ready' | 'missing' | 'unavailable' | 'unknown' | 'invalid';
  available: boolean;
  reason: string | null;
  value: number | null;
  valueText: string;
  unit: string | null;
  label: string;
  state: string | null;
  active: boolean | null;
}
const formatters = new Map<number, Intl.NumberFormat>();
export function carReading(
  entity: EntityLike | null | undefined,
  field: CarSourceField,
  options: { decimals?: number } = {}
): CarReading {
  const key = canonical(field),
    label = CAR_SOURCE_FIELDS.find((entry) => entry.key === key)?.label ?? key;
  const result: CarReading = {
    status: 'ready',
    available: true,
    reason: null,
    value: null,
    valueText: '',
    unit: null,
    label,
    state: entity?.state ?? null,
    active: null,
  };
  const fail = (status: CarReading['status'], reason: string) => ({
    ...result,
    status,
    available: false,
    valueText: reason,
    reason,
  });
  if (!entity) return fail('missing', 'Fonte non presente');
  const metadata = carSourceMetadata(entity, field);
  result.unit = metadata.unit;
  const state = text(entity.state);
  if (state === 'unavailable') return fail('unavailable', 'Non disponibile');
  if (!state || state === 'unknown') return fail('unknown', 'Stato sconosciuto');
  if (!metadata.compatible) return fail('invalid', metadata.reason!);
  if (numeric[key]) {
    const value = carFiniteNumber(state);
    if (
      value === null ||
      ((['batteryId', 'chargeLimitNumberId'].includes(key) ||
        (key === 'fuelLevelId' && metadata.unit === '%')) &&
        (value < 0 || value > 100)) ||
      (key === 'fuelLevelId' && value < 0) ||
      (['rangeId', 'odometerId', 'chargeRateId', 'timeToFullId'].includes(key) && value < 0) ||
      (key === 'latitudeId' && Math.abs(value) > 90) ||
      (key === 'longitudeId' && Math.abs(value) > 180)
    )
      return fail('invalid', 'Valore non valido');
    const decimals =
      typeof options.decimals === 'number' && Number.isFinite(options.decimals)
        ? Math.min(6, Math.max(0, Math.trunc(options.decimals)))
        : 1;
    if (!formatters.has(decimals))
      formatters.set(decimals, new Intl.NumberFormat('it-IT', { maximumFractionDigits: decimals }));
    return { ...result, value, valueText: formatters.get(decimals)!.format(value) };
  }
  if (['chargeEndTimeId', 'lastUpdatedId'].includes(key)) {
    if (
      !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(state) ||
      !Number.isFinite(Date.parse(state))
    )
      return fail('invalid', 'Data non valida');
    return { ...result, valueText: new Date(state).toLocaleString('it-IT') };
  }
  let labels: Record<string, string> | null = null;
  if (key === 'chargingStateId') {
    labels = {
      on: 'In carica',
      off: 'Non in carica',
      charging: 'In carica',
      starting: 'Avvio della ricarica',
      stopped: 'Ricarica interrotta',
      complete: 'Ricarica completata',
      disconnected: 'Scollegata',
      no_power: 'Alimentazione assente',
    };
    result.active = ['on', 'charging', 'starting'].includes(state)
      ? true
      : ['off', 'stopped', 'complete', 'disconnected', 'no_power'].includes(state)
        ? false
        : null;
  }
  if (key === 'pluggedId') {
    labels = {
      on: 'Collegata',
      off: 'Scollegata',
      plugged: 'Collegata',
      unplugged: 'Scollegata',
      true: 'Collegata',
      false: 'Scollegata',
    };
    result.active = ['on', 'plugged', 'true'].includes(state)
      ? true
      : ['off', 'unplugged', 'false'].includes(state)
        ? false
        : null;
  }
  if (key === 'ignitionSwitchId' || key === 'chargeControlId') {
    labels = { on: 'Acceso', off: 'Spento' };
    result.active = state === 'on' ? true : state === 'off' ? false : null;
  }
  if (key === 'climateId') {
    labels = {
      off: 'Spento',
      heat: 'Riscaldamento',
      cool: 'Raffrescamento',
      heat_cool: 'Riscaldamento/raffrescamento',
      auto: 'Automatico',
      dry: 'Deumidificazione',
      fan_only: 'Ventilazione',
    };
    result.active = Object.hasOwn(labels, state) ? state !== 'off' : null;
  }
  if (key === 'lockId') {
    labels =
      domain(entity) === 'binary_sensor'
        ? { on: 'Sbloccata', off: 'Bloccata' }
        : {
            locked: 'Bloccata',
            unlocked: 'Sbloccata',
            open: 'Aperta',
            locking: 'Blocco in corso',
            unlocking: 'Sblocco in corso',
            opening: 'Apertura in corso',
            jammed: 'Inceppata',
          };
  }
  if (labels) {
    if (!Object.hasOwn(labels, state)) return fail('unknown', 'Stato sconosciuto');
    return { ...result, valueText: labels[state]! };
  }
  return {
    ...result,
    valueText:
      key === 'locationId' && state === 'home'
        ? 'A casa'
        : key === 'locationId' && state === 'not_home'
          ? 'Fuori casa'
          : state,
  };
}

/** History owns its metadata; a different or absent unit is not silently converted. */
export function carHistoryReading(
  event: { state?: string; unit?: string | null; deviceClass?: string | null },
  currentEntity: EntityLike | null | undefined,
  field: CarSourceField,
  options: { decimals?: number } = {}
): CarReading {
  const sample = carReading(
    {
      entity_id: currentEntity?.entity_id,
      state: event.state,
      attributes: { unit_of_measurement: event.unit, device_class: event.deviceClass },
    },
    field,
    options
  );
  const current = carSourceMetadata(currentEntity, field);
  if (!numeric[canonical(field)] || !current.compatible || sample.unit !== current.unit)
    return {
      ...sample,
      status: 'invalid',
      available: false,
      value: null,
      active: null,
      valueText: 'Metadati storici incompatibili',
      reason: 'Metadati storici incompatibili',
    };
  return sample;
}

/** Never assemble a position from half a tracker and half a different manual source. */
export function carCoordinates(entities: EntityLikeMap, settings: Record<string, unknown>) {
  const { ids } = configuredCarSources(settings),
    tracker = ids.locationId ? entities[ids.locationId] : null;
  const pair = (lat: unknown, lon: unknown, source: 'tracker' | 'manual') => {
    const latitude = carFiniteNumber(lat),
      longitude = carFiniteNumber(lon);
    return latitude !== null &&
      longitude !== null &&
      Math.abs(latitude) <= 90 &&
      Math.abs(longitude) <= 180
      ? { lat: latitude, lon: longitude, source }
      : null;
  };
  if (tracker && carReading(tracker, 'locationId').available) {
    const position = pair(attr(tracker, 'latitude'), attr(tracker, 'longitude'), 'tracker');
    if (position) return position;
  }
  const lat = carReading(ids.latitudeId ? entities[ids.latitudeId] : null, 'latitudeId'),
    lon = carReading(ids.longitudeId ? entities[ids.longitudeId] : null, 'longitudeId');
  return lat.available && lon.available ? pair(lat.value, lon.value, 'manual') : null;
}

export function carNativeBounds(
  entity: EntityLike | null | undefined,
  field: 'chargeLimitNumberId' | 'climateId',
  haTemperatureUnit?: unknown
) {
  if (!entity || !carSourceMetadata(entity, field).compatible) return null;
  const climate = field === 'climateId',
    min = carFiniteNumber(attr(entity, climate ? 'min_temp' : 'min')),
    max = carFiniteNumber(attr(entity, climate ? 'max_temp' : 'max')),
    step = carFiniteNumber(attr(entity, climate ? 'target_temp_step' : 'step')),
    configuredUnit = text(haTemperatureUnit),
    // HA serializes climate temperatures/bounds in its configured display unit.
    unit =
      climate && ['°C', '°F', 'K'].includes(configuredUnit)
        ? configuredUnit
        : text(attr(entity, climate ? 'temperature_unit' : 'unit_of_measurement'));
  return min !== null &&
    max !== null &&
    step !== null &&
    min < max &&
    step > 0 &&
    step <= max - min &&
    (climate ? ['°C', '°F', 'K'].includes(unit) : unit === '%' && min >= 0 && max <= 100)
    ? { min, max, step, unit }
    : null;
}

/** Existing service names only. The caller must additionally enforce live permissions/edit guards. */
export function carCapabilities(
  entity: EntityLike | null | undefined,
  field: CarSourceField,
  services: unknown,
  haTemperatureUnit?: unknown
): string[] {
  if (!entity || !carSourceMetadata(entity, field).compatible || entity.state === 'unavailable')
    return [];
  const has = (name: string) => {
    const [dom, service] = name.split('.');
    if (!services || typeof services !== 'object' || !dom || !service) return false;
    const group = own(services, dom);
    return Boolean(group && typeof group === 'object' && Object.hasOwn(group, service));
  };
  const dom = domain(entity),
    state = entity.state,
    key = canonical(field),
    actions: string[] = [];
  if (key === 'updateButtonId' || key === 'chargeControlId') {
    if (dom === 'button' || dom === 'input_button') actions.push(`${dom}.press`);
    if (dom === 'script' && (state === 'on' || state === 'off')) actions.push('script.turn_on');
  }
  if (
    (key === 'ignitionSwitchId' || key === 'chargeControlId') &&
    dom === 'switch' &&
    (state === 'on' || state === 'off')
  )
    actions.push(state === 'on' ? 'switch.turn_off' : 'switch.turn_on');
  if (
    key === 'chargeLimitNumberId' &&
    carReading(entity, key).available &&
    carNativeBounds(entity, key)
  )
    actions.push('number.set_value');
  if (key === 'chargeLimitSelectId' && text(state) && state !== 'unknown') {
    const options = attr(entity, 'options');
    if (
      Array.isArray(options) &&
      options.some((option) => typeof option === 'string' && option.trim()) &&
      options.includes(state)
    )
      actions.push('select.select_option');
  }
  if (key === 'lockId' && dom === 'lock' && ['locked', 'unlocked', 'open'].includes(state ?? ''))
    actions.push(state === 'locked' ? 'lock.unlock' : 'lock.lock');
  if (
    key === 'lockId' &&
    dom === 'lock' &&
    carReading(entity, key).available &&
    state !== 'open' &&
    state !== 'opening'
  ) {
    const raw = attr(entity, 'supported_features');
    if (typeof raw === 'number' && Number.isSafeInteger(raw) && raw >= 0 && raw & 1)
      actions.push('lock.open');
  }
  if (key === 'climateId' && carReading(entity, key).available) {
    const raw = attr(entity, 'supported_features'),
      flags = typeof raw === 'number' && Number.isSafeInteger(raw) && raw >= 0 ? raw : 0;
    if (flags & (state === 'off' ? 256 : 128))
      actions.push(state === 'off' ? 'climate.turn_on' : 'climate.turn_off');
    if (
      flags & 1 &&
      carNativeBounds(entity, key, haTemperatureUnit) &&
      carFiniteNumber(attr(entity, 'temperature')) !== null
    )
      actions.push('climate.set_temperature');
  }
  return actions.filter(has);
}
