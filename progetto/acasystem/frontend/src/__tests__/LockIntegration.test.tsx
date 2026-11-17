import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { ProductDevicePreview } from '@/templates/launcher/ProductDevicePreview';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { buildMockupSeed } from '@/utils/mockup/seed';
import { createMockHaStore } from '@/utils/mockup/haStore';
import type { CardSettingsMap } from '@/@types/dashboard';

const binding = { version: 1 as const, family: 'lock' as const, deviceId: 'door', primaryEntityId: 'lock.door', channelEntityIds: ['lock.door'], secondaryEntityIds: [] };
afterEach(cleanup);
describe('integrazione conservativa Serrature', () => {
  it('la Console prodotto e il minimo2x2 non contaminano la cache legacy o una riassociazione', () => {
    const settings = { categoryWidgetType: 'lock', lockId: 'lock.door' };
    const legacy = findWidgetDefinition('lock_card_old', settings)!;
    const product = findWidgetDefinition('lock_card_new', { ...settings, productDevice: binding })!;
    expect(legacy.Console).toBeUndefined();
    expect(product.Console).toBeDefined();
    expect(product.sizes.min).toEqual({ w: 2, h: 2 });
    expect(findWidgetDefinition('lock_card_old', settings)).toBe(legacy);
    expect(findWidgetDefinition('lock_card_new', { ...settings, lockId: 'lock.other', productDevice: binding })).toBe(legacy);
  });
  it('l’anteprima non confonde sblocco e apertura, non mostra azioni e non inventa stati', () => {
    const view = render(<ProductDevicePreview binding={binding} label="Porta" entities={fixtureEntities([fixtureEntity('lock.door', 'unlocked')])} />);
    expect(screen.getByText('Sbloccata')).toBeInTheDocument();
    expect(screen.queryByText('Aperta')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    view.rerender(<ProductDevicePreview binding={binding} label="Porta" entities={fixtureEntities([fixtureEntity('lock.door', 'unknown')])} />);
    expect(screen.getByText('Non disponibile')).toBeInTheDocument();
    expect(screen.queryByText('Bloccata')).toBeNull();
    view.rerender(<ProductDevicePreview binding={binding} label="Porta" entities={fixtureEntities([fixtureEntity('lock.door', 'constructor')])} />);
    expect(screen.getByText('Non disponibile')).toBeInTheDocument();
  });
  it('l’anteprima multicanale resta inerte e conta solo stati effettivi', () => {
    render(<ProductDevicePreview binding={{ ...binding, channelEntityIds: ['lock.door', 'lock.second'] }} label="Porte" entities={fixtureEntities([fixtureEntity('lock.door', 'locked'), fixtureEntity('lock.second', 'unavailable')])} />);
    expect(screen.getByText('1 di 2 canali disponibili')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('il seed privato mantiene lockId, metadati e geometria coerenti', () => {
    const seed = buildMockupSeed();
    const cards = JSON.parse(seed.storage.tunet_card_settings!) as CardSettingsMap;
    const products = Object.entries(cards).filter(([, value]) => value.productDevice?.family === 'lock');
    expect(products.length).toBeGreaterThan(0);
    for (const [key, value] of products) {
      expect(value.lockId).toBe(value.productDevice?.primaryEntityId);
      const [page, id] = key.split('::');
      const size = seed.layout.pages.find(p => p.id === page)?.placements.tablet?.[id!];
      if (size) { expect(size.w).toBeGreaterThanOrEqual(2); expect(size.h).toBeGreaterThanOrEqual(2); }
    }
  });
  it('un comando simulato agisce sul solo canale scelto e sbloccare non apre', async () => {
    const store = createMockHaStore();
    try {
      const second = store.getEntities()['lock.accesso_interno'];
      await store.callService('lock', 'unlock', { entity_id: 'lock.accesso_esterno' });
      expect(store.getEntities()['lock.accesso_esterno']?.state).toBe('unlocked');
      expect(store.getEntities()['lock.accesso_interno']).toEqual(second);
      expect(store.calls()).toMatchObject([{ domain: 'lock', service: 'unlock', data: { entity_id: 'lock.accesso_esterno' } }]);
    } finally { store.dispose(); }
  });
});
