import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { ProductDevicePreview } from '@/templates/launcher/ProductDevicePreview';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { buildMockupSeed } from '@/utils/mockup/seed';
import { createMockHaStore } from '@/utils/mockup/haStore';
import type { CardSettingsMap } from '@/@types/dashboard';

const binding = { version: 1 as const, family: 'cover' as const, deviceId: 'shade', primaryEntityId: 'cover.shade',
  channelEntityIds: ['cover.shade'], secondaryEntityIds: [] };
afterEach(cleanup);

describe('integrazione conservativa Cover', () => {
  it('minimo e Console del prodotto non cambiano la definizione storica o quella riassociata', () => {
    const settings = { categoryWidgetType: 'cover', coverId: 'cover.shade' };
    const legacy = findWidgetDefinition('cover_card_old', settings)!;
    const product = findWidgetDefinition('cover_card_new', { ...settings, productDevice: binding })!;
    expect(legacy.sizes.min).toEqual({ w: 2, h: 1 });
    expect(legacy.Console).toBeUndefined();
    expect(product.sizes.min).toEqual({ w: 2, h: 2 });
    expect(product.Console).toBeDefined();
    expect(findWidgetDefinition('cover_card_old', settings)).toBe(legacy);
    expect(findWidgetDefinition('cover_card_new', { ...settings, coverId: 'cover.other', productDevice: binding })).toBe(legacy);
  });
  it('anteprima inerte con stato reale e nessuna percentuale inventata', () => {
    const view = render(<ProductDevicePreview binding={binding} label="Tenda" entities={fixtureEntities([
      fixtureEntity('cover.shade', 'closed', { supported_features: 3 }),
    ])} />);
    expect(screen.getByText('Chiusa')).toBeInTheDocument();
    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    view.rerender(<ProductDevicePreview binding={binding} label="Tenda" entities={fixtureEntities([
      fixtureEntity('cover.shade', 'unavailable', { current_position: 0 }),
    ])} />);
    expect(screen.getByText('Non disponibile')).toBeInTheDocument();
    expect(screen.queryByText('Chiusa')).toBeNull();
  });
  it('il seed dimostrativo mantiene binding e ingombri coerenti senza convertire la seconda tenda storica', () => {
    const seed = buildMockupSeed();
    const cards = JSON.parse(seed.storage.tunet_card_settings!) as CardSettingsMap;
    const products = Object.entries(cards).filter(([, settings]) => settings.productDevice?.family === 'cover');
    expect(products.length).toBeGreaterThan(0);
    for (const [key, settings] of products) {
      expect(settings.coverId).toBe(settings.productDevice?.primaryEntityId);
      const [page, id] = key.split('::');
      const size = seed.layout.pages.find(p => p.id === page)?.placements.tablet?.[id!];
      if (size) { expect(size.w).toBeGreaterThanOrEqual(2); expect(size.h).toBeGreaterThanOrEqual(2); }
    }
    expect(Object.values(cards).some(settings => settings.coverId === 'cover.tenda_soggiorno' && !settings.productDevice)).toBe(true);
  });
  it('Stop nella simulazione conserva posizione/lamelle e non altera altri apparecchi', async () => {
    const store = createMockHaStore();
    try {
      store.patchEntity('cover.veneziana_studio', { state: 'opening', attributes: { current_position: 40, current_tilt_position: 30 } });
      const other = store.getEntities()['cover.veneziana_studio_secondaria'];
      await store.callService('cover', 'stop_cover', { entity_id: 'cover.veneziana_studio' });
      expect(store.getEntities()['cover.veneziana_studio']).toMatchObject({ state: 'open', attributes: { current_position: 40, current_tilt_position: 30 } });
      expect(store.getEntities()['cover.veneziana_studio_secondaria']).toEqual(other);
      expect(store.calls()).toMatchObject([{ domain: 'cover', service: 'stop_cover', data: { entity_id: 'cover.veneziana_studio' } }]);
    } finally { store.dispose(); }
  });
});
