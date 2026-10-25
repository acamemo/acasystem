/**
 * Adapter puro tra entità reali Home Assistant e modello delle Capability del kit adattivo.
 * Converte supported_features, attributi e stato in capacità effettive (evitando controlli fantasma)
 * e risolve i comandi nei rispettivi servizi Home Assistant. (ISSUE-064 / Fase 1)
 */
import type { EntityLike } from '@/@types/ha';
import type {
  Capability,
  DeviceProfile,
  SampleValue,
  SampleValues,
} from '@/components/widgets/adaptive/widgetDesignModel';

// Feature bits Home Assistant standard
export const HA_FEATURES = {
  // Light
  LIGHT_BRIGHTNESS: 1,
  LIGHT_COLOR_TEMP: 2,
  LIGHT_EFFECT: 4,
  LIGHT_FLASH: 8,
  LIGHT_COLOR: 16,
  LIGHT_TRANSITION: 32,

  // Climate
  CLIMATE_TARGET_TEMPERATURE: 1,
  CLIMATE_TARGET_TEMPERATURE_RANGE: 2,
  CLIMATE_TARGET_HUMIDITY: 4,
  CLIMATE_FAN_MODE: 8,
  CLIMATE_PRESET_MODE: 16,
  CLIMATE_SWING_MODE: 32,
  CLIMATE_TURN_OFF: 128,
  CLIMATE_TURN_ON: 256,

  // Cover
  COVER_OPEN: 1,
  COVER_CLOSE: 2,
  COVER_SET_POSITION: 4,
  COVER_STOP: 8,
  COVER_OPEN_TILT: 16,
  COVER_CLOSE_TILT: 32,
  COVER_STOP_TILT: 64,
  COVER_SET_TILT_POSITION: 128,

  // Lock
  LOCK_OPEN: 1,

  // Media Player
  MEDIA_PAUSE: 1,
  MEDIA_SEEK: 2,
  MEDIA_VOLUME_SET: 4,
  MEDIA_VOLUME_MUTE: 8,
  MEDIA_PREVIOUS_TRACK: 16,
  MEDIA_NEXT_TRACK: 32,
  MEDIA_TURN_ON: 128,
  MEDIA_TURN_OFF: 256,
  MEDIA_PLAY_MEDIA: 512,
  MEDIA_SELECT_SOURCE: 2048,
  MEDIA_STOP: 4096,
  MEDIA_CLEAR_PLAYLIST: 8192,
  MEDIA_PLAY: 16384,
  MEDIA_SHUFFLE_SET: 32768,
  MEDIA_SELECT_SOUND_MODE: 65536,
  MEDIA_REPEAT_SET: 262144,
  MEDIA_GROUPING: 524288,

  // Fan
  FAN_SET_SPEED: 1,
  FAN_OSCILLATE: 2,
  FAN_DIRECTION: 4,
  FAN_PRESET_MODE: 8,
  FAN_TURN_OFF: 16,
  FAN_TURN_ON: 32,

  // Vacuum
  VACUUM_TURN_ON: 1,
  VACUUM_TURN_OFF: 2,
  VACUUM_PAUSE: 4,
  VACUUM_STOP: 8,
  VACUUM_RETURN_HOME: 16,
  VACUUM_FAN_SPEED: 32,
  VACUUM_BATTERY: 64,
  VACUUM_STATUS: 128,
  VACUUM_LOCATE: 512,
  VACUUM_START: 8192,

  // Lawn Mower
  LAWN_MOWER_START_MOWING: 1,
  LAWN_MOWER_PAUSE: 2,
  LAWN_MOWER_DOCK: 4,
} as const;

/** Helper per estrarre maschera supported_features numerica */
export function getFeatures(entity: EntityLike | null | undefined): number {
  const raw = entity?.attributes?.supported_features;
  const num = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(num) ? num : 0;
}

/** Verifica se una maschera di bit contiene la feature desiderata */
export function hasBit(mask: number, bit: number): boolean {
  return (mask & bit) !== 0;
}

/** Inferisce il dominio di un'entità (es. 'light', 'climate', 'media_player') */
export function domainOf(entityId: string | null | undefined): string {
  return entityId?.split('.')[0] ?? '';
}

/** Mappatura dello stato operativo in italiano */
export function translateState(state: string | undefined, domain: string): string {
  if (!state || state === 'unavailable' || state === 'unknown') return 'Non disponibile';
  switch (domain) {
    case 'vacuum':
      switch (state) {
        case 'cleaning':
          return 'Pulizia in corso';
        case 'docked':
          return 'Alla base';
        case 'paused':
          return 'In pausa';
        case 'returning':
          return 'Ritorno alla base';
        case 'idle':
          return 'Fermo';
        case 'error':
          return 'Errore';
        default:
          return state;
      }
    case 'lawn_mower':
    case 'mower':
      switch (state) {
        case 'mowing':
          return 'Taglio in corso';
        case 'docked':
          return 'Alla base';
        case 'paused':
          return 'In pausa';
        case 'returning':
          return 'Ritorno alla base';
        case 'error':
          return 'Errore';
        default:
          return state;
      }
    case 'lock':
      return state === 'locked' ? 'Bloccata' : 'Sbloccata';
    case 'cover':
      return state === 'open' ? 'Aperta' : state === 'closed' ? 'Chiusa' : state;
    case 'media_player':
      return state === 'playing'
        ? 'In riproduzione'
        : state === 'paused'
          ? 'In pausa'
          : state === 'off'
            ? 'Spento'
            : state;
    case 'climate':
      switch (state) {
        case 'heat':
          return 'Caldo';
        case 'cool':
          return 'Freddo';
        case 'auto':
          return 'Auto';
        case 'fan_only':
          return 'Ventola';
        case 'dry':
          return 'Deumidifica';
        case 'off':
          return 'Spento';
        default:
          return state;
      }
    default:
      if (state === 'on') return 'Acceso';
      if (state === 'off') return 'Spento';
      return state;
  }
}

