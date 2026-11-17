import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppearanceSection } from '@/pages/system/sections/AppearanceSection';
import {
  APPEARANCE_KEY,
  DEFAULT_APPEARANCE,
  applyAppearance,
  readAppearance,
} from '@/utils/appearance';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('palette fissa ACA Liquid Glass', () => {
  it.each([
    '{"theme":"dark","accent":"cyan","wallpaper":"photo","wallpaperHue":230}',
    '{"theme":"auto","accent":"wallpaper","wallpaper":"mare"}',
    '{non json',
  ])('legge la palette effettiva senza riscrivere le preferenze storiche: %s', (raw) => {
    localStorage.setItem(APPEARANCE_KEY, raw);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const remove = vi.spyOn(Storage.prototype, 'removeItem');
    expect(readAppearance()).toEqual(DEFAULT_APPEARANCE);
    expect(localStorage.getItem(APPEARANCE_KEY)).toBe(raw);
    expect(write).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('non dipende dalla disponibilità dello storage e restituisce copie indipendenti', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage indisponibile'); });
    const first = readAppearance();
    first.theme = 'dark';
    expect(readAppearance()).toEqual({ theme: 'light', accent: 'violet', wallpaper: 'none' });
  });

  it('rimuove gli override globali senza leggere, sostituire o cancellare la vecchia foto', () => {
    const root = document.createElement('div');
    root.dataset.theme = 'dark';
    root.dataset.accent = 'custom';
    root.dataset.wallpaper = 'photo';
    root.style.setProperty('--k2-accent-hue', '230');
    root.style.setProperty('--aca-wallpaper-photo', 'url("blob:foto-storica")');
    const indexed = { open: vi.fn(), deleteDatabase: vi.fn() };
    const matchMedia = vi.fn();
    vi.stubGlobal('indexedDB', indexed);
    vi.stubGlobal('matchMedia', matchMedia);
    const raw = '{"theme":"dark","accent":"red","wallpaper":"photo","wallpaperHue":20}';
    localStorage.setItem(APPEARANCE_KEY, raw);
    const changed = vi.fn();
    window.addEventListener('acasystem:appearance-changed', changed);
    try {
      applyAppearance(JSON.parse(raw), root);
      applyAppearance({ theme: 'auto', accent: 'wallpaper', wallpaper: 'mare' }, root);
      expect(root.dataset.theme).toBe('light');
      expect(root.dataset.accent).toBeUndefined();
      expect(root.dataset.wallpaper).toBeUndefined();
      expect(root.style.getPropertyValue('--k2-accent-hue')).toBe('');
      expect(root.style.getPropertyValue('--aca-wallpaper-photo')).toBe('');
      expect(root.style.colorScheme).toBe('light');
      expect(indexed.open).not.toHaveBeenCalled();
      expect(indexed.deleteDatabase).not.toHaveBeenCalled();
      expect(matchMedia).not.toHaveBeenCalled();
      expect(changed).not.toHaveBeenCalled();
      expect(localStorage.getItem(APPEARANCE_KEY)).toBe(raw);
    } finally {
      window.removeEventListener('acasystem:appearance-changed', changed);
    }
  });

  it('mostra il tema attuale senza selettori, pulsanti o caricamento di sfondi globali', () => {
    const { container } = render(<AppearanceSection />);
    expect(screen.getByRole('heading', { name: 'Vetro Bianco' })).toBeVisible();
    expect(screen.getByText('Superfici trasparenti e paesaggio naturale.')).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(container.querySelector('input')).toBeNull();
  });
});
