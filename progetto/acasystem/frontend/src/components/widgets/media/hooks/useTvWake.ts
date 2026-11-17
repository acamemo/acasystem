import { useEffect, useState } from 'react';
import { getPower } from '@/api/devicesApi';
import { isUnavailable, type Entity } from '../model/entity';
import { MEDIA_FEATURE } from '../model/features';
import { tvMaybeAsleep } from '../model/tv';

/**
 * Can this LG webOS TV be woken from the network? Home Assistant reports a webOS TV that is off as
 * `unavailable`, unless something can turn it on; with a way to wake it, the widget shows
 * «Spento» and keeps the power key. The answer comes, in order, from:
 *
 *  1. the entity itself, when it declares TURN_ON now or declared it the last time it was seen
 *     (kept for the session);
 *  2. the power-on recipe of its config entry (`config_entry_id` that the entity registry adds to
 *     the attributes, then `getPower(entry).configured`), cached per entry.
 *
 * `true`/`false` once known; `null` while the recipe is being read.
 */

const declaredWhenSeen = new Map<string, boolean>();

interface Recipe {
  configured: boolean;
  at: number;
}
const recipes = new Map<string, Recipe>();
const reading = new Map<string, Promise<boolean>>();

/** A «no» is asked again after a while: the recipe may have been set up from the flow since. */
export const NOT_CONFIGURED_RECHECK_MS = 60_000;

const declaresTurnOn = (entity: Entity | undefined): boolean => {
  const raw = Number(entity?.attributes?.supported_features);
  return Number.isFinite(raw) && (raw & MEDIA_FEATURE.TURN_ON) !== 0;
};

const knownRecipe = (entryId: string): boolean | null => {
  const found = recipes.get(entryId);
  if (!found) return null;
  if (!found.configured && Date.now() - found.at > NOT_CONFIGURED_RECHECK_MS) return null;
  return found.configured;
};

function readRecipe(entryId: string): Promise<boolean> {
  const pending = reading.get(entryId);
  if (pending) return pending;
  const asked: Promise<boolean> = getPower(entryId)
    .then((status) => status.configured === true)
    .catch(() => false)
    .then((configured) => {
      // A read that was forgotten meanwhile (the recipe was just set up) must not write back.
      if (reading.get(entryId) === asked) {
        recipes.set(entryId, { configured, at: Date.now() });
        reading.delete(entryId);
      }
      return configured;
    });
  reading.set(entryId, asked);
  return asked;
}

const listeners = new Set<() => void>();

/**
 * The recipe of this entry was just set up or changed: forget what was learnt and read it again,
 * so the widgets of the TV (power key, details) follow at once.
 */
export function refreshTvWake(entryId: string): void {
  recipes.delete(entryId);
  reading.delete(entryId);
  listeners.forEach((listener) => listener());
}

/** Re-renders the hook when `refreshTvWake` is called. */
function useRefreshTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick((value) => value + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return tick;
}

/** The integration whose power-on recipe the server can set up (an LG webOS TV). */
export const POWER_RECIPE_PLATFORMS: readonly string[] = ['webostv'];

/**
 * The power-on recipe of a TV the server can set up: its config entry and whether the recipe
 * exists (`null` while it is being read). `entryId` is empty when the TV has no entry or its
 * integration has no recipe. Awake or asleep, so the details can offer to change it.
 */
export function useTvPowerRecipe(entity: Entity | undefined): {
  entryId: string;
  configured: boolean | null;
} {
  const tick = useRefreshTick();
  const rawEntry = entity?.attributes?.config_entry_id;
  const platform = entity?.attributes?.platform;
  const entryId =
    typeof rawEntry === 'string' &&
    typeof platform === 'string' &&
    POWER_RECIPE_PLATFORMS.includes(platform)
      ? rawEntry
      : '';
  const [configured, setConfigured] = useState<boolean | null>(() =>
    entryId ? knownRecipe(entryId) : null
  );
  useEffect(() => {
    if (!entryId) return undefined;
    let cancelled = false;
    const known = knownRecipe(entryId);
    setConfigured(known);
    if (known === null) {
      void readRecipe(entryId).then((value) => {
        if (!cancelled) setConfigured(value);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [entryId, tick]);
  return { entryId, configured: entryId ? configured : null };
}

/** Forgets what was learnt (tests, and a TV whose recipe was just set up). */
export function resetTvWake(): void {
  declaredWhenSeen.clear();
  recipes.clear();
  reading.clear();
}

export function useTvWake(entity: Entity | undefined): boolean | null {
  const entityId = entity?.entity_id ?? '';
  const asleep = tvMaybeAsleep(entity);
  const declared = asleep && (declaresTurnOn(entity) || declaredWhenSeen.get(entityId) === true);
  const entryId = asleep ? entity?.attributes?.config_entry_id : undefined;
  const entry = typeof entryId === 'string' ? entryId : '';
  const [recipe, setRecipe] = useState<boolean | null>(() => (entry ? knownRecipe(entry) : null));
  const tick = useRefreshTick();

  // What the entity declares while it answers is what it is remembered to do when it sleeps.
  const seenDeclaring = entity && !isUnavailable(entity) ? declaresTurnOn(entity) : null;
  useEffect(() => {
    if (seenDeclaring !== null && entityId) declaredWhenSeen.set(entityId, seenDeclaring);
  }, [entityId, seenDeclaring]);

  const needsRecipe = asleep && !declared && entry !== '';
  useEffect(() => {
    if (!needsRecipe) return undefined;
    let cancelled = false;
    const known = knownRecipe(entry);
    setRecipe(known);
    if (known === null) {
      void readRecipe(entry).then((configured) => {
        if (!cancelled) setRecipe(configured);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [needsRecipe, entry, tick]);

  if (!asleep) return false;
  if (declared) return true;
  if (!entry) return false;
  return recipe ?? knownRecipe(entry);
}
