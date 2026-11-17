import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { ProductDevicePreview } from '@/templates/launcher/ProductDevicePreview';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { buildMockupSeed } from '@/utils/mockup/seed';
import type { CardSettingsMap } from '@/@types/dashboard';

const binding = { version: 1 as const, family: 'climate' as const, deviceId: 'air', primaryEntityId: 'climate.air',
  channelEntityIds: ['climate.air'], secondaryEntityIds: [] };
afterEach(cleanup);

describe('integrazione conservativa del prodotto Clima', () => {
  it('la misura minima del nuovo prodotto non cambia i widget storici o una successiva riassociazione', () => {
    const legacy = findWidgetDefinition('climate_card_old', { categoryWidgetType: 'climate', climateId: 'climate.air' })!;
    const product = findWidgetDefinition('climate_card_new', { categoryWidgetType: 'climate', climateId: 'climate.air', productDevice: binding })!;
    expect(legacy.sizes.min).toEqual({ w: 2, h: 1 });
    expect(product.sizes.min).toEqual({ w: 2, h: 2 });
    expect(findWidgetDefinition('climate_card_old', { categoryWidgetType: 'climate', climateId: 'climate.air' })).toBe(legacy);
    expect(findWidgetDefinition('climate_card_new', { categoryWidgetType: 'climate', climateId: 'climate.other', productDevice: binding })?.sizes.min).toEqual(legacy.sizes.min);
  });
  it('l’anteprima associata mostra dati del clima e non offre comandi o stati luce', () => {
    render(<ProductDevicePreview binding={binding} label="Termostato" entities={fixtureEntities([
      fixtureEntity('climate.air', 'heat', { current_temperature: 68, temperature_unit: '°F' }),
    ])} />);
    expect(screen.getByText('Temperatura attuale · 68 °F')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText('Spenta')).toBeNull();
  });
  it('il modello dimostrativo conserva almeno un prodotto clima associato e geometrie idonee', () => {
    const seed = buildMockupSeed();
    const cards = JSON.parse(seed.storage.tunet_card_settings!) as CardSettingsMap;
    const products = Object.entries(cards).filter(([, setting]) => setting.productDevice?.family === 'climate');
    expect(products.length).toBeGreaterThan(0);
    for (const [key, setting] of products) {
      const [page, id] = key.split('::');
      const size = seed.layout.pages.find(item => item.id === page)?.placements.tablet?.[id!];
      if (size) {
        expect(size.w).toBeGreaterThanOrEqual(2);
        expect(size.h).toBeGreaterThanOrEqual(2);
      }
      expect(setting.climateId).toBe(setting.productDevice?.primaryEntityId);
    }
  });
});
