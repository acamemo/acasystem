/**
 * Robot vacuum: states, supported features and the discovery of related entities
 * (consumables, diagnostics, rooms, maps, statistics), ported from the legacy VacuumCard and
 * VacuumModal. Pure functions: entities, registry relations and card settings in, data out.
 */
import type { HassEntity } from 'home-assistant-js-websocket';
import type { CardSettings } from '@/@types/dashboard';
import type { EntityMap } from '@/@types/ha';
import { parseNumber } from '../shared/format';
import { attr, isUnavailableState, listAttr, numberAttr, settingString, stringAttr, type MaybeEntity } from '../shared/entity';

export const ERROR_STATES = ['error', 'fault', 'problem', 'stuck'];

/** Italian label of a vacuum state (legacy getVacuumStateLabel, modal variant). */
export function vacuumStateLabel(state: string | undefined, battery: number | null): string {
  const normalized = String(state ?? '').toLowerCase();
  if (!normalized) return 'Stato sconosciuto';
  if (normalized === 'unavailable') return 'Non disponibile';
  if (normalized === 'unknown') return 'Stato sconosciuto';
  if (normalized === 'cleaning' || normalized === 'vacuuming') return 'Pulizia in corso';
  if (['returning', 'going_home', 'return_to_base'].includes(normalized)) return 'Ritorno alla base';
  if ((normalized === 'charging' || normalized === 'docked') && battery === 100) return 'Alla base';
  if (normalized === 'charging' || normalized === 'docked') return 'In carica';
  if (normalized === 'idle' || normalized === 'ready') return 'Inattivo';
  if (normalized === 'paused' || normalized === 'pause') return 'In pausa';
  if (ERROR_STATES.includes(normalized)) return 'Errore';
  if (normalized === 'stopped') return 'Fermo';
  return String(state).replace(/_/g, ' ');
}

/** States that confirm each request (requested → confirmed). */
export const VACUUM_CONFIRM = {
  start: ['cleaning', 'vacuuming'],
  pause: ['paused', 'pause', 'idle', 'stopped', 'docked'],
  stop: ['idle', 'stopped', 'docked', 'paused', 'returning'],
  dock: ['returning', 'going_home', 'return_to_base', 'docked', 'charging'],
} as const;

export interface VacuumFeatures {
  canPause: boolean;
  canStop: boolean;
  canReturnToBase: boolean;
  canLocate: boolean;
  canSetFanSpeed: boolean;
}

/** Supported features (legacy bit checks; without the attribute everything is allowed). */
export function vacuumFeatures(entity: MaybeEntity): VacuumFeatures {
  const features = numberAttr(entity, 'supported_features');
  const known = features !== null && features > 0;
  const has = (bits: number[]) => known && bits.some((bit) => (Number(features) & bit) === bit);
  const fanList = listAttr(entity, 'fan_speed_list');
  const fanSpeed = attr(entity, 'fan_speed');
  const hasFan = fanList.length > 0 || (typeof fanSpeed === 'string' && !isUnavailableState(fanSpeed) && fanSpeed !== '');
  return {
    canPause: has([2, 4]) || !known,
    canStop: has([4, 8]) || !known,
    canReturnToBase: has([8, 16]) || !known,
    canLocate: has([64, 256, 1024]) || !known,
    canSetFanSpeed: hasFan || has([16, 32]),
  };
}

/** Primary action of the details: pause (or stop) while cleaning, start otherwise. */
export function primaryAction(entity: MaybeEntity): 'pause' | 'stop' | 'start' {
  if (entity?.state !== 'cleaning') return 'start';
  const features = vacuumFeatures(entity);
  if (features.canPause) return 'pause';
  if (features.canStop) return 'stop';
  return 'start';
}

export function vacuumBattery(entity: MaybeEntity): number | null {
  return numberAttr(entity, 'battery_level');
}

/** Room reported by the vacuum itself. */
export function vacuumRoom(entity: MaybeEntity): string | null {
  return stringAttr(entity, 'current_room') ?? stringAttr(entity, 'room');
}

// ── Discovery of related entities ────────────────────────────────────────────────────

export interface Relations {
  sensors: string[];
  selects: string[];
  buttons: string[];
}

export const NO_RELATIONS: Relations = { sensors: [], selects: [], buttons: [] };

