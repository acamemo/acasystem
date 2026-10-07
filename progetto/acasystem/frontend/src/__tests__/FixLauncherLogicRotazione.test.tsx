/**
 * Verifica avversaria con il controller reale e le taglie del registro: configurazione legacy con
 * la stessa luce su due pagine; la pagina Casa trabocca nel telefono orizzontale (6×2).
 */
import { useMemo, useState } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CardSettings, PagesConfig } from '@/@types/dashboard';
import type { DeviceClass, LauncherLayout } from '@/@types/launcher';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { useLauncherController, type LauncherStore } from '@/hooks/launcher/useLauncherController';

const resolveSizes = (widgetId: string, settings: CardSettings) =>
  findWidgetDefinition(widgetId, settings)?.sizes;

describe('avversario: rotazione con la stessa luce su due pagine', () => {
  it('la pagina Cucina mostra ancora la sua luce nel telefono orizzontale', () => {
    const pagesConfig = {
      pages: ['home', 'cucina'],
      header: [],
      home: ['climate_card_1', 'climate_card_2', 'climate_card_3', 'light.cucina'],
      cucina: ['light.cucina', 'climate_card_4'],
    } as unknown as PagesConfig;
    const pageSettings = { home: { label: 'Casa' }, cucina: { label: 'Cucina' } };
    const cardSettings = {
      'home::climate_card_1': { climateId: 'climate.a' },
      'home::climate_card_2': { climateId: 'climate.b' },
      'home::climate_card_3': { climateId: 'climate.c' },
      'cucina::climate_card_4': { climateId: 'climate.d' },
    };
    const { result, rerender } = renderHook(
      ({ deviceClass }: { deviceClass: DeviceClass }) => {
        const [layout, setLayout] = useState<LauncherLayout | null>(null);
        const store = useMemo<LauncherStore>(
          () => ({
            ready: true,
            layout,
            persistLayout: setLayout,
            pagesConfig,
            pageSettings,
            cardSettings,
          }),
          [layout]
        );
        return useLauncherController({ store, deviceClass, resolveSizes });
      },
      { initialProps: { deviceClass: 'tablet' as DeviceClass } }
    );
    const onTablet = result.current.layout.pages.find((page) => page.id === 'cucina');
    expect(onTablet?.placements.tablet?.['light.cucina']).toBeDefined();

    rerender({ deviceClass: 'phoneLandscape' });
    const pages = result.current.layout.pages;
    const cucinaFamily = pages.filter((page) => (page.continuationOf ?? page.id) === 'cucina');
    expect(cucinaFamily.some((page) => page.placements.phoneLandscape?.['light.cucina'])).toBe(
      true
    );
  });
});
