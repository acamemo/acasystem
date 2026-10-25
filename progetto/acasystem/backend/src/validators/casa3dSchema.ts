/**
 * Schema del piano della Casa 3D (ADR-0014, T6): porta in TypeScript i vincoli di `schema.py` della
 * copia a monte (`casa3d/upstream/custom_components/neonplan3d/schema.py`, revisione 1383a14), che
 * rispecchia `casa3d/src/model.ts`. Stessi campi noti, stessi limiti (piani, stanze, punti, elementi),
 * stessi intervalli e lunghezze.
 *
 * Come nell'originale i campi che non conosce passano invariati (un frontend più nuovo del server non
 * si vede rifiutare i campi aggiunti). Differenze volute, dichiarate in PATCHES.md e nel report:
 * - il server non riempie i valori predefiniti né porta `theta` entro un giro: il piano resta come lo
 *   manda il client e lo normalizza `normalizeBuilding` al caricamento;
 * - i numeri devono essere numeri JSON (nessuna conversione da testo, come `vol.Coerce(float)`);
 * - le immagini delle regole degli schermi non possono essere indirizzi: solo l'id di un'immagine
 *   salvata, una telecamera `camera:<entità>` o il testo vuoto (ISSUE-016, ADR-0014 sezione 4).
 *
 * Ogni controllo restituisce il primo errore trovato, con il percorso del campo.
 */
import { isRecord } from '../helpers/objects.ts';

export const MAX_FLOORS = 20;
export const MAX_ROOMS = 200;
export const MAX_POINTS = 200;
export const MAX_ITEMS = 1000;

/** Esito di un controllo: null se il valore è valido, altrimenti il motivo. */
type Check = (value: unknown, path: string) => string | null;

interface Field {
  check: Check;
  required: boolean;
}

const fail = (path: string, what: string): string => `${path}: ${what}`;

/** Lunghezza in punti di codice, come `len()` di Python. */
const codePoints = (text: string): number => (text.length <= 1 ? text.length : [...text].length);

// ---------------------------------------------------------------------------- primitive

const str = (max: number, min = 0): Check => (value, path) => {
  if (typeof value !== 'string') return fail(path, 'expected a string');
  const length = codePoints(value);
  if (length < min || length > max) return fail(path, `length must be ${min}..${max}`);
  return null;
};

const matching = (pattern: RegExp, what: string): Check => (value, path) =>
  typeof value === 'string' && pattern.test(value) ? null : fail(path, what);

const ID_PATTERN = /^[A-Za-z0-9_\-.]+$/;
const ID: Check = (value, path) =>
  str(64, 1)(value, path) ?? matching(ID_PATTERN, 'not a valid id')(value, path);

const num = (min: number, max: number): Check => (value, path) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fail(path, 'expected a number');
  if (value < min || value > max) return fail(path, `must be between ${min} and ${max}`);
  return null;
};

const anyNumber: Check = (value, path) =>
  typeof value === 'number' && Number.isFinite(value) ? null : fail(path, 'expected a number');

const int = (min: number, max: number): Check => (value, path) => {
  if (typeof value !== 'number' || !Number.isInteger(value)) return fail(path, 'expected an integer');
  if (value < min || value > max) return fail(path, `must be between ${min} and ${max}`);
  return null;
};

const bool: Check = (value, path) => (typeof value === 'boolean' ? null : fail(path, 'expected true or false'));

const oneOf = (values: readonly string[]): Check => (value, path) =>
  typeof value === 'string' && values.includes(value) ? null : fail(path, `must be one of ${values.join(', ')}`);

const nullable = (check: Check): Check => (value, path) => (value === null ? null : check(value, path));

/** Oggetto JSON (non una lista). */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && !Array.isArray(value);

const plainObject: Check = (value, path) =>
  isPlainObject(value) ? null : fail(path, 'expected an object');

const list = (item: Check, max: number, min = 0): Check => (value, path) => {
  if (!Array.isArray(value)) return fail(path, 'expected a list');
  if (value.length < min || value.length > max) return fail(path, `must have ${min}..${max} items`);
  for (let index = 0; index < value.length; index += 1) {
    const error = item(value[index], `${path}[${index}]`);
    if (error) return error;
  }
  return null;
};

const req = (check: Check): Field => ({ check, required: true });
const opt = (check: Check): Field => ({ check, required: false });

