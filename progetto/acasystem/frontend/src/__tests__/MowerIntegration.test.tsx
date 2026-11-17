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
  family: 'mower' as const,
  deviceId: 'mower-controller',
  primaryEntityId: 'lawn_mower.main',
  channelEntityIds: ['lawn_mower.main'],
  secondaryEntityIds: [],
};

afterEach(cleanup);
describe('integrazione conservativa Tagliaerba', () => {
  it('la nuova Console e il minimo2x2 non contaminano la definizione legacy o una riassociazione', () => {
    const settings = { categoryWidgetType: 'mower', bindingEntityId: 'lawn_mower.main' };
    const legacy = findWidgetDefinition('lawn_mower.widget_old', settings)!;
    const product = findWidgetDefinition('lawn_mower.widget_new', {
      ...settings,
      productDevice: binding,
    })!;
    expect(legacy.Console).toBeUndefined();
    expect(product.Console).toBeDefined();
    expect(product.sizes.min).toEqual({ w: 2, h: 2 });
    expect(legacy.sizes.min).toEqual({ w: 2, h: 1 });
    expect(findWidgetDefinition('lawn_mower.widget_old', settings)).toBe(legacy);
    expect(
      findWidgetDefinition('lawn_mower.widget_new', {
        ...settings,
        bindingEntityId: 'lawn_mower.other',
        productDevice: binding,
      })
    ).toBe(legacy);
  });
  it('anteprima inerte con stato osservato, unknown e proprietà del prototipo indisponibili', () => {
    const view = render(
      <ProductDevicePreview
        binding={binding}
        label="Tagliaerba"
        entities={fixtureEntities([fixtureEntity('lawn_mower.main', 'idle')])}
      />
    );
    expect(screen.getByText('Inattivo')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
    expect(view.container.querySelector('img,video,iframe')).toBeNull();
    for (const state of ['unknown', 'constructor', '__proto__']) {
      view.rerender(
        <ProductDevicePreview
          binding={binding}
          label="Tagliaerba"
          entities={fixtureEntities([fixtureEntity('lawn_mower.main', state)])}
        />
      );
      expect(screen.getByText('Non disponibile')).toBeInTheDocument();
      expect(screen.queryByText(/^(Alla base|In carica|Inattivo)$/)).toBeNull();
    }
  });
  it('anteprima multicanale conta solo i canali disponibili senza avviare mappe o comandi', () => {
    const view = render(
      <ProductDevicePreview
        binding={{ ...binding, channelEntityIds: ['lawn_mower.main', 'lawn_mower.second'] }}
        label="Robot giardino"
        entities={fixtureEntities([
          fixtureEntity('lawn_mower.main', 'mowing'),
          fixtureEntity('lawn_mower.second', 'unavailable'),
        ])}
      />
    );
    expect(screen.getByText('1 di 2 canali disponibili')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
    expect(view.container.querySelector('img,video,iframe')).toBeNull();
  });
  it('seed per dispositivo usa bindingEntityId e mantiene almeno2x2 senza introdurre mowerId', () => {
    const seed = buildMockupSeed();
    const cards = JSON.parse(seed.storage.tunet_card_settings!) as CardSettingsMap;
    const products = Object.entries(cards).filter(
      ([, value]) => value.productDevice?.family === 'mower'
    );
    expect(products.length).toBeGreaterThan(0);
    for (const [key, value] of products) {
      expect(value.bindingEntityId).toBe(value.productDevice?.primaryEntityId);
      expect(value).not.toHaveProperty('mowerId');
      const [page, id] = key.split('::');
      const size = seed.layout.pages.find((p) => p.id === page)?.placements.tablet?.[id!];
      if (size) {
        expect(size.w).toBeGreaterThanOrEqual(2);
        expect(size.h).toBeGreaterThanOrEqual(2);
      }
    }
  });
  it('il mock avvia soltanto il tagliaerba scelto senza alterare altri robot', async () => {
    const store = createMockHaStore();
    try {
      const before = structuredClone(store.getEntities());
      const selected = 'lawn_mower.robot_prato',
        other = 'lawn_mower.robot_bordo';
      expect(before[selected]).toBeDefined();
      expect(before[other]).toBeDefined();
      await store.callService('lawn_mower', 'start_mowing', { entity_id: selected });
      expect(store.getEntities()[selected]?.state).toBe('mowing');
      for (const [id, entity] of Object.entries(before))
        if (id !== selected) expect(store.getEntities()[id]).toEqual(entity);
      expect(store.calls()).toMatchObject([
        { domain: 'lawn_mower', service: 'start_mowing', data: { entity_id: selected } },
      ]);
    } finally {
      store.dispose();
    }
  });
});