/** Costruisce i profili di capacità per Light */
function lightCapabilities(entity: EntityLike | null | undefined): Capability[] {
  const caps: Capability[] = [];
  const attrs = entity?.attributes ?? {};
  const features = getFeatures(entity);
  const colorModes = Array.isArray(attrs.supported_color_modes)
    ? (attrs.supported_color_modes as string[])
    : [];

  const supportsBrightness =
    hasBit(features, HA_FEATURES.LIGHT_BRIGHTNESS) ||
    colorModes.some((m) =>
      ['brightness', 'hs', 'rgb', 'rgbw', 'rgbww', 'xy', 'color_temp', 'white'].includes(m)
    );

  const supportsColor =
    hasBit(features, HA_FEATURES.LIGHT_COLOR) ||
    colorModes.some((m) => ['hs', 'rgb', 'rgbw', 'rgbww', 'xy'].includes(m));

  const supportsWhite =
    hasBit(features, HA_FEATURES.LIGHT_COLOR_TEMP) || colorModes.includes('color_temp');

  // Toggle principale
  caps.push({
    id: 'power',
    label: 'Accensione luce',
    icon: 'power',
    initial: entity?.state === 'on',
    frequent: true,
    kind: 'toggle',
    on: 'Acceso',
    off: 'Spento',
  });

  // Luminosità
  if (supportsBrightness) {
    const rawBri = Number(attrs.brightness ?? 0);
    const briPct = Math.round((rawBri / 255) * 100);
    caps.push({
      id: 'brightness',
      label: 'Luminosità della luce',
      icon: 'light',
      initial: briPct,
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      frequent: true,
      kind: 'range',
    });
  }

  // Colore (Hue)
  if (supportsColor) {
    const hs = Array.isArray(attrs.hs_color) ? Number(attrs.hs_color[0]) : 0;
    caps.push({
      id: 'hue',
      label: 'Colore della luce',
      icon: 'appearance',
      initial: hs || 0,
      min: 0,
      max: 360,
      step: 1,
      unit: '°',
      frequent: true,
      colour: 'hue',
      kind: 'range',
    });
  }

  // Temperatura colore bianco
  if (supportsWhite) {
    const kelvin =
      typeof attrs.color_temp_kelvin === 'number'
        ? attrs.color_temp_kelvin
        : typeof attrs.color_temp === 'number' && attrs.color_temp > 0
          ? Math.round(1000000 / attrs.color_temp)
          : 3000;
    const minK = Number(attrs.min_color_temp_kelvin ?? 2200);
    const maxK = Number(attrs.max_color_temp_kelvin ?? 6500);
    caps.push({
      id: 'white',
      label: 'Temperatura del bianco',
      icon: 'sun',
      initial: kelvin,
      min: minK,
      max: maxK,
      step: 100,
      unit: 'K',
      frequent: false,
      colour: 'white',
      kind: 'range',
    });
  }

  // Effetti
  if (Array.isArray(attrs.effect_list) && attrs.effect_list.length > 0) {
    caps.push({
      id: 'effect',
      label: 'Effetto',
      icon: 'settings',
      initial: String(attrs.effect ?? attrs.effect_list[0]),
      options: attrs.effect_list as string[],
      frequent: false,
      kind: 'options',
    });
  }

  return caps;
}

