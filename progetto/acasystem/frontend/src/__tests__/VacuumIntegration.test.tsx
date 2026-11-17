import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { findWidgetDefinition } from '@/components/widgets/registry';
import { ProductDevicePreview } from '@/templates/launcher/ProductDevicePreview';
import { fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { buildMockupSeed } from '@/utils/mockup/seed';
import { createMockHaStore } from '@/utils/mockup/haStore';
import type { CardSettingsMap } from '@/@types/dashboard';

const binding = {
  version: 1 as const,
  family: 'vacuum' as const,
  deviceId: 'vacuum-controller',
  primaryEntityId: 'vacuum.main',
  channelEntityIds: ['vacuum.main'],
  secondaryEntityIds: [],
};

afterEach(cleanup);
describe('integrazione conservativa Aspirapolvere', () => {
  it('la Console prodotto conserva la Console legacy senza contaminare cache o riassociazioni', () => {
    const settings = { categoryWidgetType: 'vacuum', bindingEntityId: 'vacuum.main' };
    const legacy = findWidgetDefinition('vacuum.widget_old', settings)!;
    const product = findWidgetDefinition('vacuum.widget_new', {
      ...settings,
      productDevice: binding,
    })!;
    expect(legacy.Console).toBeDefined();
    expect(product.Console).toBeDefined();
    expect(product.Console).not.toBe(legacy.Console);
    expect(product.sizes.min).toEqual({ w: 2, h: 2 });
    expect(legacy.sizes.min).toEqual({ w: 2, h: 1 });
    expect(findWidgetDefinition('vacuum.widget_old', settings)).toBe(legacy);
    expect(
      findWidgetDefinition('vacuum.widget_new', {
        ...settings,
        bindingEntityId: 'vacuum.other',
        productDevice: binding,
      })
    ).toBe(legacy);
  });
  it('anteprima inerte con stato osservato e nessuno stato inventato per unknown o proprietà del prototipo', () => {
    const view = render(
      <ProductDevicePreview
        binding={binding}
        label="Aspirapolvere"
        entities={fixtureEntities([fixtureEntity('vacuum.main', 'idle')])}
      />
    );
    expect(screen.getByText('Inattivo')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
    expect(view.container.querySelector('img,video,iframe')).toBeNull();
    for (const state of ['unknown', 'constructor', '__proto__']) {
      view.rerender(
        <ProductDevicePreview
          binding={binding}
          label="Aspirapolvere"
          entities={fixtureEntities([fixtureEntity('vacuum.main', state)])}
        />
      );
      expect(screen.getByText('Non disponibile')).toBeInTheDocument();
      expect(screen.queryByText(/^(Alla base|In carica|Inattivo)$/)).toBeNull();
    }
  });
  it('anteprima multicanale conta solo i canali disponibili senza mappe o comandi', () => {
    const view = render(
      <ProductDevicePreview
        binding={{ ...binding, channelEntityIds: ['vacuum.main', 'vacuum.second'] }}
        label="Robot pulizia"
        entities={fixtureEntities([
          fixtureEntity('vacuum.main', 'cleaning'),
          fixtureEntity('vacuum.second', 'unavailable'),
        ])}
      />
    );
    expect(screen.getByText('1 di 2 canali disponibili')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
    expect(view.container.querySelector('img,video,iframe')).toBeNull();
  });
  it('seed per dispositivo usa bindingEntityId e mantiene almeno2x2 senza introdurre vacuumId', () => {
    const seed = buildMockupSeed();
    const cards = JSON.parse(seed.storage.tunet_card_settings!) as CardSettingsMap;
    const products = Object.entries(cards).filter(
      ([, value]) => value.productDevice?.family === 'vacuum'
    );
    expect(products.length).toBeGreaterThan(0);
    for (const [key, value] of products) {
      expect(value.bindingEntityId).toBe(value.productDevice?.primaryEntityId);
      expect(value).not.toHaveProperty('vacuumId');
      const [page, id] = key.split('::');
      const size = seed.layout.pages.find((p) => p.id === page)?.placements.tablet?.[id!];
      if (size) {
        expect(size.w).toBeGreaterThanOrEqual(2);
        expect(size.h).toBeGreaterThanOrEqual(2);
      }
    }
  });
  it('il mock avvia soltanto il canale selezionato senza comandare altri robot', async () => {
    const store = createMockHaStore();
    try {
      const before = structuredClone(store.getEntities());
      const selected = 'vacuum.robot_piano_terra',
        other = 'vacuum.robot_piano_primo';
      expect(before[selected]).toBeDefined();
      expect(before[other]).toBeDefined();
      await store.callService('vacuum', 'start', { entity_id: selected });
      expect(store.getEntities()[selected]?.state).toBe('cleaning');
      for (const [id, entity] of Object.entries(before))
        if (id !== selected) expect(store.getEntities()[id]).toEqual(entity);
      expect(store.calls()).toMatchObject([
        { domain: 'vacuum', service: 'start', data: { entity_id: selected } },
      ]);
    } finally {
      store.dispose();
    }
  });
});
