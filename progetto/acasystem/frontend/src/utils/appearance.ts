/**
 * ACA uses a fixed light/violet palette without a user-selected global wallpaper.
 * Legacy choices remain valid import data, but never change the effective appearance.
 * Neither reading nor applying the palette rewrites saved preferences or photos.
 */
export type ThemeChoice = 'light' | 'dark' | 'auto';
export type AccentChoice = 'violet' | 'red' | 'cyan' | 'orange' | 'wallpaper';
export type WallpaperChoice = 'none' | 'alba' | 'mare' | 'bosco' | 'tramonto' | 'notte' | 'photo';

/** Historical configuration shape, retained for portable layouts and existing profiles. */
export interface Appearance {
  theme: ThemeChoice;
  accent: AccentChoice;
  wallpaper: WallpaperChoice;
  wallpaperHue?: number;
}

export const APPEARANCE_KEY = 'aca_appearance';
export const DEFAULT_APPEARANCE: Readonly<Appearance> = Object.freeze({
  theme: 'light',
  accent: 'violet',
  wallpaper: 'none',
});

/** Effective appearance only: historical local and profile data stay untouched. */
export function readAppearance(): Appearance {
  return { ...DEFAULT_APPEARANCE };
}

/** Clear obsolete global overrides even when the supplied profile contains legacy choices. */
export function applyAppearance(
  _appearance: unknown,
  root: HTMLElement = document.documentElement
): void {
  root.dataset.theme = DEFAULT_APPEARANCE.theme;
  delete root.dataset.accent;
  delete root.dataset.wallpaper;
  root.style.removeProperty('--k2-accent-hue');
  root.style.removeProperty('--aca-wallpaper-photo');
  root.style.colorScheme = 'light';
}
