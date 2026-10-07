/**
 * Icons offered by the icon picker: the kit icons of the Icon primitive (iconNames), with
 * Italian names for the buttons and the search. Saved names outside the kit (legacy lucide or
 * «mdi:» names) are never rewritten: they stay saved and are shown with the fallback icon.
 */
import { iconNames, isIconName, type IconName } from '@/components/primitives';

/** Icon shown for an empty value and for a saved name that is not a kit icon. */
export const FALLBACK_ICON: IconName = 'grid';

/** Interface controls of the kit (arrows, closing, edit handles): not meaningful as an icon. */
const INTERFACE_ONLY: ReadonlySet<IconName> = new Set<IconName>([
  'chevronDown',
  'chevronUp',
  'chevronLeft',
  'chevronRight',
  'close',
  'resize',
  'move',
]);

/** Italian names of the kit icons; a name without one falls back to the kit key. */
const ICON_LABELS: Partial<Record<IconName, string>> = {
  add: 'Aggiungi',
  edit: 'Modifica',
  settings: 'Impostazioni',
  grid: 'Griglia',
  profile: 'Profilo',
  appearance: 'Tavolozza',
  text: 'Testo',
  server: 'Server',
  done: 'Fatto',
  search: 'Cerca',
  home: 'Casa',
  music: 'Musica',
  speaker: 'Altoparlante',
  light: 'Luce',
  battery: 'Batteria',
  refresh: 'Aggiorna',
  heart: 'Cuore',
  bag: 'Borsa',
  bell: 'Campanello',
  menu: 'Elenco',
  fingerprint: 'Impronta',
  share: 'Invia',
  coffee: 'Caffè',
  wallet: 'Portafoglio',
  activity: 'Andamento',
  warning: 'Avviso',
  info: 'Informazioni',
  lamp: 'Lampada',
  power: 'Accensione',
  thermostat: 'Termostato',
  fan: 'Ventilatore',
  blinds: 'Tapparella',
  lock: 'Serratura',
  unlock: 'Serratura aperta',
  shield: 'Allarme',
  calendar: 'Calendario',
  task: 'Attività',
  sun: 'Sole',
  cloud: 'Nuvola',
  weather: 'Meteo',
  humidity: 'Umidità',
  car: 'Auto',
  energy: 'Energia',
  tv: 'Televisore',
  camera: 'Videocamera',
  room: 'Stanza',
  vacuum: 'Aspirapolvere',
  mower: 'Tosaerba',
  wifi: 'Wi-Fi',
  speed: 'Velocità',
  clock: 'Orologio',
  key: 'Chiave',
  play: 'Riproduci',
  pause: 'Pausa',
  stop: 'Ferma',
  next: 'Successivo',
  previous: 'Precedente',
  volume: 'Volume',
  mute: 'Muto',
  repeat: 'Ripeti',
  minus: 'Meno',
  ok: 'Conferma',
  failed: 'Errore',
};

export function iconLabel(name: IconName): string {
  return ICON_LABELS[name] ?? name;
}

/** Kit icon of a saved value, or null when the value is empty or not a kit icon. */
export function kitIcon(value: unknown): IconName | null {
  return isIconName(value) ? value : null;
}

/** Icon to draw for a saved value: the kit icon, or the fallback for empty and legacy names. */
export function shownIcon(value: unknown): IconName {
  return kitIcon(value) ?? FALLBACK_ICON;
}

export interface IconChoice {
  name: IconName;
  label: string;
}

/** Icons of the picker, sorted by their Italian name. */
export function pickerIcons(): IconChoice[] {
  return iconNames
    .filter((name) => !INTERFACE_ONLY.has(name))
    .map((name) => ({ name, label: iconLabel(name) }))
    .sort((left, right) => left.label.localeCompare(right.label, 'it'));
}

/** Choices whose Italian name or kit key contains the query (case-insensitive). */
export function matchIcons(choices: readonly IconChoice[], query: string): IconChoice[] {
  const needle = query.trim().toLocaleLowerCase('it');
  if (!needle) return [...choices];
  return choices.filter(
    (choice) =>
      choice.label.toLocaleLowerCase('it').includes(needle) ||
      choice.name.toLowerCase().includes(needle)
  );
}