export interface VacuumIdentity {
  id: string;
  name: string;
  friendly: string;
  tokens: string[];
}

export function vacuumIdentity(vacuumId: string, entity: MaybeEntity): VacuumIdentity {
  const name = (vacuumId.split('.')[1] ?? '').toLowerCase();
  return {
    id: vacuumId,
    name,
    friendly: (stringAttr(entity, 'friendly_name') ?? '').toLowerCase(),
    tokens: name
      .split(/[_\-\s]+/)
      .filter((token) => token.length > 2)
      .filter((token) => !['vacuum', 'robot', 'cleaner'].includes(token)),
  };
}

const friendlyLower = (entity: MaybeEntity) => (stringAttr(entity, 'friendly_name') ?? '').toLowerCase();

const normalizeSearch = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function matchesKeywords(entityId: string, entity: MaybeEntity, keywords: string[]): boolean {
  const raw = `${entityId.toLowerCase()} ${friendlyLower(entity)}`;
  const normalized = normalizeSearch(raw);
  return keywords.every((keyword) => {
    const lower = keyword.toLowerCase();
    return raw.includes(lower) || normalized.includes(normalizeSearch(lower));
  });
}

function relatedByName(identity: VacuumIdentity, entityId: string): boolean {
  const lower = entityId.toLowerCase();
  return (
    identity.tokens.length === 0 ||
    identity.tokens.some((token) => lower.includes(token)) ||
    lower.includes(identity.name)
  );
}

const isValid = (value: unknown) => !isUnavailableState(value);

/** Select or input_select that chooses the room to clean. */
export function roomSelectId(
  entities: EntityMap,
  identity: VacuumIdentity,
  relations: Relations,
  settings: CardSettings
): string | null {
  const configured = settingString(settings, 'roomSelectEntityId');
  if (configured) return configured;
  const keyword = /(room|zone|segment|clean_room|area)/i;
  const fromRegistry = relations.selects.find(
    (id) => keyword.test(id.toLowerCase()) || keyword.test(friendlyLower(entities[id]))
  );
  if (fromRegistry) return fromRegistry;
  for (const [id, entity] of Object.entries(entities)) {
    if (!id.startsWith('select.') && !id.startsWith('input_select.')) continue;
    if (!relatedByName(identity, id)) continue;
    if (keyword.test(id.toLowerCase()) || keyword.test(friendlyLower(entity))) return id;
  }
  return null;
}

/** Sensors of the vacuum: from the registry when known, else by name. */
export function relatedSensors(entities: EntityMap, identity: VacuumIdentity, relations: Relations): Map<string, HassEntity> {
  const found = new Map<string, HassEntity>();
  if (!identity.name) return found;
  if (relations.sensors.length > 0) {
    for (const id of relations.sensors) {
      const entity = entities[id];
      if (id.startsWith('sensor.') && entity) found.set(id, entity);
    }
    return found;
  }
  for (const [id, entity] of Object.entries(entities)) {
    if (!id.startsWith('sensor.')) continue;
    const lower = id.toLowerCase();
    const friendly = friendlyLower(entity);
    if (
      lower.includes(identity.name) ||
      (identity.friendly && friendly.includes(identity.friendly)) ||
      identity.tokens.some((token) => lower.includes(token) || friendly.includes(token))
    ) {
      found.set(id, entity);
    }
  }
  return found;
}

export interface Reading {
  value: string;
  unit: string | null;
}

function findReading(sensors: Map<string, HassEntity>, keywords: string[]): Reading | null {
  for (const [id, entity] of sensors) {
    const haystack = `${id.toLowerCase()} ${friendlyLower(entity)}`;
    if (keywords.every((keyword) => haystack.includes(keyword.toLowerCase())) && isValid(entity.state)) {
      return { value: entity.state, unit: stringAttr(entity, 'unit_of_measurement') };
    }
  }
  return null;
}

function mappedReading(entities: EntityMap, settings: CardSettings, key: string): Reading | null {
  const id = settingString(settings, key);
  const entity = id ? entities[id] : undefined;
  if (!entity || !isValid(entity.state)) return null;
  return { value: entity.state, unit: stringAttr(entity, 'unit_of_measurement') };
}

