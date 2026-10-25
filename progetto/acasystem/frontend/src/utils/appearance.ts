/**
 * Appearance of Kit 2 (ADR-0011, REP-20261007-008): theme and accent of this device.
 * Saved in this browser (each tablet keeps its own), applied to <html> as data-theme and
 * data-accent, which the Kit 2 tokens read. «auto» follows the system light/dark preference.
 */
import { useCallback, useEffect, useState } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'auto';
/** `wallpaper`: the hue taken from the wallpaper (REP-20261007-038), as Material You. */
export type AccentChoice = 'violet' | 'red' | 'cyan' | 'orange' | 'wallpaper';
/** Wallpaper of the launcher (REP-20261007-038): none, a preset, or a photo of this device. */
export type WallpaperChoice = 'none' | 'alba' | 'mare' | 'bosco' | 'tramonto' | 'notte' | 'photo';

export interface Appearance {
  theme: ThemeChoice;
  accent: AccentChoice;
  wallpaper: WallpaperChoice;
  /** OKLCH hue of the wallpaper, for the «Dallo sfondo» accent. */
  wallpaperHue?: number;
}

export const APPEARANCE_KEY = 'aca_appearance';
export const DEFAULT_APPEARANCE: Appearance = {
  theme: 'light',
  accent: 'violet',
  wallpaper: 'none',
};

const THEMES: readonly ThemeChoice[] = ['light', 'dark', 'auto'];
const ACCENTS: readonly AccentChoice[] = ['violet', 'red', 'cyan', 'orange', 'wallpaper'];
const WALLPAPERS: readonly WallpaperChoice[] = [
  'none',
  'alba',
  'mare',
  'bosco',
  'tramonto',
  'notte',
  'photo',
];

/** OKLCH hue of each preset wallpaper (themes/kit2/wallpapers.css draws them). */
export const WALLPAPER_HUES: Record<Exclude<WallpaperChoice, 'none' | 'photo'>, number> = {
  alba: 60,
  mare: 230,
  bosco: 155,
  tramonto: 25,
  notte: 280,
};