/** Costruisce i profili di capacità per Climate */
function climateCapabilities(entity: EntityLike | null | undefined): Capability[] {
  const caps: Capability[] = [];
  const attrs = entity?.attributes ?? {};
  const features = getFeatures(entity);

  // Lettura temperatura corrente
  const currentTemp = Number(attrs.current_temperature ?? 20);
  caps.push({
    id: 'temperature',
    label: 'Temperatura in casa',
    icon: 'activity',
    initial: currentTemp,
    unit: '°C',
    frequent: true,
    kind: 'reading',
  });

  // Target temperature
  if (hasBit(features, HA_FEATURES.CLIMATE_TARGET_TEMPERATURE)) {
    const targetTemp = Number(attrs.temperature ?? 21);
    const minTemp = Number(attrs.min_temp ?? 16);
    const maxTemp = Number(attrs.max_temp ?? 30);
    const step = Number(attrs.target_temp_step ?? 0.5);
    caps.push({
      id: 'target',
      label: 'Temperatura desiderata',
      icon: 'thermostat',
      initial: targetTemp,
      min: minTemp,
      max: maxTemp,
      step,
      unit: '°C',
      frequent: true,
      kind: 'range',
    });
  }

  // Toggle accensione clima
  if (features & 128 && features & 256) {
    caps.push({
      id: 'power',
      label: 'Accensione clima',
      icon: 'power',
      initial: entity?.state !== 'off',
      frequent: true,
      kind: 'toggle',
      on: 'Acceso',
      off: 'Spento',
    });
  }

  // Modalità HVAC
  if (Array.isArray(attrs.hvac_modes) && attrs.hvac_modes.length > 0) {
    caps.push({
      id: 'hvac',
      label: 'Modalità clima',
      icon: 'settings',
      initial: translateState(entity?.state, 'climate'),
      options: (attrs.hvac_modes as string[]).map((m) => translateState(m, 'climate')),
      frequent: true,
      kind: 'options',
    });
  }

  // Fan modes
  if (
    hasBit(features, HA_FEATURES.CLIMATE_FAN_MODE) &&
    Array.isArray(attrs.fan_modes) &&
    attrs.fan_modes.length > 0
  ) {
    caps.push({
      id: 'fan',
      label: 'Ventola',
      icon: 'fan',
      initial: String(attrs.fan_mode ?? attrs.fan_modes[0]),
      options: attrs.fan_modes as string[],
      frequent: false,
      kind: 'options',
    });
  }

  // Presets
  if (
    hasBit(features, HA_FEATURES.CLIMATE_PRESET_MODE) &&
    Array.isArray(attrs.preset_modes) &&
    attrs.preset_modes.length > 0
  ) {
    caps.push({
      id: 'preset',
      label: 'Preset',
      icon: 'settings',
      initial: String(attrs.preset_mode ?? attrs.preset_modes[0]),
      options: attrs.preset_modes as string[],
      frequent: false,
      kind: 'options',
    });
  }

  // Humidity target
  if (hasBit(features, HA_FEATURES.CLIMATE_TARGET_HUMIDITY)) {
    caps.push({
      id: 'humidity',
      label: 'Umidità desiderata',
      icon: 'humidity',
      initial: Number(attrs.humidity ?? attrs.target_humidity ?? 50),
      min: Number(attrs.min_humidity ?? 30),
      max: Number(attrs.max_humidity ?? 99),
      step: 1,
      unit: '%',
      frequent: false,
      kind: 'range',
    });
  }

  return caps;
}

/** Costruisce i profili di capacità per Cover (tapparelle, tende) */
function coverCapabilities(entity: EntityLike | null | undefined): Capability[] {
  const caps: Capability[] = [];
  const attrs = entity?.attributes ?? {};
  const features = getFeatures(entity);

  const supportsSetPos = hasBit(features, HA_FEATURES.COVER_SET_POSITION);
  const currentPos = Number(attrs.current_position ?? (entity?.state === 'open' ? 100 : 0));

  if (supportsSetPos) {
    caps.push({
      id: 'position',
      label: 'Apertura tapparella',
      icon: 'blinds',
      initial: currentPos,
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      frequent: true,
      kind: 'range',
    });
  }

  if (hasBit(features, HA_FEATURES.COVER_OPEN)) {
    caps.push({
      id: 'open',
      label: 'Apri tapparella',
      icon: 'chevronUp',
      message: 'Tapparella aperta',
      frequent: true,
      kind: 'action',
      update: { id: 'position', value: 100 },
    });
  }

  if (hasBit(features, HA_FEATURES.COVER_STOP)) {
    caps.push({
      id: 'stop',
      label: 'Ferma tapparella',
      icon: 'stop',
      message: 'Tapparella fermata',
      frequent: true,
      kind: 'action',
    });
  }

  if (hasBit(features, HA_FEATURES.COVER_CLOSE)) {
    caps.push({
      id: 'close',
      label: 'Chiudi tapparella',
      icon: 'chevronDown',
      message: 'Tapparella chiusa',
      frequent: true,
      kind: 'action',
      update: { id: 'position', value: 0 },
    });
  }

  // Tilt (inclinazione lamelle)
  if (hasBit(features, HA_FEATURES.COVER_SET_TILT_POSITION)) {
    caps.push({
      id: 'tilt',
      label: 'Inclinazione lamelle',
      icon: 'blinds',
      initial: Number(attrs.current_tilt_position ?? 50),
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      frequent: false,
      kind: 'range',
    });
  }

  return caps;
}

/** Costruisce i profili di capacità per Lock */
function lockCapabilities(entity: EntityLike | null | undefined): Capability[] {
  const caps: Capability[] = [];
  const attrs = entity?.attributes ?? {};
  const features = getFeatures(entity);

  caps.push({
    id: 'locked',
    label: 'Serratura',
    icon: 'lock',
    initial: entity?.state === 'locked',
    frequent: true,
    kind: 'toggle',
    on: 'Bloccata',
    off: 'Sbloccata',
  });

  if (hasBit(features, HA_FEATURES.LOCK_OPEN)) {
    caps.push({
      id: 'open',
      label: 'Apri lo scrocco',
      icon: 'unlock',
      message: 'Scrocco aperto',
      frequent: false,
      kind: 'action',
      update: { id: 'locked', value: false },
    });
  }

  if (attrs.battery_level !== undefined) {
    caps.push({
      id: 'battery',
      label: 'Batteria',
      icon: 'activity',
      initial: Number(attrs.battery_level),
      unit: '%',
      frequent: false,
      kind: 'reading',
    });
  }

  return caps;
}