function attrReading(entity: MaybeEntity, keys: string[]): string | null {
  for (const key of keys) {
    const value = attr(entity, key);
    if (value !== undefined && value !== null && value !== '') return String(value);
  }
  return null;
}

export interface VacuumStatistics {
  battery: number | null;
  room: string | null;
  cleaningTime: Reading | null;
  cleanedArea: Reading | null;
  totalTime: Reading | null;
  totalArea: Reading | null;
  totalCount: string | null;
  lastClean: string | null;
  avgTime: number | null;
  avgArea: number | null;
}

/** Statistics of the vacuum: mapped sensors first, then attributes, then sensors by name. */
export function vacuumStatistics(
  entities: EntityMap,
  vacuumId: string,
  settings: CardSettings,
  sensors: Map<string, HassEntity>
): VacuumStatistics {
  const entity = entities[vacuumId];
  const pick = (mappedKey: string, attrKeys: string[], unitKeys: string[], searches: string[][]): Reading | null => {
    const mapped = mappedReading(entities, settings, mappedKey);
    if (mapped) return mapped;
    const fromAttr = attrReading(entity, attrKeys);
    if (fromAttr !== null) return { value: fromAttr, unit: attrReading(entity, unitKeys) };
    for (const keywords of searches) {
      const found = findReading(sensors, keywords);
      if (found) return found;
    }
    return null;
  };

  const batteryRaw =
    numberAttr(entity, 'battery_level') ??
    parseNumber(mappedReading(entities, settings, 'batterySensorId')?.value) ??
    parseNumber(findReading(sensors, ['battery_level'])?.value) ??
    parseNumber(findReading(sensors, ['battery'])?.value) ??
    parseNumber(findReading(sensors, ['soc'])?.value);

  let room = vacuumRoom(entity);
  if (!room) {
    room = mappedReading(entities, settings, 'currentRoomSensorId')?.value ?? null;
  }
  if (!room) {
    for (const [id, item] of Object.entries(entities)) {
      if (
        id.startsWith('sensor.') &&
        id.includes('current_room') &&
        (id.includes(vacuumId.split('.')[1] ?? '') || id.includes('roborock') || id.includes('vacuum'))
      ) {
        room = isValid(item.state) ? item.state : null;
        break;
      }
    }
  }

  const cleaningTime = pick('cleaningTimeSensorId', ['cleaning_time', 'current_clean_time', 'clean_time'], [], [['cleaning_time'], ['clean_time']]);
  const cleanedArea = pick(
    'cleanedAreaSensorId',
    ['cleaned_area', 'current_clean_area', 'clean_area'],
    ['cleaned_area_unit', 'current_clean_area_unit', 'clean_area_unit'],
    [['cleaning_area'], ['cleaned_area'], ['clean_area']]
  );
  const totalTime = pick(
    'totalCleanTimeSensorId',
    ['total_cleaning_time', 'total_clean_time', 'total_duration'],
    [],
    [['total', 'cleaning_time'], ['total', 'clean_time'], ['total', 'duration']]
  );
  const totalArea = pick(
    'totalCleanAreaSensorId',
    ['total_clean_area', 'total_cleaned_area'],
    ['total_clean_area_unit', 'total_cleaned_area_unit'],
    [['total', 'clean_area'], ['total', 'cleaned_area']]
  );
  const totalCount =
    mappedReading(entities, settings, 'totalCleanCountSensorId')?.value ??
    attrReading(entity, ['total_clean_count', 'clean_count']) ??
    findReading(sensors, ['total', 'clean_count'])?.value ??
    findReading(sensors, ['clean_count'])?.value ??
    null;
  const lastStart =
    mappedReading(entities, settings, 'lastCleanStartSensorId')?.value ??
    attrReading(entity, ['last_clean_start', 'last_run_start']) ??
    findReading(sensors, ['last_clean_start'])?.value ??
    findReading(sensors, ['last_run_start'])?.value ??
    null;
  const lastEnd =
    mappedReading(entities, settings, 'lastCleanEndSensorId')?.value ??
    attrReading(entity, ['last_clean_end', 'last_run_end']) ??
    findReading(sensors, ['last_clean_end'])?.value ??
    findReading(sensors, ['last_run_end'])?.value ??
    findReading(sensors, ['last_clean_time'])?.value ??
    null;

  const count = parseNumber(totalCount);
  const time = parseNumber(totalTime?.value);
  const area = parseNumber(totalArea?.value);
  const hasAverages = count !== null && count > 0 && ((time !== null && time > 0) || (area !== null && area > 0));
  return {
    battery: batteryRaw,
    room,
    cleaningTime,
    cleanedArea,
    totalTime,
    totalArea,
    totalCount,
    lastClean: lastEnd ?? lastStart,
    avgTime: hasAverages && time ? Math.round(time / Number(count)) : null,
    avgArea: hasAverages && area ? Number((area / Number(count)).toFixed(1)) : null,
  };
}

