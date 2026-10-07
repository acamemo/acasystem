/**
 * Italian texts of the control widgets (ADR-0007: Italian only, sentence case).
 * The legacy dictionary has no Italian entries for these domains, so the texts live here.
 */

export const GENERIC_STATE_LABELS: Readonly<Record<string, string>> = {
  on: 'Acceso',
  off: 'Spento',
  unavailable: 'Non disponibile',
  unknown: 'Sconosciuto',
  open: 'Aperto',
  closed: 'Chiuso',
  opening: 'In apertura',
  closing: 'In chiusura',
  locked: 'Bloccato',
  unlocked: 'Sbloccato',
  active: 'Attivo',
  inactive: 'Inattivo',
  idle: 'Inattivo',
  charging: 'In carica',
  playing: 'In riproduzione',
  paused: 'In pausa',
  standby: 'In standby',
  home: 'A casa',
  away: 'Fuori casa',
  not_home: 'Fuori casa',
  online: 'Online',
  offline: 'Offline',
  heat: 'Riscaldamento',
  cool: 'Raffrescamento',
  auto: 'Automatico',
  fan_only: 'Solo ventilazione',
  dry: 'Deumidificazione',
  true: 'Sì',
  false: 'No',
};

/** On/off wording of binary sensors by device class (legacy `binary.*` keys). */
export const BINARY_STATE_LABELS: Readonly<Record<string, { on: string; off: string }>> = {
  door: { on: 'Aperta', off: 'Chiusa' },
  window: { on: 'Aperta', off: 'Chiusa' },
  garage_door: { on: 'Aperta', off: 'Chiusa' },
  motion: { on: 'Movimento rilevato', off: 'Nessun movimento' },
  moisture: { on: 'Bagnato', off: 'Asciutto' },
  occupancy: { on: 'Occupato', off: 'Libero' },
  presence: { on: 'Occupato', off: 'Libero' },
  smoke: { on: 'Fumo rilevato', off: 'Nessun fumo' },
  lock: { on: 'Sbloccata', off: 'Bloccata' },
};

export const LOCK_STATE_LABELS: Readonly<Record<string, string>> = {
  locked: 'Bloccata',
  unlocked: 'Sbloccata',
  locking: 'Blocco in corso',
  unlocking: 'Sblocco in corso',
  jammed: 'Inceppata',
  open: 'Aperta',
  opening: 'Apertura in corso',
  unavailable: 'Non disponibile',
  unknown: 'Sconosciuto',
};

export const COVER_STATE_LABELS: Readonly<Record<string, string>> = {
  open: 'Aperta',
  closed: 'Chiusa',
  opening: 'In apertura',
  closing: 'In chiusura',
  unavailable: 'Non disponibile',
  unknown: 'Non disponibile',
};

export const COVER_DEVICE_LABELS: Readonly<Record<string, string>> = {
  awning: 'Tenda da sole',
  blind: 'Veneziana',
  cover: 'Tapparella',
  curtain: 'Tenda',
  damper: 'Serranda',
  door: 'Porta',
  garage: 'Porta del garage',
  gate: 'Cancello',
  shade: 'Tenda oscurante',
  shutter: 'Persiana',
  window: 'Finestra',
};

export const FAN_DIRECTION_LABELS: Readonly<Record<string, string>> = {
  forward: 'Avanti',
  reverse: 'Indietro',
};

/** Common fan presets: Home Assistant reports free text, often in English (lower case). */
export const FAN_PRESET_LABELS: Readonly<Record<string, string>> = {
  auto: 'Automatico',
  automatic: 'Automatico',
  sleep: 'Notte',
  night: 'Notte',
  normal: 'Normale',
  nature: 'Naturale',
  natural: 'Naturale',
  eco: 'Risparmio',
  boost: 'Potenza massima',
  turbo: 'Potenza massima',
  breeze: 'Brezza',
};

/**
 * Shown preset: a known one in Italian, any other with a capital initial. Commands keep sending
 * the raw value (REP-20261006-001, DES-10).
 */
export function fanPresetLabel(mode: string): string {
  const preset = mode.trim();
  const known = FAN_PRESET_LABELS[preset.toLowerCase()];
  return known ?? preset.charAt(0).toUpperCase() + preset.slice(1);
}

/** Feedback of a command: requested, sent, confirmed by Home Assistant, failed. */
export const COMMAND_LABELS = {
  pending: 'In attesa di conferma…',
  sent: 'Comando inviato',
  confirmed: 'Aggiornato',
  error: 'Comando non riuscito',
  timeout: 'Nessuna conferma da Home Assistant',
} as const;

export const COMMON_LABELS = {
  unavailable: 'Non disponibile',
  missing: 'Dispositivo non trovato',
  missingHint: 'Scegli di nuovo il dispositivo nelle impostazioni del widget.',
  unavailableHint: 'Home Assistant non riesce a raggiungere il dispositivo.',
  loading: 'Caricamento del dispositivo…',
  details: 'Dettagli',
  on: 'Acceso',
  off: 'Spento',
} as const;

/** Label of a generic state, falling back to the raw value. */
export function stateLabel(state: string | null | undefined, deviceClass?: string): string {
  if (state === null || state === undefined || state === '') return '--';
  const normalized = state.toLowerCase();
  if ((normalized === 'on' || normalized === 'off') && deviceClass) {
    const binary = BINARY_STATE_LABELS[deviceClass];
    if (binary) return binary[normalized];
  }
  return GENERIC_STATE_LABELS[normalized] ?? state;
}
