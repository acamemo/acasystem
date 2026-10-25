/**
 * Vacuum and lawn mower share the card: state label, active state, primary action and the
 * return to the dock. Services and attributes are those of the legacy VacuumCard and MowerCard.
 */
import type { UtilityIconName } from '../shared/UtilityIcon';
import { numberAttr, stringAttr, type MaybeEntity } from '../shared/entity';
import { ERROR_STATES, VACUUM_CONFIRM, vacuumStateLabel } from './vacuumData';
import type { ServiceCatalog } from '../../adaptive/operationalProfile';

/** HA 2026.9.4 feature flags; readable attributes do not grant write capabilities. */
export function robotActionSupported(
  entity: MaybeEntity,
  domain: string,
  service: string,
  services: ServiceCatalog | null
) {
  const bits: Record<string, Record<string, number>> = {
    vacuum: {
      start: 8192,
      pause: 4,
      stop: 8,
      return_to_base: 16,
      locate: 512,
      clean_spot: 1024,
      set_fan_speed: 32,
      clean_area: 16384,
    },
    lawn_mower: { start_mowing: 1, pause: 2, dock: 4 },
  };
  const bit = bits[domain]?.[service];
  return (
    Boolean(services?.[domain]?.[service]) &&
    (!bit || (Number(entity?.attributes.supported_features ?? 0) & bit) === bit)
  );
}

export interface RobotAction {
  key: string;
  domain: string;
  service: string;
  label: string;
  /** Text while waiting for confirmation. */
  requested: string;
  icon: UtilityIconName;
  confirm: readonly string[];
}

export interface RobotSpec {
  icon: UtilityIconName;
  defaultName: string;
  placeLabel: string;
  stateLabel: (state: string | undefined, battery: number | null) => string;
  isActive: (state: string | undefined) => boolean;
  /** Start or pause, from the current state (card variant: no feature checks). */
  primary: (entity: MaybeEntity) => RobotAction;
  dock: RobotAction;
  battery: (entity: MaybeEntity) => number | null;
  place: (entity: MaybeEntity) => string | null;
}

const lower = (state: string | undefined) => String(state ?? '').toLowerCase();

export const isErrorState = (state: string | undefined) => ERROR_STATES.includes(lower(state));

export const vacuumSpec: RobotSpec = {
  icon: 'vacuum',
  defaultName: 'Aspirapolvere',
  placeLabel: 'Stanza',
  stateLabel: vacuumStateLabel,
  isActive: (state) => state === 'cleaning',
  primary: (entity) =>
    entity?.state === 'cleaning'
      ? {
          key: 'pause',
          domain: 'vacuum',
          service: 'pause',
          label: 'Pausa',
          requested: 'Pausa richiesta…',
          icon: 'pause',
          confirm: VACUUM_CONFIRM.pause,
        }
      : {
          key: 'start',
          domain: 'vacuum',
          service: 'start',
          label: 'Avvia',
          requested: 'Avvio richiesto…',
          icon: 'play',
          confirm: VACUUM_CONFIRM.start,
        },
  dock: {
    key: 'dock',
    domain: 'vacuum',
    service: 'return_to_base',
    label: 'Torna alla base',
    requested: 'Ritorno alla base richiesto…',
    icon: 'home',
    confirm: VACUUM_CONFIRM.dock,
  },
  battery: (entity) => numberAttr(entity, 'battery_level'),
  place: (entity) => stringAttr(entity, 'current_room') ?? stringAttr(entity, 'room'),
};

const MOWER_ACTIVE = ['mowing', 'cleaning'];

/** Italian label of a mower state (legacy getMowerStateLabel). */
export function mowerStateLabel(state: string | undefined, battery: number | null): string {
  const normalized = lower(state);
  if (!normalized) return 'Stato sconosciuto';
  if (normalized === 'unavailable') return 'Non disponibile';
  if (normalized === 'unknown') return 'Stato sconosciuto';
  if (MOWER_ACTIVE.includes(normalized)) return 'Taglio in corso';
  if (['returning', 'going_home', 'return_to_base'].includes(normalized))
    return 'Ritorno alla base';
  if ((normalized === 'charging' || normalized === 'docked') && battery === 100) return 'Alla base';
  if (normalized === 'docked' || normalized === 'charging') return 'In carica';
  if (normalized === 'idle' || normalized === 'ready') return 'Inattivo';
  if (normalized === 'paused' || normalized === 'pause') return 'In pausa';
  if (ERROR_STATES.includes(normalized)) return 'Errore';
  if (normalized === 'stopped') return 'Fermo';
  return String(state).replace(/_/g, ' ');
}

export const mowerSpec: RobotSpec = {
  icon: 'mower',
  defaultName: 'Tosaerba',
  placeLabel: 'Zona',
  stateLabel: mowerStateLabel,
  isActive: (state) => MOWER_ACTIVE.includes(lower(state)),
  primary: (entity) =>
    MOWER_ACTIVE.includes(lower(entity?.state))
      ? {
          key: 'pause',
          domain: 'lawn_mower',
          service: 'pause',
          label: 'Pausa',
          requested: 'Pausa richiesta…',
          icon: 'pause',
          confirm: ['paused', 'pause', 'idle', 'stopped', 'docked'],
        }
      : {
          key: 'start',
          domain: 'lawn_mower',
          service: 'start_mowing',
          label: 'Avvia',
          requested: 'Avvio richiesto…',
          icon: 'play',
          confirm: MOWER_ACTIVE,
        },
  dock: {
    key: 'dock',
    domain: 'lawn_mower',
    service: 'dock',
    label: 'Torna alla base',
    requested: 'Ritorno alla base richiesto…',
    icon: 'home',
    confirm: ['returning', 'going_home', 'return_to_base', 'docked', 'charging'],
  },
  battery: (entity) => numberAttr(entity, 'battery_level'),
  place: (entity) =>
    stringAttr(entity, 'current_zone') ??
    stringAttr(entity, 'zone') ??
    stringAttr(entity, 'current_room'),
};