// ── Consumables and diagnostics ──────────────────────────────────────────────────────

/** Nominal lifetimes in hours (Roborock and compatible). */
const LIFE_HOURS: Record<string, number> = { mainBrush: 300, sideBrush: 200, filter: 150, sensors: 30 };

const UNIT_HOURS: Record<string, number> = {
  s: 1 / 3600,
  sec: 1 / 3600,
  secs: 1 / 3600,
  second: 1 / 3600,
  seconds: 1 / 3600,
  min: 1 / 60,
  mins: 1 / 60,
  minute: 1 / 60,
  minutes: 1 / 60,
  h: 1,
  hr: 1,
  hrs: 1,
  hour: 1,
  hours: 1,
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

/** Remaining life in percent: a percentage as is, a remaining duration against the nominal life. */
export function consumablePercent(entity: MaybeEntity, lifeHours: number | undefined): number | null {
  if (!entity || !isValid(entity.state)) return null;
  const value = parseNumber(entity.state);
  if (value === null) return null;
  const unit = (stringAttr(entity, 'unit_of_measurement') ?? '').trim().toLowerCase();
  if (unit === '%') return clampPercent(value);
  const perUnit = UNIT_HOURS[unit];
  if (perUnit && lifeHours) return clampPercent(((value * perUnit) / lifeHours) * 100);
  if (!unit && value >= 0 && value <= 100) return clampPercent(value);
  return null;
}

function finder(entities: EntityMap, identity: VacuumIdentity, registry: string[], prefix: string) {
  return (keywords: string[]): string | undefined => {
    const fromRegistry = registry.find((id) => matchesKeywords(id, entities[id], keywords));
    if (fromRegistry) return fromRegistry;
    return Object.keys(entities).find(
      (id) => id.startsWith(prefix) && relatedByName(identity, id) && matchesKeywords(id, entities[id], keywords)
    );
  };
}

export interface Consumable {
  key: string;
  label: string;
  percent: number | null;
  sensorId: string | undefined;
  buttonId: string | undefined;
}

export function vacuumConsumables(entities: EntityMap, identity: VacuumIdentity, relations: Relations): Consumable[] {
  const sensor = finder(entities, identity, relations.sensors, 'sensor.');
  const button = finder(entities, identity, relations.buttons, 'button.');
  const items = [
    { key: 'mainBrush', label: 'Spazzola principale', sensorId: sensor(['main', 'brush']), buttonId: button(['main', 'brush', 'reset']) },
    { key: 'sideBrush', label: 'Spazzola laterale', sensorId: sensor(['side', 'brush']), buttonId: button(['side', 'brush', 'reset']) },
    { key: 'filter', label: 'Filtro', sensorId: sensor(['filter']), buttonId: button(['filter', 'reset']) },
    {
      key: 'sensors',
      label: 'Sensori',
      sensorId:
        sensor(['sensor_time_left']) ??
        sensor(['sensor', 'dirty']) ??
        sensor(['sensor', 'cleaning']) ??
        sensor(['sensor', 'wear']) ??
        sensor(['sensors', 'dirty']),
      buttonId:
        button(['reset', 'sensor', 'consumable']) ??
        button(['sensor', 'reset']) ??
        button(['sensors', 'reset']) ??
        button(['sensor_dirty', 'reset']),
    },
  ];
  return items
    .map((item) => ({
      ...item,
      percent: consumablePercent(item.sensorId ? entities[item.sensorId] : undefined, LIFE_HOURS[item.key]),
    }))
    .filter((item) => item.percent !== null || Boolean(item.buttonId));
}

export type DiagnosticType = 'water_clean' | 'water_dirty' | 'binary_ok' | 'binary_inverse' | 'status';

export interface Diagnostic {
  key: string;
  label: string;
  id: string;
  text: string;
  /** Needs attention (empty clean tank, full dirty tank, missing part). */
  warn: boolean;
}

function diagnosticText(state: string, type: DiagnosticType, unit: string | null): { text: string; warn: boolean } {
  const normalized = state.toLowerCase();
  if (!isValid(state)) return { text: '--', warn: false };
  if (Number.isFinite(Number(state))) return { text: `${state}${unit && unit !== '%' ? ` ${unit}` : '%'}`, warn: false };
  const yes = ['on', 'true', 'yes'].includes(normalized);
  if (type === 'binary_ok') return yes || normalized === 'home' ? { text: 'Installato', warn: false } : { text: 'Rimosso', warn: true };
  if (type === 'binary_inverse') return yes ? { text: 'Attiva', warn: false } : { text: 'Non attiva', warn: false };
  if (type === 'water_clean') {
    if (normalized === 'on' || normalized === 'true') return { text: 'Vuoto', warn: true };
    if (normalized === 'off' || normalized === 'false') return { text: 'Pieno', warn: false };
  }
  if (type === 'water_dirty') {
    if (normalized === 'on' || normalized === 'true') return { text: 'Pieno', warn: true };
    if (normalized === 'off' || normalized === 'false') return { text: 'Vuoto', warn: false };
  }
  if (normalized === 'on') return { text: 'Acceso', warn: false };
  if (normalized === 'off') return { text: 'Spento', warn: false };
  return { text: state.replace(/_/g, ' '), warn: false };
}

export function vacuumDiagnostics(entities: EntityMap, identity: VacuumIdentity, relations: Relations): Diagnostic[] {
  const pool = [...relations.sensors, ...relations.selects, ...relations.buttons];
  const find = (keywords: string[], domains = ['sensor', 'binary_sensor', 'switch']): string | undefined => {
    const lowered = keywords.map((keyword) => keyword.toLowerCase());
    const hit = (id: string) => {
      const haystack = `${id.toLowerCase()} ${friendlyLower(entities[id])}`;
      return lowered.every((keyword) => haystack.includes(keyword));
    };
    const fromPool = pool.find((id) => domains.includes(id.split('.')[0] ?? '') && entities[id] && hit(id));
    if (fromPool) return fromPool;
    return Object.keys(entities).find((id) => {
      if (!domains.includes(id.split('.')[0] ?? '')) return false;
      const lower = id.toLowerCase();
      const friendly = friendlyLower(entities[id]);
      const related =
        lower.includes(identity.name) ||
        (identity.friendly !== '' && friendly.includes(identity.friendly)) ||
        identity.tokens.some((token) => lower.includes(token) || friendly.includes(token));
      return related && hit(id);
    });
  };
  const specs: Array<{ key: string; label: string; type: DiagnosticType; id: string | undefined }> = [
    { key: 'cleanWater', label: 'Serbatoio acqua pulita', type: 'water_clean', id: find(['clean', 'water']) ?? find(['water', 'tank']) ?? find(['water', 'box']) },
    { key: 'dirtyWater', label: 'Serbatoio acqua sporca', type: 'water_dirty', id: find(['dirty', 'water']) ?? find(['waste', 'water']) },
    { key: 'mopAttached', label: 'Supporto del panno', type: 'binary_ok', id: find(['mop', 'attached']) ?? find(['mop', 'mount']) ?? find(['mop', 'installed']) },
    { key: 'dustbin', label: 'Contenitore della polvere', type: 'binary_ok', id: find(['dustbin', 'installed']) ?? find(['dustbin', 'attached']) ?? find(['dustbin']) },
    { key: 'dnd', label: 'Non disturbare', type: 'binary_inverse', id: find(['dnd']) ?? find(['do_not_disturb']) },
    { key: 'drying', label: 'Asciugatura del panno', type: 'status', id: find(['drying']) ?? find(['mop_drying']) },
  ];
  const result: Diagnostic[] = [];
  for (const spec of specs) {
    const entity = spec.id ? entities[spec.id] : undefined;
    if (!spec.id || !entity) continue;
    const { text, warn } = diagnosticText(entity.state, spec.type, stringAttr(entity, 'unit_of_measurement'));
    result.push({ key: spec.key, label: spec.label, id: spec.id, text, warn });
  }
  return result;
}

// ── Maps ─────────────────────────────────────────────────────────────────────────────

/** Image and camera entities of the vacuum maps (legacy discovery and fallback). */
export function vacuumMapIds(entities: EntityMap, identity: VacuumIdentity, settings: CardSettings): string[] {
  const isMapDomain = (id: string) => id.startsWith('image.') || id.startsWith('camera.');
  const related = Object.keys(entities).filter((id) => {
    if (!isMapDomain(id) || !identity.name) return false;
    const lower = id.toLowerCase();
    const friendly = friendlyLower(entities[id]);
    return (
      identity.tokens.some((token) => lower.includes(token) || friendly.includes(token)) ||
      lower.includes(identity.name) ||
      friendly.includes(identity.name) ||
      (identity.friendly !== '' &&
        identity.friendly
          .split(/[_\-\s]+/)
          .some((token) => token.length > 2 && (lower.includes(token) || friendly.includes(token))))
    );
  });
  const configured = settingString(settings, 'mapImageEntityId');
  const list = related.length > 0
    ? related
    : Object.keys(entities).filter((id) => {
        if (!isMapDomain(id)) return false;
        const lower = id.toLowerCase();
        const friendly = friendlyLower(entities[id]);
        return lower.includes('map') || friendly.includes('map') || lower.includes('kart') || friendly.includes('kart');
      });
  if (configured && entities[configured] && !list.includes(configured)) return [configured, ...list];
  if (configured && list.includes(configured)) return [configured, ...list.filter((id) => id !== configured)];
  return list;
}

/** Fan speeds of the vacuum, with the legacy defaults. */
export function fanSpeeds(entity: MaybeEntity): string[] {
  const list = listAttr(entity, 'fan_speed_list');
  return list.length > 0 ? list : ['Silent', 'Standard', 'Strong', 'Turbo'];
}

export interface MopControl {
  /** select/input_select controlling the mop, or null for vacuum.set_mop_intensity. */
  entityId: string | null;
  options: string[];
  current: string | null;
  available: boolean;
}

/** Mop intensity control: a related select when present, else the vacuum attributes. */
export function mopControl(entities: EntityMap, entity: MaybeEntity, relations: Relations, settings: CardSettings): MopControl {
  const mapped = settingString(settings, 'mopIntensityControlEntityId');
  let controlId: string | null = mapped && entities[mapped] ? mapped : null;
  if (!controlId) {
    const keyword = /(mop|water|intensity|wet|scrub)/i;
    controlId =
      relations.selects.find((id) => keyword.test(id.toLowerCase()) || keyword.test(friendlyLower(entities[id]))) ?? null;
  }
  const control = controlId ? entities[controlId] : undefined;
  const controlOptions = listAttr(control, 'options');
  const attrList = listAttr(entity, 'mop_intensity_list');
  const intensity = stringAttr(entity, 'mop_intensity');
  const attributes: Record<string, unknown> = entity?.attributes ?? {};
  const available =
    attrList.length > 0 ||
    (intensity !== null && isValid(intensity)) ||
    controlOptions.length > 0 ||
    Object.keys(attributes).some((key) => key.startsWith('mop_') || key.startsWith('water_'));
  if (controlId && controlOptions.length > 0) {
    return { entityId: controlId, options: controlOptions, current: control?.state ?? null, available };
  }
  return {
    entityId: null,
    options: attrList.length > 0 ? attrList : ['Low', 'Medium', 'High'],
    current: intensity,
    available,
  };
}

/** Sensors of the vacuum not shown elsewhere (legacy «advanced telemetry»). */
export function telemetry(
  entities: EntityMap,
  relations: Relations,
  shown: Set<string>
): Array<{ id: string; label: string; value: string; unit: string | null }> {
  return relations.sensors
    .filter((id) => !shown.has(id) && (id.startsWith('sensor.') || id.startsWith('binary_sensor.')))
    .map((id) => {
      const entity = entities[id];
      return {
        id,
        label: stringAttr(entity, 'friendly_name') ?? (id.split('.')[1] ?? id).replace(/_/g, ' '),
        value: entity?.state ?? '',
        unit: stringAttr(entity, 'unit_of_measurement'),
      };
    })
    .filter((item) => isValid(item.value));
}
