/**
 * Quality of the Casa 3D view as the host keeps it (ADR-0014, section 5, T5). The three levels are
 * Light, Medium and High; the view starts in Light on every device and only the user raises it.
 * The preference is one level per device: it is kept in this browser and, when the settings
 * synchronisation is on, copied into the device's current settings (api/snapshot.ts).
 *
 * The parameters of each level (pixel ratio, antialias, frame spacing) belong to the 3D bundle.
 */
import { useSyncExternalStore } from 'react';

export type Casa3dQuality = 'light' | 'medium' | 'high';

export const CASA3D_QUALITY_KEY = 'aca_casa3d_quality';
export const DEFAULT_CASA3D_QUALITY: Casa3dQuality = 'light';

export interface Casa3dQualityOption {
  value: Casa3dQuality;
  label: string;
  hint: string;
}

export const CASA3D_QUALITY_OPTIONS: ReadonlyArray<Casa3dQualityOption> = [
  {
    value: 'light',
    label: 'Light',
    hint: 'Il più leggero, pensato per tablet e telefoni. È il livello di partenza.',
  },
  {
    value: 'medium',
    label: 'Medium',
    hint: 'Più definizione e luci più ricche, per tablet più potenti.',
  },
  {
    value: 'high',
    label: 'High',
    hint: 'La massima qualità, per dispositivi con hardware generoso.',
  },
];

export function parseCasa3dQuality(raw: unknown): Casa3dQuality | null {
  return raw === 'light' || raw === 'medium' || raw === 'high' ? raw : null;
}

/** Set when the browser refuses to store (a private window): the choice then lasts for the page. */
let unstored: Casa3dQuality | null = null;
let storageRefused = false;
const listeners = new Set<() => void>();

/** The level stored in this browser, or null when the user never chose one. */
export function readStoredCasa3dQuality(): Casa3dQuality | null {
  if (storageRefused) return unstored;
  try {
    return parseCasa3dQuality(localStorage.getItem(CASA3D_QUALITY_KEY));
  } catch {
    return unstored;
  }
}

export function getCasa3dQuality(): Casa3dQuality {
  return readStoredCasa3dQuality() ?? DEFAULT_CASA3D_QUALITY;
}

/** Saves the level of this device and tells every component that shows it. */
export function setCasa3dQuality(quality: Casa3dQuality): void {
  try {
    localStorage.setItem(CASA3D_QUALITY_KEY, quality);
    storageRefused = false;
  } catch {
    // the choice lasts for this page only
    storageRefused = true;
    unstored = quality;
  }
  for (const listener of [...listeners]) listener();
}

/** Calls `listener` when the level of this device changes (here or in another tab). */
export function subscribeCasa3dQuality(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === CASA3D_QUALITY_KEY || event.key === null) listener();
  };
  globalThis.window?.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    globalThis.window?.removeEventListener('storage', onStorage);
  };
}

/** The saved level of this device and its setter, shared by the page menu and Sistema. */
export function useCasa3dQuality(): readonly [Casa3dQuality, (quality: Casa3dQuality) => void] {
  const quality = useSyncExternalStore(
    subscribeCasa3dQuality,
    getCasa3dQuality,
    () => DEFAULT_CASA3D_QUALITY
  );
  return [quality, setCasa3dQuality];
}

interface DeviceHints {
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

/**
 * A device that the High level may slow down: little memory or few cores (the Tab M11 reports
 * 4 GB). Moving to High asks for a confirmation there. The browser gives only a rough memory
 * figure, so this never blocks anything.
 */
export function isWeakDevice(hints: DeviceHints = globalThis.navigator ?? {}): boolean {
  const { deviceMemory, hardwareConcurrency } = hints;
  if (typeof deviceMemory === 'number' && deviceMemory > 0 && deviceMemory <= 4) return true;
  return (
    typeof hardwareConcurrency === 'number' && hardwareConcurrency > 0 && hardwareConcurrency <= 4
  );
}