/** Costruisce i profili di capacità per Media Player / Sonos */
function mediaCapabilities(entity: EntityLike | null | undefined, isSonos = false): Capability[] {
  const caps: Capability[] = [];
  const attrs = entity?.attributes ?? {};
  const features = getFeatures(entity);

  const title = String(attrs.media_title ?? '');
  const artist = String(attrs.media_artist ?? '');
  const trackLabel = title ? (artist ? `${artist} - ${title}` : title) : 'Nessun brano';

  caps.push({
    id: 'track',
    label: 'Brano',
    icon: isSonos ? 'speaker' : 'music',
    initial: trackLabel,
    frequent: true,
    kind: 'reading',
  });

  if (
    hasBit(features, HA_FEATURES.MEDIA_TURN_ON) ||
    hasBit(features, HA_FEATURES.MEDIA_TURN_OFF) ||
    entity?.state === 'off' ||
    entity?.state === 'on' ||
    entity?.state === 'playing' ||
    entity?.state === 'paused' ||
    entity?.state === 'idle'
  ) {
    caps.push({
      id: 'power',
      label: 'Accensione',
      icon: 'power',
      initial: entity?.state !== 'off',
      frequent: true,
      kind: 'toggle',
      on: 'Acceso',
      off: 'Spento',
    });
  }

  if (hasBit(features, HA_FEATURES.MEDIA_PLAY) || hasBit(features, HA_FEATURES.MEDIA_PAUSE)) {
    caps.push({
      id: 'playing',
      label: 'Riproduzione',
      icon: 'play',
      initial: entity?.state === 'playing',
      frequent: true,
      kind: 'toggle',
      on: 'In riproduzione',
      off: 'In pausa',
    });
  }

  if (hasBit(features, HA_FEATURES.MEDIA_VOLUME_SET)) {
    const volPct = Math.round(Number(attrs.volume_level ?? 0) * 100);
    caps.push({
      id: 'volume',
      label: 'Volume',
      icon: 'volume',
      initial: volPct,
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      frequent: true,
      kind: 'range',
    });
  }

  if (hasBit(features, HA_FEATURES.MEDIA_PREVIOUS_TRACK)) {
    caps.push({
      id: 'previous',
      label: 'Brano precedente',
      icon: 'previous',
      message: 'Brano precedente',
      frequent: true,
      kind: 'action',
    });
  }

  if (hasBit(features, HA_FEATURES.MEDIA_NEXT_TRACK)) {
    caps.push({
      id: 'next',
      label: 'Brano successivo',
      icon: 'next',
      message: 'Brano successivo',
      frequent: true,
      kind: 'action',
    });
  }

  if (hasBit(features, HA_FEATURES.MEDIA_STOP)) {
    caps.push({
      id: 'stop',
      label: 'Ferma la riproduzione',
      icon: 'stop',
      message: 'Riproduzione fermata',
      frequent: false,
      kind: 'action',
      update: { id: 'playing', value: false },
    });
  }

  if (hasBit(features, HA_FEATURES.MEDIA_VOLUME_MUTE)) {
    caps.push({
      id: 'mute',
      label: 'Audio silenziato',
      icon: 'mute',
      initial: Boolean(attrs.is_volume_muted),
      frequent: false,
      kind: 'toggle',
      on: 'Silenziato',
      off: 'Attivo',
    });
  }

  if (hasBit(features, HA_FEATURES.MEDIA_SHUFFLE_SET)) {
    caps.push({
      id: 'shuffle',
      label: 'Riproduzione casuale',
      icon: 'music',
      initial: Boolean(attrs.shuffle),
      frequent: false,
      kind: 'toggle',
      on: 'Casuale attiva',
      off: 'Normale',
    });
  }

  if (
    hasBit(features, HA_FEATURES.MEDIA_SELECT_SOURCE) &&
    Array.isArray(attrs.source_list) &&
    attrs.source_list.length > 0
  ) {
    caps.push({
      id: 'source',
      label: 'Sorgente',
      icon: 'settings',
      initial: String(attrs.source ?? attrs.source_list[0]),
      options: attrs.source_list as string[],
      frequent: false,
      kind: 'options',
    });
  }

  return caps;
}

