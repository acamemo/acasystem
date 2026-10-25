import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppearanceSection } from '@/pages/system/sections/AppearanceSection';
import {
  APPEARANCE_KEY,
  DEFAULT_APPEARANCE,
  applyAppearance,
  readAppearance,
  resolveTheme,
  writeAppearance,
  type Appearance,
  WALLPAPER_HUES,
  dominantHue,
  oklchHue,
} from '@/utils/appearance';

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.accent;
});

describe('aspetto di Kit 2 (REP-20261007-008)', () => {
  it('legge i valori salvati e torna ai predefiniti se mancano o non sono validi', () => {
    expect(readAppearance()).toEqual(DEFAULT_APPEARANCE);
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ theme: 'dark', accent: 'cyan' }));
    expect(readAppearance()).toEqual({ theme: 'dark', accent: 'cyan', wallpaper: 'none' });
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ theme: 'sepia', accent: 'green' }));
    expect(readAppearance()).toEqual(DEFAULT_APPEARANCE);
    localStorage.setItem(APPEARANCE_KEY, '{non json');
    expect(readAppearance()).toEqual(DEFAULT_APPEARANCE);
  });

  it('salva la scelta in questo browser', () => {
    writeAppearance({ theme: 'auto', accent: 'red', wallpaper: 'mare' });
    expect(JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? '{}')).toEqual({
      theme: 'auto',
      accent: 'red',
      wallpaper: 'mare',
    });
  });

  it('risolve «Automatico» con la preferenza del dispositivo', () => {
    expect(resolveTheme('auto', true)).toBe('dark');
    expect(resolveTheme('auto', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('scrive su <html> gli attributi letti dai token, senza accento per il viola', () => {
    const root = document.documentElement;
    applyAppearance({ theme: 'auto', accent: 'orange', wallpaper: 'none' }, root, true);
    expect(root.dataset.theme).toBe('dark');
    expect(root.dataset.accent).toBe('orange');
    expect(root.style.colorScheme).toBe('dark');
    applyAppearance({ theme: 'light', accent: 'violet', wallpaper: 'none' }, root, true);
    expect(root.dataset.theme).toBe('light');
    expect(root.dataset.accent).toBeUndefined();
  });

  it('sfondo e accento «Dallo sfondo» (REP-20261007-038)', () => {
    const root = document.documentElement;
    applyAppearance({ theme: 'light', accent: 'wallpaper', wallpaper: 'mare' }, root, false);
    expect(root.dataset.wallpaper).toBe('mare');
    expect(root.dataset.accent).toBe('custom');
    expect(root.style.getPropertyValue('--k2-accent-hue')).toBe(String(WALLPAPER_HUES.mare));
    // Without a wallpaper the accent falls back to violet.
    applyAppearance({ theme: 'light', accent: 'wallpaper', wallpaper: 'none' }, root, false);
    expect(root.dataset.wallpaper).toBeUndefined();
    expect(root.dataset.accent).toBeUndefined();
    expect(root.style.getPropertyValue('--k2-accent-hue')).toBe('');
  });

  it('ricava la tinta dominante dai pixel della foto', () => {
    // 3 blue pixels, 1 orange, 1 grey: the blue sector wins; a grey image has none.
    const pixels = [
      ...[0, 90, 255, 255],
      ...[0, 90, 255, 255],
      ...[0, 90, 255, 255],
      ...[255, 120, 0, 255],
      ...[128, 128, 128, 255],
    ];
    const hue = dominantHue(pixels);
    expect(hue).not.toBeNull();
    expect(Math.abs((hue ?? 0) - oklchHue(0, 90, 255).hue)).toBeLessThan(15);
    expect(dominantHue([128, 128, 128, 255, 20, 20, 20, 255])).toBeNull();
  });

  it('nella sezione Aspetto cambia tema e accento', () => {
    function Harness() {
      const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
      return <AppearanceSection appearance={appearance} onChange={setAppearance} />;
    }
    render(<Harness />);
    const theme = screen.getByRole('group', { name: 'Tema' });
    fireEvent.click(within(theme).getByRole('button', { name: 'Scuro' }));
    expect(within(theme).getByRole('button', { name: 'Scuro' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    const accents = screen.getByRole('group', { name: 'Colore d’accento' });
    // Four colours and «Dallo sfondo», off without a wallpaper (REP-20261007-038).
    expect(within(accents).getAllByRole('button')).toHaveLength(5);
    expect(within(accents).getByRole('button', { name: 'Dallo sfondo' })).toBeDisabled();
    fireEvent.click(within(accents).getByRole('button', { name: 'Ciano' }));
    expect(within(accents).getByRole('button', { name: 'Ciano' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(within(accents).getByRole('button', { name: 'Viola' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });
});
