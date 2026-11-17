import { createContext, useContext } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import { tvStateWord } from '../media/model/tv';

/**
 * The device name for the small card: its controls carry it in their accessible name, so a
 * screen reader tells «Accensione luce: Luce soggiorno» from the same control on another card.
 * Null where the name is already printed on the card.
 */
export const AdaptiveNameContext = createContext<string | null>(null);

/** Accessible name of a control: its label, and the device it belongs to on the smallest card. */
export function useControlLabel(label: string): string {
  const name = useContext(AdaptiveNameContext);
  return name ? `${label}: ${name}` : label;
}

const asNumber = (value: unknown): number | null =>
  value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
    ? Number(value)
    : null;

const MEDIA_WORDS: Record<string, string> = {
  playing: 'In riproduzione',
  paused: 'In pausa',
  buffering: 'In caricamento',
  off: 'Spento',
  standby: 'Spento',
  idle: 'Acceso',
  on: 'Acceso',
};

const ROBOT_WORDS: Record<string, string> = {
  cleaning: 'In pulizia',
  mowing: 'Sta tagliando',
  paused: 'In pausa',
  returning: 'Torna alla base',
  idle: 'Ferma',
  error: 'In errore',
};

/**
 * The state of the device in words, so it is not carried by colour alone. Null where the card
 * already says it in words (lock, alarm) or has no state to speak of (sensor, room, energy).
 * `shown` lists the controls on the card: a value one of them already prints is not repeated.
 */
export function adaptiveStateWord(
  type: string,
  entity: HassEntity | undefined,
  shown: ReadonlySet<string>
): string | null {
  if (!entity) return null;
  const state = entity.state;
  switch (type) {
    case 'light':
      return state === 'on' ? 'Accesa' : state === 'off' ? 'Spenta' : null;
    case 'fan':
    case 'climate':
      return state === 'off' ? 'Spento' : state === 'unknown' ? null : 'Acceso';
    case 'cover': {
      if (state === 'closed') return 'Chiusa';
      if (state === 'opening') return 'In apertura';
      if (state === 'closing') return 'In chiusura';
      if (state !== 'open') return null;
      const position = asNumber(entity.attributes.current_position);
      return position !== null && position < 100 && !shown.has('position')
        ? `Aperta ${Math.round(position)}%`
        : 'Aperta';
    }
    case 'camera':
      return state === 'recording'
        ? 'In registrazione'
        : state === 'streaming'
          ? 'In diretta'
          : 'Attiva';
    case 'media':
    case 'sonos':
      return MEDIA_WORDS[state] ?? null;
    // A TV says its state with the words of its widget, details and console.
    case 'androidtv':
    case 'appletv':
      return tvStateWord(state);
    case 'vacuum':
    case 'mower': {
      if (state === 'docked') {
        const battery = asNumber(entity.attributes.battery_level);
        return battery !== null && battery < 100 ? 'In carica' : 'Alla base';
      }
      return ROBOT_WORDS[state] ?? null;
    }
    default:
      return null;
  }
}