/** Costruisce i profili di capacità per TV (Android TV / Apple TV) */
function tvCapabilities(entity: EntityLike | null | undefined, targetType: string): Capability[] {
  const caps: Capability[] = [];
  const attrs = entity?.attributes ?? {};
  const features = getFeatures(entity);

  const title = String(attrs.media_title ?? '');
  const app = String(attrs.app_name ?? '');
  const contentLabel = title ? (app ? `${app}: ${title}` : title) : app || 'Nessun contenuto';

  caps.push({
    id: 'programme',
    label: 'Contenuto',
    icon: targetType === 'appletv' ? 'play' : 'tv',
    initial: contentLabel,
    frequent: true,
    kind: 'reading',
  });

  caps.push({
    id: 'power',
    label: 'Accensione TV',
    icon: 'power',
    initial: entity?.state !== 'off' && entity?.state !== 'standby',
    frequent: true,
    kind: 'toggle',
    on: 'Acceso',
    off: 'Spento',
  });

  if (
    hasBit(features, HA_FEATURES.MEDIA_PLAY) ||
    hasBit(features, HA_FEATURES.MEDIA_PAUSE) ||
    entity?.state === 'playing' ||
    entity?.state === 'paused'
  ) {
    caps.push({
      id: 'playing',
      label: 'Riproduzione TV',
      icon: 'play',
      initial: entity?.state === 'playing',
      frequent: true,
      kind: 'toggle',
      on: 'In riproduzione',
      off: 'In pausa',
    });
  }

  if (hasBit(features, HA_FEATURES.MEDIA_VOLUME_SET)) {
    const volPct = Math.round(Number(attrs.volume_level ?? 0) * 100);
    caps.push({
      id: 'volume',
      label: 'Volume TV',
      icon: 'volume',
      initial: volPct,
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      frequent: true,
      kind: 'range',
    });
  }

  if (hasBit(features, HA_FEATURES.MEDIA_VOLUME_MUTE)) {
    caps.push({
      id: 'mute',
      label: 'Audio silenziato',
      icon: 'mute',
      initial: Boolean(attrs.is_volume_muted),
      frequent: false,
      kind: 'toggle',
      on: 'Silenziato',
      off: 'Attivo',
    });
  }

  if (
    hasBit(features, HA_FEATURES.MEDIA_SELECT_SOURCE) &&
    Array.isArray(attrs.source_list) &&
    attrs.source_list.length > 0
  ) {
    caps.push({
      id: 'source',
      label: 'Sorgente o app',
      icon: 'settings',
      initial: String(attrs.source ?? attrs.source_list[0]),
      options: attrs.source_list as string[],
      frequent: false,
      kind: 'options',
    });
  }

  if (hasBit(features, HA_FEATURES.MEDIA_STOP)) {
    caps.push({
      id: 'stop',
      label: 'Ferma la TV',
      icon: 'stop',
      message: 'Riproduzione fermata',
      frequent: false,
      kind: 'action',
      update: { id: 'playing', value: false },
    });
  }

  return caps;
}

/** Costruisce i profili di capacità per Fan */
function fanCapabilities(entity: EntityLike | null | undefined): Capability[] {
  const caps: Capability[] = [];
  const attrs = entity?.attributes ?? {};
  const features = getFeatures(entity);

  if (features & 16 && features & 32) {
    caps.push({
      id: 'power',
      label: 'Accensione ventilatore',
      icon: 'power',
      initial: entity?.state === 'on',
      frequent: true,
      kind: 'toggle',
      on: 'Acceso',
      off: 'Spento',
    });
  }

  if (hasBit(features, HA_FEATURES.FAN_SET_SPEED)) {
    caps.push({
      id: 'speed',
      label: 'Velocità del ventilatore',
      icon: 'fan',
      initial: Number(attrs.percentage ?? 0),
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      frequent: true,
      kind: 'range',
    });
  }

  if (hasBit(features, HA_FEATURES.FAN_OSCILLATE)) {
    caps.push({
      id: 'oscillation',
      label: 'Oscillazione',
      icon: 'fan',
      initial: Boolean(attrs.oscillating),
      frequent: false,
      kind: 'toggle',
      on: 'Attiva',
      off: 'Ferma',
    });
  }

  return caps;
}

/** Costruisce i profili di capacità per Vacuum */
function vacuumCapabilities(entity: EntityLike | null | undefined): Capability[] {
  const caps: Capability[] = [];
  const attrs = entity?.attributes ?? {};
  const features = getFeatures(entity);

  caps.push({
    id: 'state',
    label: 'Stato robot',
    icon: 'activity',
    initial: translateState(entity?.state, 'vacuum'),
    frequent: true,
    kind: 'reading',
  });

  if (hasBit(features, HA_FEATURES.VACUUM_START)) {
    caps.push({
      id: 'start',
      label: 'Avvia pulizia',
      icon: 'play',
      message: 'Pulizia avviata',
      frequent: true,
      kind: 'action',
      update: { id: 'state', value: 'Pulizia in corso' },
    });
  }

  if (hasBit(features, HA_FEATURES.VACUUM_PAUSE)) {
    caps.push({
      id: 'pause',
      label: 'Pausa pulizia',
      icon: 'pause',
      message: 'Pulizia sospesa',
      frequent: true,
      kind: 'action',
      update: { id: 'state', value: 'In pausa' },
    });
  }

  if (hasBit(features, HA_FEATURES.VACUUM_RETURN_HOME)) {
    caps.push({
      id: 'dock',
      label: 'Torna alla base',
      icon: 'home',
      message: 'Ritorno alla base',
      frequent: true,
      kind: 'action',
      update: { id: 'state', value: 'Ritorno alla base' },
    });
  }

  if (attrs.battery_level !== undefined) {
    caps.push({
      id: 'battery',
      label: 'Batteria',
      icon: 'activity',
      initial: Number(attrs.battery_level),
      unit: '%',
      frequent: false,
      kind: 'reading',
    });
  }

  return caps;
}