/** Saved appearance; unknown or missing values fall back to the defaults. */
export function readAppearance(
  storage: Pick<Storage, 'getItem'> | undefined = safeStorage()
): Appearance {
  try {
    const raw = storage?.getItem(APPEARANCE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Appearance>) : {};
    const hue = parsed.wallpaperHue;
    return {
      theme: THEMES.includes(parsed.theme as ThemeChoice)
        ? (parsed.theme as ThemeChoice)
        : DEFAULT_APPEARANCE.theme,
      accent: ACCENTS.includes(parsed.accent as AccentChoice)
        ? (parsed.accent as AccentChoice)
        : DEFAULT_APPEARANCE.accent,
      wallpaper: WALLPAPERS.includes(parsed.wallpaper as WallpaperChoice)
        ? (parsed.wallpaper as WallpaperChoice)
        : DEFAULT_APPEARANCE.wallpaper,
      ...(typeof hue === 'number' && Number.isFinite(hue)
        ? { wallpaperHue: ((Math.round(hue) % 360) + 360) % 360 }
        : {}),
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function writeAppearance(
  appearance: Appearance,
  storage: Pick<Storage, 'setItem'> | undefined = safeStorage()
): void {
  try {
    storage?.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
  } catch {
    // Storage unavailable (private mode): the choice lasts for this session only.
  }
}

/** Light or dark actually shown: «auto» asks the system. */
export function resolveTheme(theme: ThemeChoice, prefersDark: boolean): 'light' | 'dark' {
  if (theme === 'auto') return prefersDark ? 'dark' : 'light';
  return theme;
}

const darkQuery = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

/** Writes the attributes the Kit 2 tokens read; violet is the default accent (no attribute). */
export function applyAppearance(
  appearance: Appearance,
  root: HTMLElement = document.documentElement,
  prefersDark: boolean = darkQuery()?.matches ?? false
): void {
  const theme = resolveTheme(appearance.theme, prefersDark);
  root.dataset.theme = theme;
  const hue = wallpaperHueOf(appearance);
  if (appearance.accent === 'wallpaper' && hue !== null) {
    // The hue of the wallpaper as the accent (REP-20261007-038).
    root.dataset.accent = 'custom';
    root.style.setProperty('--k2-accent-hue', String(hue));
  } else {
    root.style.removeProperty('--k2-accent-hue');
    if (appearance.accent === 'violet' || appearance.accent === 'wallpaper') {
      delete root.dataset.accent;
    } else root.dataset.accent = appearance.accent;
  }
  if (appearance.wallpaper === 'none') delete root.dataset.wallpaper;
  else root.dataset.wallpaper = appearance.wallpaper;
  if (appearance.wallpaper === 'photo') void showWallpaperPhoto(root);
  else root.style.removeProperty('--aca-wallpaper-photo');
  // Native controls (scrollbars, inputs) follow the theme too.
  root.style.colorScheme = theme;
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

/** Current appearance with a setter that saves and applies it; «auto» follows system changes. */
export function useAppearance(): [Appearance, (next: Appearance) => void] {
  const [appearance, setAppearance] = useState<Appearance>(() => readAppearance());

  useEffect(() => {
    applyAppearance(appearance);
    if (appearance.theme !== 'auto') return undefined;
    const query = darkQuery();
    if (!query) return undefined;
    const onChange = () => applyAppearance(appearance);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [appearance]);

  const update = useCallback((next: Appearance) => {
    writeAppearance(next);
    setAppearance(next);
  }, []);

  return [appearance, update];
}

/** Hue of the wallpaper: the preset's, or the one measured on the photo; null without one. */
export function wallpaperHueOf(appearance: Appearance): number | null {
  if (appearance.wallpaper === 'none') return null;
  if (appearance.wallpaper === 'photo') return appearance.wallpaperHue ?? null;
  return WALLPAPER_HUES[appearance.wallpaper];
}

/*
 * The photo of the wallpaper stays on this device, in IndexedDB (too large for localStorage);
 * it is never synchronised.
 */
const DB_NAME = 'aca-appearance';
const STORE = 'files';
const PHOTO_KEY = 'wallpaper';

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Saves the photo of the wallpaper on this device. */
export async function saveWallpaperPhoto(photo: Blob): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(photo, PHOTO_KEY);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
}

async function readWallpaperPhoto(): Promise<Blob | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(PHOTO_KEY);
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
    request.onerror = () => resolve(null);
  });
}

let photoUrl: string | null = null;

/** Shows the saved photo as the wallpaper (an object URL in --aca-wallpaper-photo). */
async function showWallpaperPhoto(root: HTMLElement): Promise<void> {
  const photo = await readWallpaperPhoto();
  if (!photo || typeof URL.createObjectURL !== 'function') return;
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = URL.createObjectURL(photo);
  root.style.setProperty('--aca-wallpaper-photo', `url("${photoUrl}")`);
}

/** OKLCH hue (degrees) and chroma of an sRGB colour (0–255 channels). */
export function oklchHue(r: number, g: number, b: number): { hue: number; chroma: number } {
  const linear = (value: number) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const hue = ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
  return { hue, chroma: Math.hypot(a, bb) };
}

/**
 * Dominant hue of image pixels (RGBA): the hue sector of 15° with the most colour, each pixel
 * weighted by its chroma, as Material You takes a seed colour from the wallpaper. Null for a
 * grey image.
 */
export function dominantHue(pixels: ArrayLike<number>): number | null {
  const sectors = new Array<number>(24).fill(0);
  for (let index = 0; index + 3 < pixels.length; index += 4) {
    if (pixels[index + 3] < 128) continue;
    const { hue, chroma } = oklchHue(pixels[index], pixels[index + 1], pixels[index + 2]);
    if (chroma < 0.03) continue;
    sectors[Math.floor(hue / 15) % 24] += chroma;
  }
  const best = sectors.reduce((top, weight, sector) => (weight > sectors[top] ? sector : top), 0);
  return sectors[best] > 0 ? best * 15 + 7 : null;
}

/** Dominant hue of a photo, measured on a 32 × 32 copy; null when it cannot be read. */
export async function photoHue(photo: Blob): Promise<number | null> {
  try {
    if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return null;
    const bitmap = await createImageBitmap(photo, { resizeWidth: 32, resizeHeight: 32 });
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, 32, 32);
    return dominantHue(context.getImageData(0, 0, 32, 32).data);
  } catch {
    return null;
  }
}