/** Oggetto con campi noti; i campi sconosciuti passano (`extra=ALLOW_EXTRA`) salvo `strict`. */
const obj = (fields: Record<string, Field>, strict = false): Check => (value, path) => {
  if (!isPlainObject(value)) return fail(path, 'expected an object');
  for (const [name, field] of Object.entries(fields)) {
    if (!(name in value)) {
      if (field.required) return fail(`${path}.${name}`, 'required');
      continue;
    }
    const error = field.check(value[name], `${path}.${name}`);
    if (error) return error;
  }
  if (strict) {
    for (const name of Object.keys(value)) {
      if (!(name in fields)) return fail(`${path}.${name}`, 'extra key not allowed');
    }
  }
  return null;
};

// ---------------------------------------------------------------------------- tipi ricorrenti

const NAME = str(100);
const COORD = num(-1000, 1000);
const LENGTH = num(0, 100);
/** Punto di una stanza: coordinate entro ±1000 (il `_POINT` definito per primo nell'originale). */
const POINT = list(COORD, 2, 2);
/** Punto delle aree esterne, tetti, cavi, tubi e muri liberi: coordinate libere (il `_POINT` ridefinito più avanti). */
const FREE_POINT = list(anyNumber, 2, 2);
const ENTITY_REF = nullable(str(255));
const TEXT_255 = str(255);
const NULL_TEXT_255 = nullable(TEXT_255);
const HEIGHT = num(-50, 200);
const HEX_COLOR = matching(/^#[0-9a-fA-F]{6}$/, 'expected #rrggbb');

const START_VIEW = obj({
  theta: req(anyNumber),
  phi: req(num(0, 3.2)),
  radius: req(num(1, 500)),
  target: opt(
    obj({ x: req(num(-1000, 1000)), y: req(num(-200, 200)), z: req(num(-1000, 1000)) })
  ),
});

// ---------------------------------------------------------------------------- stanze e aperture

const ROOM = obj({
  climate: opt(
    nullable(
      obj({
        temperature: opt(ENTITY_REF),
        humidity: opt(ENTITY_REF),
        co2: opt(ENTITY_REF),
      })
    )
  ),
  id: req(ID),
  name: req(NAME),
  area_id: req(NULL_TEXT_255),
  points: req(list(POINT, MAX_POINTS, 3)),
  floor_material: req(str(32)),
  start_view: opt(nullable(START_VIEW)),
  panel: opt(list(TEXT_255, 100)),
  hidden: opt(list(TEXT_255, 200)),
  no_state: opt(list(TEXT_255, 200)),
  wall_splits: opt(list(nullable(list(num(0.05, 200), 16)), MAX_POINTS)),
  ceiling_height: opt(nullable(num(1, 30))),
  wall_thickness: opt(list(nullable(num(0.02, 1.5)), MAX_POINTS)),
  wall_heights: opt(
    list(
      (value, path) =>
        value === null
          ? null
          : Array.isArray(value)
            ? list(nullable(num(0, 20)), 32)(value, path)
            : num(0, 20)(value, path),
      MAX_POINTS
    )
  ),
});

const OPENING_STYLES = [
  'interior',
  'front',
  'front_glass',
  'sidelight',
  'sidelights',
  'glass',
  'sliding',
  'passage',
  'standard',
  'bars',
  'glass_wall',
];
const OPENING_SENSOR = nullable(oneOf(['contact', 'handle', 'contact_tilt']));

const OPENING = obj({
  id: req(ID),
  room_id: req(ID),
  edge: req(int(0, MAX_POINTS)),
  offset: req(LENGTH),
  wall: opt(nullable(ID)),
  width: req(LENGTH),
  type: req(oneOf(['door', 'window', 'garage'])),
  sill: req(LENGTH),
  height: req(LENGTH),
  hinge: opt(oneOf(['left', 'right'])),
  leaves: opt((value, path) => (value === 1 || value === 2 ? null : fail(path, 'must be 1 or 2'))),
  swing: opt(oneOf(['in', 'out'])),
  style: opt(nullable(oneOf(OPENING_STYLES))),
  sidelight_hinge: opt(bool),
  sidelight_width: opt(nullable(num(0.1, 3))),
  sidelight_width2: opt(nullable(num(0.1, 3))),
  contact2: opt(NULL_TEXT_255),
  sensor: opt(OPENING_SENSOR),
  sensor2: opt(OPENING_SENSOR),
  tilt2: opt(NULL_TEXT_255),
  position: opt(NULL_TEXT_255),
  position_inverted: opt(bool),
  tilt_angle: opt(ENTITY_REF),
  tilt_max: opt(nullable(num(1, 90))),
  tilt_offset: opt(nullable(num(-360, 360))),
  tilt_invert: opt(bool),
  shut: opt(bool),
  contact_invert: opt(bool),
  rain_ignore: opt(bool),
  well: opt(bool),
  well_rim: opt(nullable(num(-0.3, 1))),
  mark: opt(nullable(oneOf(['closed']))),
  confirm: opt(bool),
  cover: opt(ENTITY_REF),
  contact: opt(ENTITY_REF),
  tilt: opt(ENTITY_REF),
});

// ---------------------------------------------------------------------------- mobili

/**
 * Immagine di una regola di uno schermo: nessun indirizzo. Ammessi il testo vuoto (regola senza
 * immagine), l'id di un'immagine salvata e `camera:<entità>` (immagine di una telecamera di Home
 * Assistant, che passa dal proxy `/ha`). Un indirizzo `http:`, `https:`, `//`, `data:` o altro è rifiutato.
 */
export const isAllowedPictureRef = (value: string): boolean =>
  value === '' || ID_PATTERN.test(value) || /^camera:[A-Za-z0-9_.]+$/.test(value);

const PICTURE_IMAGE: Check = (value, path) => {
  const error = str(2048)(value, path);
  if (error) return error;
  return isAllowedPictureRef(value as string)
    ? null
    : fail(path, 'an image address is not allowed: use a stored image or a camera');
};

/** Senza `ALLOW_EXTRA`, come `vol.Schema({...})` dell'originale. */
const SCREEN_PICTURE = obj(
  {
    entity: req(TEXT_255),
    attribute: opt(nullable(str(64))),
    state: req(str(128)),
    image: req(PICTURE_IMAGE),
  },
  true
);

const CAR_ENTITY = nullable(str(255));
const CAR = obj({
  device: opt(CAR_ENTITY),
  soc: opt(CAR_ENTITY),
  range: opt(CAR_ENTITY),
  charging: opt(CAR_ENTITY),
  plugged: opt(CAR_ENTITY),
  lock: opt(CAR_ENTITY),
  climate: opt(CAR_ENTITY),
  tracker: opt(CAR_ENTITY),
});

const VEHICLE_TYPE = obj({ state: req(str(64)), vehicle: req(str(96)) }, true);

const WASTE_KINDS = ['rest', 'bio', 'paper', 'plastic', 'glass', 'garden', 'recycling', 'other'];

const FURNITURE = obj({
  id: req(ID),
  type: req(str(96)),
  x: req(COORD),
  z: req(COORD),
  rotation: req(anyNumber),
  w: req(LENGTH),
  d: req(LENGTH),
  h: req(LENGTH),
  variant: req(nullable(str(32))),
  name: opt(nullable(str(60))),
  show_name: opt(bool),
  glow_scale: opt(nullable(num(0.1, 1.5))),
  entity: opt(NULL_TEXT_255),
  power: opt(NULL_TEXT_255),
  door_left: opt(NULL_TEXT_255),
  door_right: opt(NULL_TEXT_255),
  soc: opt(NULL_TEXT_255),
  charge: opt(NULL_TEXT_255),
  export: opt(NULL_TEXT_255),
  holo: opt(bool),
  plant_card: opt(bool),
  plant_right: opt(num(-30, 30)),
  plant_up: opt(num(-30, 30)),
  status: opt(NULL_TEXT_255),
  room_sensor: opt(NULL_TEXT_255),
  confirm: opt(bool),
  marker: opt(nullable(oneOf(['always', 'no_power', 'never']))),
  icon: opt(nullable(str(64))),
  mount_y: opt(nullable(num(0, 10))),
  state_entity: opt(NULL_TEXT_255),
  state_entity2: opt(NULL_TEXT_255),
  state_split: opt(nullable(oneOf(['left_right', 'top_bottom']))),
  color_entity: opt(NULL_TEXT_255),
  mirror: opt(bool),
  awning_pitch: opt(nullable(num(0, 80))),
  awning_valance: opt(bool),
  awning_position: opt(NULL_TEXT_255),
  awning_time: opt(nullable(num(2, 300))),
  awning_invert: opt(bool),
  bin_kind: opt(nullable(oneOf(WASTE_KINDS))),
  bin_color: opt(nullable(HEX_COLOR)),
  bin_lid: opt(nullable(HEX_COLOR)),
  bin_source: opt(NULL_TEXT_255),
  bin_match: opt(nullable(str(120))),
  mailbox_door: opt(NULL_TEXT_255),
  moisture: opt(NULL_TEXT_255),
  moisture_min: opt(nullable(num(0, 100))),
  remaining: opt(NULL_TEXT_255),
  service: opt(NULL_TEXT_255),
  service_min: opt(nullable(num(0, 1000))),
  door_alarm: opt(nullable(num(0.5, 120))),
  tilt: opt(num(-90, 90)),
  upright: opt(bool),
  pictures: opt(list(SCREEN_PICTURE, 20)),
  screen_bg: opt(oneOf(['black', 'white'])),
  vehicle: opt(nullable(str(96))),
  valve_position: opt(
    nullable(oneOf(['filter', 'backwash', 'rinse', 'waste', 'recirculate', 'closed']))
  ),
  valve_open: opt(nullable(bool)),
  car: opt(nullable(CAR)),
  scale: opt(num(0.2, 2)),
  type_entity: opt(NULL_TEXT_255),
  types: opt(list(VEHICLE_TYPE, 20)),
  group: opt(nullable(str(64))),
  locked: opt(nullable(bool)),
});

const PLACEMENT = obj({
  entity_id: req(TEXT_255),
  x: req(COORD),
  z: req(COORD),
  y: req(nullable(LENGTH)),
  mount: opt(nullable(oneOf(['ceiling', 'floor', 'table', 'wall']))),
  pin: opt(bool),
  rotation: opt(anyNumber),
  fov: opt(nullable(num(10, 360))),
  reach: opt(nullable(num(0.5, 50))),
  tilt: opt(nullable(num(0, 90))),
  confirm: opt(bool),
  marker: opt(nullable(oneOf(['always', 'no_power', 'never']))),
  icon: opt(nullable(str(64))),
  name: opt(nullable(str(60))),
  show_name: opt(bool),
  glow_scale: opt(nullable(num(0.1, 1.5))),
  holo: opt(bool),
  cone: opt(nullable(bool)),
  detect_pins: opt(nullable(bool)),
  locked: opt(nullable(bool)),
});

/** Sfondo: `image_id` è l'id di un'immagine salvata (mai un indirizzo: la regex lo esclude). */
const BACKGROUND = obj({
  image_id: req(ID),
  x: req(COORD),
  z: req(COORD),
  width: req(num(0.1, 1000)),
  opacity: req(num(0, 1)),
  rotation: opt(num(-360, 360)),
});

// ---------------------------------------------------------------------------- piscina e aree esterne

const POOL_ENTITY = nullable(str(255));

const POOL_PORT = obj({
  id: req(str(80)),
  kind: req(oneOf(['skimmer', 'drain', 'inlet', 'waste'])),
  x: req(anyNumber),
  z: req(anyNumber),
  depth: opt(nullable(num(0, 5))),
});
const POOL_FITTING = obj({
  id: req(str(80)),
  kind: req(oneOf(['valve', 'sight'])),
  at: req(num(0, 1000)),
  open: opt(bool),
});
const POOL_PIPE = obj({
  id: req(str(80)),
  from: req(str(120)),
  to: req(str(120)),
  floor_id: req(str(80)),
  points: opt(list(FREE_POINT, 80)),
  height: opt(nullable(num(-5, 10))),
  heights: opt(nullable(list(nullable(num(-5, 10)), 80))),
  fittings: opt(nullable(list(POOL_FITTING, 40))),
});
const POOL_JOINT = obj({
  id: req(str(80)),
  x: req(anyNumber),
  z: req(anyNumber),
  y: req(num(-5, 10)),
  kind: opt(nullable(oneOf(['tee', 'y', 'wall', 'floor']))),
  name: opt(nullable(str(60))),
  nx: opt(nullable(anyNumber)),
  nz: opt(nullable(anyNumber)),
  depth: opt(nullable(num(0, 2))),
});
const POOL = obj({
  temperature: opt(POOL_ENTITY),
  heater: opt(POOL_ENTITY),
  pump: opt(POOL_ENTITY),
  light: opt(POOL_ENTITY),
  ph: opt(POOL_ENTITY),
  chlorine: opt(POOL_ENTITY),
  cover: opt(POOL_ENTITY),
  ports: opt(list(POOL_PORT, 40)),
  pipes: opt(list(POOL_PIPE, 80)),
  joints: opt(list(POOL_JOINT, 80)),
});

const OUTDOOR_TYPES = [
  'lawn',
  'terrace',
  'path',
  'driveway',
  'pool',
  'bed',
  'wild',
  'hedge',
  'fence',
  'pergola',
  'balcony',
];

const OUTDOOR = obj({
  id: req(ID),
  type: req(oneOf(OUTDOOR_TYPES)),
  points: req(list(FREE_POINT, MAX_POINTS, 3)),
  height: opt(nullable(num(0.1, 6))),
  outline: opt(bool),
  offset: opt(nullable(num(-10, 10))),
  slope: opt(nullable(num(0, 20))),
  slope_dir: opt(oneOf(['x', '-x', 'z', '-z'])),
  open: opt(bool),
  bracing: opt(bool),
  cut: opt(bool),
  pool_shape: opt(nullable(oneOf(['round', 'oval']))),
  above: opt(bool),
  depth: opt(nullable(num(0, 5))),
  rim: opt(nullable(num(-0.5, 2))),
  pool: opt(nullable(POOL)),
  name: opt(nullable(str(80))),
  area_id: opt(NULL_TEXT_255),
  panel: opt(list(TEXT_255, 100)),
  hidden: opt(list(TEXT_255, 200)),
  no_state: opt(list(TEXT_255, 200)),
});

// ---------------------------------------------------------------------------- tetto, solare, cavi

const ROOF_SECTION = obj({
  id: req(ID),
  x0: req(COORD),
  z0: req(COORD),
  x1: req(COORD),
  z1: req(COORD),
  shape: opt(oneOf(['gable', 'hip', 'halfhip', 'pyramid', 'mansard', 'pent', 'flat', 'parapet'])),
  axis: opt(oneOf(['x', 'z'])),
  eave_a: req(HEIGHT),
  eave_b: req(HEIGHT),
  pitch_a: opt(num(0, 80)),
  pitch_b: opt(num(0, 80)),
  base: req(HEIGHT),
  overhang: opt(nullable(num(0, 2))),
  flip: opt(bool),
  points: opt(nullable(list(FREE_POINT, MAX_POINTS, 3))),
  dormer: opt(bool),
  locked: opt(bool),
  open: opt(bool),
});

const SOLAR_FIELD = obj({
  id: req(ID),
  face: req(str(80)),
  u: req(num(-50, 200)),
  v: req(num(-50, 200)),
  rows: req(int(1, 40)),
  cols: req(int(1, 60)),
  portrait: opt(bool),
  tilt: opt(nullable(num(0, 90))),
  flip: opt(bool),
  entity: opt(NULL_TEXT_255),
  name: opt(nullable(str(80))),
  layout: opt(nullable(list(int(0, 60), 40))),
  align: opt(nullable(oneOf(['left', 'center', 'right']))),
  skip: opt(nullable(list(str(12), 2400))),
  look: opt(nullable(oneOf(['black', 'blue']))),
  module_w: opt(nullable(num(0.3, 3))),
  module_h: opt(nullable(num(0.3, 3))),
  wp: opt(nullable(num(50, 1500))),
  string: opt(nullable(ID)),
  rotation: opt(nullable(num(-360, 360))),
  base: opt(nullable(num(0, 60))),
  locked: opt(bool),
});

const SOLAR_STRING = obj({
  id: req(ID),
  name: req(str(80)),
  entity: opt(NULL_TEXT_255),
  inverter: opt(nullable(ID)),
});

const ROOF_WINDOW = obj({
  id: req(ID),
  face: req(str(80)),
  u: req(num(-50, 200)),
  v: req(num(-50, 200)),
  w: opt(nullable(num(0.3, 4))),
  h: opt(nullable(num(0.3, 4))),
  cover: opt(ENTITY_REF),
  contact: opt(ENTITY_REF),
  tilt: opt(ENTITY_REF),
  window: opt(ENTITY_REF),
  name: opt(nullable(str(64))),
  locked: opt(bool),
  float: opt(bool),
});

const CABLE = obj({
  id: req(str(80)),
  floor_id: req(ID),
  points: req(list(FREE_POINT, 60, 1)),
  height: opt(num(0, 30)),
  locked: opt(bool),
});

const HOLOGRAM = obj({
  place: opt(oneOf(['field', 'free'])),
  field: opt(nullable(ID)),
  x: opt(num(-500, 500)),
  z: opt(num(-500, 500)),
  height: opt(num(0, 60)),
  size: opt(num(0.3, 3)),
  right: opt(num(-30, 30)),
  up: opt(num(-30, 30)),
  mirror: opt(bool),
  device_house: opt(bool),
  device_room: opt(bool),
  plant_floor: opt(bool),
  device_min_w: opt(num(0, 100000)),
});

const ROOF = obj({
  type: opt(oneOf(['none', 'flat', 'gable', 'custom'])),
  sections: opt(list(ROOF_SECTION, 64)),
  solar: opt(list(SOLAR_FIELD, 32)),
  strings: opt(list(SOLAR_STRING, 16)),
  windows: opt(list(ROOF_WINDOW, 32)),
  hologram: opt(nullable(HOLOGRAM)),
  cables: opt(list(CABLE, 64)),
  pitch: opt(num(5, 60)),
  overhang: opt(num(0, 2)),
  ridge: opt(nullable(oneOf(['long', 'short']))),
});

const FREE_WALL = obj({
  id: req(ID),
  a: req(FREE_POINT),
  b: req(FREE_POINT),
  thickness: opt(nullable(num(0.02, 1))),
  height: opt(nullable(num(0.05, 20))),
});

// ---------------------------------------------------------------------------- piano, impostazioni

const FLOOR = obj({
  id: req(ID),
  name: req(NAME),
  elevation: req(num(-100, 500)),
  height: req(num(1, 20)),
  cut_height: req(num(0.2, 20)),
  rooms: req(list(ROOM, MAX_ROOMS)),
  openings: req(list(OPENING, MAX_ITEMS)),
  furniture: req(list(FURNITURE, MAX_ITEMS)),
  placements: req(list(PLACEMENT, MAX_ITEMS)),
  background: req(nullable(BACKGROUND)),
  outdoor: opt(list(OUTDOOR, MAX_ITEMS)),
  walls: opt(list(FREE_WALL, MAX_ITEMS)),
  ha_floor: opt(NULL_TEXT_255),
  start_view: opt(nullable(START_VIEW)),
});

const MEDIA_PRESET = obj({
  id: req(str(64, 1)),
  label: req(str(60)),
  type: req(str(40)),
  content: req(str(500)),
});

const BUTTON = obj({
  id: req(str(64, 1)),
  label: req(str(60)),
  icon: opt(nullable(str(64))),
  action: req(oneOf(['navigate', 'more_info', 'service', 'fire_dom_event'])),
  target: opt(NULL_TEXT_255),
  data: opt(nullable(plainObject)),
});

const PET = obj({
  id: req(str(64, 1)),
  kind: req(oneOf(['cat', 'dog', 'rabbit'])),
  name: opt(str(30)),
  fur: opt(str(20)),
  breed: opt(nullable(str(20))),
  floor_id: opt(nullable(str(64))),
});

const SETTINGS = obj({
  wall_exterior: req(num(0.02, 1)),
  wall_interior: req(num(0.02, 1)),
  grid: req(num(0.01, 1)),
  north: opt(num(-360, 360)),
  units: opt(nullable(oneOf(['metric', 'imperial']))),
  lock_plan: opt(bool),
  media_presets: opt(list(MEDIA_PRESET, 30)),
  buttons: opt(list(BUTTON, 20)),
  favorites: opt(list(TEXT_255, 40)),
  start_view: opt(nullable(START_VIEW)),
  roof: opt(ROOF),
  weather_entity: opt(NULL_TEXT_255),
  rain_warning: opt(bool),
  rain_entity: opt(NULL_TEXT_255),
  alert_names: opt(bool),
  outage_entity: opt(NULL_TEXT_255),
  sun_patches: opt(bool),
  household: opt(
    nullable(
      obj({
        bin_from: opt(nullable(num(0, 24))),
        bin_until: opt(nullable(num(0, 24))),
      })
    )
  ),
  director: opt(
    nullable(
      obj({
        doorbell: opt(bool),
        doorbell_entity: opt(NULL_TEXT_255),
        doorbell_camera: opt(NULL_TEXT_255),
        motion: opt(oneOf(['off', 'person', 'all'])),
        appliances: opt(bool),
        alerts: opt(bool),
        hold: opt(nullable(num(10, 600))),
      })
    )
  ),
  halloween: opt(nullable(obj({ ghost: opt(bool) }))),
  terrain: opt(nullable(obj({ level: opt(nullable(num(-20, 20))), earth: opt(bool) }))),
  weather_effects: opt(
    nullable(list(oneOf(['rain', 'snow', 'fog', 'clouds', 'lightning', 'sky']), Number.MAX_SAFE_INTEGER))
  ),
  pets: opt(nullable(obj({ on: opt(bool), list: opt(list(PET, 8)) }))),
});

const METER = obj({ floor_id: req(ID), x: req(COORD), z: req(COORD) });

const ENERGY = obj({
  meter: opt(nullable(METER)),
  grid: opt(NULL_TEXT_255),
  grid_invert: opt(bool),
  solar: opt(NULL_TEXT_255),
  battery: opt(NULL_TEXT_255),
  battery_invert: opt(bool),
  battery_soc: opt(NULL_TEXT_255),
  consumption: opt(NULL_TEXT_255),
  tariff: opt(NULL_TEXT_255),
  gas: opt(NULL_TEXT_255),
  water: opt(NULL_TEXT_255),
});

const PRESENCE = obj({ person: req(TEXT_255), sensor: req(NULL_TEXT_255) });

const BUILDING = obj({
  version: req((value, path) => (value === 1 ? null : fail(path, 'must be 1'))),
  floors: req(list(FLOOR, MAX_FLOORS)),
  settings: req(SETTINGS),
  energy: opt(ENERGY),
  presence: opt(list(PRESENCE, 50)),
});

/** Primo errore del piano, oppure null se rispetta lo schema. */
export const checkBuilding = (building: unknown): string | null => BUILDING(building, 'building');

// ---------------------------------------------------------------------------- immagini del piano

/** Id delle immagini salvate che il piano usa: gli sfondi dei piani e le immagini delle regole degli schermi. */
export const referencedImageIds = (building: unknown): Set<string> => {
  const ids = new Set<string>();
  if (!isRecord(building) || !Array.isArray(building.floors)) return ids;
  for (const floor of building.floors) {
    if (!isRecord(floor)) continue;
    if (isRecord(floor.background) && typeof floor.background.image_id === 'string') {
      ids.add(floor.background.image_id);
    }
    if (!Array.isArray(floor.furniture)) continue;
    for (const item of floor.furniture) {
      if (!isRecord(item) || !Array.isArray(item.pictures)) continue;
      for (const rule of item.pictures) {
        if (isRecord(rule) && typeof rule.image === 'string' && rule.image !== '' && !rule.image.startsWith('camera:')) {
          ids.add(rule.image);
        }
      }
    }
  }
  return ids;
};

/** Piani, stanze e mobili di un piano già validato (per l'elenco dei punti di ripristino). */
export const summarizeBuilding = (
  building: unknown
): { floors: number; rooms: number; furniture: number } => {
  const floors = isRecord(building) && Array.isArray(building.floors) ? building.floors : [];
  let rooms = 0;
  let furniture = 0;
  for (const floor of floors) {
    if (!isRecord(floor)) continue;
    rooms += Array.isArray(floor.rooms) ? floor.rooms.length : 0;
    furniture += Array.isArray(floor.furniture) ? floor.furniture.length : 0;
  }
  return { floors: floors.length, rooms, furniture };
};

/** Piano vuoto, come `empty_building()` dell'originale. */
export const emptyBuilding = (): Record<string, unknown> => ({
  version: 1,
  floors: [],
  settings: { wall_exterior: 0.24, wall_interior: 0.12, grid: 0.05 },
  energy: {
    meter: null,
    grid: null,
    grid_invert: false,
    solar: null,
    battery: null,
    battery_invert: false,
    battery_soc: null,
    consumption: null,
    tariff: null,
    gas: null,
    water: null,
  },
  presence: [],
});