/** Costruisce i profili di capacità per Lawn Mower / Tosaerba */
function mowerCapabilities(entity: EntityLike | null | undefined): Capability[] {
  const caps: Capability[] = [];
  const attrs = entity?.attributes ?? {};
  const features = getFeatures(entity);

  caps.push({
    id: 'state',
    label: 'Stato tosaerba',
    icon: 'activity',
    initial: translateState(entity?.state, 'mower'),
    frequent: true,
    kind: 'reading',
  });

  if (hasBit(features, HA_FEATURES.LAWN_MOWER_START_MOWING)) {
    caps.push({
      id: 'start',
      label: 'Avvia taglio',
      icon: 'play',
      message: 'Taglio avviato',
      frequent: true,
      kind: 'action',
      update: { id: 'state', value: 'Taglio in corso' },
    });
  }

  if (hasBit(features, HA_FEATURES.LAWN_MOWER_PAUSE)) {
    caps.push({
      id: 'pause',
      label: 'Pausa taglio',
      icon: 'pause',
      message: 'Taglio sospeso',
      frequent: true,
      kind: 'action',
      update: { id: 'state', value: 'In pausa' },
    });
  }

  if (hasBit(features, HA_FEATURES.LAWN_MOWER_DOCK)) {
    caps.push({
      id: 'dock',
      label: 'Torna alla base',
      icon: 'home',
      message: 'Ritorno alla base',
      frequent: true,
      kind: 'action',
      update: { id: 'state', value: 'Ritorno alla base' },
    });
  }

  if (attrs.battery_level !== undefined) {
    caps.push({
      id: 'battery',
      label: 'Batteria',
      icon: 'battery',
      initial: Number(attrs.battery_level),
      unit: '%',
      frequent: false,
      kind: 'reading',
    });
  }

  return caps;
}

/** Costruisce i profili di capacità per Car / Veicolo elettrico */
function carCapabilities(entity: EntityLike | null | undefined): Capability[] {
  const caps: Capability[] = [];
  const attrs = entity?.attributes ?? {};

  const battery = attrs.battery_level ?? entity?.state;
  caps.push({
    id: 'battery',
    label: 'Batteria auto',
    icon: 'battery',
    initial: typeof battery === 'number' || /^\d+$/.test(String(battery)) ? Number(battery) : 65,
    unit: '%',
    frequent: true,
    kind: 'reading',
  });

  if (attrs.range !== undefined || attrs.battery_range !== undefined) {
    caps.push({
      id: 'range',
      label: 'Autonomia residua',
      icon: 'car',
      initial: Number(attrs.range ?? attrs.battery_range),
      unit: 'km',
      frequent: true,
      kind: 'reading',
    });
  }

  if (attrs.charging !== undefined || attrs.charging_status !== undefined) {
    caps.push({
      id: 'charging',
      label: 'Ricarica',
      icon: 'energy',
      initial: Boolean(attrs.charging ?? attrs.charging_status === 'Charging'),
      frequent: true,
      kind: 'toggle',
      on: 'Attiva',
      off: 'Ferma',
    });
  }

  return caps;
}

/** Costruisce i profili di capacità per Cost / Energia */
function costCapabilities(entity: EntityLike | null | undefined): Capability[] {
  const caps: Capability[] = [];
  const attrs = entity?.attributes ?? {};
  const unit = String(attrs.unit_of_measurement ?? '€');

  caps.push({
    id: 'today',
    label: 'Costo di oggi',
    icon: 'wallet',
    initial: entity?.state ?? '0,00',
    unit,
    frequent: true,
    kind: 'reading',
  });

  if (attrs.month_cost !== undefined || attrs.total_cost !== undefined) {
    caps.push({
      id: 'month',
      label: 'Questo mese',
      icon: 'wallet',
      initial: String(attrs.month_cost ?? attrs.total_cost),
      unit,
      frequent: true,
      kind: 'reading',
    });
  }

  return caps;
}

/** Costruisce i profili di capacità per Nordpool / Prezzo energia */
function nordpoolCapabilities(entity: EntityLike | null | undefined): Capability[] {
  const caps: Capability[] = [];
  const attrs = entity?.attributes ?? {};
  const unit = String(attrs.unit_of_measurement ?? '€/kWh');

  caps.push({
    id: 'price',
    label: 'Prezzo attuale',
    icon: 'energy',
    initial: entity?.state ?? '0,00',
    unit,
    frequent: true,
    kind: 'reading',
  });

  if (attrs.min !== undefined || attrs.current_price !== undefined) {
    caps.push({
      id: 'minimum',
      label: 'Prezzo minimo',
      icon: 'energy',
      initial: String(attrs.min ?? attrs.current_price),
      unit,
      frequent: true,
      kind: 'reading',
    });
  }

  return caps;
}

/** Costruisce i profili generici per Sensor e Switch */
function genericCapabilities(entity: EntityLike | null | undefined, domain: string): Capability[] {
  const caps: Capability[] = [];
  const attrs = entity?.attributes ?? {};

  if (domain === 'switch') {
    caps.push({
      id: 'power',
      label: 'Interruttore',
      icon: 'power',
      initial: entity?.state === 'on',
      frequent: true,
      kind: 'toggle',
      on: 'Acceso',
      off: 'Spento',
    });
  } else {
    // Sensor
    const unit = String(attrs.unit_of_measurement ?? '');
    caps.push({
      id: 'reading',
      label: String(attrs.friendly_name ?? 'Sensore'),
      icon: 'activity',
      initial: entity?.state ?? '—',
      unit,
      frequent: true,
      kind: 'reading',
    });
  }

  return caps;
}

/**
 * Funzione pura principale: estrae le Capability effettive offerte da un'entità Home Assistant.
 * Elimina i controlli fantasma verificando supported_features, attributi e tipologia reale.
 */
