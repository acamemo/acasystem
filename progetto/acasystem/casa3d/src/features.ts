/**
 * Pro features: unlocked by an installed, signed feature pack (a pack whose payload lists `features`).
 * The code of every feature is in the integration; the pack is the licence and carries its content.
 */
import { getPacks } from "./packs.ts";

export type Feature = "camera_cockpit" | "weather" | "screens" | "energy_pro" | "sound" | "auto_pro" | "time_travel" | "pool" | "household" | "fridge_smart" | "fun_pets" | "fun_halloween";

/** The Pro add-ons (their code is in the bundles; what unlocks them is decided by Acasystem, T8). */
export const FEATURES: readonly Feature[] = ["camera_cockpit", "weather", "screens", "energy_pro", "sound", "auto_pro", "time_travel", "pool", "household"];
/**
 * Fun packs: free extras (0 €, anyone may give what they like) picked up in the shop by customers – not Pro add-ons,
 * shown in their own section of the extensions page and switched on and off there.
 */
export const FUN: readonly Feature[] = ["fun_pets", "fun_halloween"];
/** Free features built but not released yet (no pack unlocks them; only the lab switch shows them). */
export type FreeFeature = never;
export type Gated = Feature | FreeFeature;

/**
 * Pro add-ons (and free features) built but not released yet: they show nowhere (extensions page, teasers) unless they are
 * unlocked (the tester has the pack) or the lab switch is on (localStorage "casa3d.lab" = "1").
 * A release takes a feature off this list.
 */
export const UNRELEASED: readonly Gated[] = ["pool"];

export function labOn(): boolean {
  try {
    // "?fp3d_lab=1" in the address bar switches it on (and "=0" off) – easier than the browser console on a tablet
    const flag = new URLSearchParams(location.search).get("fp3d_lab");
    if (flag === "1") localStorage.setItem("casa3d.lab", "1");
    else if (flag === "0") localStorage.removeItem("casa3d.lab");
    return localStorage.getItem("casa3d.lab") === "1";
  } catch {
    return false;
  }
}

/** The parked camera projection prototype: only with its own switch ("?fp3d_projection=1", "=0" off), off by default. */
export function projectionOn(): boolean {
  try {
    const flag = new URLSearchParams(location.search).get("fp3d_projection");
    if (flag === "1") localStorage.setItem("casa3d.projection", "1");
    else if (flag === "0") localStorage.removeItem("casa3d.projection");
    return localStorage.getItem("casa3d.projection") === "1";
  } catch {
    return false;
  }
}

/** Whether an add-on may be shown and advertised: released, or unlocked, or the lab switch is on. */
export function released(feature: Gated): boolean {
  return !UNRELEASED.includes(feature) || hasFeature(feature) || labOn();
}

/** Features unlocked by a pack but not listed anywhere (exclusive items). */
const HIDDEN: readonly Feature[] = ["fridge_smart"];

/** Whether this frontend knows a feature key at all (an older bundle does not know newer Pro add-ons). */
export function knownFeature(key: string): boolean {
  return (FEATURES as readonly string[]).includes(key) || (HIDDEN as readonly string[]).includes(key) || (FUN as readonly string[]).includes(key);
}

export function unlockedFeatures(packs: readonly { features?: string[] }[] = getPacks()): Set<Feature> {
  const out = new Set<Feature>();
  for (const p of packs) for (const f of p.features ?? []) if (knownFeature(f)) out.add(f as Feature);
  return out;
}

export function hasFeature(feature: Feature, packs?: readonly { features?: string[] }[]): boolean {
  return unlockedFeatures(packs).has(feature);
}
