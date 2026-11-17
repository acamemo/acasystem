/**
 * Sound output of an LG webOS TV (`webostv.select_sound_output`, home-assistant.io, read
 * 2026-10-29). Home Assistant gives no list of the outputs the TV has: the five documented values
 * are offered, plus the one the TV reports now when it is none of them. Pure, tested without
 * rendering.
 */
import type { Entity } from './entity';
import { attrString } from './entity';
import { testi } from '../testi';

export interface TvSoundOutput {
  value: string;
  name: string;
}

/** Outputs of the documentation, with the names the household understands. */
const KNOWN: Readonly<Record<string, string>> = testi.usciteAudio;

/** Other values a webOS TV reports, with a readable name. */
const OTHER: Readonly<Record<string, string>> = testi.usciteAudioAltre;

/** The entity is an LG webOS TV (the platform comes from the entity registry). */
export const isWebosTv = (entity: Entity | undefined): boolean =>
  entity?.attributes?.platform === 'webostv';

/** `sound_output` the TV reports now, in lower case; empty when it does not report one. */
export const tvSoundOutput = (entity: Entity | undefined): string =>
  attrString(entity, 'sound_output').trim().toLowerCase();

/** The outputs to offer; empty for a TV that is not an LG webOS one. */
export function tvSoundOutputs(entity: Entity | undefined): TvSoundOutput[] {
  if (!isWebosTv(entity)) return [];
  const list = Object.entries(KNOWN).map(([value, name]) => ({ value, name }));
  const current = tvSoundOutput(entity);
  if (current && !Object.hasOwn(KNOWN, current)) {
    list.push({ value: current, name: Object.hasOwn(OTHER, current) ? OTHER[current]! : current });
  }
  return list;
}