export function haEntityToCapabilities(
  entity: EntityLike | null | undefined,
  targetType?: string
): DeviceProfile {
  const entityId = entity?.entity_id ?? 'unknown';
  const domain = domainOf(entityId) || targetType || 'generic';
  const label = String(entity?.attributes?.friendly_name ?? entityId);

  let capabilities: Capability[] = [];

  switch (domain) {
    case 'light':
      capabilities = lightCapabilities(entity);
      break;
    case 'climate':
      capabilities = climateCapabilities(entity);
      break;
    case 'cover':
      capabilities = coverCapabilities(entity);
      break;
    case 'lock':
      capabilities = lockCapabilities(entity);
      break;
    case 'media_player':
    case 'media':
      if (targetType === 'androidtv' || targetType === 'appletv') {
        capabilities = tvCapabilities(entity, targetType);
      } else {
        capabilities = mediaCapabilities(entity, targetType === 'sonos');
      }
      break;
    case 'sonos':
      capabilities = mediaCapabilities(entity, true);
      break;
    case 'androidtv':
    case 'appletv':
      capabilities = tvCapabilities(entity, domain);
      break;
    case 'fan':
      capabilities = fanCapabilities(entity);
      break;
    case 'vacuum':
      capabilities = vacuumCapabilities(entity);
      break;
    case 'lawn_mower':
    case 'mower':
      capabilities = mowerCapabilities(entity);
      break;
    case 'car':
      capabilities = carCapabilities(entity);
      break;
    case 'cost':
      capabilities = costCapabilities(entity);
      break;
    case 'nordpool':
      capabilities = nordpoolCapabilities(entity);
      break;
    case 'switch':
      capabilities = genericCapabilities(entity, 'switch');
      break;
    default:
      if (targetType === 'mower') {
        capabilities = mowerCapabilities(entity);
      } else if (targetType === 'car') {
        capabilities = carCapabilities(entity);
      } else if (targetType === 'cost') {
        capabilities = costCapabilities(entity);
      } else if (targetType === 'nordpool') {
        capabilities = nordpoolCapabilities(entity);
      } else if (targetType === 'vacuum') {
        capabilities = vacuumCapabilities(entity);
      } else if (targetType === 'fan') {
        capabilities = fanCapabilities(entity);
      } else {
        capabilities = genericCapabilities(entity, 'sensor');
      }
      break;
  }

  return {
    id: entityId,
    label,
    capabilities,
  };
}

/**
 * Estrae i valori correnti effettivi da un'entità HA per inizializzare o aggiornare le Capability.
 */
export function haEntityToValues(
  _entity: EntityLike | null | undefined,
  capabilities: readonly Capability[]
): SampleValues {
  const result: Record<string, SampleValue> = {};
  for (const cap of capabilities) {
    if (cap.kind === 'action') continue;
    result[cap.id] = 'initial' in cap ? cap.initial : '';
  }
  return result;
}

export interface ResolvedHaCommand {
  domain: string;
  service: string;
  data: Record<string, unknown>;
}

/**
 * Risolve un'interazione con una Capability del kit nel comando di servizio Home Assistant corrispondente.
 */
export function resolveHaService(
  entityId: string,
  capabilityId: string,
  value: SampleValue
): ResolvedHaCommand | null {
  const domain = domainOf(entityId);
  if (!domain) return null;

  switch (domain) {
    case 'light':
      if (capabilityId === 'power') {
        return {
          domain: 'light',
          service: value ? 'turn_on' : 'turn_off',
          data: { entity_id: entityId },
        };
      }
      if (capabilityId === 'brightness') {
        return {
          domain: 'light',
          service: 'turn_on',
          data: { entity_id: entityId, brightness_pct: Number(value) },
        };
      }
      if (capabilityId === 'hue') {
        return {
          domain: 'light',
          service: 'turn_on',
          data: { entity_id: entityId, hs_color: [Number(value), 100] },
        };
      }
      if (capabilityId === 'white') {
        return {
          domain: 'light',
          service: 'turn_on',
          data: { entity_id: entityId, color_temp_kelvin: Number(value) },
        };
      }
      if (capabilityId === 'effect') {
        return {
          domain: 'light',
          service: 'turn_on',
          data: { entity_id: entityId, effect: String(value) },
        };
      }
      break;

    case 'climate':
      if (capabilityId === 'power') {
        return {
          domain: 'climate',
          service: value ? 'turn_on' : 'turn_off',
          data: { entity_id: entityId },
        };
      }
      if (capabilityId === 'target') {
        return {
          domain: 'climate',
          service: 'set_temperature',
          data: { entity_id: entityId, temperature: Number(value) },
        };
      }
      if (capabilityId === 'hvac') {
        const modeMap: Record<string, string> = {
          Caldo: 'heat',
          Freddo: 'cool',
          Auto: 'auto',
          Ventola: 'fan_only',
          Deumidifica: 'dry',
          Spento: 'off',
        };
        const hvacMode = modeMap[String(value)] ?? String(value);
        return {
          domain: 'climate',
          service: 'set_hvac_mode',
          data: { entity_id: entityId, hvac_mode: hvacMode },
        };
      }
      if (capabilityId === 'fan') {
        return {
          domain: 'climate',
          service: 'set_fan_mode',
          data: { entity_id: entityId, fan_mode: String(value) },
        };
      }
      if (capabilityId === 'preset') {
        return {
          domain: 'climate',
          service: 'set_preset_mode',
          data: { entity_id: entityId, preset_mode: String(value) },
        };
      }
      if (capabilityId === 'humidity') {
        return {
          domain: 'climate',
          service: 'set_humidity',
          data: { entity_id: entityId, humidity: Number(value) },
        };
      }
      if (capabilityId === 'swing' || capabilityId === 'horizontal') {
        return {
          domain: 'climate',
          service: capabilityId === 'swing' ? 'set_swing_mode' : 'set_swing_horizontal_mode',
          data: {
            entity_id: entityId,
            [capabilityId === 'swing' ? 'swing_mode' : 'swing_horizontal_mode']: String(value),
          },
        };
      }
      break;

    case 'cover':
      if (capabilityId === 'open') {
        return { domain: 'cover', service: 'open_cover', data: { entity_id: entityId } };
      }
      if (capabilityId === 'close') {
        return { domain: 'cover', service: 'close_cover', data: { entity_id: entityId } };
      }
      if (capabilityId === 'stop') {
        return { domain: 'cover', service: 'stop_cover', data: { entity_id: entityId } };
      }
      if (capabilityId === 'position') {
        return {
          domain: 'cover',
          service: 'set_cover_position',
          data: { entity_id: entityId, position: Number(value) },
        };
      }
      if (capabilityId === 'tilt') {
        return {
          domain: 'cover',
          service: 'set_cover_tilt_position',
          data: { entity_id: entityId, tilt_position: Number(value) },
        };
      }
      break;

    case 'lock':
      if (capabilityId === 'locked') {
        return {
          domain: 'lock',
          service: value ? 'lock' : 'unlock',
          data: { entity_id: entityId },
        };
      }
      if (capabilityId === 'open') {
        return { domain: 'lock', service: 'open', data: { entity_id: entityId } };
      }
      break;

    case 'media_player':
    case 'media':
    case 'sonos':
    case 'androidtv':
    case 'appletv':
      if (capabilityId === 'power') {
        return {
          domain: 'media_player',
          service: value ? 'turn_on' : 'turn_off',
          data: { entity_id: entityId },
        };
      }
      if (capabilityId === 'playing') {
        return {
          domain: 'media_player',
          service: value ? 'media_play' : 'media_pause',
          data: { entity_id: entityId },
        };
      }
      if (capabilityId === 'volume') {
        return {
          domain: 'media_player',
          service: 'volume_set',
          data: { entity_id: entityId, volume_level: Number(value) / 100 },
        };
      }
      if (capabilityId === 'next') {
        return {
          domain: 'media_player',
          service: 'media_next_track',
          data: { entity_id: entityId },
        };
      }
      if (capabilityId === 'previous') {
        return {
          domain: 'media_player',
          service: 'media_previous_track',
          data: { entity_id: entityId },
        };
      }
      if (capabilityId === 'stop') {
        return { domain: 'media_player', service: 'media_stop', data: { entity_id: entityId } };
      }
      if (capabilityId === 'mute') {
        return {
          domain: 'media_player',
          service: 'volume_mute',
          data: { entity_id: entityId, is_volume_muted: Boolean(value) },
        };
      }
      if (capabilityId === 'source') {
        return {
          domain: 'media_player',
          service: 'select_source',
          data: { entity_id: entityId, source: String(value) },
        };
      }
      break;

    case 'fan':
      if (capabilityId === 'power') {
        return {
          domain: 'fan',
          service: value ? 'turn_on' : 'turn_off',
          data: { entity_id: entityId },
        };
      }
      if (capabilityId === 'speed') {
        return {
          domain: 'fan',
          service: 'set_percentage',
          data: { entity_id: entityId, percentage: Number(value) },
        };
      }
      if (capabilityId === 'oscillation') {
        return {
          domain: 'fan',
          service: 'oscillate',
          data: { entity_id: entityId, oscillating: Boolean(value) },
        };
      }
      break;

    case 'vacuum':
      if (capabilityId === 'start') {
        return { domain: 'vacuum', service: 'start', data: { entity_id: entityId } };
      }
      if (capabilityId === 'pause') {
        return { domain: 'vacuum', service: 'pause', data: { entity_id: entityId } };
      }
      if (capabilityId === 'dock') {
        return { domain: 'vacuum', service: 'return_to_base', data: { entity_id: entityId } };
      }
      break;

    case 'lawn_mower':
    case 'mower':
      if (capabilityId === 'start') {
        return { domain: 'lawn_mower', service: 'start_mowing', data: { entity_id: entityId } };
      }
      if (capabilityId === 'pause') {
        return { domain: 'lawn_mower', service: 'pause', data: { entity_id: entityId } };
      }
      if (capabilityId === 'dock') {
        return { domain: 'lawn_mower', service: 'dock', data: { entity_id: entityId } };
      }
      break;

    case 'car':
      if (capabilityId === 'charging') {
        return {
          domain: 'switch',
          service: value ? 'turn_on' : 'turn_off',
          data: { entity_id: entityId },
        };
      }
      break;

    case 'switch':
      if (capabilityId === 'power') {
        return {
          domain: 'switch',
          service: value ? 'turn_on' : 'turn_off',
          data: { entity_id: entityId },
        };
      }
      break;
  }

  return null;
}
